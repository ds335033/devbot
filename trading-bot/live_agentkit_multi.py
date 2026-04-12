#!/usr/bin/env python3
"""
DEVBOT LIVE MULTI-TIER AGENTKIT TRADER
=======================================
3 concurrent AI trading tiers using Coinbase AgentKit (on-chain DEX swaps).

  Tier 1 — Conservative (4%):  DCA into WETH on Base, steady accumulation
  Tier 2 — Moderate (8%):      Momentum swaps USDC<>WETH, trend-based
  Tier 3 — Aggressive (14%):   Mean reversion multi-token (WETH, cbBTC), buy dips sell rallies

Uses your existing CDP key for on-chain trading via Base network.
Claude AI makes decisions. AgentKit executes swaps.

Usage:
  python live_agentkit_multi.py                  # Run all 3 tiers
  python live_agentkit_multi.py --tier 1         # Conservative only
  python live_agentkit_multi.py --status         # Portfolio check
  python live_agentkit_multi.py --once           # Single cycle
  python live_agentkit_multi.py --testnet        # Force Base Sepolia
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

# ── PYTHON 3.14 + nest_asyncio FIX ─────────────────────────
# nest_asyncio breaks aiohttp/asyncio timeouts on Python 3.14.
# Block it before any imports pull it in.
import sys as _sys
if _sys.version_info >= (3, 14):
    class _FakeNestAsyncio:
        """No-op stub — nest_asyncio is incompatible with Python 3.14 asyncio timeouts."""
        def apply(self, *a, **kw): pass
        def __getattr__(self, name): return lambda *a, **kw: None
    _sys.modules['nest_asyncio'] = _FakeNestAsyncio()

# ── CDP SDK PATCHES (fix overly strict Pydantic validators) ─
# The OpenAPI-generated CDP SDK models reject valid API responses:
#   - liquidityAvailable: API returns bool True, SDK expects string 'true'
#   - fees/issues/permit2/transaction: API may return null, SDK marks them required
#   - simulationIncomplete: API may return string, SDK expects StrictBool
# Direct file patches have been applied to the SDK source files.

# ── CONFIG ──────────────────────────────────────────────────
CDP_API_KEY_NAME = os.getenv("CDP_API_KEY_NAME", "")
CDP_API_KEY_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
CDP_WALLET_SECRET = os.getenv("CDP_WALLET_SECRET", "")
NETWORK_ID = os.getenv("NETWORK_ID", "base-mainnet")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MAX_DAILY = int(os.getenv("MAX_DAILY_TRADES", "30"))
CYCLE_INTERVAL = int(os.getenv("CYCLE_INTERVAL_SECONDS", "600"))

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
TRADES_FILE = DATA_DIR / "agentkit_trades.json"
LOG_FILE = DATA_DIR / "agentkit_multi.log"

# ── TIER DEFINITIONS ────────────────────────────────────────
TIERS = {
    1: {
        "name": "Conservative",
        "pct": 4.0,
        "strategy": "dca",
        "description": "DCA into WETH — steady, low-risk accumulation",
        "stop_loss": 3.0,
        "take_profit": 8.0,
        "max_daily": 12,
    },
    2: {
        "name": "Moderate",
        "pct": 8.0,
        "strategy": "momentum",
        "description": "Momentum trading — buy uptrends, sell on reversal signals",
        "stop_loss": 5.0,
        "take_profit": 12.0,
        "max_daily": 8,
    },
    3: {
        "name": "Aggressive",
        "pct": 14.0,
        "strategy": "mean_reversion",
        "description": "Mean reversion — buy dips hard, sell rallies, multi-token",
        "stop_loss": 8.0,
        "take_profit": 18.0,
        "max_daily": 10,
    },
}

# ── LOGGING ─────────────────────────────────────────────────
def log(msg, level="INFO", tier=None):
    ts = datetime.now().strftime("%H:%M:%S")
    prefix = f"[T{tier}]" if tier else "[BOT]"
    colors = {1: "\033[92m", 2: "\033[93m", 3: "\033[91m"}
    c = colors.get(tier, "\033[96m")
    line = f"[{ts}] [{level}] {prefix} {msg}"
    print(f"{c}{line}\033[0m", flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ── PERSISTENCE ─────────────────────────────────────────────
def load_trades():
    if TRADES_FILE.exists():
        try: return json.loads(TRADES_FILE.read_text())
        except: pass
    return []

def save_trade(trade):
    trades = load_trades()
    trades.append(trade)
    TRADES_FILE.write_text(json.dumps(trades, indent=2))

def get_trades_today(tier=None):
    trades = load_trades()
    today = datetime.now().strftime("%Y-%m-%d")
    out = [t for t in trades if t.get("timestamp", "").startswith(today)]
    if tier: out = [t for t in out if t.get("tier") == tier]
    return out

# ── AGENTKIT INITIALIZATION ─────────────────────────────────
def create_agentkit():
    """Initialize Coinbase AgentKit.

    Uses Smart Wallet + Paymaster (gasless) if CDP_PAYMASTER_URL is set.
    Otherwise uses standard EVM wallet (requires ETH for gas).
    """
    PAYMASTER_URL = os.getenv("CDP_PAYMASTER_URL", "")

    from coinbase_agentkit import (
        AgentKit, AgentKitConfig,
        cdp_api_action_provider,
        erc20_action_provider, wallet_action_provider, weth_action_provider,
    )
    from coinbase_agentkit_langchain import get_langchain_tools
    from langchain_anthropic import ChatAnthropic
    from langgraph.prebuilt import create_react_agent

    WALLET_ADDRESS = os.getenv("CDP_WALLET_ADDRESS", "")

    if PAYMASTER_URL:
        # ── SMART WALLET MODE (gasless via paymaster) ──
        log("Initializing AgentKit (Smart Wallet — GASLESS)...")
        from coinbase_agentkit import (
            CdpSmartWalletProvider, CdpSmartWalletProviderConfig,
            cdp_smart_wallet_action_provider,
        )
        wallet_config = CdpSmartWalletProviderConfig(
            api_key_id=CDP_API_KEY_NAME,
            api_key_secret=CDP_API_KEY_PRIVATE_KEY,
            wallet_secret=CDP_WALLET_SECRET,
            network_id=NETWORK_ID,
            owner=WALLET_ADDRESS,
            paymaster_url=PAYMASTER_URL,
        )
        log(f"Owner: {WALLET_ADDRESS}")
        log(f"Paymaster: {PAYMASTER_URL}")
        wallet = None
        for attempt in range(3):
            try:
                wallet = CdpSmartWalletProvider(wallet_config)
                break
            except Exception as e:
                log(f"Smart wallet init {attempt+1}/3 failed: {e}", "WARN")
                if attempt < 2: time.sleep(5)
                else: raise
        swap_provider = cdp_smart_wallet_action_provider()
    else:
        # ── STANDARD EVM WALLET MODE (needs ETH for gas) ──
        log("Initializing AgentKit (EVM wallet)...")
        from coinbase_agentkit import (
            CdpEvmWalletProvider, CdpEvmWalletProviderConfig,
            cdp_evm_wallet_action_provider,
        )
        wallet_config_kwargs = {
            "api_key_id": CDP_API_KEY_NAME,
            "api_key_secret": CDP_API_KEY_PRIVATE_KEY,
            "wallet_secret": CDP_WALLET_SECRET,
            "network_id": NETWORK_ID,
        }
        if WALLET_ADDRESS:
            wallet_config_kwargs["address"] = WALLET_ADDRESS
            log(f"Using wallet: {WALLET_ADDRESS}")
        wallet_config = CdpEvmWalletProviderConfig(**wallet_config_kwargs)
        wallet = None
        for attempt in range(3):
            try:
                wallet = CdpEvmWalletProvider(wallet_config)
                break
            except Exception as e:
                log(f"Wallet init {attempt+1}/3 failed: {e}", "WARN")
                if attempt < 2: time.sleep(5)
                else: raise
        swap_provider = cdp_evm_wallet_action_provider()

    address = wallet.get_address()
    log(f"Wallet: {address}")
    log(f"Network: {NETWORK_ID}")
    log(f"Mode: {'GASLESS (paymaster)' if PAYMASTER_URL else 'standard (needs ETH)'}")

    agentkit = AgentKit(AgentKitConfig(
        wallet_provider=wallet,
        action_providers=[
            cdp_api_action_provider(),
            swap_provider,
            erc20_action_provider(),
            wallet_action_provider(),
            weth_action_provider(),
        ],
    ))

    tools = get_langchain_tools(agentkit)
    llm = ChatAnthropic(
        model="claude-haiku-4-5-20251001",
        api_key=ANTHROPIC_API_KEY,
        max_tokens=4096,
    )

    log(f"AgentKit ready — {len(tools)} on-chain tools available")
    return llm, tools, wallet, agentkit

# ── TIER AGENT CREATION ─────────────────────────────────────
def create_tier_agent(tier_num, tier_cfg, llm, tools, wallet_address):
    """Create a LangChain agent for a specific trading tier."""
    from langgraph.prebuilt import create_react_agent

    prompt = f"""You are DevBot Tier {tier_num} Trading Agent — {tier_cfg['name']} ({tier_cfg['pct']}%).

WALLET: {wallet_address}
NETWORK: {NETWORK_ID} ({'MAINNET — REAL MONEY' if 'mainnet' in NETWORK_ID else 'TESTNET — paper trading'})

TIER CONFIG:
- Strategy: {tier_cfg['strategy']}
- Risk Level: {tier_cfg['name']}
- Portfolio Allocation: {tier_cfg['pct']}% per cycle
- Stop Loss: {tier_cfg['stop_loss']}%
- Take Profit: {tier_cfg['take_profit']}%

AVAILABLE TOKENS ON BASE:
- ETH (native gas token)
- WETH (wrapped ETH — 0x4200000000000000000000000000000000000006)
- USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- cbBTC (Coinbase wrapped Bitcoin — 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf)

STRATEGY RULES:
- dca (Tier 1): ALWAYS execute a swap of USDC → WETH. No analysis needed. Just buy.
- momentum (Tier 2): Check wallet balances. If WETH balance is growing (we're in profit), buy more. If USDC is growing, we've been selling — hold or buy small.
- mean_reversion (Tier 3): Check balances across WETH, cbBTC, USDC. If heavily weighted in one token, swap some to the underweight token. Diversify.

EXECUTION RULES:
1. ALWAYS check wallet balance first using the available tools
2. Calculate the trade size as {tier_cfg['pct']}% of total portfolio value
3. Execute the swap using the on-chain tools
4. Report what you did clearly: token pair, amount, result
5. If insufficient balance, report it and skip
6. On mainnet, be precise with amounts — this is real money

GO: Execute one {tier_cfg['strategy']} trade now. Check balance, calculate amount, execute swap."""

    agent = create_react_agent(llm, tools=tools, prompt=prompt)
    return agent

# ── EXECUTE TIER ────────────────────────────────────────────
def execute_tier(tier_num, tier_cfg, llm, tools, wallet_address):
    """Run one trading cycle for a specific tier."""
    log(f"{'='*50}", tier=tier_num)
    log(f"TIER {tier_num}: {tier_cfg['name'].upper()} ({tier_cfg['pct']}%) — {tier_cfg['strategy']}", tier=tier_num)

    # Check daily limit
    today = get_trades_today(tier=tier_num)
    if len(today) >= tier_cfg["max_daily"]:
        log(f"Daily limit reached ({tier_cfg['max_daily']}). Skip.", "WARN", tier=tier_num)
        return

    # Create tier-specific agent
    log(f"Creating {tier_cfg['strategy']} agent...", tier=tier_num)
    agent = create_tier_agent(tier_num, tier_cfg, llm, tools, wallet_address)

    # Build the execution prompt
    prompts = {
        "dca": (
            f"Execute a DCA buy: Check my USDC balance, then swap {tier_cfg['pct']}% "
            f"of my total portfolio value from USDC to WETH. "
            f"If I have very little USDC, try wrapping {tier_cfg['pct']}% of my ETH to WETH instead. "
            f"Report the exact amount swapped."
        ),
        "momentum": (
            f"Check my wallet balances (ETH, WETH, USDC, cbBTC). "
            f"Analyze the current allocation. If USDC > 30% of portfolio, swap {tier_cfg['pct']}% into WETH (bullish). "
            f"If WETH > 70%, swap {tier_cfg['pct']}% of WETH back to USDC (take profit). "
            f"Otherwise hold. Execute the swap if needed."
        ),
        "mean_reversion": (
            f"Check my full wallet: ETH, WETH, USDC, cbBTC. "
            f"Target allocation: 40% WETH, 30% cbBTC, 30% USDC. "
            f"Find which token is most overweight vs target. "
            f"Swap {tier_cfg['pct']}% of portfolio from the overweight token to the most underweight. "
            f"Execute the rebalancing swap now."
        ),
    }

    prompt = prompts.get(tier_cfg["strategy"], prompts["dca"])
    log(f"Executing: {prompt[:80]}...", tier=tier_num)

    try:
        result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})
        response = result["messages"][-1].content if result.get("messages") else "No response"

        log(f"Result: {response[:300]}", tier=tier_num)

        save_trade({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tier": tier_num,
            "tier_name": tier_cfg["name"],
            "strategy": tier_cfg["strategy"],
            "pct": tier_cfg["pct"],
            "network": NETWORK_ID,
            "response": response[:1000],
            "live": "mainnet" in NETWORK_ID,
        })

        log(f"Tier {tier_num} complete.", tier=tier_num)

    except Exception as e:
        log(f"Execution error: {e}", "ERROR", tier=tier_num)
        save_trade({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tier": tier_num,
            "tier_name": tier_cfg["name"],
            "strategy": tier_cfg["strategy"],
            "error": str(e),
            "live": False,
        })

# ── STATUS ──────────────────────────────────────────────────
def show_status(llm, tools, wallet_address):
    """Check portfolio via AgentKit."""
    from langgraph.prebuilt import create_react_agent

    agent = create_react_agent(llm, tools=tools, prompt=(
        f"You are a portfolio analyzer. Wallet: {wallet_address}, Network: {NETWORK_ID}. "
        f"Check the complete wallet balance including ETH, WETH, USDC, cbBTC. "
        f"Show each token balance and estimate USD values. Show total portfolio value."
    ))

    log("Checking portfolio...")
    result = agent.invoke({"messages": [{"role": "user", "content":
        "Show my complete portfolio with all token balances, USD values, and allocation percentages."
    }]})
    response = result["messages"][-1].content if result.get("messages") else "No response"
    print(f"\n{response}\n")

    trades = load_trades()
    today = get_trades_today()
    print(f"Total trades all-time: {len(trades)}")
    print(f"Trades today: {len(today)} / {MAX_DAILY}")
    for t in [1, 2, 3]:
        t_today = len(get_trades_today(tier=t))
        cfg = TIERS[t]
        print(f"  Tier {t} ({cfg['name']:12s} {cfg['pct']}%): {t_today}/{cfg['max_daily']} today")

# ── MAIN ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="DevBot AgentKit Multi-Tier Trader")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Run specific tier")
    parser.add_argument("--status", action="store_true", help="Show portfolio")
    parser.add_argument("--once", action="store_true", help="Single cycle")
    parser.add_argument("--testnet", action="store_true", help="Force Base Sepolia")
    args = parser.parse_args()

    global NETWORK_ID
    if args.testnet:
        NETWORK_ID = "base-sepolia"
        log("TESTNET MODE (Base Sepolia)")

    # Validate
    missing = []
    if not CDP_API_KEY_NAME: missing.append("CDP_API_KEY_NAME")
    if not CDP_API_KEY_PRIVATE_KEY: missing.append("CDP_API_KEY_PRIVATE_KEY")
    if not ANTHROPIC_API_KEY: missing.append("ANTHROPIC_API_KEY")
    if missing:
        log(f"FATAL: Missing env vars: {', '.join(missing)}", "ERROR")
        sys.exit(1)

    tiers_to_run = [args.tier] if args.tier else [1, 2, 3]

    print()
    log("=" * 58)
    log("  DEVBOT AGENTKIT MULTI-TIER LIVE TRADER")
    tier_labels = ", ".join(f"T{t}({TIERS[t]['pct']}%)" for t in tiers_to_run)
    log(f"  Tiers: {tier_labels}")
    total_alloc = sum(TIERS[t]["pct"] for t in tiers_to_run)
    log(f"  Total allocation: {total_alloc}% | Reserve: {100-total_alloc}%")
    log(f"  Network: {NETWORK_ID}")
    if "mainnet" in NETWORK_ID:
        log("  *** LIVE MAINNET — REAL MONEY ***")
    else:
        log("  Testnet — paper trading (no real funds at risk)")
    log("=" * 58)
    print()

    # Initialize AgentKit (shared across all tiers)
    llm, tools, wallet, agentkit = create_agentkit()
    wallet_address = wallet.get_address()

    if args.status:
        show_status(llm, tools, wallet_address)
        return

    cycle = 0
    while True:
        try:
            cycle += 1
            log(f"\n{'#'*58}")
            log(f"### CYCLE {cycle} — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ###")
            log(f"{'#'*58}")

            # Check global daily limit
            if len(get_trades_today()) >= MAX_DAILY:
                log(f"Global daily limit ({MAX_DAILY}). Sleeping.", "WARN")
            else:
                for t in tiers_to_run:
                    try:
                        execute_tier(t, TIERS[t], llm, tools, wallet_address)
                    except Exception as e:
                        log(f"Tier {t} failed: {e}", "ERROR", tier=t)
                    # Small delay between tiers to avoid rate limits
                    if t != tiers_to_run[-1]:
                        time.sleep(5)

            if args.once:
                log("Single cycle complete.")
                break

            log(f"\nNext cycle in {CYCLE_INTERVAL // 60} minutes...")
            time.sleep(CYCLE_INTERVAL)

        except KeyboardInterrupt:
            log("\nStopped. Goodbye!")
            break
        except Exception as e:
            import traceback
            log(f"Cycle error: {e}", "ERROR")
            log(traceback.format_exc(), "ERROR")
            time.sleep(60)

if __name__ == "__main__":
    main()

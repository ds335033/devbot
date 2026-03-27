#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, os
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

"""
DevBot AI Trading Bot — Coinbase AgentKit + Claude AI
=====================================================
Autonomous crypto trading with AI-powered decisions.

Strategies:
  - momentum:       Buy when price is trending up, sell when reversing
  - dca:            Dollar-cost average at regular intervals
  - mean_reversion: Buy dips, sell rallies based on moving averages
  - grid:           Place buy/sell orders at price grid levels
  - rebalance:      Maintain target portfolio allocation

Usage:
  python bot.py                  # Interactive mode with Claude AI
  python bot.py --strategy dca   # Run specific strategy
  python bot.py --status         # Check wallet & portfolio
  python bot.py --testnet        # Force testnet mode
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

# Load environment
load_dotenv(override=True)

# ─── Configuration ────────────────────────────────────────────────────────────

CDP_API_KEY_NAME = os.getenv("CDP_API_KEY_NAME", "")
CDP_API_KEY_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
NETWORK_ID = os.getenv("NETWORK_ID", "base-sepolia")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
TRADE_AMOUNT = float(os.getenv("TRADE_AMOUNT_USD", "25"))
MAX_DAILY_TRADES = int(os.getenv("MAX_DAILY_TRADES", "10"))
STOP_LOSS_PCT = float(os.getenv("STOP_LOSS_PERCENT", "5"))
TAKE_PROFIT_PCT = float(os.getenv("TAKE_PROFIT_PERCENT", "10"))
DCA_INTERVAL = float(os.getenv("DCA_INTERVAL_HOURS", "4"))
STRATEGY = os.getenv("STRATEGY", "momentum")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
TRADES_FILE = DATA_DIR / "trades.json"
PORTFOLIO_FILE = DATA_DIR / "portfolio.json"
LOG_FILE = DATA_DIR / "bot.log"

# ─── Logging ──────────────────────────────────────────────────────────────────

def log(msg, level="INFO"):
    """Log to file and console."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def load_json(path, default=None):
    if default is None:
        default = []
    if path.exists():
        return json.loads(path.read_text())
    return default


def save_json(path, data):
    path.write_text(json.dumps(data, indent=2, default=str))


# ─── Validate Keys ───────────────────────────────────────────────────────────

def check_keys():
    """Verify all required API keys are set."""
    missing = []
    if not CDP_API_KEY_NAME:
        missing.append("CDP_API_KEY_NAME")
    if not CDP_API_KEY_PRIVATE_KEY:
        missing.append("CDP_API_KEY_PRIVATE_KEY")
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")

    if missing:
        print("\n❌ Missing required API keys:")
        for k in missing:
            print(f"   → {k}")
        print(f"\n📋 Copy .env.example to .env and fill in your keys:")
        print(f"   cp .env.example .env")
        print(f"\n🔑 Get CDP keys at: https://portal.cdp.coinbase.com")
        print(f"🔑 Get Claude key at: https://console.anthropic.com\n")
        return False
    return True


# ─── Coinbase AgentKit Setup ─────────────────────────────────────────────────

def create_agent():
    """Initialize AgentKit with CDP wallet and Claude AI."""
    log("Initializing Coinbase AgentKit...")

    try:
        from coinbase_agentkit import (
            AgentKit,
            AgentKitConfig,
            CdpEvmWalletProvider,
            CdpEvmWalletProviderConfig,
            cdp_api_action_provider,
            cdp_evm_wallet_action_provider,
            erc20_action_provider,
            wallet_action_provider,
            weth_action_provider,
        )
        from coinbase_agentkit_langchain import get_langchain_tools
        from langchain_anthropic import ChatAnthropic
        from langgraph.prebuilt import create_react_agent

        # Configure CDP wallet
        wallet_config = CdpEvmWalletProviderConfig(
            api_key_name=CDP_API_KEY_NAME,
            api_key_private_key=CDP_API_KEY_PRIVATE_KEY,
            network_id=NETWORK_ID,
        )
        wallet_provider = CdpEvmWalletProvider(wallet_config)

        log(f"Wallet address: {wallet_provider.get_address()}")
        log(f"Network: {NETWORK_ID}")

        # Configure AgentKit with action providers
        agentkit = AgentKit(AgentKitConfig(
            wallet_provider=wallet_provider,
            action_providers=[
                cdp_api_action_provider(),
                cdp_evm_wallet_action_provider(),
                erc20_action_provider(),
                wallet_action_provider(),
                weth_action_provider(),
            ],
        ))

        # Get LangChain tools from AgentKit
        tools = get_langchain_tools(agentkit)

        # Initialize Claude as the AI brain
        llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            api_key=ANTHROPIC_API_KEY,
            max_tokens=4096,
        )

        # Create the trading agent
        trading_prompt = f"""You are DevBot Trading Agent — an autonomous crypto trading AI.

WALLET: {wallet_provider.get_address()}
NETWORK: {NETWORK_ID}
TRADE SIZE: ${TRADE_AMOUNT} USD per trade
STRATEGY: {STRATEGY}
MAX DAILY TRADES: {MAX_DAILY_TRADES}
STOP LOSS: {STOP_LOSS_PCT}%
TAKE PROFIT: {TAKE_PROFIT_PCT}%

RULES:
1. Always check wallet balance before trading
2. Never trade more than ${TRADE_AMOUNT} per trade
3. Always confirm the trade pair and amount before executing
4. Log every trade with timestamp, pair, amount, price
5. If on testnet (base-sepolia), mention this clearly
6. If on mainnet (base-mainnet), be extra cautious — this is REAL MONEY
7. Follow the {STRATEGY} strategy guidelines
8. Respect stop-loss and take-profit levels

STRATEGY GUIDELINES:
- momentum: Buy when 4h candle closes green with volume > avg. Sell on red reversal.
- dca: Buy fixed ${TRADE_AMOUNT} worth of ETH/BTC every {DCA_INTERVAL} hours.
- mean_reversion: Buy when price is >2% below 20-period SMA. Sell when >2% above.
- grid: Set buy orders at 2% intervals below current price, sell at 2% above.
- rebalance: Maintain 50% ETH, 30% BTC, 20% USDC. Rebalance when >5% drift.

You have access to onchain tools. Use them to check balances, execute swaps, and manage the portfolio.
Always explain your reasoning before executing trades."""

        agent = create_react_agent(
            llm,
            tools=tools,
            prompt=trading_prompt,
        )

        log("✅ Trading agent initialized successfully!")
        return agent, wallet_provider, agentkit

    except ImportError as e:
        log(f"❌ Missing dependency: {e}", "ERROR")
        log("Run: pip install -r requirements.txt", "ERROR")
        sys.exit(1)
    except Exception as e:
        log(f"❌ Failed to initialize agent: {e}", "ERROR")
        sys.exit(1)


# ─── Trading Strategies ──────────────────────────────────────────────────────

def run_strategy(agent, strategy):
    """Execute a trading strategy via the AI agent."""
    prompts = {
        "momentum": (
            f"Check the current ETH/USDC price and my wallet balance. "
            f"Based on recent price momentum, should I buy ${TRADE_AMOUNT} of ETH right now? "
            f"If the trend is bullish, execute the swap. If bearish, hold and explain why."
        ),
        "dca": (
            f"Execute a DCA buy: swap exactly ${TRADE_AMOUNT} USDC for ETH. "
            f"This is a scheduled dollar-cost-average purchase. Check balance first, then execute."
        ),
        "mean_reversion": (
            f"Check ETH/USDC price. If it's significantly below recent average, "
            f"buy ${TRADE_AMOUNT} worth. If it's above average, consider selling. "
            f"Show your analysis before acting."
        ),
        "grid": (
            f"Check current ETH/USDC price and my positions. "
            f"Set up grid levels: if price is near a buy level, buy ${TRADE_AMOUNT}. "
            f"If near a sell level, sell equivalent. Show the grid."
        ),
        "rebalance": (
            f"Check my full portfolio balance (ETH, BTC/WBTC, USDC). "
            f"Target allocation: 50% ETH, 30% BTC, 20% USDC. "
            f"If any asset drifts >5% from target, rebalance with swaps up to ${TRADE_AMOUNT}."
        ),
    }

    prompt = prompts.get(strategy, prompts["momentum"])
    log(f"Running strategy: {strategy}")
    log(f"Prompt: {prompt[:100]}...")

    try:
        result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})

        # Extract response
        response = result["messages"][-1].content if result.get("messages") else "No response"
        log(f"Agent response: {response[:200]}...")

        # Record trade
        trade_record = {
            "timestamp": datetime.now().isoformat(),
            "strategy": strategy,
            "amount_usd": TRADE_AMOUNT,
            "network": NETWORK_ID,
            "response": response[:500],
        }
        trades = load_json(TRADES_FILE)
        trades.append(trade_record)
        save_json(TRADES_FILE, trades)

        return response

    except Exception as e:
        log(f"❌ Strategy execution failed: {e}", "ERROR")
        return f"Error: {e}"


# ─── Interactive Chat Mode ────────────────────────────────────────────────────

def interactive_mode(agent):
    """Run the bot in interactive chat mode with Claude AI."""
    global STRATEGY
    print("\n" + "=" * 60)
    print("  🤖 DevBot Trading Agent — Interactive Mode")
    print(f"  📊 Strategy: {STRATEGY} | 💰 Trade Size: ${TRADE_AMOUNT}")
    print(f"  🌐 Network: {NETWORK_ID}")
    print("=" * 60)
    print("\nCommands:")
    print("  /trade     — Execute current strategy")
    print("  /balance   — Check wallet balance")
    print("  /portfolio — Show portfolio breakdown")
    print("  /history   — Show trade history")
    print("  /switch <strategy> — Change strategy")
    print("  /quit      — Exit\n")

    while True:
        try:
            user_input = input("You > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Shutting down trading bot...")
            break

        if not user_input:
            continue

        if user_input == "/quit":
            print("👋 Shutting down trading bot...")
            break
        elif user_input == "/trade":
            print(f"\n⏳ Executing {STRATEGY} strategy...")
            result = run_strategy(agent, STRATEGY)
            print(f"\n📊 Result:\n{result}\n")
        elif user_input == "/balance":
            result = agent.invoke({"messages": [{"role": "user", "content": "Check my full wallet balance on all tokens. Show ETH, USDC, WBTC, and any other tokens."}]})
            print(f"\n{result['messages'][-1].content}\n")
        elif user_input == "/portfolio":
            result = agent.invoke({"messages": [{"role": "user", "content": "Show my complete portfolio with USD values, allocation percentages, and total value."}]})
            print(f"\n{result['messages'][-1].content}\n")
        elif user_input == "/history":
            trades = load_json(TRADES_FILE)
            if not trades:
                print("\n📭 No trades yet.\n")
            else:
                print(f"\n📈 Trade History ({len(trades)} trades):")
                for t in trades[-10:]:
                    print(f"  [{t['timestamp'][:16]}] {t['strategy']} — ${t['amount_usd']}")
                print()
        elif user_input.startswith("/switch"):
            parts = user_input.split()
            if len(parts) > 1:
                new_strat = parts[1]
                valid = ["momentum", "dca", "mean_reversion", "grid", "rebalance"]
                if new_strat in valid:
                    STRATEGY = new_strat
                    print(f"✅ Switched to {new_strat} strategy.\n")
                else:
                    print(f"❌ Invalid strategy. Choose: {', '.join(valid)}\n")
        else:
            # Free-form chat with the trading agent
            result = agent.invoke({"messages": [{"role": "user", "content": user_input}]})
            print(f"\n🤖 {result['messages'][-1].content}\n")


# ─── Scheduled DCA Mode ──────────────────────────────────────────────────────

def scheduled_dca(agent):
    """Run DCA strategy on a schedule."""
    log(f"Starting scheduled DCA — ${TRADE_AMOUNT} every {DCA_INTERVAL}h")

    while True:
        try:
            result = run_strategy(agent, "dca")
            log(f"DCA executed. Next run in {DCA_INTERVAL}h")
            print(f"\n📊 DCA Result:\n{result}\n")
            time.sleep(DCA_INTERVAL * 3600)
        except KeyboardInterrupt:
            log("DCA schedule stopped by user.")
            break
        except Exception as e:
            log(f"DCA error: {e}", "ERROR")
            time.sleep(300)  # Retry in 5 min


# ─── Status Check (No Trading) ───────────────────────────────────────────────

def show_status():
    """Show wallet status and recent trades without executing anything."""
    print("\n" + "=" * 60)
    print("  📊 DevBot Trading Bot — Status")
    print("=" * 60)
    print(f"\n  Network:    {NETWORK_ID}")
    print(f"  Strategy:   {STRATEGY}")
    print(f"  Trade Size: ${TRADE_AMOUNT}")
    print(f"  Max Daily:  {MAX_DAILY_TRADES}")
    print(f"  Stop Loss:  {STOP_LOSS_PCT}%")
    print(f"  Take Profit:{TAKE_PROFIT_PCT}%")

    trades = load_json(TRADES_FILE)
    print(f"\n  Total Trades: {len(trades)}")

    if trades:
        today = datetime.now().date().isoformat()
        today_trades = [t for t in trades if t["timestamp"][:10] == today]
        print(f"  Today's Trades: {len(today_trades)}")
        total_volume = sum(t.get("amount_usd", 0) for t in trades)
        print(f"  Total Volume: ${total_volume:,.2f}")

    print(f"\n  🔑 CDP Key: {'✅ Set' if CDP_API_KEY_NAME else '❌ Missing'}")
    print(f"  🔑 Claude:  {'✅ Set' if ANTHROPIC_API_KEY else '❌ Missing'}")
    print()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="DevBot AI Trading Bot")
    parser.add_argument("--strategy", choices=["momentum", "dca", "mean_reversion", "grid", "rebalance"], help="Trading strategy")
    parser.add_argument("--status", action="store_true", help="Show status only")
    parser.add_argument("--testnet", action="store_true", help="Force testnet mode")
    parser.add_argument("--dca-loop", action="store_true", help="Run DCA on schedule")
    parser.add_argument("--trade-once", action="store_true", help="Execute one trade and exit")
    args = parser.parse_args()

    print("")
    print("  ======================================")
    print("    DevBot AI Trading Bot v1.0")
    print("    Powered by Coinbase AgentKit")
    print("    + Claude AI")
    print("  ======================================")
    print("")

    if args.status:
        show_status()
        return

    if args.testnet:
        global NETWORK_ID
        NETWORK_ID = "base-sepolia"
        log("⚠️  Forced TESTNET mode (base-sepolia)")

    if args.strategy:
        global STRATEGY
        STRATEGY = args.strategy

    if not check_keys():
        return

    # Initialize the trading agent
    agent, wallet, agentkit = create_agent()

    if args.trade_once:
        result = run_strategy(agent, STRATEGY)
        print(f"\n📊 Result:\n{result}")
    elif args.dca_loop:
        scheduled_dca(agent)
    else:
        interactive_mode(agent)


if __name__ == "__main__":
    main()

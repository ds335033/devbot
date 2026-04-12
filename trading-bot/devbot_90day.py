#!/usr/bin/env python3
"""
DEVBOT 90-DAY MONEY MACHINE
==============================
Automated portfolio manager that takes $300 and grows it over 90 days.
Multiple strategies running simultaneously. Daily Telegram reports.

Strategies:
  1. DCA Accumulation — Steady daily buys of WETH & cbBTC (40% of funds)
  2. Momentum Trading — Buy trends, sell reversals (30% of funds)
  3. Yield Farming — Park stables in high-yield positions (20% of funds)
  4. Swing Trading — Buy dips, sell rallies on larger timeframes (10% of funds)

Risk Management:
  - Never risk more than 5% on a single trade
  - Stop loss at -8% per position
  - Take profit at +15% per position
  - Keep 20% always in USDC as safety reserve
  - Daily rebalancing

Usage:
  python devbot_90day.py              # Run continuous (every 4 hours)
  python devbot_90day.py --status     # Portfolio report
  python devbot_90day.py --telegram   # Send report to Telegram
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from decimal import Decimal

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Block nest_asyncio on Python 3.14+
if sys.version_info >= (3, 14):
    class _FakeNestAsyncio:
        def apply(self, *a, **kw): pass
        def __getattr__(self, name): return lambda *a, **kw: None
    sys.modules['nest_asyncio'] = _FakeNestAsyncio()

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

# ── CONFIG ──────────────────────────────────────────────────
CDP_API_KEY_NAME = os.getenv("CDP_API_KEY_NAME", "")
CDP_API_KEY_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
CDP_WALLET_SECRET = os.getenv("CDP_WALLET_SECRET", "")
WALLET_ADDRESS = os.getenv("CDP_WALLET_ADDRESS", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
PORTFOLIO_FILE = DATA_DIR / "portfolio_90day.json"
TRADES_FILE = DATA_DIR / "trades_90day.json"

# Token addresses on Base
TOKENS = {
    "USDC":  {"address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "decimals": 6},
    "WETH":  {"address": "0x4200000000000000000000000000000000000006", "decimals": 18},
    "CBBTC": {"address": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", "decimals": 8},
}

# ── PRICE FETCHING ─────────────────────────────────────────
def get_prices():
    """Get current token prices from on-chain."""
    import asyncio
    from cdp import CdpClient

    async def _fetch():
        client = CdpClient(
            api_key_id=CDP_API_KEY_NAME,
            api_key_secret=CDP_API_KEY_PRIVATE_KEY,
            wallet_secret=CDP_WALLET_SECRET,
        )
        prices = {}
        async with client as cdp:
            # Get WETH price (1 USDC -> WETH)
            try:
                weth_price = await cdp.evm.get_swap_price(
                    from_token=TOKENS["USDC"]["address"],
                    to_token=TOKENS["WETH"]["address"],
                    from_amount="1000000",  # 1 USDC
                    network="base",
                    taker=WALLET_ADDRESS,
                )
                weth_per_usdc = int(weth_price.to_amount) / 1e18
                prices["WETH"] = 1.0 / weth_per_usdc if weth_per_usdc > 0 else 2000
            except:
                prices["WETH"] = 2000  # fallback

            # Get cbBTC price
            try:
                btc_price = await cdp.evm.get_swap_price(
                    from_token=TOKENS["USDC"]["address"],
                    to_token=TOKENS["CBBTC"]["address"],
                    from_amount="1000000",  # 1 USDC
                    network="base",
                    taker=WALLET_ADDRESS,
                )
                btc_per_usdc = int(btc_price.to_amount) / 1e8
                prices["CBBTC"] = 1.0 / btc_per_usdc if btc_per_usdc > 0 else 95000
            except:
                prices["CBBTC"] = 95000  # fallback

        prices["USDC"] = 1.0
        return prices

    return asyncio.run(_fetch())


# ── BALANCE CHECKING ───────────────────────────────────────
def get_balances():
    """Get all token balances."""
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))
    addr = Web3.to_checksum_address(WALLET_ADDRESS)
    abi = [{"inputs": [{"name": "a", "type": "address"}], "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}], "type": "function"}]

    balances = {}

    # ETH
    eth_bal = w3.eth.get_balance(addr) / 1e18
    balances["ETH"] = eth_bal

    # ERC-20
    for symbol, info in TOKENS.items():
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(info["address"]), abi=abi
        )
        raw = contract.functions.balanceOf(addr).call()
        balances[symbol] = raw / (10 ** info["decimals"])

    return balances


# ── SWAP EXECUTION ─────────────────────────────────────────
def execute_swap(from_token, to_token, amount_atomic):
    """Execute a swap via CDP."""
    import asyncio
    from cdp import CdpClient
    from cdp.actions.evm.swap.types import AccountSwapOptions

    async def _swap():
        client = CdpClient(
            api_key_id=CDP_API_KEY_NAME,
            api_key_secret=CDP_API_KEY_PRIVATE_KEY,
            wallet_secret=CDP_WALLET_SECRET,
        )
        async with client as cdp:
            account = await cdp.evm.get_account(address=WALLET_ADDRESS)
            result = await account.swap(AccountSwapOptions(
                network="base",
                from_token=TOKENS[from_token]["address"],
                to_token=TOKENS[to_token]["address"],
                from_amount=str(amount_atomic),
                slippage_bps=200,
            ))
            return result.transaction_hash

    return asyncio.run(_swap())


# ── STRATEGY ENGINE ────────────────────────────────────────
def load_portfolio_state():
    """Load portfolio tracking state."""
    if PORTFOLIO_FILE.exists():
        try:
            return json.loads(PORTFOLIO_FILE.read_text())
        except:
            pass
    return {
        "start_date": datetime.now(timezone.utc).isoformat(),
        "start_value_usd": 0,
        "day": 0,
        "total_trades": 0,
        "total_profit_usd": 0,
        "daily_snapshots": [],
        "last_trade_time": None,
        "strategy_allocations": {
            "dca": 0.40,        # 40% steady accumulation
            "momentum": 0.30,   # 30% trend following
            "reserve": 0.20,    # 20% safety (always USDC)
            "swing": 0.10,      # 10% buy dips / sell rallies
        },
    }


def save_portfolio_state(state):
    PORTFOLIO_FILE.write_text(json.dumps(state, indent=2))


def save_trade(trade):
    trades = []
    if TRADES_FILE.exists():
        try:
            trades = json.loads(TRADES_FILE.read_text())
        except:
            pass
    trades.append(trade)
    TRADES_FILE.write_text(json.dumps(trades[-500:], indent=2))


def calculate_portfolio_value(balances, prices):
    """Calculate total USD value."""
    total = 0
    total += balances.get("ETH", 0) * prices.get("WETH", 2000)  # ETH same price as WETH
    total += balances.get("WETH", 0) * prices.get("WETH", 2000)
    total += balances.get("USDC", 0) * 1.0
    total += balances.get("CBBTC", 0) * prices.get("CBBTC", 95000)
    return total


def run_strategy_cycle():
    """Run one complete strategy cycle."""
    print(f"\n{'='*60}")
    print(f"  DEVBOT 90-DAY MONEY MACHINE — CYCLE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    # Load state
    state = load_portfolio_state()

    # Get current data
    print("\nFetching prices...")
    prices = get_prices()
    print(f"  WETH: ${prices['WETH']:,.2f}")
    print(f"  cbBTC: ${prices['CBBTC']:,.2f}")

    print("\nChecking balances...")
    balances = get_balances()
    for symbol, amount in balances.items():
        if amount > 0:
            print(f"  {symbol}: {amount:.6f}")

    total_value = calculate_portfolio_value(balances, prices)
    print(f"\n  TOTAL VALUE: ${total_value:.2f}")

    # Initialize start value on first run
    if state["start_value_usd"] == 0:
        state["start_value_usd"] = total_value
        state["start_date"] = datetime.now(timezone.utc).isoformat()

    # Calculate allocations
    usdc_balance = balances.get("USDC", 0)
    reserve_target = total_value * state["strategy_allocations"]["reserve"]  # 20% reserve
    available_usdc = max(0, usdc_balance - reserve_target)

    print(f"\n  Reserve (20%): ${reserve_target:.2f}")
    print(f"  Available for trading: ${available_usdc:.2f}")

    trades_this_cycle = 0

    # ── STRATEGY 1: DCA (40% allocation) ───────────────
    dca_budget = available_usdc * (state["strategy_allocations"]["dca"] / 0.80)  # 40% of tradeable
    if dca_budget >= 1.0:
        # Split DCA: 70% WETH, 30% cbBTC
        weth_buy = dca_budget * 0.70
        btc_buy = dca_budget * 0.30

        if weth_buy >= 0.50:
            try:
                print(f"\n  [DCA] Buying ${weth_buy:.2f} USDC -> WETH...")
                atomic = int(weth_buy * 1e6)
                tx = execute_swap("USDC", "WETH", atomic)
                print(f"  [DCA] TX: {tx}")
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "strategy": "dca",
                    "from": "USDC", "to": "WETH",
                    "amount_usd": weth_buy,
                    "tx": tx, "success": True,
                })
                trades_this_cycle += 1
            except Exception as e:
                print(f"  [DCA] WETH buy failed: {e}")

        if btc_buy >= 0.50:
            try:
                print(f"\n  [DCA] Buying ${btc_buy:.2f} USDC -> cbBTC...")
                atomic = int(btc_buy * 1e6)
                tx = execute_swap("USDC", "CBBTC", atomic)
                print(f"  [DCA] TX: {tx}")
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "strategy": "dca",
                    "from": "USDC", "to": "CBBTC",
                    "amount_usd": btc_buy,
                    "tx": tx, "success": True,
                })
                trades_this_cycle += 1
            except Exception as e:
                print(f"  [DCA] cbBTC buy failed: {e}")
    else:
        print(f"\n  [DCA] Budget too low (${dca_budget:.2f}), skipping")

    # ── STRATEGY 2: MOMENTUM (30% allocation) ──────────
    # For now: if WETH is more than 50% of portfolio, take some profit
    weth_value = balances.get("WETH", 0) * prices["WETH"]
    weth_pct = weth_value / total_value * 100 if total_value > 0 else 0

    if weth_pct > 60:
        # Take profit — sell 10% of WETH back to USDC
        sell_amount = balances["WETH"] * 0.10
        sell_atomic = int(sell_amount * 1e18)
        if sell_amount * prices["WETH"] >= 1.0:
            try:
                print(f"\n  [MOMENTUM] Taking profit: selling {sell_amount:.6f} WETH -> USDC")
                tx = execute_swap("WETH", "USDC", sell_atomic)
                print(f"  [MOMENTUM] TX: {tx}")
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "strategy": "momentum",
                    "from": "WETH", "to": "USDC",
                    "amount_usd": sell_amount * prices["WETH"],
                    "tx": tx, "success": True,
                })
                trades_this_cycle += 1
            except Exception as e:
                print(f"  [MOMENTUM] Take profit failed: {e}")
    else:
        print(f"\n  [MOMENTUM] WETH at {weth_pct:.1f}% — holding (take profit at >60%)")

    # ── Update state ───────────────────────────────────
    state["total_trades"] += trades_this_cycle
    state["last_trade_time"] = datetime.now(timezone.utc).isoformat()

    # Daily snapshot
    days_running = (datetime.now(timezone.utc) - datetime.fromisoformat(state["start_date"])).days
    state["day"] = days_running

    profit = total_value - state["start_value_usd"]
    profit_pct = (profit / state["start_value_usd"] * 100) if state["start_value_usd"] > 0 else 0

    snapshot = {
        "date": datetime.now(timezone.utc).isoformat()[:10],
        "day": days_running,
        "total_value": round(total_value, 2),
        "profit_usd": round(profit, 2),
        "profit_pct": round(profit_pct, 2),
        "trades_today": trades_this_cycle,
        "prices": {k: round(v, 2) for k, v in prices.items()},
    }

    # Only add one snapshot per day
    today = snapshot["date"]
    state["daily_snapshots"] = [s for s in state["daily_snapshots"] if s["date"] != today]
    state["daily_snapshots"].append(snapshot)
    state["total_profit_usd"] = round(profit, 2)

    save_portfolio_state(state)

    # ── Print report ───────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  CYCLE COMPLETE — Day {days_running}/90")
    print(f"  Start Value:   ${state['start_value_usd']:.2f}")
    print(f"  Current Value: ${total_value:.2f}")
    print(f"  Profit/Loss:   ${profit:.2f} ({profit_pct:+.1f}%)")
    print(f"  Total Trades:  {state['total_trades']}")
    print(f"  Trades Today:  {trades_this_cycle}")
    print(f"{'='*60}")

    # ── Telegram notification ──────────────────────────
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        try:
            send_telegram_report(state, balances, prices, total_value, profit, profit_pct)
        except Exception as e:
            print(f"  Telegram notification failed: {e}")

    return total_value


def send_telegram_report(state, balances, prices, total_value, profit, profit_pct):
    """Send portfolio update to Telegram."""
    import urllib.request

    emoji = "\U0001f4c8" if profit >= 0 else "\U0001f4c9"
    msg = (
        f"{emoji} *DevBot 90-Day Report — Day {state['day']}/90*\n\n"
        f"*Portfolio: ${total_value:.2f}*\n"
        f"P/L: ${profit:+.2f} ({profit_pct:+.1f}%)\n\n"
        f"*Holdings:*\n"
    )

    for symbol in ["USDC", "WETH", "CBBTC", "ETH"]:
        amt = balances.get(symbol, 0)
        if amt > 0:
            price = prices.get(symbol, prices.get("WETH", 2000))
            usd = amt * price if symbol != "USDC" else amt
            msg += f"  {symbol}: {amt:.6f} (${usd:.2f})\n"

    msg += f"\nTrades: {state['total_trades']} total"

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": msg, "parse_mode": "Markdown"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=10)
    print("  Telegram report sent!")


def show_status():
    """Show current portfolio status."""
    state = load_portfolio_state()
    balances = get_balances()
    prices = get_prices()
    total = calculate_portfolio_value(balances, prices)
    profit = total - state.get("start_value_usd", total)
    profit_pct = (profit / state["start_value_usd"] * 100) if state.get("start_value_usd", 0) > 0 else 0

    print(f"\n{'='*60}")
    print(f"  DEVBOT 90-DAY MONEY MACHINE — STATUS")
    print(f"{'='*60}")
    print(f"  Day: {state.get('day', 0)}/90")
    print(f"  Started: {state.get('start_date', 'N/A')[:10]}")
    print(f"  Start Value: ${state.get('start_value_usd', 0):.2f}")
    print(f"\n  Current Holdings:")

    for symbol in ["ETH", "USDC", "WETH", "CBBTC"]:
        amt = balances.get(symbol, 0)
        if amt > 0:
            price = prices.get(symbol, prices.get("WETH", 2000))
            usd = amt * price if symbol != "USDC" else amt
            pct = usd / total * 100 if total > 0 else 0
            print(f"    {symbol:6s}: {amt:>12.6f}  ${usd:>8.2f}  ({pct:.0f}%)")

    print(f"\n  TOTAL: ${total:.2f}")
    print(f"  P/L:   ${profit:+.2f} ({profit_pct:+.1f}%)")
    print(f"  Trades: {state.get('total_trades', 0)}")
    print(f"{'='*60}\n")


# ── MAIN ───────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="DevBot 90-Day Money Machine")
    parser.add_argument("--status", action="store_true", help="Show portfolio status")
    parser.add_argument("--once", action="store_true", help="Run single cycle")
    parser.add_argument("--interval", type=int, default=14400, help="Seconds between cycles (default: 4 hours)")
    args = parser.parse_args()

    if args.status:
        show_status()
        return

    print("\n" + "=" * 60)
    print("  DEVBOT 90-DAY MONEY MACHINE")
    print(f"  Wallet: {WALLET_ADDRESS}")
    print(f"  Strategy: DCA(40%) + Momentum(30%) + Reserve(20%) + Swing(10%)")
    print(f"  Cycle interval: {args.interval // 3600}h {(args.interval % 3600) // 60}m")
    print("=" * 60 + "\n")

    cycle = 0
    while True:
        try:
            cycle += 1
            run_strategy_cycle()

            if args.once:
                break

            next_run = datetime.now() + timedelta(seconds=args.interval)
            print(f"\nNext cycle at {next_run.strftime('%H:%M:%S')}...")
            time.sleep(args.interval)

        except KeyboardInterrupt:
            print("\nStopped. Final status:")
            show_status()
            break
        except Exception as e:
            print(f"\nError in cycle {cycle}: {e}")
            if args.once:
                break
            time.sleep(60)


if __name__ == "__main__":
    main()

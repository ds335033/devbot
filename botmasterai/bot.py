#!/usr/bin/env python3
"""
BOTMASTERAI — Telegram Trading Bot
====================================
Users interact via Telegram to trade crypto on Base network.
Powered by Coinbase AgentKit + Claude AI.

Commands:
  /start        — Welcome & setup
  /portfolio    — Show all balances & USD values
  /buy <amount> <token>   — Buy token (e.g. /buy 5 WETH)
  /sell <amount> <token>  — Sell token back to USDC
  /price <token>          — Get current price
  /trade                  — Let AI decide & execute a trade
  /history                — Recent trade history
  /help                   — Show all commands
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from decimal import Decimal

# Fix encoding
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

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    ContextTypes, MessageHandler, filters,
)

# ── CONFIG ──────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CDP_API_KEY_NAME = os.getenv("CDP_API_KEY_NAME", "")
CDP_API_KEY_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
CDP_WALLET_SECRET = os.getenv("CDP_WALLET_SECRET", "")
NETWORK_ID = os.getenv("NETWORK_ID", "base-mainnet")
WALLET_ADDRESS = os.getenv("CDP_WALLET_ADDRESS", "")
ADMIN_CHAT_IDS = os.getenv("ADMIN_CHAT_IDS", "").split(",")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
TRADES_FILE = DATA_DIR / "botmaster_trades.json"

# Token addresses on Base
TOKENS = {
    "ETH":   {"address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "decimals": 18, "native": True},
    "WETH":  {"address": "0x4200000000000000000000000000000000000006", "decimals": 18},
    "USDC":  {"address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "decimals": 6},
    "CBBTC": {"address": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", "decimals": 8},
}

PRICE_ESTIMATES = {"ETH": 1900, "WETH": 1900, "CBBTC": 95000, "USDC": 1}

logging.basicConfig(
    format="%(asctime)s [BotMasterAI] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── TRADE PERSISTENCE ──────────────────────────────────────
def load_trades():
    if TRADES_FILE.exists():
        try: return json.loads(TRADES_FILE.read_text())
        except: pass
    return []

def save_trade(trade):
    trades = load_trades()
    trades.append(trade)
    TRADES_FILE.write_text(json.dumps(trades[-100:], indent=2))  # Keep last 100

# ── CDP CLIENT ─────────────────────────────────────────────
async def get_cdp_client():
    from cdp import CdpClient
    return CdpClient(
        api_key_id=CDP_API_KEY_NAME,
        api_key_secret=CDP_API_KEY_PRIVATE_KEY,
        wallet_secret=CDP_WALLET_SECRET,
    )

# ── PORTFOLIO ──────────────────────────────────────────────
async def get_portfolio():
    """Get all token balances."""
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))
    addr = Web3.to_checksum_address(WALLET_ADDRESS)
    abi = [{"inputs":[{"name":"a","type":"address"}],"name":"balanceOf",
            "outputs":[{"name":"","type":"uint256"}],"type":"function"}]

    balances = {}

    # Native ETH
    eth_bal = w3.eth.get_balance(addr) / 1e18
    balances["ETH"] = {"amount": eth_bal, "usd": eth_bal * PRICE_ESTIMATES["ETH"]}

    # ERC-20 tokens
    for symbol, info in TOKENS.items():
        if info.get("native"):
            continue
        try:
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(info["address"]), abi=abi
            )
            raw = contract.functions.balanceOf(addr).call()
            amount = raw / (10 ** info["decimals"])
            usd = amount * PRICE_ESTIMATES.get(symbol, 0)
            balances[symbol] = {"amount": amount, "usd": usd}
        except Exception as e:
            balances[symbol] = {"amount": 0, "usd": 0, "error": str(e)}

    return balances

# ── SWAP EXECUTION ─────────────────────────────────────────
async def execute_swap(from_token, to_token, amount_usd):
    """Execute a swap via CDP SDK."""
    from cdp.actions.evm.swap.types import AccountSwapOptions

    from_info = TOKENS.get(from_token.upper())
    to_info = TOKENS.get(to_token.upper())

    if not from_info or not to_info:
        return {"success": False, "error": f"Unknown token: {from_token} or {to_token}"}

    # Convert USD amount to atomic units
    decimals = from_info["decimals"]
    if from_token.upper() == "USDC":
        atomic_amount = str(int(amount_usd * (10 ** decimals)))
    else:
        price = PRICE_ESTIMATES.get(from_token.upper(), 1900)
        token_amount = amount_usd / price
        atomic_amount = str(int(token_amount * (10 ** decimals)))

    client = await get_cdp_client()
    try:
        async with client as cdp:
            account = await cdp.evm.get_account(address=WALLET_ADDRESS)
            result = await account.swap(AccountSwapOptions(
                network="base",
                from_token=from_info["address"],
                to_token=to_info["address"],
                from_amount=atomic_amount,
                slippage_bps=200,
            ))

            tx_hash = result.transaction_hash if hasattr(result, "transaction_hash") else str(result)

            trade = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "from_token": from_token.upper(),
                "to_token": to_token.upper(),
                "amount_usd": amount_usd,
                "atomic_amount": atomic_amount,
                "tx_hash": tx_hash,
                "success": True,
            }
            save_trade(trade)

            return {
                "success": True,
                "tx_hash": tx_hash,
                "from_token": from_token.upper(),
                "to_token": to_token.upper(),
                "amount_usd": amount_usd,
                "url": f"https://basescan.org/tx/{tx_hash}",
            }
    except Exception as e:
        trade = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "from_token": from_token.upper(),
            "to_token": to_token.upper(),
            "amount_usd": amount_usd,
            "error": str(e),
            "success": False,
        }
        save_trade(trade)
        return {"success": False, "error": str(e)}

# ── TELEGRAM HANDLERS ──────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Welcome message."""
    welcome = (
        "\U0001f916 *Welcome to BotMasterAI!*\n\n"
        "I'm your AI-powered crypto trading bot on Base network.\n\n"
        "\U0001f4b0 *Quick Commands:*\n"
        "/portfolio \u2014 View your holdings\n"
        "/buy 5 WETH \u2014 Buy $5 of WETH\n"
        "/sell 5 WETH \u2014 Sell $5 of WETH to USDC\n"
        "/price WETH \u2014 Check token price\n"
        "/trade \u2014 Let AI decide a trade\n"
        "/history \u2014 Recent trades\n"
        "/help \u2014 All commands\n\n"
        f"\U0001f3e6 *Wallet:* `{WALLET_ADDRESS[:8]}...{WALLET_ADDRESS[-6:]}`\n"
        f"\U0001f310 *Network:* Base Mainnet\n\n"
        "_Powered by Coinbase AgentKit + Claude AI_"
    )
    await update.message.reply_text(welcome, parse_mode="Markdown")

async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help."""
    help_text = (
        "\U0001f4d6 *BotMasterAI Commands:*\n\n"
        "/portfolio \u2014 Show all token balances & USD values\n"
        "/buy <amount> <token> \u2014 Buy token with USDC\n"
        "  _Example: /buy 10 WETH_\n"
        "/sell <amount> <token> \u2014 Sell token back to USDC\n"
        "  _Example: /sell 5 WETH_\n"
        "/price <token> \u2014 Get swap price quote\n"
        "  _Example: /price CBBTC_\n"
        "/trade \u2014 AI auto-trade (DCA into WETH)\n"
        "/history \u2014 Last 10 trades\n"
        "/wallet \u2014 Show wallet address\n\n"
        "*Supported tokens:* ETH, WETH, USDC, CBBTC\n"
        "*Network:* Base Mainnet"
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")

async def cmd_portfolio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show portfolio balances."""
    await update.message.reply_text("\U0001f50d Checking portfolio...")

    try:
        balances = await get_portfolio()
        total_usd = sum(b["usd"] for b in balances.values())

        lines = ["\U0001f4bc *BotMasterAI Portfolio*\n"]
        for symbol, data in balances.items():
            if data["amount"] > 0:
                lines.append(
                    f"  *{symbol}:* {data['amount']:.6f} (${data['usd']:.2f})"
                )

        lines.append(f"\n\U0001f4b5 *Total: ${total_usd:.2f}*")
        lines.append(f"\U0001f310 Network: Base Mainnet")

        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    except Exception as e:
        await update.message.reply_text(f"\u274c Error: {e}")

async def cmd_buy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Buy a token with USDC. Usage: /buy <amount_usd> <token>"""
    args = context.args
    if not args or len(args) < 2:
        await update.message.reply_text(
            "\u2753 Usage: `/buy <amount> <token>`\n"
            "Example: `/buy 5 WETH`",
            parse_mode="Markdown",
        )
        return

    try:
        amount = float(args[0])
        token = args[1].upper()
    except ValueError:
        await update.message.reply_text("\u274c Invalid amount. Use a number like: `/buy 5 WETH`", parse_mode="Markdown")
        return

    if token not in TOKENS or token == "USDC":
        await update.message.reply_text(f"\u274c Can't buy {token}. Choose: WETH, CBBTC, ETH")
        return

    if amount < 0.50:
        await update.message.reply_text("\u274c Minimum trade: $0.50")
        return

    await update.message.reply_text(
        f"\u26a1 Swapping ${amount:.2f} USDC \u2192 {token}...",
    )

    result = await execute_swap("USDC", token, amount)

    if result["success"]:
        await update.message.reply_text(
            f"\u2705 *Trade Executed!*\n\n"
            f"  \U0001f4b8 Sold: ${amount:.2f} USDC\n"
            f"  \U0001f4b0 Bought: {token}\n"
            f"  \U0001f517 [View TX]({result['url']})",
            parse_mode="Markdown",
        )
    else:
        await update.message.reply_text(f"\u274c Trade failed: {result['error']}")

async def cmd_sell(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sell a token for USDC. Usage: /sell <amount_usd> <token>"""
    args = context.args
    if not args or len(args) < 2:
        await update.message.reply_text(
            "\u2753 Usage: `/sell <amount> <token>`\n"
            "Example: `/sell 5 WETH`",
            parse_mode="Markdown",
        )
        return

    try:
        amount = float(args[0])
        token = args[1].upper()
    except ValueError:
        await update.message.reply_text("\u274c Invalid amount.")
        return

    if token not in TOKENS or token == "USDC":
        await update.message.reply_text(f"\u274c Can't sell {token}. Choose: WETH, CBBTC, ETH")
        return

    await update.message.reply_text(
        f"\u26a1 Swapping ${amount:.2f} of {token} \u2192 USDC...",
    )

    result = await execute_swap(token, "USDC", amount)

    if result["success"]:
        await update.message.reply_text(
            f"\u2705 *Trade Executed!*\n\n"
            f"  \U0001f4b8 Sold: ${amount:.2f} of {token}\n"
            f"  \U0001f4b0 Received: USDC\n"
            f"  \U0001f517 [View TX]({result['url']})",
            parse_mode="Markdown",
        )
    else:
        await update.message.reply_text(f"\u274c Trade failed: {result['error']}")

async def cmd_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Get price quote. Usage: /price <token>"""
    args = context.args
    if not args:
        await update.message.reply_text("Usage: `/price WETH`", parse_mode="Markdown")
        return

    token = args[0].upper()
    if token not in TOKENS:
        await update.message.reply_text(f"\u274c Unknown token: {token}")
        return

    await update.message.reply_text(f"\U0001f50d Getting {token} price...")

    try:
        client = await get_cdp_client()
        async with client as cdp:
            price_data = await cdp.evm.get_swap_price(
                from_token=TOKENS["USDC"]["address"],
                to_token=TOKENS[token]["address"],
                from_amount="1000000",  # 1 USDC
                network="base",
                taker=WALLET_ADDRESS,
            )
            to_amount = int(price_data.to_amount) / (10 ** TOKENS[token]["decimals"])
            price_per_token = 1.0 / to_amount if to_amount > 0 else 0

            await update.message.reply_text(
                f"\U0001f4c8 *{token} Price*\n\n"
                f"  1 {token} = ${price_per_token:,.2f} USDC\n"
                f"  $1 USDC = {to_amount:.8f} {token}\n\n"
                f"_Live from Base DEX_",
                parse_mode="Markdown",
            )
    except Exception as e:
        await update.message.reply_text(f"\u274c Error getting price: {e}")

async def cmd_trade(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """AI auto-trade — DCA buy."""
    await update.message.reply_text("\U0001f916 AI is analyzing the market...")

    try:
        balances = await get_portfolio()
        usdc_bal = balances.get("USDC", {}).get("amount", 0)

        if usdc_bal < 1:
            await update.message.reply_text("\u274c Not enough USDC to trade (need at least $1)")
            return

        # DCA: trade 5% of USDC balance
        trade_amount = round(usdc_bal * 0.05, 2)
        trade_amount = max(trade_amount, 1.0)  # minimum $1

        await update.message.reply_text(
            f"\U0001f916 AI Decision: DCA buy ${trade_amount:.2f} USDC \u2192 WETH\n"
            f"_Executing..._",
            parse_mode="Markdown",
        )

        result = await execute_swap("USDC", "WETH", trade_amount)

        if result["success"]:
            await update.message.reply_text(
                f"\u2705 *AI Trade Executed!*\n\n"
                f"  \U0001f4b8 Bought WETH with ${trade_amount:.2f} USDC\n"
                f"  \U0001f517 [View TX]({result['url']})\n\n"
                f"_AI Strategy: Dollar-Cost Averaging_",
                parse_mode="Markdown",
            )
        else:
            await update.message.reply_text(f"\u274c Trade failed: {result['error']}")
    except Exception as e:
        await update.message.reply_text(f"\u274c Error: {e}")

async def cmd_history(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show recent trades."""
    trades = load_trades()
    if not trades:
        await update.message.reply_text("No trades yet! Use /buy or /trade to start.")
        return

    recent = trades[-10:]
    lines = ["\U0001f4ca *Recent Trades:*\n"]
    for t in reversed(recent):
        ts = t.get("timestamp", "")[:16]
        status = "\u2705" if t.get("success") else "\u274c"
        from_t = t.get("from_token", "?")
        to_t = t.get("to_token", "?")
        amt = t.get("amount_usd", 0)
        lines.append(f"  {status} {ts} | ${amt:.2f} {from_t}\u2192{to_t}")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def cmd_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show wallet address."""
    await update.message.reply_text(
        f"\U0001f3e6 *Wallet Address:*\n"
        f"`{WALLET_ADDRESS}`\n\n"
        f"\U0001f310 Network: Base Mainnet\n"
        f"\U0001f517 [View on BaseScan](https://basescan.org/address/{WALLET_ADDRESS})",
        parse_mode="Markdown",
    )

# ── QUICK TRADE BUTTONS ───────────────────────────────────
async def cmd_quick(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Quick trade buttons."""
    keyboard = [
        [
            InlineKeyboardButton("Buy $5 WETH", callback_data="buy_5_WETH"),
            InlineKeyboardButton("Buy $10 WETH", callback_data="buy_10_WETH"),
        ],
        [
            InlineKeyboardButton("Buy $5 CBBTC", callback_data="buy_5_CBBTC"),
            InlineKeyboardButton("Buy $10 CBBTC", callback_data="buy_10_CBBTC"),
        ],
        [
            InlineKeyboardButton("AI Trade", callback_data="ai_trade"),
            InlineKeyboardButton("Portfolio", callback_data="portfolio"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "\u26a1 *Quick Trade:*", reply_markup=reply_markup, parse_mode="Markdown"
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline button presses."""
    query = update.callback_query
    await query.answer()

    data = query.data

    if data == "portfolio":
        # Reuse portfolio logic
        balances = await get_portfolio()
        total_usd = sum(b["usd"] for b in balances.values())
        lines = ["\U0001f4bc *Portfolio*\n"]
        for symbol, d in balances.items():
            if d["amount"] > 0:
                lines.append(f"  *{symbol}:* {d['amount']:.6f} (${d['usd']:.2f})")
        lines.append(f"\n\U0001f4b5 *Total: ${total_usd:.2f}*")
        await query.edit_message_text("\n".join(lines), parse_mode="Markdown")

    elif data == "ai_trade":
        await query.edit_message_text("\U0001f916 AI executing trade...")
        balances = await get_portfolio()
        usdc_bal = balances.get("USDC", {}).get("amount", 0)
        trade_amount = max(round(usdc_bal * 0.05, 2), 1.0)
        result = await execute_swap("USDC", "WETH", trade_amount)
        if result["success"]:
            await query.edit_message_text(
                f"\u2705 AI traded ${trade_amount:.2f} USDC \u2192 WETH\n"
                f"[View TX]({result['url']})",
                parse_mode="Markdown",
            )
        else:
            await query.edit_message_text(f"\u274c Failed: {result['error']}")

    elif data.startswith("buy_"):
        parts = data.split("_")
        amount = float(parts[1])
        token = parts[2]
        await query.edit_message_text(f"\u26a1 Buying ${amount} of {token}...")
        result = await execute_swap("USDC", token, amount)
        if result["success"]:
            await query.edit_message_text(
                f"\u2705 Bought ${amount} of {token}!\n"
                f"[View TX]({result['url']})",
                parse_mode="Markdown",
            )
        else:
            await query.edit_message_text(f"\u274c Failed: {result['error']}")

# ── MAIN ───────────────────────────────────────────────────
def main():
    if not TELEGRAM_BOT_TOKEN:
        print("FATAL: Set TELEGRAM_BOT_TOKEN in .env")
        sys.exit(1)
    if not CDP_API_KEY_NAME:
        print("FATAL: Set CDP_API_KEY_NAME in .env")
        sys.exit(1)

    print()
    print("=" * 50)
    print("  BOTMASTERAI — Telegram Trading Bot")
    print(f"  Wallet: {WALLET_ADDRESS[:8]}...{WALLET_ADDRESS[-6:]}")
    print(f"  Network: {NETWORK_ID}")
    print("=" * 50)
    print()

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Register commands
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("portfolio", cmd_portfolio))
    app.add_handler(CommandHandler("buy", cmd_buy))
    app.add_handler(CommandHandler("sell", cmd_sell))
    app.add_handler(CommandHandler("price", cmd_price))
    app.add_handler(CommandHandler("trade", cmd_trade))
    app.add_handler(CommandHandler("history", cmd_history))
    app.add_handler(CommandHandler("wallet", cmd_wallet))
    app.add_handler(CommandHandler("quick", cmd_quick))
    app.add_handler(CallbackQueryHandler(button_handler))

    print("BotMasterAI is running! Send /start in Telegram.")
    app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)

if __name__ == "__main__":
    main()

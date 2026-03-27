#!/usr/bin/env python3
"""
DevBot Direct Trading Bot v2.0
Trades directly from your Coinbase account using CDP API keys + EdDSA JWT.
No wallet transfers needed. Your crypto stays in your Coinbase account.
"""

import os
import sys
import json
import time
import base64
import argparse
import secrets as sec
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

# ============================================
# CONFIG
# ============================================
CDP_API_KEY = os.getenv("CDP_API_KEY_NAME", "")
CDP_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
TRADE_AMOUNT = float(os.getenv("TRADE_AMOUNT_USD", "25"))
MAX_DAILY = int(os.getenv("MAX_DAILY_TRADES", "10"))
STRATEGY = os.getenv("STRATEGY", "momentum")
STOP_LOSS = float(os.getenv("STOP_LOSS_PERCENT", "5"))
TAKE_PROFIT = float(os.getenv("TAKE_PROFIT_PERCENT", "10"))
PAPER_MODE = True  # Paper trading until trade permissions enabled

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
TRADES_FILE = DATA_DIR / "trades.json"
LOG_FILE = DATA_DIR / "bot.log"


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def save_trade(trade_data):
    trades = []
    if TRADES_FILE.exists():
        try:
            trades = json.loads(TRADES_FILE.read_text())
        except Exception:
            trades = []
    trades.append(trade_data)
    TRADES_FILE.write_text(json.dumps(trades, indent=2))


def get_trades_today():
    if not TRADES_FILE.exists():
        return []
    try:
        trades = json.loads(TRADES_FILE.read_text())
        today = datetime.now().strftime("%Y-%m-%d")
        return [t for t in trades if t.get("timestamp", "").startswith(today)]
    except Exception:
        return []


# ============================================
# AUTH — EdDSA JWT with CDP Keys
# ============================================
def _load_private_key():
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    key_bytes = base64.b64decode(CDP_PRIVATE_KEY)
    seed = key_bytes[:32] if len(key_bytes) == 64 else key_bytes
    return Ed25519PrivateKey.from_private_bytes(seed)


_cached_key = None


def get_private_key():
    global _cached_key
    if _cached_key is None:
        _cached_key = _load_private_key()
    return _cached_key


def make_jwt(method, path):
    """Create EdDSA JWT for Coinbase API."""
    import jwt as pyjwt
    uri = f"{method} api.coinbase.com{path}"
    payload = {
        "sub": CDP_API_KEY,
        "iss": "cdp",
        "nbf": int(time.time()),
        "exp": int(time.time()) + 120,
        "uri": uri,
    }
    return pyjwt.encode(
        payload,
        get_private_key(),
        algorithm="EdDSA",
        headers={"kid": CDP_API_KEY, "nonce": sec.token_hex()},
    )


def api_get(path, params=None):
    """Authenticated GET request."""
    import httpx
    token = make_jwt("GET", path)
    url = f"https://api.coinbase.com{path}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    r = httpx.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=15)
    if r.status_code == 200:
        return r.json()
    log(f"API GET {r.status_code}: {r.text[:200]}", "ERROR")
    return None


def api_post(path, body):
    """Authenticated POST request."""
    import httpx
    token = make_jwt("POST", path)
    r = httpx.post(
        f"https://api.coinbase.com{path}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=body,
        timeout=15,
    )
    if r.status_code in (200, 201):
        return r.json()
    log(f"API POST {r.status_code}: {r.text[:300]}", "ERROR")
    return None


# ============================================
# COINBASE FUNCTIONS
# ============================================
def get_accounts():
    """Get all funded accounts (checks both V3 and V2 APIs)."""
    seen = set()
    accounts = []

    # V3 Brokerage accounts
    data = api_get("/api/v3/brokerage/accounts", {"limit": "50"})
    if data:
        for acc in data.get("accounts", []):
            bal = float(acc.get("available_balance", {}).get("value", 0))
            hold = float(acc.get("hold", {}).get("value", 0))
            curr = acc.get("currency", "")
            if (bal > 0.000001 or hold > 0.000001) and curr not in seen:
                seen.add(curr)
                accounts.append({
                    "uuid": acc.get("uuid", ""),
                    "name": acc.get("name", ""),
                    "currency": curr,
                    "balance": bal,
                    "hold": hold,
                })

    # V2 Legacy accounts (catches old holdings)
    v2 = api_get("/v2/accounts", {"limit": "100"})
    if v2:
        for acc in v2.get("data", []):
            bal = float(acc.get("balance", {}).get("amount", 0))
            curr = acc.get("balance", {}).get("currency", "")
            if bal > 0.000001 and curr not in seen:
                seen.add(curr)
                accounts.append({
                    "uuid": acc.get("id", ""),
                    "name": acc.get("name", ""),
                    "currency": curr,
                    "balance": bal,
                    "hold": 0,
                })

    return accounts


def get_price(product_id="ETH-USD"):
    """Get current price for a trading pair."""
    data = api_get(f"/api/v3/brokerage/products/{product_id}")
    if data:
        return float(data.get("price", 0))
    return None


def get_portfolio_value():
    """Calculate total portfolio value in USD."""
    accounts = get_accounts()
    total = 0
    holdings = []
    for acc in accounts:
        if acc["currency"] in ("USD", "USDC", "USDT"):
            usd_val = acc["balance"]
        else:
            price = get_price(f"{acc['currency']}-USD")
            usd_val = acc["balance"] * price if price else 0
        total += usd_val
        holdings.append({
            "currency": acc["currency"],
            "balance": round(acc["balance"], 8),
            "usd_value": round(usd_val, 2),
        })
    return round(total, 2), holdings


def place_market_buy(product_id, usd_amount):
    """Place a market buy order."""
    order_id = f"devbot-{int(time.time())}"
    body = {
        "client_order_id": order_id,
        "product_id": product_id,
        "side": "BUY",
        "order_configuration": {
            "market_market_ioc": {"quote_size": str(round(usd_amount, 2))}
        },
    }
    result = api_post("/api/v3/brokerage/orders", body)
    if result and result.get("success"):
        return {"success": True, "order_id": order_id, "response": result}
    err = "Unknown error"
    if result:
        err = result.get("error_response", {}).get("message", json.dumps(result)[:200])
    return {"success": False, "error": err}


def place_market_sell(product_id, base_amount):
    """Place a market sell order."""
    order_id = f"devbot-{int(time.time())}"
    body = {
        "client_order_id": order_id,
        "product_id": product_id,
        "side": "SELL",
        "order_configuration": {
            "market_market_ioc": {"base_size": str(round(base_amount, 8))}
        },
    }
    result = api_post("/api/v3/brokerage/orders", body)
    if result and result.get("success"):
        return {"success": True, "order_id": order_id, "response": result}
    err = "Unknown error"
    if result:
        err = result.get("error_response", {}).get("message", json.dumps(result)[:200])
    return {"success": False, "error": err}


# ============================================
# AI BRAIN
# ============================================
def ask_claude(prompt):
    """Ask Claude for a trading decision."""
    import httpx
    try:
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        if r.status_code == 200:
            return r.json()["content"][0]["text"]
        log(f"Claude error: {r.status_code}", "ERROR")
        return None
    except Exception as e:
        log(f"Claude failed: {e}", "ERROR")
        return None


def get_ai_decision(holdings, prices, strategy):
    """Get AI trading decision."""
    prompt = f"""You are a crypto trading AI. Give a CLEAR trading decision.

PORTFOLIO:
{json.dumps(holdings, indent=2)}

PRICES:
{json.dumps(prices, indent=2)}

STRATEGY: {strategy}
TRADE SIZE: ${TRADE_AMOUNT}
STOP LOSS: {STOP_LOSS}% | TAKE PROFIT: {TAKE_PROFIT}%

RULES:
- momentum: Buy when trend is up, sell on reversal
- dca: Always buy ${TRADE_AMOUNT} of ETH
- mean_reversion: Buy when low vs average, sell when high
- grid: Buy at support, sell at resistance
- rebalance: Keep 50% ETH, 30% BTC, 20% USD

Respond ONLY with one JSON object:
{{"action": "BUY", "pair": "ETH-USD", "amount_usd": {TRADE_AMOUNT}, "reason": "brief reason"}}
{{"action": "SELL", "pair": "ETH-USD", "amount_base": 0.01, "reason": "brief reason"}}
{{"action": "HOLD", "reason": "brief reason"}}"""

    response = ask_claude(prompt)
    if not response:
        return {"action": "HOLD", "reason": "AI unavailable"}
    try:
        text = response.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        log(f"Parse fail: {response[:150]}", "WARN")
        return {"action": "HOLD", "reason": "Could not parse AI response"}


# ============================================
# COMMANDS
# ============================================
def run_status():
    print("\n" + "=" * 60)
    print("  DevBot Trading Bot v2.0 -- Portfolio Status")
    print("  Direct Coinbase Account | AI-Powered")
    print("=" * 60)

    total, holdings = get_portfolio_value()
    print(f"\n  Total Value:  ${total:.2f}")
    print(f"  Strategy:     {STRATEGY}")
    print(f"  Trade Size:   ${TRADE_AMOUNT}")
    print(f"  Trades Today: {len(get_trades_today())}/{MAX_DAILY}")
    print(f"\n  Holdings:")
    for h in holdings:
        print(f"    {h['currency']:6s} {h['balance']:>14.8f}  (${h['usd_value']:.2f})")
    if not holdings:
        print("    (no funded assets)")

    trades_today = get_trades_today()
    if trades_today:
        print(f"\n  Recent Trades:")
        for t in trades_today[-5:]:
            print(f"    {t.get('action','?'):4s} {t.get('pair','?'):8s} ${t.get('amount_usd',0):>8.2f} - {t.get('reason','')[:35]}")
    print("\n" + "=" * 60)


def run_trade():
    log("Starting trade cycle...")

    today_trades = get_trades_today()
    if len(today_trades) >= MAX_DAILY:
        log(f"Daily limit reached ({MAX_DAILY}). Skipping.", "WARN")
        return

    total, holdings = get_portfolio_value()
    log(f"Portfolio: ${total:.2f}")

    if total < TRADE_AMOUNT * 0.5:
        log(f"Insufficient funds (${total:.2f}). Need at least ${TRADE_AMOUNT * 0.5:.2f}.", "WARN")
        return

    prices = {}
    for pair in ["ETH-USD", "BTC-USD"]:
        p = get_price(pair)
        if p:
            prices[pair] = p
            log(f"{pair}: ${p:,.2f}")

    log(f"Asking Claude AI ({STRATEGY} strategy)...")
    decision = get_ai_decision(holdings, prices, STRATEGY)
    log(f"AI Decision: {json.dumps(decision)}")

    action = decision.get("action", "HOLD").upper()
    pair = decision.get("pair", "ETH-USD")
    reason = decision.get("reason", "No reason")

    if action == "BUY":
        amount_usd = min(decision.get("amount_usd", TRADE_AMOUNT), TRADE_AMOUNT * 1.5)
        if PAPER_MODE:
            log(f"[PAPER] BUY ${amount_usd:.2f} of {pair} @ ${prices.get(pair, 0):,.2f}")
            save_trade({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "BUY", "pair": pair, "paper": True,
                "amount_usd": amount_usd,
                "price": prices.get(pair, 0),
                "reason": reason,
                "strategy": STRATEGY,
            })
        else:
            log(f"EXECUTING BUY: ${amount_usd:.2f} of {pair}")
            result = place_market_buy(pair, amount_usd)
            if result["success"]:
                log(f"BUY SUCCESS: {result['order_id']}")
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action": "BUY", "pair": pair,
                    "amount_usd": amount_usd,
                    "price": prices.get(pair, 0),
                    "reason": reason,
                    "order_id": result["order_id"],
                    "strategy": STRATEGY,
                })
            else:
                log(f"BUY FAILED: {result['error']}", "ERROR")

    elif action == "SELL":
        amount_base = decision.get("amount_base", 0)
        if amount_base > 0:
            if PAPER_MODE:
                usd_val = round(amount_base * prices.get(pair, 0), 2)
                log(f"[PAPER] SELL {amount_base} {pair} @ ${prices.get(pair, 0):,.2f} (${usd_val})")
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action": "SELL", "pair": pair, "paper": True,
                    "amount_base": amount_base,
                    "amount_usd": usd_val,
                    "price": prices.get(pair, 0),
                    "reason": reason,
                    "strategy": STRATEGY,
                })
            else:
                log(f"EXECUTING SELL: {amount_base} of {pair}")
                result = place_market_sell(pair, amount_base)
                if result["success"]:
                    log(f"SELL SUCCESS: {result['order_id']}")
                    save_trade({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "action": "SELL", "pair": pair,
                        "amount_base": amount_base,
                        "amount_usd": round(amount_base * prices.get(pair, 0), 2),
                        "price": prices.get(pair, 0),
                        "reason": reason,
                        "order_id": result["order_id"],
                        "strategy": STRATEGY,
                    })
                else:
                    log(f"SELL FAILED: {result['error']}", "ERROR")
    else:
        log(f"HOLD: {reason}")


def run_interactive():
    print("\n  DevBot Trading Bot v2.0 - Interactive Mode")
    print("  /trade  /status  /price  /quit")
    print("  Or type anything to chat with AI\n")

    while True:
        try:
            user = input("You > ").strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not user:
            continue
        if user.lower() in ("/quit", "/exit", "quit"):
            break
        if user.lower() in ("/status", "status"):
            run_status()
            continue
        if user.lower() in ("/trade", "trade"):
            run_trade()
            continue
        if user.lower().startswith("/price"):
            for pair in ["ETH-USD", "BTC-USD", "SOL-USD"]:
                p = get_price(pair)
                if p:
                    print(f"  {pair}: ${p:,.2f}")
            continue

        total, holdings = get_portfolio_value()
        prompt = f"""You are DevBot, a crypto trading assistant.
Portfolio: {json.dumps(holdings)}
Strategy: {STRATEGY}, Trade size: ${TRADE_AMOUNT}
User says: {user}
Be helpful and concise."""
        reply = ask_claude(prompt)
        print(f"\nDevBot > {reply or 'Sorry, no response.'}\n")


def run_dca_loop(interval_hours=4):
    log(f"DCA loop started (every {interval_hours}h). Ctrl+C to stop.")
    while True:
        try:
            run_trade()
            log(f"Next trade in {interval_hours} hours...")
            time.sleep(interval_hours * 3600)
        except KeyboardInterrupt:
            log("DCA loop stopped.")
            break


# ============================================
# MAIN
# ============================================
def main():
    print("""
  ======================================
    DevBot Trading Bot v2.0
    Direct Coinbase Account Trading
    + Claude AI Brain
  ======================================
""")

    if not CDP_API_KEY or not CDP_PRIVATE_KEY:
        print("  ERROR: Set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in .env")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="DevBot Trading Bot v2.0")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--trade-once", action="store_true")
    parser.add_argument("--dca-loop", action="store_true")
    parser.add_argument("--interactive", action="store_true")
    parser.add_argument("--strategy", choices=["momentum", "dca", "mean_reversion", "grid", "rebalance"])
    parser.add_argument("--live", action="store_true", help="Enable LIVE trading (real money)")
    parser.add_argument("--paper", action="store_true", help="Paper trading mode (default)")
    args = parser.parse_args()

    if args.strategy:
        global STRATEGY
        STRATEGY = args.strategy
    if args.live:
        global PAPER_MODE
        PAPER_MODE = False
        log("*** LIVE TRADING MODE — REAL MONEY ***", "WARN")

    log("Connecting to Coinbase...")
    try:
        accounts = get_accounts()
        if accounts is None:
            raise Exception("Auth failed")
        log(f"Connected! {len(accounts)} funded account(s)")
        for acc in accounts:
            log(f"  {acc['currency']}: {acc['balance']:.8f}")
    except Exception as e:
        log(f"Failed: {e}", "ERROR")
        sys.exit(1)

    if args.status:
        run_status()
    elif args.trade_once:
        run_trade()
    elif args.dca_loop:
        run_dca_loop()
    elif args.interactive:
        run_interactive()
    else:
        run_status()
        run_interactive()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
TRADE NOW — Live Coinbase Trading Bot
Uses requests (no httpx) for Python 3.14 compatibility.
CDP API Keys + EdDSA JWT Authentication.
"""

import os
import sys
import json
import time
import base64
import secrets as sec
from datetime import datetime, timezone
from pathlib import Path

# Fix encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv(override=True)

# ── CONFIG ──────────────────────────────────────────────
CDP_API_KEY = os.getenv("CDP_API_KEY_NAME", "")
CDP_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
TRADE_AMOUNT = float(os.getenv("TRADE_AMOUNT_USD", "25"))
MAX_DAILY = int(os.getenv("MAX_DAILY_TRADES", "10"))
STRATEGY = os.getenv("STRATEGY", "momentum")
STOP_LOSS = float(os.getenv("STOP_LOSS_PERCENT", "5"))
TAKE_PROFIT = float(os.getenv("TAKE_PROFIT_PERCENT", "10"))
INTERVAL = 540  # 9 minutes between cycles

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
TRADES_FILE = DATA_DIR / "trades.json"
LOG_FILE = DATA_DIR / "trade_now.log"

# ── LOGGING ─────────────────────────────────────────────
def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line, flush=True)
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

# ── AUTH — EdDSA JWT ────────────────────────────────────
_cached_key = None

def get_private_key():
    global _cached_key
    if _cached_key is None:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
        key_bytes = base64.b64decode(CDP_PRIVATE_KEY)
        seed = key_bytes[:32] if len(key_bytes) == 64 else key_bytes
        _cached_key = Ed25519PrivateKey.from_private_bytes(seed)
    return _cached_key

def make_jwt(method, path):
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

# ── API — using requests ───────────────────────────────
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def api_get(path, params=None):
    token = make_jwt("GET", path)
    url = f"https://api.coinbase.com{path}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    try:
        r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=15, verify=False)
        if r.status_code == 200:
            return r.json()
        log(f"API GET {path} → {r.status_code}: {r.text[:200]}", "ERROR")
    except Exception as e:
        log(f"API GET {path} failed: {e}", "ERROR")
    return None

def api_post(path, body):
    token = make_jwt("POST", path)
    try:
        r = requests.post(
            f"https://api.coinbase.com{path}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
            timeout=15,
            verify=False,
        )
        if r.status_code in (200, 201):
            return r.json()
        log(f"API POST {path} → {r.status_code}: {r.text[:300]}", "ERROR")
    except Exception as e:
        log(f"API POST {path} failed: {e}", "ERROR")
    return None

# ── COINBASE FUNCTIONS ──────────────────────────────────
def get_accounts():
    seen = set()
    accounts = []
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
                    "currency": curr,
                    "balance": bal,
                    "hold": hold,
                })
    v2 = api_get("/v2/accounts", {"limit": "100"})
    if v2:
        for acc in v2.get("data", []):
            bal = float(acc.get("balance", {}).get("amount", 0))
            curr = acc.get("balance", {}).get("currency", "")
            if bal > 0.000001 and curr not in seen:
                seen.add(curr)
                accounts.append({
                    "uuid": acc.get("id", ""),
                    "currency": curr,
                    "balance": bal,
                    "hold": 0,
                })
    return accounts

def get_price(product_id="ETH-USD"):
    data = api_get(f"/api/v3/brokerage/products/{product_id}")
    if data:
        return float(data.get("price", 0))
    return None

def get_portfolio_value():
    accounts = get_accounts()
    total = 0
    holdings = []
    for acc in accounts:
        if acc["currency"] in ("USD", "USDC", "USDT", "AUD"):
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

# ── AI BRAIN ────────────────────────────────────────────
def ask_claude(prompt):
    try:
        r = requests.post(
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
        log(f"Claude {r.status_code}: {r.text[:150]}", "ERROR")
    except Exception as e:
        log(f"Claude failed: {e}", "ERROR")
    return None

def get_ai_decision(holdings, prices, strategy):
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

Respond ONLY with one JSON object:
{{"action": "BUY", "pair": "ETH-USD", "amount_usd": {TRADE_AMOUNT}, "reason": "brief reason"}}
{{"action": "SELL", "pair": "ETH-USD", "amount_base": 0.01, "reason": "brief reason"}}
{{"action": "HOLD", "reason": "brief reason"}}"""

    response = ask_claude(prompt)
    if not response:
        return {"action": "BUY", "pair": "ETH-USD", "amount_usd": TRADE_AMOUNT, "reason": "AI unavailable - DCA fallback"}
    try:
        text = response.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        log(f"Parse fail: {response[:150]}", "WARN")
        return {"action": "BUY", "pair": "ETH-USD", "amount_usd": TRADE_AMOUNT, "reason": "Parse fail - DCA fallback"}

# ── TRADE CYCLE ─────────────────────────────────────────
def trade_cycle():
    log("=" * 50)
    log("*** LIVE TRADE CYCLE ***")

    today_trades = get_trades_today()
    if len(today_trades) >= MAX_DAILY:
        log(f"Daily limit reached ({MAX_DAILY}). Skipping.", "WARN")
        return

    # Get portfolio
    try:
        total, holdings = get_portfolio_value()
        log(f"Portfolio: ${total:.2f}")
        for h in holdings:
            log(f"  {h['currency']:8s} | {h['balance']:>14.8f} | ${h['usd_value']:.2f}")
    except Exception as e:
        log(f"Portfolio error: {e}", "ERROR")
        holdings = []
        total = 0

    # Get prices
    prices = {}
    for pair in ["ETH-USD", "BTC-USD", "SOL-USD"]:
        try:
            p = get_price(pair)
            if p:
                prices[pair] = p
                log(f"{pair}: ${p:,.2f}")
        except Exception:
            pass

    if not prices:
        log("No prices available. Skipping.", "WARN")
        return

    # AI Decision
    log("Asking Claude AI for trading decision...")
    decision = get_ai_decision(holdings, prices, STRATEGY)
    log(f"AI Decision: {json.dumps(decision)}")

    action = decision.get("action", "HOLD").upper()
    pair = decision.get("pair", "ETH-USD")
    reason = decision.get("reason", "No reason")

    if action == "BUY":
        amt = min(decision.get("amount_usd", TRADE_AMOUNT), TRADE_AMOUNT * 1.5)
        log(f">>> LIVE BUY: ${amt:.2f} of {pair}")
        result = place_market_buy(pair, amt)
        if result["success"]:
            log(f"BUY SUCCESS! Order: {result['order_id']}")
            save_trade({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "BUY", "pair": pair, "live": True,
                "amount_usd": amt, "price": prices.get(pair, 0),
                "reason": reason, "order_id": result["order_id"],
            })
        else:
            log(f"BUY FAILED: {result['error']}", "ERROR")
    elif action == "SELL":
        base = decision.get("amount_base", 0)
        if base > 0:
            log(f">>> LIVE SELL: {base} of {pair}")
            result = place_market_sell(pair, base)
            if result["success"]:
                log(f"SELL SUCCESS! Order: {result['order_id']}")
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action": "SELL", "pair": pair, "live": True,
                    "amount_base": base, "price": prices.get(pair, 0),
                    "reason": reason, "order_id": result["order_id"],
                })
            else:
                log(f"SELL FAILED: {result['error']}", "ERROR")
    else:
        log(f"HOLD: {reason}")

    log("--- CYCLE COMPLETE ---")

# ── MAIN ────────────────────────────────────────────────
def main():
    log("=" * 60)
    log("  DEVBOT TRADE NOW — LIVE MAINNET")
    log(f"  Amount: ${TRADE_AMOUNT} | Interval: {INTERVAL//60}min")
    log(f"  Strategy: {STRATEGY}")
    log("  *** REAL MONEY — COINBASE MAINNET ***")
    log("=" * 60)

    if not CDP_API_KEY or not CDP_PRIVATE_KEY:
        log("FATAL: CDP_API_KEY_NAME or CDP_API_KEY_PRIVATE_KEY missing!", "ERROR")
        sys.exit(1)

    log(f"API Key: {CDP_API_KEY[:12]}...")
    log("Testing connection...")

    accounts = get_accounts()
    if accounts is None or len(accounts) == 0:
        log("WARNING: No funded accounts found. Will attempt to trade anyway.", "WARN")
    else:
        log(f"Connected! {len(accounts)} funded account(s)")
        for acc in accounts:
            log(f"  {acc['currency']}: {acc['balance']:.8f}")

    cycle = 0
    while True:
        try:
            cycle += 1
            log(f"\n=== CYCLE {cycle} ===")
            trade_cycle()
            log(f"Next cycle in {INTERVAL//60} minutes...")
            time.sleep(INTERVAL)
        except KeyboardInterrupt:
            log("Stopped by user.")
            break
        except Exception as e:
            import traceback
            log(f"Cycle error: {e}", "ERROR")
            log(traceback.format_exc(), "ERROR")
            time.sleep(60)

if __name__ == "__main__":
    main()

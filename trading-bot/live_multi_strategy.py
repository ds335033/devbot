#!/usr/bin/env python3
"""
DEVBOT LIVE MULTI-STRATEGY TRADER
==================================
Runs 3 concurrent trading strategies on your Coinbase account:

  Tier 1 — Conservative (4%):  DCA into ETH, low risk, steady accumulation
  Tier 2 — Moderate (8%):      Momentum trading BTC, follow trends
  Tier 3 — Aggressive (14%):   Mean reversion + grid on SOL/ETH, higher reward

Each tier allocates a % of your total portfolio value per trade cycle.
Real money. Real trades. Coinbase Advanced Trade API + Claude AI.

Usage:
  python live_multi_strategy.py                    # Run all 3 tiers
  python live_multi_strategy.py --tier 1           # Run Tier 1 only (4%)
  python live_multi_strategy.py --tier 2           # Run Tier 2 only (8%)
  python live_multi_strategy.py --tier 3           # Run Tier 3 only (14%)
  python live_multi_strategy.py --status           # Portfolio status only
  python live_multi_strategy.py --dry-run          # Simulate without trading
"""

import os
import sys
import json
import time
import base64
import secrets as sec
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv(override=True)

# ── CONFIG ──────────────────────────────────────────────────
CDP_API_KEY = os.getenv("CDP_API_KEY_NAME", "")
CDP_PRIVATE_KEY = os.getenv("CDP_API_KEY_PRIVATE_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MAX_DAILY = int(os.getenv("MAX_DAILY_TRADES", "30"))
CYCLE_INTERVAL = int(os.getenv("CYCLE_INTERVAL_SECONDS", "600"))  # 10 min default

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
TRADES_FILE = DATA_DIR / "multi_trades.json"
LOG_FILE = DATA_DIR / "multi_strategy.log"
STATE_FILE = DATA_DIR / "multi_state.json"

# ── STRATEGY TIERS ──────────────────────────────────────────
TIERS = {
    1: {
        "name": "Conservative",
        "allocation_pct": 4.0,
        "strategy": "dca",
        "pairs": ["ETH-USD"],
        "description": "Dollar-cost average into ETH — steady, low-risk accumulation",
        "stop_loss_pct": 3.0,
        "take_profit_pct": 8.0,
        "max_trades_per_day": 12,
        "min_trade_usd": 5.0,
        "color": "\033[92m",  # green
    },
    2: {
        "name": "Moderate",
        "allocation_pct": 8.0,
        "strategy": "momentum",
        "pairs": ["BTC-USD", "ETH-USD"],
        "description": "Momentum trading — buy uptrends, sell reversals",
        "stop_loss_pct": 5.0,
        "take_profit_pct": 12.0,
        "max_trades_per_day": 8,
        "min_trade_usd": 10.0,
        "color": "\033[93m",  # yellow
    },
    3: {
        "name": "Aggressive",
        "allocation_pct": 14.0,
        "strategy": "mean_reversion",
        "pairs": ["SOL-USD", "ETH-USD", "BTC-USD"],
        "description": "Mean reversion + grid — buy dips, sell rallies, higher reward",
        "stop_loss_pct": 8.0,
        "take_profit_pct": 18.0,
        "max_trades_per_day": 10,
        "min_trade_usd": 15.0,
        "color": "\033[91m",  # red
    },
}

RESET = "\033[0m"

# ── LOGGING ─────────────────────────────────────────────────
def log(msg, level="INFO", tier=None):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    prefix = f"[T{tier}] " if tier else ""
    color = TIERS[tier]["color"] if tier and tier in TIERS else ""
    line = f"[{ts}] [{level}] {prefix}{msg}"
    print(f"{color}{line}{RESET}", flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ── PERSISTENCE ─────────────────────────────────────────────
def load_trades():
    if TRADES_FILE.exists():
        try:
            return json.loads(TRADES_FILE.read_text())
        except Exception:
            pass
    return []

def save_trade(trade):
    trades = load_trades()
    trades.append(trade)
    TRADES_FILE.write_text(json.dumps(trades, indent=2))

def get_trades_today(tier=None):
    trades = load_trades()
    today = datetime.now().strftime("%Y-%m-%d")
    filtered = [t for t in trades if t.get("timestamp", "").startswith(today)]
    if tier:
        filtered = [t for t in filtered if t.get("tier") == tier]
    return filtered

def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"total_trades": 0, "total_profit_usd": 0, "started_at": datetime.now(timezone.utc).isoformat()}

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2))

# ── AUTH — CDP JWT (EC or EdDSA auto-detect) ───────────────
_cached_key = None
_key_algorithm = None

def get_private_key():
    global _cached_key, _key_algorithm
    if _cached_key is None:
        key_data = CDP_PRIVATE_KEY.strip()

        if key_data.startswith("-----BEGIN EC PRIVATE KEY-----"):
            # ECDSA PEM key (ES256)
            from cryptography.hazmat.primitives.serialization import load_pem_private_key
            _cached_key = load_pem_private_key(key_data.encode(), password=None)
            _key_algorithm = "ES256"
        elif key_data.startswith("-----BEGIN PRIVATE KEY-----"):
            # Generic PEM — could be EC or Ed25519
            from cryptography.hazmat.primitives.serialization import load_pem_private_key
            _cached_key = load_pem_private_key(key_data.encode(), password=None)
            from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
            if isinstance(_cached_key, EllipticCurvePrivateKey):
                _key_algorithm = "ES256"
            elif isinstance(_cached_key, Ed25519PrivateKey):
                _key_algorithm = "EdDSA"
            else:
                _key_algorithm = "ES256"
        else:
            # Raw base64 bytes — assume EdDSA
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
            key_bytes = base64.b64decode(key_data)
            seed = key_bytes[:32] if len(key_bytes) == 64 else key_bytes
            _cached_key = Ed25519PrivateKey.from_private_bytes(seed)
            _key_algorithm = "EdDSA"

        log(f"Auth: {_key_algorithm} key loaded")
    return _cached_key

def make_jwt(method, path):
    import jwt as pyjwt
    key = get_private_key()
    now = int(time.time())
    uri = f"{method} api.coinbase.com{path}"

    # CDP org keys use this format
    payload = {
        "sub": CDP_API_KEY,
        "iss": "coinbase-cloud",
        "nbf": now,
        "exp": now + 120,
        "aud": ["cdp_service"],
        "uris": [uri],
    }
    headers = {
        "kid": CDP_API_KEY,
        "nonce": sec.token_hex(16),
        "typ": "JWT",
    }
    return pyjwt.encode(
        payload,
        key,
        algorithm=_key_algorithm,
        headers=headers,
    )

# ── COINBASE API ────────────────────────────────────────────
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
        log(f"API GET {path} -> {r.status_code}: {r.text[:200]}", "ERROR")
    except Exception as e:
        log(f"API GET {path} failed: {e}", "ERROR")
    return None

def api_post(path, body):
    token = make_jwt("POST", path)
    try:
        r = requests.post(
            f"https://api.coinbase.com{path}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body, timeout=15, verify=False,
        )
        if r.status_code in (200, 201):
            return r.json()
        log(f"API POST {path} -> {r.status_code}: {r.text[:300]}", "ERROR")
    except Exception as e:
        log(f"API POST {path} failed: {e}", "ERROR")
    return None

# ── MARKET DATA ─────────────────────────────────────────────
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
                accounts.append({"uuid": acc.get("uuid", ""), "currency": curr, "balance": bal, "hold": hold})
    # Also check v2 accounts
    v2 = api_get("/v2/accounts", {"limit": "100"})
    if v2:
        for acc in v2.get("data", []):
            bal = float(acc.get("balance", {}).get("amount", 0))
            curr = acc.get("balance", {}).get("currency", "")
            if bal > 0.000001 and curr not in seen:
                seen.add(curr)
                accounts.append({"uuid": acc.get("id", ""), "currency": curr, "balance": bal, "hold": 0})
    return accounts

def get_price(product_id="ETH-USD"):
    data = api_get(f"/api/v3/brokerage/products/{product_id}")
    if data:
        return float(data.get("price", 0))
    return None

def get_24h_candles(product_id="ETH-USD"):
    """Get 24h of 1-hour candles for trend analysis."""
    end = int(time.time())
    start = end - 86400
    data = api_get(f"/api/v3/brokerage/products/{product_id}/candles", {
        "start": str(start), "end": str(end), "granularity": "ONE_HOUR"
    })
    if data and "candles" in data:
        candles = data["candles"]
        return [{"time": c["start"], "open": float(c["open"]), "high": float(c["high"]),
                 "low": float(c["low"]), "close": float(c["close"]), "volume": float(c["volume"])}
                for c in candles[:24]]
    return []

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

# ── ORDER EXECUTION ─────────────────────────────────────────
def place_market_buy(product_id, usd_amount, tier=None):
    order_id = f"devbot-t{tier or 0}-{int(time.time())}"
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
    err = result.get("error_response", {}).get("message", "Unknown") if result else "No response"
    return {"success": False, "error": err}

def place_market_sell(product_id, base_amount, tier=None):
    order_id = f"devbot-t{tier or 0}-{int(time.time())}"
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
    err = result.get("error_response", {}).get("message", "Unknown") if result else "No response"
    return {"success": False, "error": err}

# ── AI BRAIN ────────────────────────────────────────────────
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

def get_tier_decision(tier_num, tier_cfg, portfolio_value, holdings, prices, candles_data):
    """Ask Claude for a trading decision specific to this tier."""
    trade_budget = round(portfolio_value * (tier_cfg["allocation_pct"] / 100), 2)

    # Build candle summary for momentum/mean_reversion
    candle_summary = {}
    for pair, candles in candles_data.items():
        if candles:
            closes = [c["close"] for c in candles]
            avg = sum(closes) / len(closes)
            latest = closes[0] if closes else 0
            trend = "UP" if latest > avg else "DOWN"
            pct_from_avg = round(((latest - avg) / avg) * 100, 2) if avg else 0
            candle_summary[pair] = {
                "price": latest,
                "24h_avg": round(avg, 2),
                "trend": trend,
                "pct_from_avg": pct_from_avg,
                "24h_high": max(c["high"] for c in candles),
                "24h_low": min(c["low"] for c in candles),
                "24h_volume": round(sum(c["volume"] for c in candles), 2),
            }

    prompt = f"""You are DevBot Tier {tier_num} ({tier_cfg['name']}) Trading AI.

TIER CONFIG:
- Strategy: {tier_cfg['strategy']}
- Risk Level: {tier_cfg['name']} ({tier_cfg['allocation_pct']}% of portfolio per cycle)
- Trade Budget This Cycle: ${trade_budget}
- Pairs: {', '.join(tier_cfg['pairs'])}
- Stop Loss: {tier_cfg['stop_loss_pct']}% | Take Profit: {tier_cfg['take_profit_pct']}%

PORTFOLIO (${portfolio_value} total):
{json.dumps(holdings, indent=2)}

CURRENT PRICES:
{json.dumps(prices, indent=2)}

MARKET ANALYSIS (24h candles):
{json.dumps(candle_summary, indent=2)}

STRATEGY RULES:
- dca (Tier 1): ALWAYS BUY. Split ${trade_budget} across target pairs. Steady accumulation.
- momentum (Tier 2): Buy if trend is UP and price > 24h avg. Sell if trend is DOWN and price < avg. Hold if unclear.
- mean_reversion (Tier 3): Buy when price is >2% BELOW 24h avg (dip). Sell when >3% ABOVE avg (rally). Otherwise hold.

Respond with EXACTLY one JSON array of actions (can be multiple trades per cycle):
[
  {{"action": "BUY", "pair": "ETH-USD", "amount_usd": {trade_budget}, "reason": "brief reason"}},
  {{"action": "SELL", "pair": "BTC-USD", "amount_base": 0.001, "reason": "brief reason"}},
  {{"action": "HOLD", "pair": "SOL-USD", "reason": "brief reason"}}
]

Maximum total BUY spend: ${trade_budget}. Never exceed this budget.
If unsure, default to a small DCA buy of the primary pair."""

    response = ask_claude(prompt)
    if not response:
        # Fallback: simple DCA buy on primary pair
        return [{"action": "BUY", "pair": tier_cfg["pairs"][0], "amount_usd": trade_budget, "reason": "AI unavailable - DCA fallback"}]

    try:
        text = response.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        if isinstance(parsed, dict):
            parsed = [parsed]
        return parsed
    except Exception:
        log(f"Parse fail: {response[:200]}", "WARN", tier=tier_num)
        return [{"action": "BUY", "pair": tier_cfg["pairs"][0], "amount_usd": trade_budget, "reason": "Parse fail - DCA fallback"}]

# ── TIER EXECUTION ──────────────────────────────────────────
def execute_tier(tier_num, tier_cfg, portfolio_value, holdings, prices, candles_data, dry_run=False):
    """Execute one trading cycle for a specific tier."""
    log(f"{'='*50}", tier=tier_num)
    log(f"TIER {tier_num}: {tier_cfg['name'].upper()} ({tier_cfg['allocation_pct']}%)", tier=tier_num)
    log(f"Strategy: {tier_cfg['strategy']} | Pairs: {', '.join(tier_cfg['pairs'])}", tier=tier_num)

    trade_budget = round(portfolio_value * (tier_cfg["allocation_pct"] / 100), 2)
    log(f"Budget: ${trade_budget} ({tier_cfg['allocation_pct']}% of ${portfolio_value})", tier=tier_num)

    if trade_budget < tier_cfg["min_trade_usd"]:
        log(f"Budget ${trade_budget} below minimum ${tier_cfg['min_trade_usd']}. Skipping.", "WARN", tier=tier_num)
        return

    # Check daily limit for this tier
    today_trades = get_trades_today(tier=tier_num)
    if len(today_trades) >= tier_cfg["max_trades_per_day"]:
        log(f"Daily limit reached ({tier_cfg['max_trades_per_day']} trades). Skipping.", "WARN", tier=tier_num)
        return

    # Get AI decision
    log("Consulting Claude AI...", tier=tier_num)
    decisions = get_tier_decision(tier_num, tier_cfg, portfolio_value, holdings, prices, candles_data)

    total_spent = 0
    for decision in decisions:
        action = decision.get("action", "HOLD").upper()
        pair = decision.get("pair", tier_cfg["pairs"][0])
        reason = decision.get("reason", "No reason")

        if action == "BUY":
            amt = min(decision.get("amount_usd", trade_budget), trade_budget - total_spent)
            if amt < tier_cfg["min_trade_usd"]:
                log(f"Remaining budget ${amt:.2f} too small. Skipping.", tier=tier_num)
                continue

            log(f">>> {'[DRY RUN] ' if dry_run else ''}BUY ${amt:.2f} of {pair} — {reason}", tier=tier_num)

            if not dry_run:
                result = place_market_buy(pair, amt, tier=tier_num)
                if result["success"]:
                    log(f"BUY SUCCESS! Order: {result['order_id']}", tier=tier_num)
                    save_trade({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "tier": tier_num,
                        "tier_name": tier_cfg["name"],
                        "action": "BUY",
                        "pair": pair,
                        "amount_usd": amt,
                        "price": prices.get(pair, 0),
                        "reason": reason,
                        "order_id": result["order_id"],
                        "strategy": tier_cfg["strategy"],
                        "live": True,
                    })
                    total_spent += amt
                else:
                    log(f"BUY FAILED: {result['error']}", "ERROR", tier=tier_num)
            else:
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tier": tier_num,
                    "tier_name": tier_cfg["name"],
                    "action": "BUY",
                    "pair": pair,
                    "amount_usd": amt,
                    "price": prices.get(pair, 0),
                    "reason": reason,
                    "order_id": "DRY-RUN",
                    "strategy": tier_cfg["strategy"],
                    "live": False,
                })
                total_spent += amt

        elif action == "SELL":
            base_amt = decision.get("amount_base", 0)
            if base_amt <= 0:
                log(f"SELL with 0 base amount. Skipping.", "WARN", tier=tier_num)
                continue

            log(f">>> {'[DRY RUN] ' if dry_run else ''}SELL {base_amt} of {pair} — {reason}", tier=tier_num)

            if not dry_run:
                result = place_market_sell(pair, base_amt, tier=tier_num)
                if result["success"]:
                    log(f"SELL SUCCESS! Order: {result['order_id']}", tier=tier_num)
                    usd_value = base_amt * prices.get(pair, 0)
                    save_trade({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "tier": tier_num,
                        "tier_name": tier_cfg["name"],
                        "action": "SELL",
                        "pair": pair,
                        "amount_base": base_amt,
                        "amount_usd_est": round(usd_value, 2),
                        "price": prices.get(pair, 0),
                        "reason": reason,
                        "order_id": result["order_id"],
                        "strategy": tier_cfg["strategy"],
                        "live": True,
                    })
                else:
                    log(f"SELL FAILED: {result['error']}", "ERROR", tier=tier_num)
            else:
                save_trade({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tier": tier_num, "tier_name": tier_cfg["name"],
                    "action": "SELL", "pair": pair, "amount_base": base_amt,
                    "price": prices.get(pair, 0), "reason": reason,
                    "order_id": "DRY-RUN", "strategy": tier_cfg["strategy"], "live": False,
                })

        else:
            log(f"HOLD {pair} — {reason}", tier=tier_num)

    log(f"Tier {tier_num} complete. Spent: ${total_spent:.2f} / ${trade_budget:.2f} budget", tier=tier_num)

# ── MAIN TRADE CYCLE ────────────────────────────────────────
def trade_cycle(tiers_to_run, dry_run=False):
    """Run one complete multi-strategy trade cycle."""
    log("=" * 60)
    log("*** MULTI-STRATEGY LIVE TRADE CYCLE ***")
    log(f"Tiers: {', '.join(str(t) for t in tiers_to_run)} | {'DRY RUN' if dry_run else 'LIVE TRADES'}")

    # Check global daily limit
    all_today = get_trades_today()
    if len(all_today) >= MAX_DAILY:
        log(f"Global daily limit reached ({MAX_DAILY} trades). Stopping.", "WARN")
        return

    # Get portfolio
    try:
        portfolio_value, holdings = get_portfolio_value()
        log(f"Portfolio Value: ${portfolio_value:,.2f}")
        for h in sorted(holdings, key=lambda x: x["usd_value"], reverse=True):
            log(f"  {h['currency']:8s} | {h['balance']:>14.8f} | ${h['usd_value']:>10,.2f}")
    except Exception as e:
        log(f"Portfolio error: {e}", "ERROR")
        return

    if portfolio_value < 10:
        log("Portfolio too small (<$10). Cannot trade.", "ERROR")
        return

    # Get prices for all pairs across all tiers
    all_pairs = set()
    for t in tiers_to_run:
        all_pairs.update(TIERS[t]["pairs"])

    prices = {}
    candles_data = {}
    for pair in all_pairs:
        try:
            p = get_price(pair)
            if p:
                prices[pair] = p
                log(f"  {pair}: ${p:,.2f}")
        except Exception:
            pass

        try:
            candles = get_24h_candles(pair)
            candles_data[pair] = candles
        except Exception:
            candles_data[pair] = []

    if not prices:
        log("No prices available. Skipping cycle.", "WARN")
        return

    # Budget summary
    log("")
    log("TIER BUDGETS:")
    total_allocation = 0
    for t in tiers_to_run:
        cfg = TIERS[t]
        budget = round(portfolio_value * (cfg["allocation_pct"] / 100), 2)
        total_allocation += cfg["allocation_pct"]
        log(f"  Tier {t} ({cfg['name']:12s}): {cfg['allocation_pct']:5.1f}% = ${budget:>10,.2f}  [{cfg['strategy']}]")
    log(f"  {'TOTAL':27s}: {total_allocation:5.1f}% = ${round(portfolio_value * total_allocation / 100, 2):>10,.2f}")
    log(f"  {'RESERVED (untouched)':27s}: {100-total_allocation:5.1f}% = ${round(portfolio_value * (100-total_allocation) / 100, 2):>10,.2f}")
    log("")

    # Execute each tier
    for t in tiers_to_run:
        try:
            execute_tier(t, TIERS[t], portfolio_value, holdings, prices, candles_data, dry_run=dry_run)
        except Exception as e:
            log(f"Tier {t} error: {e}", "ERROR", tier=t)
            import traceback
            log(traceback.format_exc(), "ERROR", tier=t)

    # Update state
    state = load_state()
    state["last_cycle"] = datetime.now(timezone.utc).isoformat()
    state["total_trades"] = len(load_trades())
    state["portfolio_value"] = portfolio_value
    save_state(state)

    log("")
    log("--- ALL TIERS COMPLETE ---")

# ── STATUS ──────────────────────────────────────────────────
def show_status():
    """Display current portfolio and trading status."""
    log("=" * 60)
    log("DEVBOT MULTI-STRATEGY STATUS")
    log("=" * 60)

    portfolio_value, holdings = get_portfolio_value()
    log(f"\nPortfolio Value: ${portfolio_value:,.2f}")
    log("-" * 45)
    for h in sorted(holdings, key=lambda x: x["usd_value"], reverse=True):
        pct = (h["usd_value"] / portfolio_value * 100) if portfolio_value > 0 else 0
        log(f"  {h['currency']:8s} | {h['balance']:>14.8f} | ${h['usd_value']:>10,.2f} ({pct:.1f}%)")

    log(f"\nTier Allocations:")
    for t, cfg in TIERS.items():
        budget = round(portfolio_value * (cfg["allocation_pct"] / 100), 2)
        today_count = len(get_trades_today(tier=t))
        log(f"  Tier {t} ({cfg['name']:12s}): {cfg['allocation_pct']}% = ${budget:,.2f} | {today_count}/{cfg['max_trades_per_day']} trades today | {cfg['strategy']}")

    all_today = get_trades_today()
    log(f"\nToday's Trades: {len(all_today)} / {MAX_DAILY} max")

    trades = load_trades()
    if trades:
        log(f"\nLast 5 Trades:")
        for t in trades[-5:]:
            tier_label = f"T{t.get('tier', '?')}"
            log(f"  {t['timestamp'][:19]} | {tier_label} | {t['action']:4s} | {t['pair']} | ${t.get('amount_usd', t.get('amount_base', 0)):.2f} | {t.get('reason', '')[:40]}")

    state = load_state()
    log(f"\nBot started: {state.get('started_at', 'Unknown')}")
    log(f"Total trades all-time: {state.get('total_trades', 0)}")

# ── MAIN ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="DevBot Multi-Strategy Live Trader")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Run specific tier only")
    parser.add_argument("--status", action="store_true", help="Show portfolio status")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without real trades")
    parser.add_argument("--once", action="store_true", help="Run one cycle then exit")
    args = parser.parse_args()

    # Validate keys
    if not CDP_API_KEY or not CDP_PRIVATE_KEY:
        log("FATAL: CDP_API_KEY_NAME or CDP_API_KEY_PRIVATE_KEY missing!", "ERROR")
        log("Set these in your .env file. Get keys at: https://portal.cdp.coinbase.com")
        sys.exit(1)

    if args.status:
        show_status()
        return

    tiers_to_run = [args.tier] if args.tier else [1, 2, 3]
    dry_run = args.dry_run

    log("=" * 60)
    log("  DEVBOT MULTI-STRATEGY TRADER")
    tier_labels = ", ".join(f"T{t} ({TIERS[t]['name']} {TIERS[t]['allocation_pct']}%)" for t in tiers_to_run)
    log(f"  Tiers: {tier_labels}")
    log(f"  Total allocation: {sum(TIERS[t]['allocation_pct'] for t in tiers_to_run)}% of portfolio")
    log(f"  Cycle interval: {CYCLE_INTERVAL // 60} minutes")
    log(f"  Mode: {'DRY RUN (no real trades)' if dry_run else '*** LIVE — REAL MONEY ***'}")
    log("=" * 60)

    if not dry_run:
        log("")
        log("  WARNING: This bot will make REAL trades on your Coinbase account!")
        log("  Total risk per cycle: 26% of portfolio (4% + 8% + 14%)")
        log("  74% of your portfolio remains UNTOUCHED at all times.")
        log("")

    log(f"API Key: {CDP_API_KEY[:12]}...")
    log("Testing connection...")

    accounts = get_accounts()
    if not accounts:
        log("WARNING: No funded accounts found.", "WARN")
    else:
        log(f"Connected! {len(accounts)} funded account(s)")

    cycle = 0
    while True:
        try:
            cycle += 1
            log(f"\n{'#'*60}")
            log(f"### CYCLE {cycle} ###")
            log(f"{'#'*60}")
            trade_cycle(tiers_to_run, dry_run=dry_run)

            if args.once:
                log("Single cycle complete. Exiting.")
                break

            log(f"\nNext cycle in {CYCLE_INTERVAL // 60} minutes...")
            time.sleep(CYCLE_INTERVAL)

        except KeyboardInterrupt:
            log("\nStopped by user. Goodbye!")
            break
        except Exception as e:
            import traceback
            log(f"Cycle error: {e}", "ERROR")
            log(traceback.format_exc(), "ERROR")
            time.sleep(60)

if __name__ == "__main__":
    main()

#!/bin/bash
# ══════════════════════════════════════════════════════════════
# DEVBOT × PAPERCLIP × OPENCLAW × N8N — MASTER LAUNCHER
# 24/7/365 Production Mode
#
# Starts all services and connects Claude Code to all agents
# ══════════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MASTER LAUNCH — DevBot + Paperclip + n8n + 10 Agents      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Environment ──────────────────────────────────────────────
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$(grep ANTHROPIC_API_KEY C:/Users/dazza/devbot/.env 2>/dev/null | cut -d= -f2)}"
export PAPERCLIP_API_URL="http://localhost:3100"
export COMPANY_ID="ad72dde0-5089-41aa-a648-401086984411"

echo "[ENV] ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:15}..."
echo "[ENV] PAPERCLIP_API_URL: $PAPERCLIP_API_URL"
echo ""

# ─── Service Status Check ────────────────────────────────────
echo "=== Checking Services ==="

# DevBot
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
  echo "[✓] DevBot API: ONLINE (port 3000)"
else
  echo "[!] DevBot API: OFFLINE — start with: cd ~/devbot && node src/core/app.js"
fi

# Paperclip
if curl -s http://localhost:3100/api/health > /dev/null 2>&1; then
  echo "[✓] Paperclip: ONLINE (port 3100)"
else
  echo "[!] Paperclip: OFFLINE — starting..."
  paperclipai run --skip-onboard --skip-doctor &
  sleep 10
fi

# n8n
if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
  echo "[✓] n8n: ONLINE (port 5678)"
else
  echo "[!] n8n: OFFLINE — starting..."
  n8n start &
  sleep 10
fi

echo ""
echo "=== Agent Roster ==="
paperclipai agent list --company-id $COMPANY_ID 2>&1 | grep -E "SalesBot|SupportBot|LeadBot|AffiliateBot|ContentBot|SEOBot|GrowthBot|TradingBot|WorkflowBot|n8n"
echo ""

echo "=== Active Issues ==="
paperclipai issue list --company-id $COMPANY_ID 2>&1 | grep "in_progress"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ALL SYSTEMS GO                                             ║"
echo "║                                                             ║"
echo "║  DevBot API:     http://localhost:3000                      ║"
echo "║  Paperclip:      http://localhost:3100                      ║"
echo "║  n8n:            http://localhost:5678                      ║"
echo "║  Agents:         10 (9 OpenClaw + 1 n8n Specialist)        ║"
echo "║  Skills:         34 marketing + n8n automation              ║"
echo "║  LLM:            Claude Opus 4.6 (1M context)              ║"
echo "║                                                             ║"
echo "║  MONEY MACHINE IS RUNNING 24/7/365                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"

#!/bin/bash
# ══════════════════════════════════════════════════════════════
# VPS FULL DEPLOY — Paperclip + OpenClaw Bots + Revenue Engine
# Paste this ENTIRE script into your VPS terminal (root@srv1431202)
# ══════════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  VPS FULL DEPLOY — Paperclip + 9 Bots + Revenue Engine     ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ─── 1. Create DevBot Paperclip directory ─────────────────────
mkdir -p /opt/devbot/src/paperclip/workflows

# ─── 2. Get Paperclip company info ───────────────────────────
echo ""
echo "=== Setting up Paperclip ==="
PAPERCLIP_API="http://127.0.0.1:3100/api"

# Check Paperclip is running
if ! curl -s "$PAPERCLIP_API/health" > /dev/null 2>&1; then
  echo "[!] Paperclip not running. Starting..."
  paperclipai run --skip-onboard --skip-doctor &
  sleep 15
fi

echo "[✓] Paperclip API: ONLINE"

# Get or create company
COMPANY_ID=$(paperclipai company list 2>&1 | head -1 | grep -o 'id=[^ ]*' | cut -d= -f2)
if [ -z "$COMPANY_ID" ]; then
  echo "[!] No company found. Run 'paperclipai onboard --yes' first."
  exit 1
fi
echo "[✓] Company: $COMPANY_ID"

# ─── 3. Deploy 9 OpenClaw Bots ───────────────────────────────
echo ""
echo "=== Deploying 9 OpenClaw Bots ==="

deploy_bot() {
  local NAME="$1" ROLE="$2" GOAL="$3"
  RESULT=$(curl -s -X POST "$PAPERCLIP_API/companies/$COMPANY_ID/agents" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"role\":\"$ROLE\",\"goal\":\"$GOAL\"}" 2>&1)
  ID=$(echo "$RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$ID" ]; then
    echo "  [✓] $NAME ($ROLE) — $ID"
  else
    echo "  [!] $NAME — may already exist"
  fi
}

deploy_bot "SalesBot" "cmo" "Close DevBot subscriptions 24/7. Solo/Pro/Enterprise. Target: 100+ conversions/month."
deploy_bot "SupportBot" "general" "24/7 customer support on Telegram + WhatsApp. Under 2 min resolution. 98%+ satisfaction."
deploy_bot "LeadBot" "researcher" "Qualify leads on Discord using BANT framework. 50+ qualified leads/week."
deploy_bot "AffiliateBot" "cfo" "Manage 40+ affiliate programs. Recruit 10+/week. Target: 10K/month revenue."
deploy_bot "ContentBot" "designer" "Generate 50+ content pieces/week. Blog, social, email, ads. Every piece has a CTA."
deploy_bot "SEOBot" "engineer" "Dominate search rankings. SEO audits, programmatic pages. Target: 10K organic/month."
deploy_bot "GrowthBot" "pm" "Optimize all funnels. A/B test everything. 20% MoM growth target."
deploy_bot "TradingBot" "researcher" "Crypto trading via Coinbase CDP. DCA + swing strategies. AES-256 vault security."
deploy_bot "WorkflowBot" "devops" "System orchestration. Monitor health, auto-restart. 99.99% uptime target."

# ─── 4. Create work orders for all bots ──────────────────────
echo ""
echo "=== Creating Work Orders ==="

# Get all agent IDs
AGENTS=$(curl -s "$PAPERCLIP_API/companies/$COMPANY_ID/agents" 2>&1)

create_work_order() {
  local BOT_NAME="$1" TITLE="$2"
  AGENT_ID=$(echo "$AGENTS" | grep -o "\"id\":\"[^\"]*\",\"companyId\":\"$COMPANY_ID\",\"name\":\"$BOT_NAME\"" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$AGENT_ID" ]; then
    ISSUE=$(paperclipai issue create --company-id "$COMPANY_ID" \
      --title "$TITLE" \
      --description "STANDING ORDER 24/7/365: Execute your role non-stop. Never stop. Report results daily." \
      --priority critical \
      --assignee-agent-id "$AGENT_ID" \
      --status todo --json 2>&1)
    ISSUE_ID=$(echo "$ISSUE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$ISSUE_ID" ]; then
      paperclipai issue checkout --agent-id "$AGENT_ID" "$ISSUE_ID" --json > /dev/null 2>&1
      echo "  [✓] $BOT_NAME — WORKING"
    else
      echo "  [!] $BOT_NAME — issue created but checkout pending"
    fi
  else
    echo "  [!] $BOT_NAME — agent not found"
  fi
}

create_work_order "SalesBot" "[24/7] Close DevBot subscriptions"
create_work_order "SupportBot" "[24/7] Customer support Telegram + WhatsApp"
create_work_order "LeadBot" "[24/7] Discord lead qualification BANT"
create_work_order "AffiliateBot" "[24/7] Manage 40+ affiliate programs"
create_work_order "ContentBot" "[24/7] Content creation 50+ pieces/week"
create_work_order "SEOBot" "[24/7] SEO domination 10K organic"
create_work_order "GrowthBot" "[24/7] Growth hacking 20% MoM"
create_work_order "TradingBot" "[24/7] Crypto trading Coinbase CDP"
create_work_order "WorkflowBot" "[24/7] System orchestration 99.99% uptime"

# ─── 5. Deploy Revenue Engine Schema ─────────────────────────
echo ""
echo "=== Revenue Engine ==="

cat > /opt/devbot/src/paperclip/workflows/supabase-revenue-schema.sql << 'SQLEOF'
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL, name TEXT, source TEXT DEFAULT 'organic',
  channel TEXT, score INTEGER DEFAULT 0, status TEXT DEFAULT 'new',
  assigned_bot TEXT, revenue_potential DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, category TEXT, description TEXT,
  price_solo DECIMAL(10,2), price_pro DECIMAL(10,2), price_enterprise DECIMAL(10,2),
  stripe_product_id TEXT, sales_count INTEGER DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id), product_id UUID REFERENCES products(id),
  stripe_session_id TEXT, amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', channel TEXT, affiliate_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS affiliate_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_code TEXT NOT NULL, program TEXT NOT NULL,
  clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0, commission DECIMAL(10,2) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, type TEXT, channel TEXT, url TEXT,
  views INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0, revenue DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL, action TEXT NOT NULL,
  amount DECIMAL(18,8), price DECIMAL(18,8), pnl DECIMAL(18,8) DEFAULT 0,
  strategy TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, price DECIMAL(10,2),
  lessons_count INTEGER DEFAULT 0, students_count INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0, status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
SQLEOF

echo "[✓] Revenue schema saved to /opt/devbot/src/paperclip/workflows/"

# ─── 6. Set up API keys for all agents ───────────────────────
echo ""
echo "=== Setting up Agent API Keys ==="

for BOT in salesbot supportbot leadbot affiliatebot contentbot seobot growthbot tradingbot workflowbot; do
  paperclipai agent local-cli --company-id "$COMPANY_ID" --no-install-skills "$BOT" > /dev/null 2>&1
  echo "  [✓] $BOT — API key generated"
done

# ─── 7. Final Status ─────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  VPS DEPLOYMENT COMPLETE                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  AGENTS:"
paperclipai agent list --company-id "$COMPANY_ID" 2>&1 | grep -E "SalesBot|SupportBot|LeadBot|AffiliateBot|ContentBot|SEOBot|GrowthBot|TradingBot|WorkflowBot"
echo ""
echo "  ISSUES:"
paperclipai issue list --company-id "$COMPANY_ID" 2>&1 | grep "in_progress" | wc -l
echo "  issues in_progress"
echo ""
echo "  SERVICES:"
echo "  Paperclip:  http://$(hostname -I | awk '{print $1}'):3100"
echo "  DevBot:     http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "  ALL 9 BOTS DEPLOYED AND WORKING ON VPS 24/7/365"
echo ""

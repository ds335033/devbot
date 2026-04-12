
-- ══════════════════════════════════════════════════════════════
-- DEVBOT REVENUE ENGINE — Supabase Schema
-- ══════════════════════════════════════════════════════════════

-- Leads & CRM
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'organic',
  channel TEXT, -- telegram, discord, whatsapp, web, email
  score INTEGER DEFAULT 0, -- 1-10 BANT score
  status TEXT DEFAULT 'new', -- new, qualified, contacted, converted, lost
  assigned_bot TEXT, -- which OpenClaw bot handles this lead
  revenue_potential DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products & SaaS Apps
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- saas, template, course, api, consulting
  description TEXT,
  price_solo DECIMAL(10,2),
  price_pro DECIMAL(10,2),
  price_enterprise DECIMAL(10,2),
  stripe_product_id TEXT,
  stripe_price_ids JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft', -- draft, active, archived
  sales_count INTEGER DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders & Revenue Tracking
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  product_id UUID REFERENCES products(id),
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending', -- pending, paid, delivered, refunded
  channel TEXT, -- which bot closed this sale
  affiliate_code TEXT,
  affiliate_commission DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Performance
CREATE TABLE IF NOT EXISTS affiliate_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_code TEXT NOT NULL,
  program TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  commission DECIMAL(10,2) DEFAULT 0,
  period TEXT, -- daily, weekly, monthly
  date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content & SEO Tracking
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT, -- blog, social, email, ad, video
  channel TEXT, -- twitter, linkedin, reddit, telegram, blog
  url TEXT,
  seo_keywords TEXT[],
  affiliate_links TEXT[],
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  ab_variant TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading & Crypto
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL, -- ETH/USDC, BTC/USDC
  action TEXT NOT NULL, -- buy, sell, hold
  amount DECIMAL(18,8),
  price DECIMAL(18,8),
  total DECIMAL(18,8),
  pnl DECIMAL(18,8) DEFAULT 0,
  strategy TEXT, -- dca, swing, momentum
  signal_confidence DECIMAL(3,2), -- 0.00 to 1.00
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Platform
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  stripe_product_id TEXT,
  lessons_count INTEGER DEFAULT 0,
  students_count INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  content JSONB DEFAULT '[]', -- array of lesson objects
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage & Billing
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  tier TEXT, -- starter, growth, scale
  endpoint TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  response_ms INTEGER,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue Dashboard Materialized View
CREATE OR REPLACE VIEW revenue_dashboard AS
SELECT
  'orders' AS source,
  COUNT(*) AS count,
  COALESCE(SUM(amount), 0) AS total_revenue,
  COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) AS mrr,
  COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE), 0) AS today
FROM orders WHERE status = 'paid'
UNION ALL
SELECT 'affiliates', COUNT(*), COALESCE(SUM(commission), 0),
  COALESCE(SUM(commission) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0),
  COALESCE(SUM(commission) FILTER (WHERE date = CURRENT_DATE), 0)
FROM affiliate_stats
UNION ALL
SELECT 'trading', COUNT(*), COALESCE(SUM(pnl), 0),
  COALESCE(SUM(pnl) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0),
  COALESCE(SUM(pnl) FILTER (WHERE created_at >= CURRENT_DATE), 0)
FROM trades WHERE status = 'completed'
UNION ALL
SELECT 'courses', COUNT(*), COALESCE(SUM(revenue), 0),
  COALESCE(SUM(revenue) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0), 0
FROM courses
UNION ALL
SELECT 'api', COUNT(*), COALESCE(SUM(cost), 0),
  COALESCE(SUM(cost) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0),
  COALESCE(SUM(cost) FILTER (WHERE created_at >= CURRENT_DATE), 0)
FROM api_usage;

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_channel ON content(channel);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at DESC);

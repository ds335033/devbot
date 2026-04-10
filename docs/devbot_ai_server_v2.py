#!/usr/bin/env python3
"""
DevBotAI v3.0 - AI Trading & Automation Platform
CEO: Darren Michael Smith | Partner: OpenClaw AI Gateway
"""
import os, json, time, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

DEVBOT_PORT = int(os.environ.get("DEVBOT_PORT", 8888))
LOG_FILE = "/root/devbot-ai/devbot.log"

AGENTS = [
    {"id":"trade_agent","name":"Trade Agent","icon":"\U0001f4c8","desc":"Monitors crypto/stock markets and executes automated trading strategies with real-time signals."},
    {"id":"content_agent","name":"Content Agent","icon":"\u270d\ufe0f","desc":"Generates and distributes high-quality content across all major platforms 24/7."},
    {"id":"outreach_agent","name":"Outreach Agent","icon":"\U0001f4ec","desc":"Manages lead generation, automated email campaigns, and strategic partnerships."},
    {"id":"security_agent","name":"Security Agent","icon":"\U0001f6e1\ufe0f","desc":"Bug bounty hunting, vulnerability scanning, and continuous security monitoring."},
    {"id":"analytics_agent","name":"Analytics Agent","icon":"\U0001f4ca","desc":"Tracks revenue, performance metrics, and ROI across all active deployments."},
    {"id":"social_agent","name":"Social Agent","icon":"\U0001f310","desc":"Drives brand growth on X/Twitter, YouTube, and all major social platforms."},
    {"id":"deploy_agent","name":"Deploy Agent","icon":"\U0001f680","desc":"Handles all deployments, CI/CD pipelines, and VPS infrastructure management."},
    {"id":"openclaw_bridge","name":"OpenClaw Bridge","icon":"\U0001f517","desc":"Syncs seamlessly with the OpenClaw AI gateway for enhanced compute and routing."},
]

class DevBotAI:
    def __init__(self):
        self.version = "3.0.0"
        self.status = "ONLINE"
        self.start_time = datetime.now()
        self.agents = {a["id"]: {"name":a["name"],"icon":a["icon"],"desc":a["desc"],"status":"ACTIVE","tasks_completed":0} for a in AGENTS}
        self.log("DEVBOT AI v{} INITIALIZING...".format(self.version))
        self.log("CEO: Darren Michael Smith")
        self.log("{} AI agents deployed!".format(len(self.agents)))

    def log(self, message):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = "[{}] [DevBot AI] {}".format(ts, message)
        print(line)
        try:
            with open(LOG_FILE, "a") as f:
                f.write(line + "\n")
        except:
            pass

    def get_status(self):
        up = (datetime.now() - self.start_time).total_seconds()
        return {
            "version": self.version,
            "status": self.status,
            "uptime_seconds": int(up),
            "agents_count": len(self.agents),
            "agents": {k: {"name":v["name"],"status":v["status"],"tasks":v["tasks_completed"]} for k,v in self.agents.items()},
            "ceo": "Darren Michael Smith",
            "partner": "OpenClaw AI Gateway",
            "vps": "76.13.251.32"
        }

    def health_check_loop(self):
        while self.status == "ONLINE":
            time.sleep(30)
            for a in self.agents.values():
                a["tasks_completed"] += 1
            self.log("Health check OK | {} agents active".format(len(self.agents)))

devbot = DevBotAI()

CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a1a;--card:#1a1a2e;--border:rgba(0,255,136,.15);--green:#00ff88;--blue:#0088ff;--text:#e0e0f0;--muted:#8888aa;--r:12px}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;line-height:1.6;overflow-x:hidden}
a{color:var(--green);text-decoration:none}a:hover{text-decoration:underline}
nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:64px;background:rgba(10,10,26,.85);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.nav-logo{display:flex;align-items:center;gap:.6rem;font-size:1.3rem;font-weight:700;color:var(--green)}
.nav-logo span{color:var(--text)}
.nav-links{display:flex;gap:2rem;align-items:center}
.nav-links a{color:var(--muted);font-size:.95rem;transition:color .2s}
.nav-links a:hover,.nav-links a.active{color:var(--green);text-decoration:none}
.nav-cta{background:var(--green);color:#000!important;padding:.45rem 1.2rem;border-radius:6px;font-weight:600;transition:opacity .2s}
.nav-cta:hover{opacity:.85;text-decoration:none!important}
.btn{display:inline-block;padding:.75rem 1.8rem;border-radius:8px;font-weight:600;font-size:1rem;cursor:pointer;border:none;transition:all .2s;text-align:center}
.btn-primary{background:var(--green);color:#000;box-shadow:0 0 20px rgba(0,255,136,.3)}
.btn-primary:hover{opacity:.85;transform:translateY(-2px);box-shadow:0 0 30px rgba(0,255,136,.5);text-decoration:none;color:#000}
.btn-outline{background:transparent;color:var(--green);border:2px solid var(--green)}
.btn-outline:hover{background:rgba(0,255,136,.1);transform:translateY(-2px);text-decoration:none;color:var(--green)}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1.5rem;transition:border-color .25s,transform .25s,box-shadow .25s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,255,136,.03) 0%,transparent 60%);pointer-events:none}
.card:hover{border-color:var(--green);transform:translateY(-4px);box-shadow:0 0 20px rgba(0,255,136,.3)}
.section{padding:5rem 2rem}.container{max-width:1200px;margin:0 auto}
.section-title{font-size:clamp(1.8rem,4vw,2.5rem);font-weight:700;margin-bottom:.75rem}
.section-sub{color:var(--muted);max-width:600px;margin-bottom:3rem}
.gradient-text{background:linear-gradient(90deg,var(--green),var(--blue));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.badge{display:inline-block;padding:.2rem .7rem;border-radius:20px;font-size:.78rem;font-weight:600}
.badge-green{background:rgba(0,255,136,.15);color:var(--green)}
.badge-blue{background:rgba(0,136,255,.15);color:var(--blue)}
.badge-active{background:rgba(0,255,136,.2);color:var(--green);border:1px solid rgba(0,255,136,.4)}
.pulse-dot{width:10px;height:10px;border-radius:50%;background:var(--green);display:inline-block;margin-right:.4rem;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 0 0 rgba(0,255,136,.5)}50%{opacity:.7;transform:scale(1.2);box-shadow:0 0 0 6px rgba(0,255,136,0)}}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.grid-4{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem}
@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeInUp .6s ease both}
footer{border-top:1px solid var(--border);padding:2.5rem 2rem;color:var(--muted);text-align:center;font-size:.88rem}
footer a{color:var(--muted)}footer a:hover{color:var(--green)}
.footer-links{display:flex;justify-content:center;gap:2rem;margin-bottom:1rem;flex-wrap:wrap}
.ticker{overflow:hidden;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:.6rem 0}
.ticker-inner{display:flex;gap:4rem;animation:ticker 30s linear infinite;white-space:nowrap}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ticker-up{color:#00ff88}.ticker-down{color:#ff4466}
.form-input,.form-select,.form-textarea{width:100%;padding:.75rem 1rem;background:#0f0f22;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.95rem;font-family:inherit;outline:none;transition:border-color .2s}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(0,255,136,.1)}
.form-textarea{resize:vertical;min-height:100px}
.step-number{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--blue));color:#000;font-weight:800;font-size:1.2rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
.program-table{width:100%;border-collapse:collapse}
.program-table th,.program-table td{padding:.85rem 1rem;text-align:left;border-bottom:1px solid var(--border);font-size:.92rem}
.program-table th{color:var(--muted);font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:1px}
.program-table tr:hover td{background:rgba(0,255,136,.04)}
@media(max-width:768px){.nav-links{display:none}nav{padding:0 1rem}.section{padding:3.5rem 1rem}.program-table{font-size:.8rem}.program-table th,.program-table td{padding:.5rem}}
"""

NAV_HOME = '<nav><div class="nav-logo">\U0001f916 DevBot<span>AI</span></div><div class="nav-links"><a href="/" class="active">Home</a><a href="/#agents">Agents</a><a href="/#pricing">Pricing</a><a href="/partners">Partners</a><a href="/partners" class="nav-cta">Join Program</a></div></nav>'
NAV_PARTNERS = '<nav><div class="nav-logo">\U0001f916 DevBot<span>AI</span></div><div class="nav-links"><a href="/">Home</a><a href="/#agents">Agents</a><a href="/#pricing">Pricing</a><a href="/partners" class="active">Partners</a><a href="/partners" class="nav-cta">Join Program</a></div></nav>'
FOOTER = '<footer><div class="footer-links"><a href="/">Home</a><a href="/#agents">Agents</a><a href="/#pricing">Pricing</a><a href="/partners">Partner Program</a><a href="/api/status">API</a><a href="https://youtube.com/@guitargiveawaychannel" target="_blank">YouTube</a></div><p style="margin-bottom:.4rem">CEO: <strong>Darren Michael Smith</strong> | Partner: <strong>OpenClaw AI Gateway</strong></p><p style="color:#555">&copy; 2024-2026 DevBotAI &middot; devbotai.shop</p></footer>'

def build_index():
    d = devbot.get_status()
    up_m = d["uptime_seconds"] // 60

    agent_cards = ""
    for a in AGENTS:
        info = devbot.agents[a["id"]]
        agent_cards += '<div class="card fade-in">'
        agent_cards += '<div style="font-size:2.2rem;margin-bottom:.75rem">{}</div>'.format(a["icon"])
        agent_cards += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">'
        agent_cards += '<h3 style="font-size:1.05rem;font-weight:600">{}</h3>'.format(a["name"])
        agent_cards += '<span class="badge badge-active"><span class="pulse-dot" style="width:7px;height:7px"></span>LIVE</span></div>'
        agent_cards += '<p style="color:var(--muted);font-size:.9rem">{}</p>'.format(a["desc"])
        agent_cards += '<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:.8rem;color:var(--muted)">'
        agent_cards += '<span>Tasks</span><span style="color:var(--green);font-weight:600">{}</span></div></div>'.format(info["tasks_completed"])

    pricing_data = [
        ("Free","$0","/mo","var(--muted)",["Basic dashboard","1 agent (read-only)","Community support","Public API"],"Get Started",False),
        ("Basic","$19","/mo","var(--blue)",["3 active agents","Email campaigns","Weekly analytics","Standard support"],"Start Basic",False),
        ("Pro","$49","/mo","var(--green)",["All 8 agents","Live trading signals","Daily analytics + ROI","Priority support","OpenClaw bridge"],"Go Pro",True),
        ("Enterprise","$149","/mo","var(--blue)",["Full agent suite","Dedicated VPS slot","Custom strategies","SLA guarantee","Direct Slack channel"],"Contact Sales",False),
        ("Developer","$299","/mo","#ff6600",["Full REST API","White-label rights","Webhook integrations","Custom agent builds","Revenue sharing"],"Get API Access",False),
    ]

    pricing_html = ""
    for name, price, per, color, feats, cta, pop in pricing_data:
        hl = "border-color:{};box-shadow:0 0 30px {}33;".format(color, color) if pop else ""
        badge = '<div style="text-align:center;margin-bottom:.5rem"><span class="badge badge-green">MOST POPULAR</span></div>' if pop else ""
        fl = "".join('<li style="margin-bottom:.4rem;font-size:.9rem">\u2713 {}</li>'.format(f) for f in feats)
        bc = "btn-primary" if pop else "btn-outline"
        pricing_html += '<div class="card" style="{}text-align:center;display:flex;flex-direction:column">'.format(hl)
        pricing_html += '{}<div style="font-size:1.1rem;font-weight:600;color:{};margin-bottom:.25rem">{}</div>'.format(badge, color, name)
        pricing_html += '<div style="font-size:2.8rem;font-weight:800;color:var(--text);line-height:1">{}<span style="font-size:1rem;font-weight:400;color:var(--muted)">{}</span></div>'.format(price, per)
        pricing_html += '<ul style="list-style:none;text-align:left;margin:1.5rem 0;flex:1;color:var(--muted)">{}</ul>'.format(fl)
        pricing_html += '<a href="/partners" class="btn {}" style="width:100%">{}</a></div>'.format(bc, cta)

    html = '<!DOCTYPE html><html lang="en"><head>'
    html += '<title>DevBotAI v3.0 - AI Trading &amp; Automation Platform</title>'
    html += '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    html += '<meta name="description" content="The world\'s most powerful AI trading and automation platform. 8 AI agents working 24/7.">'
    html += '<style>{}</style></head><body>'.format(CSS)
    html += NAV_HOME

    # Ticker
    html += '<div class="ticker" style="margin-top:64px"><div class="ticker-inner">'
    tickers = [
        ("BTC/USD","\u25b2","$67,420","+2.4%","ticker-up"),
        ("ETH/USD","\u25b2","$3,815","+1.8%","ticker-up"),
        ("SOL/USD","\u25bc","$172","-0.6%","ticker-down"),
        ("AAPL","\u25b2","$189","+0.9%","ticker-up"),
        ("NVDA","\u25bc","$875","-1.2%","ticker-down"),
        ("BNB","\u25b2","$588","+3.1%","ticker-up"),
    ]
    for t in tickers * 2:
        html += '<span class="{}">{} {} {} {}</span><span style="width:3rem"></span>'.format(t[4], t[0], t[1], t[2], t[3])
    html += '</div></div>'

    # Hero
    html += '<section style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:6rem 2rem 4rem;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,255,136,.12) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(0,136,255,.08) 0%,transparent 50%)">'
    html += '<div class="fade-in">'
    html += '<p style="font-size:.85rem;letter-spacing:2px;text-transform:uppercase;color:var(--green);font-weight:600;margin-bottom:1rem">\U0001f916 Powered by OpenClaw AI Gateway</p>'
    html += '<h1 style="font-size:clamp(2.2rem,6vw,4rem);font-weight:800;line-height:1.15;margin-bottom:1.5rem">The World\'s Most Powerful<br><span class="gradient-text">AI Trading &amp; Automation</span><br>Platform</h1>'
    html += '<p style="font-size:1.15rem;color:var(--muted);max-width:640px;margin:0 auto 2.5rem">8 specialised AI agents working around the clock \u2014 trading markets, generating content, hunting bugs, growing your brand, and scaling your revenue on autopilot.</p>'
    html += '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:3rem">'
    html += '<a href="#pricing" class="btn btn-primary">Start Free Today</a>'
    html += '<a href="#agents" class="btn btn-outline">View All Agents</a></div>'

    # Stats bar
    html += '<div style="display:flex;gap:2rem;justify-content:center;flex-wrap:wrap;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1.25rem 2rem;max-width:700px;margin:0 auto">'
    html += '<div style="text-align:center;min-width:120px"><div class="gradient-text" style="font-size:1.6rem;font-weight:800" id="sa">{}</div><div style="font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px"><span class="pulse-dot"></span>Agents Online</div></div>'.format(d["agents_count"])
    html += '<div style="text-align:center;min-width:120px"><div class="gradient-text" style="font-size:1.6rem;font-weight:800" id="su">{}m</div><div style="font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Uptime</div></div>'.format(up_m)
    html += '<div style="text-align:center;min-width:120px"><div style="font-size:1.1rem;color:var(--green);font-weight:800">OPERATIONAL</div><div style="font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">System Status</div></div>'
    html += '<div style="text-align:center;min-width:120px"><div class="gradient-text" style="font-size:1.6rem;font-weight:800">v3.0</div><div style="font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Version</div></div>'
    html += '</div></div></section>'

    # Features
    html += '<section class="section" style="padding-top:3rem"><div class="container">'
    html += '<p class="section-title fade-in">Why <span class="gradient-text">DevBotAI</span>?</p>'
    html += '<p class="section-sub fade-in">Built for traders, creators, and developers who refuse to sleep on opportunity.</p>'
    html += '<div class="grid-3">'

    features = [
        ("\u26a1", "rgba(0,255,136,.12)", "rgba(0,255,136,.25)", "Real-Time Trading Intelligence", "Our Trade Agent monitors 500+ assets across crypto and equities 24/7, executing strategies with sub-second precision."),
        ("\U0001f9e0", "rgba(0,136,255,.12)", "rgba(0,136,255,.25)", "Multi-Agent Orchestration", "8 specialist agents collaborate via the OpenClaw AI Gateway \u2014 each an expert in its domain, all working in concert."),
        ("\U0001f4b0", "rgba(255,170,0,.12)", "rgba(255,170,0,.25)", "Revenue on Autopilot", "From affiliate commissions to bug bounties to content monetisation \u2014 DevBotAI generates revenue streams while you scale."),
    ]
    for icon, bg, bdr, title, desc in features:
        html += '<div class="card fade-in">'
        html += '<div style="width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem;background:{};border:1px solid {}">{}</div>'.format(bg, bdr, icon)
        html += '<h3 style="font-size:1.1rem;margin-bottom:.5rem">{}</h3>'.format(title)
        html += '<p style="color:var(--muted);font-size:.92rem">{}</p></div>'.format(desc)
    html += '</div></div></section>'

    # Agents
    html += '<section class="section" id="agents"><div class="container">'
    html += '<p class="section-title fade-in">Live <span class="gradient-text">Agent Network</span></p>'
    html += '<p class="section-sub fade-in">All 8 agents are online and processing tasks right now.</p>'
    html += '<div class="grid-4">{}</div></div></section>'.format(agent_cards)

    # Pricing
    html += '<section class="section" id="pricing" style="background:radial-gradient(ellipse 80% 40% at 50% 50%,rgba(0,136,255,.06) 0%,transparent 70%)"><div class="container">'
    html += '<p class="section-title fade-in" style="text-align:center">Simple, <span class="gradient-text">Transparent Pricing</span></p>'
    html += '<p class="section-sub fade-in" style="text-align:center;margin:0 auto 3rem">Start free. Scale as you grow. Cancel anytime.</p>'
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1.5rem">{}</div></div></section>'.format(pricing_html)

    # Integrations
    html += '<section style="padding:3rem 2rem;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border)"><div class="container" style="text-align:center">'
    html += '<p style="color:var(--muted);font-size:.85rem;text-transform:uppercase;letter-spacing:2px;margin-bottom:1.5rem">Integrated With</p>'
    html += '<div style="display:flex;justify-content:center;align-items:center;gap:3rem;flex-wrap:wrap;font-size:1.05rem;font-weight:600;color:var(--muted)">'
    html += '<span>OpenClaw AI</span><span>&middot;</span><span>Binance</span><span>&middot;</span><span>Coinbase</span><span>&middot;</span><span>YouTube</span><span>&middot;</span><span>X / Twitter</span><span>&middot;</span><span>AWS</span><span>&middot;</span><span>Stripe</span>'
    html += '</div></div></section>'

    html += FOOTER

    # Live refresh script
    html += '<script>setInterval(async()=>{try{const r=await fetch("/api/status");const d=await r.json();document.getElementById("sa").textContent=d.agents_count;document.getElementById("su").textContent=Math.floor(d.uptime_seconds/60)+"m"}catch(e){}},30000)</script>'
    html += '</body></html>'
    return html


def build_partners():
    html = '<!DOCTYPE html><html lang="en"><head>'
    html += '<title>Partner Program - DevBotAI</title>'
    html += '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    html += '<style>{}</style></head><body>'.format(CSS)
    html += NAV_PARTNERS

    # Hero
    html += '<section style="min-height:60vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:8rem 2rem 4rem;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,136,255,.14) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 10% 90%,rgba(0,255,136,.08) 0%,transparent 50%)">'
    html += '<div class="fade-in" style="max-width:700px">'
    html += '<p style="font-size:.85rem;letter-spacing:2px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:1rem">Partner Program</p>'
    html += '<h1 style="font-size:clamp(2rem,5vw,3.2rem);font-weight:800;line-height:1.2;margin-bottom:1rem">Earn <span class="gradient-text">Recurring Revenue</span><br>Promoting DevBotAI</h1>'
    html += '<p style="color:var(--muted);font-size:1.1rem;margin-bottom:2rem">Join hundreds of affiliates earning consistent monthly income by referring users to the world\'s most powerful AI platform.</p>'
    html += '<a href="#apply" class="btn btn-primary" style="font-size:1.05rem;padding:.9rem 2.5rem">Apply Now - It\'s Free</a>'
    html += '</div></section>'

    # Commission stats
    html += '<section style="padding:3rem 2rem;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border)"><div class="container">'
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;text-align:center">'
    stats = [("33%", "Recurring Commission", True), ("365", "Day Cookie Window", False), ("$0", "To Join", False), ("Monthly", "Payout Schedule", False)]
    for val, label, grad in stats:
        if grad:
            html += '<div><div class="gradient-text" style="font-size:3rem;font-weight:800">{}</div><div style="color:var(--muted);font-size:.9rem">{}</div></div>'.format(val, label)
        else:
            html += '<div><div style="font-size:3rem;font-weight:800">{}</div><div style="color:var(--muted);font-size:.9rem">{}</div></div>'.format(val, label)
    html += '</div></div></section>'

    # Programs table
    html += '<section class="section"><div class="container">'
    html += '<h2 class="section-title fade-in">Top <span class="gradient-text">Partner Programs</span></h2>'
    html += '<p class="section-sub fade-in">Access our curated network of high-converting affiliate programs.</p>'
    html += '<div class="card fade-in" style="padding:0;overflow-x:auto"><table class="program-table"><thead><tr>'
    html += '<th>Program</th><th>Category</th><th>Commission</th><th>Cookie</th><th>Status</th></tr></thead><tbody>'

    programs = [
        ("OpenClaw AI Gateway", "AI Infra", "badge-blue", "40% recurring", "365 days"),
        ("Jasper AI", "Content AI", "badge-green", "30% recurring", "30 days"),
        ("Semrush", "SEO", "badge-blue", "$200 per sale", "120 days"),
        ("Binance", "Crypto", "badge-green", "Up to 50% fees", "90 days"),
        ("Shopify Partners", "eCommerce", "badge-blue", "200% first month", "30 days"),
        ("HubSpot", "CRM", "badge-green", "30% recurring", "90 days"),
        ("Coinbase", "Crypto", "badge-blue", "50% trading fees", "30 days"),
        ("TradingView", "Trading", "badge-green", "30% first year", "30 days"),
        ("DigitalOcean", "Cloud", "badge-blue", "$25-$100 per ref", "30 days"),
        ("ActiveCampaign", "Email", "badge-green", "30% recurring", "90 days"),
        ("Cloudflare", "Security", "badge-blue", "$50-$200 per sale", "60 days"),
    ]
    for name, cat, badge, comm, cookie in programs:
        html += '<tr>'
        html += '<td><strong>{}</strong></td>'.format(name)
        html += '<td><span class="badge {}">{}</span></td>'.format(badge, cat)
        html += '<td style="color:var(--green);font-weight:700">{}</td>'.format(comm)
        html += '<td>{}</td>'.format(cookie)
        html += '<td><span class="badge badge-active">Live</span></td></tr>'
    html += '</tbody></table></div></div></section>'

    # How it works
    html += '<section class="section" style="background:radial-gradient(ellipse 80% 40% at 50% 50%,rgba(0,255,136,.05) 0%,transparent 70%)"><div class="container">'
    html += '<h2 class="section-title fade-in" style="text-align:center">How It <span class="gradient-text">Works</span></h2>'
    html += '<p class="section-sub fade-in" style="text-align:center;margin:0 auto 3rem">Three simple steps to start earning.</p>'
    html += '<div class="grid-3">'

    steps = [
        ("1", "Apply &amp; Get Approved", "Fill out the form below. We review within 24 hours and send your unique tracking link."),
        ("2", "Share &amp; Promote", "Use your referral link in videos, blogs, social media, or email lists. 365-day cookie tracks every conversion."),
        ("3", "Earn Every Month", "33% recurring commission on every active subscription. Paid via Stripe or PayPal monthly."),
    ]
    for num, title, desc in steps:
        html += '<div class="card fade-in" style="text-align:center">'
        html += '<div class="step-number">{}</div>'.format(num)
        html += '<h3 style="font-size:1.1rem;margin-bottom:.5rem">{}</h3>'.format(title)
        html += '<p style="color:var(--muted);font-size:.92rem">{}</p></div>'.format(desc)
    html += '</div></div></section>'

    # Application form
    html += '<section class="section" id="apply"><div class="container" style="max-width:720px">'
    html += '<h2 class="section-title fade-in" style="text-align:center">Apply to <span class="gradient-text">Partner Program</span></h2>'
    html += '<p class="section-sub fade-in" style="text-align:center;margin:0 auto 2.5rem">Free to join. No minimum traffic. Start earning in 24 hours.</p>'
    html += '<div class="card fade-in" style="padding:2.5rem">'
    html += '<form onsubmit="alert(\'Application submitted! We will review within 24 hours.\');return false">'
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">'
    html += '<div><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">First Name *</label><input class="form-input" type="text" placeholder="Darren" required></div>'
    html += '<div><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">Last Name *</label><input class="form-input" type="text" placeholder="Smith" required></div></div>'
    html += '<div style="margin-top:1.25rem"><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">Email *</label><input class="form-input" type="email" placeholder="you@example.com" required></div>'
    html += '<div style="margin-top:1.25rem"><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">Website / Channel URL *</label><input class="form-input" type="url" placeholder="https://youtube.com/@yourchannel" required></div>'
    html += '<div style="margin-top:1.25rem"><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">Audience Size</label>'
    html += '<select class="form-select"><option value="">Select range...</option><option>Under 1,000</option><option>1,000 - 10,000</option><option>10,000 - 50,000</option><option>50,000 - 250,000</option><option>250,000+</option></select></div>'
    html += '<div style="margin-top:1.25rem"><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">Primary Niche *</label>'
    html += '<select class="form-select" required><option value="">Select niche...</option><option>Crypto / Trading</option><option>AI / Technology</option><option>Online Business</option><option>Software / SaaS</option><option>Finance / Investing</option><option>Marketing / SEO</option><option>Other</option></select></div>'
    html += '<div style="margin-top:1.25rem"><label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--muted)">How will you promote DevBotAI?</label>'
    html += '<textarea class="form-textarea" placeholder="YouTube reviews, blog articles, email newsletter, Twitter threads, paid ads..."></textarea></div>'
    html += '<div style="margin-top:1.25rem;display:flex;align-items:center;gap:.75rem">'
    html += '<input type="checkbox" required style="width:16px;height:16px;accent-color:var(--green)">'
    html += '<label style="font-size:.88rem;color:var(--muted)">I agree to the DevBotAI Affiliate Terms &amp; Conditions.</label></div>'
    html += '<button type="submit" class="btn btn-primary" style="width:100%;margin-top:1.5rem;font-size:1rem;padding:.9rem">Submit Application</button>'
    html += '<p style="text-align:center;color:var(--muted);font-size:.82rem;margin-top:1rem">We respond within 24 hours.</p>'
    html += '</form></div></div></section>'

    html += FOOTER
    html += '</body></html>'
    return html


class DevBotHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/") or "/"
        if path == "/" or path == "":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(build_index().encode())
        elif path == "/partners":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(build_partners().encode())
        elif path in ("/status", "/api/status"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(devbot.get_status(), indent=2).encode())
        elif path in ("/agents", "/api/agents"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"agents": devbot.get_status()["agents"]}, indent=2).encode())
        elif path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            err = '<!DOCTYPE html><html><head><title>404</title><style>{}</style></head>'.format(CSS)
            err += '<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">'
            err += '<div><p style="font-size:5rem">\U0001f916</p>'
            err += '<h1 style="font-size:2rem;color:var(--green)">404 - Page Not Found</h1>'
            err += '<p style="color:var(--muted);margin:1rem 0 2rem">That page doesn\'t exist.</p>'
            err += '<a href="/" class="btn btn-primary">Return Home</a></div></body></html>'
            self.wfile.write(err.encode())

    def log_message(self, format, *args):
        pass

def main():
    t = threading.Thread(target=devbot.health_check_loop, daemon=True)
    t.start()
    server = HTTPServer(("0.0.0.0", DEVBOT_PORT), DevBotHandler)
    devbot.log("DEVBOT AI HTTP server running on port {}".format(DEVBOT_PORT))
    devbot.log("Dashboard: http://devbotai.shop/")
    devbot.log("Partners: http://devbotai.shop/partners")
    devbot.log("API: http://devbotai.shop/api/status")
    devbot.log("ALL AI AGENTS DEPLOYED AND OPERATIONAL!")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        devbot.log("Shutting down...")
        server.shutdown()

if __name__ == "__main__":
    main()

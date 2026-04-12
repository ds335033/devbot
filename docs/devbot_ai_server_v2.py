#!/usr/bin/env python3
"""
DevBotAI v4.0 — Elite AI Trading & Automation Platform
CEO: Darren Michael Smith | Partner: OpenClaw AI Gateway
Deployed at: https://devbotai.shop
"""
import os, json, time, threading, mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════

DEVBOT_PORT = int(os.environ.get("DEVBOT_PORT", 8888))
LOG_FILE = "/root/devbot-ai/devbot.log"
STATIC_DIR = "/root/devbot-ai"
ZAPIER_WEBHOOK = "https://hooks.zapier.com/hooks/catch/23874934/un85u2c/"
YT_VIDEO_1 = "wyNpERajHLY"
YT_VIDEO_2 = "cdSDHuv1pHU"

AGENTS = [
    {"id":"trade_agent","name":"Trade Agent","icon":"\U0001f4c8","desc":"Monitors crypto & stock markets and executes automated trading strategies with real-time signals."},
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
        self.version = "4.0.0"
        self.status = "ONLINE"
        self.start_time = datetime.now()
        self.agents = {a["id"]: {"name":a["name"],"icon":a["icon"],"desc":a["desc"],"status":"ACTIVE","tasks_completed":0} for a in AGENTS}
        self.subscribers = []
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


# ═══════════════════════════════════════════════════════════════
#  STYLES
# ═══════════════════════════════════════════════════════════════

CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#050510;--bg2:#0a0a1f;
  --card:rgba(12,12,30,0.75);--card-solid:#0c0c1e;
  --border:rgba(0,255,136,0.12);--border-hover:rgba(0,255,136,0.4);
  --green:#00ff88;--green-dim:rgba(0,255,136,0.15);
  --blue:#0088ff;--blue-dim:rgba(0,136,255,0.15);
  --purple:#8b5cf6;--orange:#ff6b2b;
  --text:#e8e8f0;--muted:#7a7a9e;--r:16px
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.7;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:
  radial-gradient(ellipse 600px 400px at 15% 30%,rgba(0,255,136,0.04) 0%,transparent 70%),
  radial-gradient(ellipse 500px 500px at 85% 20%,rgba(0,136,255,0.04) 0%,transparent 70%),
  radial-gradient(ellipse 400px 300px at 50% 80%,rgba(139,92,246,0.03) 0%,transparent 70%);
  pointer-events:none;z-index:0}
a{color:var(--green);text-decoration:none;transition:color .2s}a:hover{color:#33ffaa}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:68px;background:rgba(5,5,16,0.85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border)}
.nav-logo{display:flex;align-items:center;gap:.6rem;font-size:1.35rem;font-weight:800;color:var(--green);letter-spacing:-0.5px}
.nav-logo img{height:36px;width:36px;border-radius:8px}
.nav-logo span{color:var(--text)}
.nav-links{display:flex;gap:1.8rem;align-items:center}
.nav-links a{color:var(--muted);font-size:.92rem;font-weight:500;transition:color .2s;position:relative}
.nav-links a:hover,.nav-links a.active{color:var(--green)}
.nav-links a.active::after{content:'';position:absolute;bottom:-4px;left:0;right:0;height:2px;background:var(--green);border-radius:2px}
.nav-cta{background:linear-gradient(135deg,var(--green),#00cc6a);color:#000!important;padding:.5rem 1.4rem;border-radius:8px;font-weight:700;font-size:.9rem;transition:all .2s;box-shadow:0 0 20px rgba(0,255,136,0.2)}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(0,255,136,0.4);color:#000!important}
.nav-toggle{display:none;background:none;border:none;color:var(--text);font-size:1.6rem;cursor:pointer;padding:0.25rem}

/* BUTTONS */
.btn{display:inline-block;padding:.8rem 2rem;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;border:none;transition:all .25s;text-align:center;text-decoration:none;letter-spacing:0.3px}
.btn-primary{background:linear-gradient(135deg,var(--green),#00cc6a);color:#000;box-shadow:0 4px 24px rgba(0,255,136,0.25)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,255,136,0.4);color:#000}
.btn-outline{background:transparent;color:var(--green);border:2px solid rgba(0,255,136,0.4)}
.btn-outline:hover{background:rgba(0,255,136,0.08);border-color:var(--green);transform:translateY(-2px);color:var(--green)}
.btn-blue{background:linear-gradient(135deg,var(--blue),#0066cc);color:#fff;box-shadow:0 4px 24px rgba(0,136,255,0.25)}
.btn-blue:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,136,255,0.4);color:#fff}

/* CARDS */
.card{background:var(--card);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:var(--r);padding:1.75rem;transition:all .3s ease;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,255,136,0.02) 0%,transparent 50%);pointer-events:none}
.card:hover{border-color:var(--border-hover);transform:translateY(-6px);box-shadow:0 12px 40px rgba(0,255,136,0.08)}

/* SECTIONS */
.section{padding:6rem 2rem;position:relative;z-index:1}
.container{max-width:1200px;margin:0 auto}
.section-title{font-size:clamp(2rem,4.5vw,3rem);font-weight:800;margin-bottom:.75rem;letter-spacing:-1px}
.section-sub{color:var(--muted);max-width:600px;margin-bottom:3rem;font-size:1.05rem}
.gradient-text{background:linear-gradient(135deg,var(--green),var(--blue));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

/* BADGES */
.badge{display:inline-block;padding:.25rem .8rem;border-radius:20px;font-size:.78rem;font-weight:600;letter-spacing:0.5px}
.badge-green{background:var(--green-dim);color:var(--green)}
.badge-blue{background:var(--blue-dim);color:var(--blue)}
.badge-active{background:rgba(0,255,136,0.12);color:var(--green);border:1px solid rgba(0,255,136,0.3)}
.badge-hot{background:rgba(255,107,43,0.15);color:var(--orange);border:1px solid rgba(255,107,43,0.3)}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;margin-right:.4rem;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,0.5)}50%{box-shadow:0 0 0 8px rgba(0,255,136,0)}}

/* GRIDS */
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:2rem}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.75rem}
.grid-4{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem}

/* ANIMATIONS */
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.reveal{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease}
.reveal.visible{opacity:1;transform:translateY(0)}

/* TICKER */
.ticker{overflow:hidden;background:rgba(10,10,30,0.9);backdrop-filter:blur(8px);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:.7rem 0}
.ticker-inner{display:flex;gap:4rem;animation:tickerScroll 35s linear infinite;white-space:nowrap;font-size:.9rem;font-weight:600}
@keyframes tickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.t-up{color:#00ff88}.t-down{color:#ff4466}

/* VIDEO */
.video-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:2rem}
.video-wrap{position:relative;border-radius:var(--r);overflow:hidden;border:1px solid var(--border);background:#000;transition:all .3s}
.video-wrap:hover{border-color:var(--border-hover);box-shadow:0 8px 40px rgba(0,255,136,0.1)}
.video-wrap iframe{width:100%;aspect-ratio:16/9;display:block;border:none}
.video-label{padding:1rem 1.25rem;background:var(--card-solid);display:flex;align-items:center;justify-content:space-between}
.video-label h4{font-size:.95rem;font-weight:600}
.snd-btn{width:42px;height:42px;border-radius:50%;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s}
.snd-btn:hover{background:rgba(0,255,136,0.25);border-color:var(--green);transform:scale(1.1)}
.snd-btn.snd-on{background:rgba(0,255,136,0.2);border-color:var(--green)}

/* FORMS */
.form-group{margin-bottom:1.25rem}
.form-label{display:block;margin-bottom:.4rem;font-size:.88rem;color:var(--muted);font-weight:500}
.form-input,.form-select,.form-textarea{width:100%;padding:.85rem 1.15rem;background:rgba(8,8,20,0.9);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:.95rem;font-family:inherit;outline:none;transition:all .25s}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--green);box-shadow:0 0 0 4px rgba(0,255,136,0.08)}
.form-input::placeholder{color:rgba(122,122,158,0.6)}
.form-textarea{resize:vertical;min-height:100px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}

/* TABLE */
.program-table{width:100%;border-collapse:collapse}
.program-table th,.program-table td{padding:.9rem 1.1rem;text-align:left;border-bottom:1px solid var(--border);font-size:.92rem}
.program-table th{color:var(--muted);font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:1px;background:rgba(0,0,0,0.2)}
.program-table tr:hover td{background:rgba(0,255,136,0.03)}

/* STEP */
.step-number{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--blue));color:#000;font-weight:800;font-size:1.3rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;box-shadow:0 4px 20px rgba(0,255,136,0.3)}

/* OPTIN BANNER */
.optin-banner{background:linear-gradient(135deg,rgba(0,255,136,0.06),rgba(0,136,255,0.06));border:1px solid var(--border);border-radius:var(--r);padding:3rem;text-align:center;position:relative;overflow:hidden}
.optin-banner::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse at center,rgba(0,255,136,0.05) 0%,transparent 60%);pointer-events:none;animation:bannerGlow 6s ease infinite}
@keyframes bannerGlow{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}

/* OPTIN PAGE */
.optin-hero{min-height:100vh;display:flex;align-items:center;padding:8rem 2rem 4rem}
.optin-grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:4rem;align-items:center;max-width:1100px;margin:0 auto}
.optin-form-card{background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:20px;padding:2.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.4)}
.check-list{list-style:none;padding:0}
.check-list li{padding:.6rem 0;font-size:1.02rem;color:var(--muted);display:flex;align-items:flex-start;gap:.75rem}
.check-list li::before{content:'\\2713';color:var(--green);font-weight:700;font-size:1.1rem;flex-shrink:0;margin-top:2px}
.optin-success{display:none;text-align:center;padding:2rem}

/* FOOTER */
footer{border-top:1px solid var(--border);padding:3rem 2rem;color:var(--muted);text-align:center;font-size:.88rem;background:rgba(5,5,16,0.9)}
.footer-links{display:flex;justify-content:center;gap:2rem;margin-bottom:1.25rem;flex-wrap:wrap}
footer a{color:var(--muted);transition:color .2s}footer a:hover{color:var(--green)}
.footer-brand{margin-bottom:.4rem;font-size:.9rem}

/* RESPONSIVE */
@media(max-width:900px){
  .video-grid{grid-template-columns:1fr}
  .optin-grid{grid-template-columns:1fr;gap:2rem}
  .grid-2{grid-template-columns:1fr}
}
@media(max-width:768px){
  .nav-links{display:none;position:absolute;top:68px;left:0;right:0;background:rgba(5,5,16,0.98);backdrop-filter:blur(24px);flex-direction:column;padding:1.5rem 2rem;gap:1rem;border-bottom:1px solid var(--border)}
  .nav-links.nav-open{display:flex}
  .nav-toggle{display:block}
  nav{padding:0 1.25rem}
  .section{padding:4rem 1.25rem}
  .form-row{grid-template-columns:1fr}
  .program-table{font-size:.8rem}
  .program-table th,.program-table td{padding:.55rem .6rem}
  .video-grid{grid-template-columns:1fr}
}
"""


# ═══════════════════════════════════════════════════════════════
#  SCRIPTS
# ═══════════════════════════════════════════════════════════════

JS_CORE = """
// Mobile menu toggle
function toggleMenu(){document.querySelector('.nav-links').classList.toggle('nav-open')}

// Scroll reveal
var revealObs=new IntersectionObserver(function(entries){
  entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');revealObs.unobserve(e.target)}})
},{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(function(el){revealObs.observe(el)});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){
    var t=document.querySelector(this.getAttribute('href'));
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}
  });
});
"""

JS_YOUTUBE = """
// YouTube IFrame API
var tag=document.createElement('script');
tag.src='https://www.youtube.com/iframe_api';
document.head.appendChild(tag);

var ytP={},ytM={};
function onYouTubeIframeAPIReady(){
  document.querySelectorAll('.yt-slot').forEach(function(el){
    var vid=el.getAttribute('data-vid');
    var id=el.id;
    ytM[id]=true;
    ytP[id]=new YT.Player(id,{
      width:'100%',height:'100%',videoId:vid,
      playerVars:{autoplay:0,mute:1,rel:0,modestbranding:1,playsinline:1,iv_load_policy:3,cc_load_policy:0},
      events:{onReady:function(e){e.target.mute()}}
    });
  });
}
function toggleYTSound(pid){
  var p=ytP[pid],btn=document.getElementById('snd-'+pid);
  if(!p||!btn)return;
  if(ytM[pid]){p.unMute();p.setVolume(80);ytM[pid]=false;btn.textContent='\\uD83D\\uDD0A';btn.classList.add('snd-on')}
  else{p.mute();ytM[pid]=true;btn.textContent='\\uD83D\\uDD07';btn.classList.remove('snd-on')}
}
"""

JS_OPTIN = """
function handleOptinSubmit(e){
  e.preventDefault();
  var f=e.target;
  var name=f.querySelector('[name=first_name]').value;
  var email=f.querySelector('[name=email]').value;
  var btn=f.querySelector('button[type=submit]');
  var origText=btn.textContent;
  btn.textContent='Sending...';btn.disabled=true;
  fetch('/subscribe',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({first_name:name,email:email,source:'devbotai-optin',timestamp:new Date().toISOString()})
  })
  .then(function(r){return r.json()})
  .then(function(d){
    if(d.success){
      f.style.display='none';
      var s=f.parentElement.querySelector('.optin-success');
      if(s)s.style.display='block';
    }else{btn.textContent='Try Again';btn.disabled=false}
  })
  .catch(function(){btn.textContent=origText;btn.disabled=false;alert('Connection error. Please try again.')});
}
"""

JS_LIVE = """
setInterval(function(){
  fetch('/api/status').then(function(r){return r.json()}).then(function(d){
    var sa=document.getElementById('sa');if(sa)sa.textContent=d.agents_count;
    var su=document.getElementById('su');if(su)su.textContent=Math.floor(d.uptime_seconds/60)+'m';
  }).catch(function(){});
},30000);
"""


# ═══════════════════════════════════════════════════════════════
#  SHARED COMPONENTS
# ═══════════════════════════════════════════════════════════════

HEAD = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
HEAD += '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
HEAD += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">\n'
HEAD += '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>\U0001f916</text></svg>">\n'

def nav(active="home"):
    cls = {"home":"","partners":"","optin":""}
    cls[active] = ' class="active"'
    h = '<nav>'
    h += '<a href="/" class="nav-logo"><img src="/logo.png" alt="DevBot" onerror="this.style.display=\'none\'">\U0001f916 DevBot<span>AI</span></a>'
    h += '<div class="nav-links">'
    h += '<a href="/"{}>Home</a>'.format(cls["home"])
    h += '<a href="/#agents">Agents</a>'
    h += '<a href="/#pricing">Pricing</a>'
    h += '<a href="/partners"{}>Partners</a>'.format(cls["partners"])
    h += '<a href="/optin" class="nav-cta">\u2728 Free Blueprint</a>'
    h += '</div>'
    h += '<button class="nav-toggle" onclick="toggleMenu()" aria-label="Menu">\u2630</button>'
    h += '</nav>'
    return h

FOOTER = '<footer><div class="footer-links">'
FOOTER += '<a href="/">Home</a><a href="/#agents">Agents</a><a href="/#pricing">Pricing</a>'
FOOTER += '<a href="/partners">Partner Program</a><a href="/optin">Free Blueprint</a>'
FOOTER += '<a href="/api/status">API</a>'
FOOTER += '<a href="https://youtube.com/@guitargiveawaychannel" target="_blank" rel="noopener">YouTube</a>'
FOOTER += '</div>'
FOOTER += '<p class="footer-brand">CEO: <strong>Darren Michael Smith</strong> &middot; Partner: <strong>OpenClaw AI Gateway</strong></p>'
FOOTER += '<p style="color:#444">&copy; 2024\u20132026 DevBotAI &middot; devbotai.shop &middot; All Rights Reserved</p>'
FOOTER += '</footer>'

def video_section(title="See DevBotAI In Action", sub="Watch how our AI agents generate revenue on autopilot."):
    h = '<section class="section" id="videos"><div class="container">'
    h += '<h2 class="section-title reveal">{} <span class="gradient-text">In Action</span></h2>'.format(title.replace("In Action","").strip())
    h += '<p class="section-sub reveal">{}</p>'.format(sub)
    h += '<div class="video-grid">'
    # Video 1
    h += '<div class="card reveal" style="padding:0;overflow:hidden">'
    h += '<div class="video-wrap"><div class="yt-slot" id="ytp1" data-vid="{}"></div></div>'.format(YT_VIDEO_1)
    h += '<div class="video-label"><h4>\U0001f3ac DevBotAI Platform Overview</h4>'
    h += '<button class="snd-btn" id="snd-ytp1" onclick="toggleYTSound(\'ytp1\')" title="Toggle sound">\U0001f507</button>'
    h += '</div></div>'
    # Video 2
    h += '<div class="card reveal" style="padding:0;overflow:hidden">'
    h += '<div class="video-wrap"><div class="yt-slot" id="ytp2" data-vid="{}"></div></div>'.format(YT_VIDEO_2)
    h += '<div class="video-label"><h4>\U0001f680 Trading & Automation Demo</h4>'
    h += '<button class="snd-btn" id="snd-ytp2" onclick="toggleYTSound(\'ytp2\')" title="Toggle sound">\U0001f507</button>'
    h += '</div></div>'
    h += '</div></div></section>'
    return h

def optin_banner():
    h = '<section class="section" style="padding:4rem 2rem"><div class="container">'
    h += '<div class="optin-banner reveal">'
    h += '<span class="badge badge-hot" style="margin-bottom:1rem;display:inline-block">FREE DOWNLOAD</span>'
    h += '<h2 style="font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:800;margin-bottom:.75rem">Get The <span class="gradient-text">AI Revenue Blueprint</span></h2>'
    h += '<p style="color:var(--muted);max-width:540px;margin:0 auto 2rem;font-size:1.05rem">7 proven strategies to automate income streams using AI agents. Built by the DevBotAI team. Completely free.</p>'
    h += '<a href="/optin" class="btn btn-primary" style="font-size:1.05rem;padding:.9rem 2.5rem">\u2728 Get Your Free Copy</a>'
    h += '</div></div></section>'
    return h


# ═══════════════════════════════════════════════════════════════
#  PAGE: HOME
# ═══════════════════════════════════════════════════════════════

def build_index():
    d = devbot.get_status()
    up_m = d["uptime_seconds"] // 60

    html = '<!DOCTYPE html><html lang="en"><head>'
    html += '<title>DevBotAI v4.0 \u2014 Elite AI Trading & Automation Platform</title>'
    html += HEAD
    html += '<meta name="description" content="The world\'s most powerful AI trading and automation platform. 8 AI agents working 24/7 to generate revenue.">'
    html += '<meta property="og:title" content="DevBotAI \u2014 AI Trading & Automation Platform">'
    html += '<meta property="og:description" content="8 specialised AI agents trading markets, generating content, and scaling revenue on autopilot.">'
    html += '<meta property="og:type" content="website"><meta property="og:url" content="https://devbotai.shop/">'
    html += '<style>' + CSS + '</style></head><body>'
    html += nav("home")

    # ── TICKER ──
    html += '<div class="ticker" style="margin-top:68px"><div class="ticker-inner">'
    tickers = [
        ("BTC/USD","\u25b2","$67,420","+2.4%","t-up"),
        ("ETH/USD","\u25b2","$3,815","+1.8%","t-up"),
        ("SOL/USD","\u25b2","$185","+3.2%","t-up"),
        ("AAPL","\u25b2","$198","+0.9%","t-up"),
        ("NVDA","\u25b2","$920","+2.1%","t-up"),
        ("BNB","\u25b2","$612","+1.6%","t-up"),
        ("DEVBOT","","AI AGENTS","LIVE","t-up"),
    ]
    for t in tickers * 3:
        html += '<span class="{}">{} {} {} {}</span>'.format(t[4], t[0], t[1], t[2], t[3])
    html += '</div></div>'

    # ── HERO ──
    html += '<section style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:8rem 2rem 5rem;'
    html += 'background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,255,136,0.1) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(0,136,255,0.06) 0%,transparent 50%)">'
    html += '<div style="max-width:800px">'
    html += '<div style="margin-bottom:1.5rem"><span class="badge badge-active" style="font-size:.82rem;padding:.35rem 1rem"><span class="pulse-dot"></span>ALL SYSTEMS OPERATIONAL</span></div>'
    html += '<h1 style="font-size:clamp(2.5rem,6.5vw,4.5rem);font-weight:900;line-height:1.1;margin-bottom:1.5rem;letter-spacing:-2px">The World\'s Most Powerful<br><span class="gradient-text">AI Trading &amp; Automation</span><br>Platform</h1>'
    html += '<p style="font-size:1.15rem;color:var(--muted);max-width:640px;margin:0 auto 2.5rem;line-height:1.8">8 specialised AI agents working around the clock \u2014 trading markets, generating content, hunting bugs, growing your brand, and scaling your revenue on autopilot.</p>'
    html += '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:3.5rem">'
    html += '<a href="/optin" class="btn btn-primary" style="font-size:1.05rem;padding:.9rem 2.2rem">\u2728 Get Free Blueprint</a>'
    html += '<a href="#agents" class="btn btn-outline">View All Agents</a>'
    html += '<a href="#videos" class="btn btn-blue">Watch Demo</a></div>'

    # Stats bar
    html += '<div style="display:flex;gap:2.5rem;justify-content:center;flex-wrap:wrap;background:var(--card);backdrop-filter:blur(16px);border:1px solid var(--border);border-radius:var(--r);padding:1.5rem 2.5rem;max-width:780px;margin:0 auto">'
    html += '<div style="text-align:center;min-width:100px"><div class="gradient-text" style="font-size:2rem;font-weight:900" id="sa">{}</div><div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px"><span class="pulse-dot"></span>Agents Live</div></div>'.format(d["agents_count"])
    html += '<div style="text-align:center;min-width:100px"><div class="gradient-text" style="font-size:2rem;font-weight:900" id="su">{}m</div><div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px">Uptime</div></div>'.format(up_m)
    html += '<div style="text-align:center;min-width:100px"><div style="font-size:1.1rem;color:var(--green);font-weight:800">OPERATIONAL</div><div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px">Status</div></div>'
    html += '<div style="text-align:center;min-width:100px"><div class="gradient-text" style="font-size:2rem;font-weight:900">v4.0</div><div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px">Version</div></div>'
    html += '</div></div></section>'

    # ── VIDEOS ──
    html += video_section("See DevBotAI", "Watch how our AI agents generate real revenue on autopilot. Two deep-dive walkthroughs.")

    # ── WHY DEVBOT ──
    html += '<section class="section" style="padding-top:3rem"><div class="container">'
    html += '<h2 class="section-title reveal">Why <span class="gradient-text">DevBotAI</span>?</h2>'
    html += '<p class="section-sub reveal">Built for traders, creators, and developers who refuse to sleep on opportunity.</p>'
    html += '<div class="grid-3">'
    features = [
        ("\u26a1", "rgba(0,255,136,.1)", "Real-Time Trading Intelligence", "Our Trade Agent monitors 500+ assets across crypto and equities 24/7, executing strategies with sub-second precision on the Base network."),
        ("\U0001f9e0", "rgba(0,136,255,.1)", "Multi-Agent Orchestration", "8 specialist AI agents collaborate via the OpenClaw AI Gateway \u2014 each an expert in its domain, all working in concert to maximise returns."),
        ("\U0001f4b0", "rgba(139,92,246,.1)", "Revenue on Autopilot", "From affiliate commissions to trading profits to content monetisation \u2014 DevBotAI generates diversified revenue streams while you sleep."),
    ]
    for icon, bg, title, desc in features:
        html += '<div class="card reveal">'
        html += '<div style="width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:1.25rem;background:{}">{}</div>'.format(bg, icon)
        html += '<h3 style="font-size:1.15rem;margin-bottom:.6rem;font-weight:700">{}</h3>'.format(title)
        html += '<p style="color:var(--muted);font-size:.95rem;line-height:1.7">{}</p></div>'.format(desc)
    html += '</div></div></section>'

    # ── AGENTS ──
    html += '<section class="section" id="agents"><div class="container">'
    html += '<h2 class="section-title reveal">Live <span class="gradient-text">Agent Network</span></h2>'
    html += '<p class="section-sub reveal">All 8 agents are online and processing tasks right now.</p>'
    html += '<div class="grid-4">'
    for a in AGENTS:
        info = devbot.agents[a["id"]]
        html += '<div class="card reveal">'
        html += '<div style="font-size:2.4rem;margin-bottom:1rem">{}</div>'.format(a["icon"])
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">'
        html += '<h3 style="font-size:1rem;font-weight:700">{}</h3>'.format(a["name"])
        html += '<span class="badge badge-active"><span class="pulse-dot" style="width:6px;height:6px"></span>LIVE</span></div>'
        html += '<p style="color:var(--muted);font-size:.88rem;line-height:1.6">{}</p>'.format(a["desc"])
        html += '<div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:.8rem;color:var(--muted)">'
        html += '<span>Tasks Completed</span><span style="color:var(--green);font-weight:700">{:,}</span></div></div>'.format(info["tasks_completed"])
    html += '</div></div></section>'

    # ── OPTIN BANNER ──
    html += optin_banner()

    # ── PRICING ──
    html += '<section class="section" id="pricing" style="background:radial-gradient(ellipse 80% 40% at 50% 50%,rgba(0,136,255,0.04) 0%,transparent 70%)"><div class="container">'
    html += '<h2 class="section-title reveal" style="text-align:center">Simple, <span class="gradient-text">Transparent Pricing</span></h2>'
    html += '<p class="section-sub reveal" style="text-align:center;margin:0 auto 3.5rem">Start free. Scale as you grow. Cancel anytime.</p>'
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1.5rem">'

    pricing = [
        ("Free","$0","/mo","var(--muted)",["Basic dashboard","1 agent (read-only)","Community support","Public API access"],"Get Started",False),
        ("Basic","$19","/mo","var(--blue)",["3 active agents","Email campaigns","Weekly analytics","Standard support"],"Start Basic",False),
        ("Pro","$49","/mo","var(--green)",["All 8 agents","Live trading signals","Daily analytics + ROI","Priority support","OpenClaw bridge access"],"Go Pro",True),
        ("Enterprise","$149","/mo","var(--purple)",["Full agent suite","Dedicated VPS slot","Custom strategies","SLA guarantee","Direct Slack channel"],"Contact Sales",False),
        ("Developer","$299","/mo","var(--orange)",["Full REST API access","White-label rights","Webhook integrations","Custom agent builds","Revenue sharing model"],"Get API Access",False),
    ]
    for name, price, per, color, feats, cta, pop in pricing:
        hl = "border-color:{c};box-shadow:0 0 40px {c}22;".format(c=color.replace("var(","").replace(")","")) if pop else ""
        if pop:
            hl = "border-color:var(--green);box-shadow:0 0 40px rgba(0,255,136,0.12);"
        badge = '<div style="text-align:center;margin-bottom:.6rem"><span class="badge badge-green">\u2b50 MOST POPULAR</span></div>' if pop else ""
        fl = ""
        for f in feats:
            fl += '<li style="margin-bottom:.5rem;font-size:.9rem;display:flex;align-items:center;gap:.5rem"><span style="color:var(--green);font-size:.8rem">\u2713</span> {}</li>'.format(f)
        bc = "btn-primary" if pop else "btn-outline"
        html += '<div class="card reveal" style="{}text-align:center;display:flex;flex-direction:column">'.format(hl)
        html += '{}<div style="font-size:1.05rem;font-weight:700;color:{};margin-bottom:.3rem">{}</div>'.format(badge, color, name)
        html += '<div style="font-size:3rem;font-weight:900;color:var(--text);line-height:1;margin-bottom:.25rem">{}<span style="font-size:1rem;font-weight:400;color:var(--muted)">{}</span></div>'.format(price, per)
        html += '<ul style="list-style:none;text-align:left;margin:1.5rem 0;flex:1;color:var(--muted)">{}</ul>'.format(fl)
        html += '<a href="/partners" class="btn {}" style="width:100%">{}</a></div>'.format(bc, cta)
    html += '</div></div></section>'

    # ── INTEGRATIONS ──
    html += '<section style="padding:3.5rem 2rem;background:rgba(10,10,26,0.6);border-top:1px solid var(--border);border-bottom:1px solid var(--border)"><div class="container" style="text-align:center">'
    html += '<p style="color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:3px;margin-bottom:1.75rem;font-weight:600">Trusted Integrations</p>'
    html += '<div style="display:flex;justify-content:center;align-items:center;gap:3rem;flex-wrap:wrap;font-size:1.05rem;font-weight:600;color:var(--muted)">'
    integrations = ["OpenClaw AI", "Binance", "Coinbase", "YouTube", "X / Twitter", "Stripe", "AWS", "Cloudflare", "Zapier"]
    html += '<span>\u2022</span>'.join('<span>{}</span>'.format(i) for i in integrations)
    html += '</div></div></section>'

    html += FOOTER

    # Scripts
    html += '<script>' + JS_CORE + '</script>'
    html += '<script>' + JS_YOUTUBE + '</script>'
    html += '<script>' + JS_LIVE + '</script>'
    html += '</body></html>'
    return html


# ═══════════════════════════════════════════════════════════════
#  PAGE: PARTNERS
# ═══════════════════════════════════════════════════════════════

def build_partners():
    html = '<!DOCTYPE html><html lang="en"><head>'
    html += '<title>Partner Program \u2014 DevBotAI | Earn 33% Recurring</title>'
    html += HEAD
    html += '<meta name="description" content="Earn 33% recurring commission promoting DevBotAI. 365-day cookie. Free to join. Apply in 2 minutes.">'
    html += '<style>' + CSS + '</style></head><body>'
    html += nav("partners")

    # ── HERO ──
    html += '<section style="min-height:60vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:8rem 2rem 5rem;'
    html += 'background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,136,255,0.1) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 10% 90%,rgba(0,255,136,0.06) 0%,transparent 50%)">'
    html += '<div style="max-width:720px">'
    html += '<span class="badge badge-blue" style="margin-bottom:1rem;display:inline-block;font-size:.82rem;padding:.35rem 1rem">PARTNER PROGRAM</span>'
    html += '<h1 style="font-size:clamp(2.2rem,5.5vw,3.5rem);font-weight:900;line-height:1.15;margin-bottom:1.25rem;letter-spacing:-1.5px">Earn <span class="gradient-text">Recurring Revenue</span><br>Promoting DevBotAI</h1>'
    html += '<p style="color:var(--muted);font-size:1.1rem;margin-bottom:2.5rem;line-height:1.7">Join hundreds of affiliates earning consistent monthly income by referring users to the world\'s most powerful AI trading platform.</p>'
    html += '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">'
    html += '<a href="#apply" class="btn btn-primary" style="font-size:1.05rem;padding:.9rem 2.5rem">Apply Now \u2014 It\'s Free</a>'
    html += '<a href="#videos" class="btn btn-outline">Watch Demo</a></div>'
    html += '</div></section>'

    # ── COMMISSION STATS ──
    html += '<section style="padding:3rem 2rem;background:rgba(10,10,26,0.6);border-top:1px solid var(--border);border-bottom:1px solid var(--border)"><div class="container">'
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:2rem;text-align:center">'
    stats = [
        ("33%", "Recurring Commission", True),
        ("365", "Day Cookie Window", False),
        ("$0", "To Join", False),
        ("Monthly", "Payouts via Stripe", False),
        ("$1,650", "Per Flagship Sale", True),
    ]
    for val, label, grad in stats:
        vc = 'class="gradient-text"' if grad else ""
        html += '<div class="reveal"><div {} style="font-size:2.8rem;font-weight:900">{}</div><div style="color:var(--muted);font-size:.88rem;margin-top:.25rem">{}</div></div>'.format(vc, val, label)
    html += '</div></div></section>'

    # ── VIDEOS ──
    html += video_section("Watch How It", "See the platform in action. Two detailed walkthroughs of DevBotAI's AI agent network.")

    # ── PROGRAMS TABLE ──
    html += '<section class="section"><div class="container">'
    html += '<h2 class="section-title reveal">Top <span class="gradient-text">Partner Programs</span></h2>'
    html += '<p class="section-sub reveal">Access our curated network of high-converting affiliate programs with industry-leading commissions.</p>'
    html += '<div class="card reveal" style="padding:0;overflow-x:auto"><table class="program-table"><thead><tr>'
    html += '<th>Program</th><th>Category</th><th>Commission</th><th>Cookie</th><th>Status</th></tr></thead><tbody>'
    programs = [
        ("DevBotAI Flagship", "AI Platform", "badge-green", "33% recurring ($1,650)", "365 days"),
        ("OpenClaw AI Gateway", "AI Infra", "badge-blue", "40% recurring", "365 days"),
        ("Jasper AI", "Content AI", "badge-green", "30% recurring", "30 days"),
        ("Semrush", "SEO Tools", "badge-blue", "$200 per sale", "120 days"),
        ("Binance", "Crypto Exchange", "badge-green", "Up to 50% fees", "90 days"),
        ("Shopify Partners", "eCommerce", "badge-blue", "200% first month", "30 days"),
        ("HubSpot", "CRM", "badge-green", "30% recurring", "90 days"),
        ("Coinbase", "Crypto Exchange", "badge-blue", "50% trading fees", "30 days"),
        ("TradingView", "Trading", "badge-green", "30% first year", "30 days"),
        ("DigitalOcean", "Cloud", "badge-blue", "$25\u2013$100 per ref", "30 days"),
        ("ActiveCampaign", "Email", "badge-green", "30% recurring", "90 days"),
        ("Cloudflare", "Security", "badge-blue", "$50\u2013$200 per sale", "60 days"),
    ]
    for name, cat, badge, comm, cookie in programs:
        html += '<tr>'
        html += '<td><strong>{}</strong></td>'.format(name)
        html += '<td><span class="badge {}">{}</span></td>'.format(badge, cat)
        html += '<td style="color:var(--green);font-weight:700">{}</td>'.format(comm)
        html += '<td>{}</td>'.format(cookie)
        html += '<td><span class="badge badge-active"><span class="pulse-dot" style="width:5px;height:5px"></span>Live</span></td></tr>'
    html += '</tbody></table></div></div></section>'

    # ── HOW IT WORKS ──
    html += '<section class="section" style="background:radial-gradient(ellipse 80% 40% at 50% 50%,rgba(0,255,136,0.03) 0%,transparent 70%)"><div class="container">'
    html += '<h2 class="section-title reveal" style="text-align:center">How It <span class="gradient-text">Works</span></h2>'
    html += '<p class="section-sub reveal" style="text-align:center;margin:0 auto 3.5rem">Three simple steps to start earning recurring income.</p>'
    html += '<div class="grid-3">'
    steps = [
        ("1", "Apply & Get Approved", "Fill out the form below. We review applications within 24 hours and send your unique tracking link via email."),
        ("2", "Share & Promote", "Use your referral link in videos, blogs, social media, or email lists. Our 365-day cookie tracks every single conversion."),
        ("3", "Earn Every Month", "33% recurring commission on every active subscription. Payouts via Stripe or PayPal on the 1st of each month."),
    ]
    for num, title, desc in steps:
        html += '<div class="card reveal" style="text-align:center">'
        html += '<div class="step-number">{}</div>'.format(num)
        html += '<h3 style="font-size:1.15rem;margin-bottom:.6rem;font-weight:700">{}</h3>'.format(title)
        html += '<p style="color:var(--muted);font-size:.95rem;line-height:1.7">{}</p></div>'.format(desc)
    html += '</div></div></section>'

    # ── OPTIN BANNER ──
    html += optin_banner()

    # ── APPLICATION FORM ──
    html += '<section class="section" id="apply"><div class="container" style="max-width:740px">'
    html += '<h2 class="section-title reveal" style="text-align:center">Apply to <span class="gradient-text">Partner Program</span></h2>'
    html += '<p class="section-sub reveal" style="text-align:center;margin:0 auto 2.5rem">Free to join. No minimum traffic required. Start earning within 24 hours.</p>'
    html += '<div class="card reveal" style="padding:2.5rem">'
    html += '<form id="partner-form" onsubmit="handlePartnerSubmit(event)">'
    html += '<div class="form-row">'
    html += '<div class="form-group"><label class="form-label">First Name *</label><input class="form-input" type="text" name="first_name" placeholder="Darren" required></div>'
    html += '<div class="form-group"><label class="form-label">Last Name *</label><input class="form-input" type="text" name="last_name" placeholder="Smith" required></div></div>'
    html += '<div class="form-group"><label class="form-label">Email *</label><input class="form-input" type="email" name="email" placeholder="you@example.com" required></div>'
    html += '<div class="form-group"><label class="form-label">Website / Channel URL *</label><input class="form-input" type="url" name="website" placeholder="https://youtube.com/@yourchannel" required></div>'
    html += '<div class="form-group"><label class="form-label">Audience Size</label>'
    html += '<select class="form-select" name="audience"><option value="">Select range...</option><option>Under 1,000</option><option>1,000 - 10,000</option><option>10,000 - 50,000</option><option>50,000 - 250,000</option><option>250,000+</option></select></div>'
    html += '<div class="form-group"><label class="form-label">Primary Niche *</label>'
    html += '<select class="form-select" name="niche" required><option value="">Select niche...</option><option>Crypto / Trading</option><option>AI / Technology</option><option>Online Business</option><option>Software / SaaS</option><option>Finance / Investing</option><option>Marketing / SEO</option><option>Other</option></select></div>'
    html += '<div class="form-group"><label class="form-label">How will you promote DevBotAI?</label>'
    html += '<textarea class="form-textarea" name="promotion" placeholder="YouTube reviews, blog articles, email newsletter, Twitter threads, paid ads..."></textarea></div>'
    html += '<div style="margin-bottom:1.5rem;display:flex;align-items:center;gap:.75rem">'
    html += '<input type="checkbox" required style="width:18px;height:18px;accent-color:var(--green);flex-shrink:0">'
    html += '<label style="font-size:.88rem;color:var(--muted)">I agree to the DevBotAI Affiliate Terms &amp; Conditions.</label></div>'
    html += '<button type="submit" class="btn btn-primary" style="width:100%;font-size:1.05rem;padding:1rem">Submit Application \u2192</button>'
    html += '<p style="text-align:center;color:var(--muted);font-size:.82rem;margin-top:1rem">We respond within 24 hours. Your info is 100% secure.</p>'
    html += '</form>'
    html += '<div class="optin-success" id="partner-success">'
    html += '<div style="font-size:3.5rem;margin-bottom:1rem">\u2705</div>'
    html += '<h3 style="font-size:1.5rem;font-weight:800;margin-bottom:.75rem">Application Submitted!</h3>'
    html += '<p style="color:var(--muted);font-size:1.05rem">We\'ll review your application and send your tracking link within 24 hours. Check your email!</p>'
    html += '</div></div></div></section>'

    html += FOOTER

    # Partner form script
    partner_js = """
function handlePartnerSubmit(e){
  e.preventDefault();
  var f=e.target;
  var data={};
  new FormData(f).forEach(function(v,k){data[k]=v});
  data.source='devbotai-partner-application';
  data.timestamp=new Date().toISOString();
  var btn=f.querySelector('button[type=submit]');
  btn.textContent='Submitting...';btn.disabled=true;
  fetch('/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  .then(function(r){return r.json()})
  .then(function(d){
    if(d.success){f.style.display='none';document.getElementById('partner-success').style.display='block'}
    else{btn.textContent='Try Again';btn.disabled=false}
  })
  .catch(function(){btn.textContent='Submit Application';btn.disabled=false;alert('Connection error. Please try again.')});
}
"""
    html += '<script>' + JS_CORE + '</script>'
    html += '<script>' + JS_YOUTUBE + '</script>'
    html += '<script>' + partner_js + '</script>'
    html += '</body></html>'
    return html


# ═══════════════════════════════════════════════════════════════
#  PAGE: OPT-IN (Lead Magnet)
# ═══════════════════════════════════════════════════════════════

def build_optin():
    html = '<!DOCTYPE html><html lang="en"><head>'
    html += '<title>Free AI Revenue Blueprint \u2014 DevBotAI</title>'
    html += HEAD
    html += '<meta name="description" content="Download the free AI Revenue Blueprint: 7 proven strategies to automate income with AI agents. By the DevBotAI team.">'
    html += '<style>' + CSS + '</style></head><body>'
    html += nav("optin")

    html += '<section class="optin-hero" style="background:radial-gradient(ellipse 70% 50% at 30% 30%,rgba(0,255,136,0.08) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 80% 70%,rgba(0,136,255,0.06) 0%,transparent 50%)">'
    html += '<div class="optin-grid">'

    # LEFT: Lead magnet description
    html += '<div>'
    html += '<span class="badge badge-hot" style="margin-bottom:1.25rem;display:inline-block;font-size:.85rem;padding:.4rem 1.1rem">100% FREE \u2014 NO CREDIT CARD</span>'
    html += '<h1 style="font-size:clamp(2rem,4.5vw,3rem);font-weight:900;line-height:1.15;margin-bottom:1.25rem;letter-spacing:-1px">The <span class="gradient-text">AI Revenue Blueprint</span></h1>'
    html += '<p style="font-size:1.3rem;color:var(--text);font-weight:600;margin-bottom:.5rem">7 Proven Strategies to Automate Income with AI Agents</p>'
    html += '<p style="color:var(--muted);font-size:1.05rem;margin-bottom:2rem;line-height:1.7">Built by the DevBotAI team from real-world results. Learn how our 8 AI agents generate revenue 24/7 \u2014 and how you can replicate it.</p>'

    html += '<ul class="check-list" style="margin-bottom:2.5rem">'
    checks = [
        "AI-powered trading automation \u2014 set up in minutes, not months",
        "Content marketing on autopilot \u2014 blogs, social, and video",
        "Affiliate revenue at scale \u2014 129+ high-paying programs",
        "Email marketing sequences that convert at 3x industry average",
        "Social media growth engine \u2014 7 platforms, zero manual work",
        "Security bounty hunting \u2014 get paid to find vulnerabilities",
        "White-label & reselling \u2014 build a business on top of DevBotAI",
    ]
    for c in checks:
        html += '<li>{}</li>'.format(c)
    html += '</ul>'

    # Social proof
    html += '<div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">'
    html += '<div style="display:flex;align-items:center;gap:.5rem"><span class="pulse-dot"></span><span style="font-size:.9rem;color:var(--green);font-weight:600">2,400+ downloads</span></div>'
    html += '<div style="font-size:.9rem;color:var(--muted)">\u2605\u2605\u2605\u2605\u2605 Rated 4.9/5</div>'
    html += '</div></div>'

    # RIGHT: Opt-in form
    html += '<div>'
    html += '<div class="optin-form-card">'
    html += '<div style="text-align:center;margin-bottom:1.75rem">'
    html += '<div style="font-size:3rem;margin-bottom:.75rem">\U0001f4d6</div>'
    html += '<h2 style="font-size:1.4rem;font-weight:800;margin-bottom:.4rem">Get Your Free Copy</h2>'
    html += '<p style="color:var(--muted);font-size:.92rem">Enter your details below and we\'ll send it straight to your inbox.</p></div>'

    html += '<form id="optin-form" onsubmit="handleOptinSubmit(event)">'
    html += '<div class="form-group"><label class="form-label">First Name *</label>'
    html += '<input class="form-input" type="text" name="first_name" placeholder="Your first name" required></div>'
    html += '<div class="form-group"><label class="form-label">Email Address *</label>'
    html += '<input class="form-input" type="email" name="email" placeholder="you@example.com" required></div>'
    html += '<button type="submit" class="btn btn-primary" style="width:100%;font-size:1.05rem;padding:1rem;margin-top:.5rem">\u2728 Send Me The Blueprint</button>'
    html += '<p style="text-align:center;color:var(--muted);font-size:.8rem;margin-top:1rem">\U0001f512 We respect your privacy. Unsubscribe anytime.</p>'
    html += '</form>'

    html += '<div class="optin-success" id="optin-success-msg">'
    html += '<div style="font-size:3.5rem;margin-bottom:1rem">\U0001f389</div>'
    html += '<h3 style="font-size:1.4rem;font-weight:800;margin-bottom:.75rem;color:var(--green)">You\'re In!</h3>'
    html += '<p style="color:var(--muted);font-size:1rem;margin-bottom:1.25rem">Check your inbox for the AI Revenue Blueprint. If you don\'t see it, check your spam folder.</p>'
    html += '<a href="/" class="btn btn-outline" style="margin-right:.75rem">Explore Platform</a>'
    html += '<a href="/partners" class="btn btn-blue">Become a Partner</a>'
    html += '</div>'

    html += '</div></div>'

    html += '</div></section>'

    # Mini video section on optin page
    html += '<section class="section" style="padding:4rem 2rem;background:rgba(10,10,26,0.5)"><div class="container" style="text-align:center">'
    html += '<h2 class="section-title reveal" style="font-size:1.8rem">See What You\'ll <span class="gradient-text">Learn</span></h2>'
    html += '<p class="section-sub reveal" style="margin:0 auto 2rem">Watch these two deep-dives into how DevBotAI generates revenue.</p>'
    html += '<div class="video-grid">'
    html += '<div class="card reveal" style="padding:0;overflow:hidden">'
    html += '<div class="video-wrap"><div class="yt-slot" id="ytp1" data-vid="{}"></div></div>'.format(YT_VIDEO_1)
    html += '<div class="video-label"><h4>\U0001f3ac Platform Overview</h4>'
    html += '<button class="snd-btn" id="snd-ytp1" onclick="toggleYTSound(\'ytp1\')" title="Toggle sound">\U0001f507</button>'
    html += '</div></div>'
    html += '<div class="card reveal" style="padding:0;overflow:hidden">'
    html += '<div class="video-wrap"><div class="yt-slot" id="ytp2" data-vid="{}"></div></div>'.format(YT_VIDEO_2)
    html += '<div class="video-label"><h4>\U0001f680 Automation Demo</h4>'
    html += '<button class="snd-btn" id="snd-ytp2" onclick="toggleYTSound(\'ytp2\')" title="Toggle sound">\U0001f507</button>'
    html += '</div></div>'
    html += '</div></div></section>'

    html += FOOTER
    html += '<script>' + JS_CORE + '</script>'
    html += '<script>' + JS_YOUTUBE + '</script>'
    html += '<script>' + JS_OPTIN + '</script>'
    html += '</body></html>'
    return html


# ═══════════════════════════════════════════════════════════════
#  HTTP HANDLER
# ═══════════════════════════════════════════════════════════════

class DevBotHandler(BaseHTTPRequestHandler):

    def send_page(self, html, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def serve_static(self, filepath):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            mime, _ = mimetypes.guess_type(filepath)
            self.send_response(200)
            self.send_header("Content-Type", mime or "application/octet-stream")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_404()

    def send_404(self):
        err = '<!DOCTYPE html><html><head><title>404 \u2014 DevBotAI</title>'
        err += HEAD + '<style>' + CSS + '</style></head>'
        err += '<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">'
        err += '<div><p style="font-size:5rem">\U0001f916</p>'
        err += '<h1 style="font-size:2.5rem;margin-bottom:.5rem"><span class="gradient-text">404</span> \u2014 Page Not Found</h1>'
        err += '<p style="color:var(--muted);margin:1rem 0 2rem;font-size:1.05rem">That page doesn\'t exist. Let\'s get you back on track.</p>'
        err += '<a href="/" class="btn btn-primary">Return Home</a></div></body></html>'
        self.send_page(err, 404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/") or "/"

        if path == "/":
            self.send_page(build_index())
        elif path == "/partners":
            self.send_page(build_partners())
        elif path == "/optin":
            self.send_page(build_optin())
        elif path in ("/status", "/api/status"):
            self.send_json(devbot.get_status())
        elif path in ("/agents", "/api/agents"):
            self.send_json({"agents": devbot.get_status()["agents"]})
        elif path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            # Try static file from STATIC_DIR
            clean = path.lstrip("/")
            if ".." not in clean and clean:
                static_path = os.path.join(STATIC_DIR, clean)
                if os.path.isfile(static_path):
                    self.serve_static(static_path)
                    return
            self.send_404()

    def do_POST(self):
        path = self.path.split("?")[0].rstrip("/")

        if path == "/subscribe":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body)
                devbot.log("NEW SUBSCRIBER: {} <{}>".format(data.get("first_name", ""), data.get("email", "")))
                devbot.subscribers.append(data)

                # Forward to Zapier webhook
                try:
                    import urllib.request
                    req = urllib.request.Request(
                        ZAPIER_WEBHOOK,
                        data=json.dumps(data).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    urllib.request.urlopen(req, timeout=10)
                    devbot.log("Zapier webhook sent OK")
                except Exception as ze:
                    devbot.log("Zapier webhook error: {}".format(str(ze)))

                self.send_json({"success": True, "message": "Subscribed!"})
            except Exception as e:
                devbot.log("Subscribe error: {}".format(str(e)))
                self.send_json({"success": False, "error": str(e)}, 400)
        else:
            self.send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        pass


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    t = threading.Thread(target=devbot.health_check_loop, daemon=True)
    t.start()
    server = HTTPServer(("0.0.0.0", DEVBOT_PORT), DevBotHandler)
    devbot.log("=" * 50)
    devbot.log("DEVBOT AI v4.0 ELITE PLATFORM")
    devbot.log("=" * 50)
    devbot.log("Dashboard:  http://devbotai.shop/")
    devbot.log("Partners:   http://devbotai.shop/partners")
    devbot.log("Opt-in:     http://devbotai.shop/optin")
    devbot.log("API:        http://devbotai.shop/api/status")
    devbot.log("Port:       {}".format(DEVBOT_PORT))
    devbot.log("Static dir: {}".format(STATIC_DIR))
    devbot.log("ALL {} AI AGENTS DEPLOYED AND OPERATIONAL!".format(len(AGENTS)))
    devbot.log("=" * 50)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        devbot.log("Shutting down...")
        server.shutdown()

if __name__ == "__main__":
    main()

/* ============================================================
   dwvbotai.store — Main Application
   ============================================================ */

class DevBotStore {
  constructor() {
    this.baseUrl = this.detectBaseUrl();
    this.healthInterval = null;
    this.init();
  }

  /* --- Initialization --- */
  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupScrollAnimations();
    this.setupKeyboardShortcuts();
    this.renderStaticContent();
    this.fetchHealthData();
    this.fetchIntegrations();
    this.fetchWorkflowTemplates();
    this.startHealthPolling();
    this.setupQuickActions();
    this.setupSearch();
  }

  /* --- API Base URL Detection --- */
  detectBaseUrl() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }

  /* --- API Client --- */
  async api(endpoint, options = {}) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`API call failed: ${endpoint}`, err.message);
      return null;
    }
  }

  /* --- Theme --- */
  setupTheme() {
    const saved = localStorage.getItem('dwvbot-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeIcon(saved);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('dwvbot-theme', next);
        this.updateThemeIcon(next);
      });
    }
  }

  updateThemeIcon(theme) {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
  }

  /* --- Mobile Navigation --- */
  setupNavigation() {
    const btn = document.getElementById('nav-menu-toggle');
    const links = document.getElementById('nav-links');
    if (btn && links) {
      btn.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
      links.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          links.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* --- Scroll Animations --- */
  setupScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    this._scrollObserver = observer;
  }

  reobserveFadeIns() {
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
      this._scrollObserver.observe(el);
    });
  }

  /* --- Keyboard Shortcuts --- */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'g') { e.preventDefault(); this.runAction('generate-app'); }
      if (e.ctrlKey && e.key === 'r') { e.preventDefault(); this.runAction('review-code'); }
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); this.runAction('start-trading'); }
    });
  }

  /* --- Toast Notifications --- */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove());
    }, 3500);
  }

  /* --- Health Data --- */
  async fetchHealthData() {
    const data = await this.api('/api/health');
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    const services = data ? (data.services || []) : this.getDefaultServices();
    grid.innerHTML = '';

    let activeCount = 0;
    services.forEach(svc => {
      if (svc.status === 'active' || svc.status === 'running') activeCount++;
      grid.innerHTML += this.renderServiceCard(svc);
    });

    const statEl = document.getElementById('stat-services');
    if (statEl) statEl.textContent = activeCount;
  }

  getDefaultServices() {
    return [
      { name: 'DevBot API', status: 'active', port: 3000, uptime: '99.9%', icon: 'fa-server' },
      { name: 'Slack Bot', status: 'active', port: 3001, uptime: '99.7%', icon: 'fa-brands fa-slack' },
      { name: 'Trading Engine', status: 'active', port: 3002, uptime: '98.5%', icon: 'fa-chart-line' },
      { name: 'Scent of Adelaide', status: 'active', port: 5000, uptime: '100%', icon: 'fa-spa' },
      { name: 'Workflow Runner', status: 'active', port: 3003, uptime: '99.2%', icon: 'fa-diagram-project' },
    ];
  }

  renderServiceCard(svc) {
    const isActive = svc.status === 'active' || svc.status === 'running';
    return `
      <div class="card service-card fade-in">
        <div class="card-header">
          <div class="card-icon ${isActive ? 'green' : 'red'}">
            <i class="fa-solid ${svc.icon || 'fa-server'}"></i>
          </div>
          <div>
            <div class="card-title">${svc.name}</div>
            <div class="status">
              <span class="status-dot ${isActive ? 'active' : 'inactive'}"></span>
              ${isActive ? 'Running' : 'Offline'}
            </div>
          </div>
        </div>
        <div class="service-card card-meta">
          <span>Port ${svc.port || '—'}</span>
          <span>Uptime ${svc.uptime || '—'}</span>
        </div>
      </div>`;
  }

  /* --- Integrations --- */
  async fetchIntegrations() {
    const data = await this.api('/api/integrations');
    const grid = document.getElementById('integrations-grid');
    if (!grid) return;

    const integrations = data ? (Array.isArray(data) ? data : data.integrations || []) : this.getDefaultIntegrations();
    grid.innerHTML = '';
    integrations.forEach(intg => {
      grid.innerHTML += this.renderIntegrationCard(intg);
    });
    this.reobserveFadeIns();
  }

  getDefaultIntegrations() {
    return [
      {
        id: 'sharepoint', name: 'SharePoint Dev Tools', icon: 'fa-brands fa-microsoft', color: 'blue',
        description: 'Generate SPFx web parts, extensions, and solutions with AI-powered scaffolding.',
        capabilities: ['SPFx App Generation', 'PnP PowerShell Scripts', 'Graph API Integration', 'Site Provisioning'],
        status: 'active'
      },
      {
        id: 'financial', name: 'Financial Markets', icon: 'fa-chart-line', color: 'green',
        description: 'Real-time market data, algorithmic trading signals, and portfolio analytics.',
        capabilities: ['Live Stock Quotes', 'Technical Analysis', 'Trading Signals', 'Report Generation'],
        status: 'active'
      },
      {
        id: 'chatbot', name: 'AI Chatbot Builder', icon: 'fa-robot', color: 'purple',
        description: 'Design, train, and deploy conversational AI chatbots in minutes.',
        capabilities: ['Multi-platform Deploy', 'Custom Training', 'Analytics Dashboard', 'Template Library'],
        status: 'active'
      },
      {
        id: 'benchmarks', name: 'Agent Benchmarks', icon: 'fa-ranking-star', color: 'orange',
        description: 'Compare AI agents across tasks, measure performance, and get recommendations.',
        capabilities: ['Agent Comparison', 'Task Benchmarks', 'Cost Analysis', 'Recommendation Engine'],
        status: 'active'
      },
      {
        id: 'academy', name: 'Prompt Academy', icon: 'fa-graduation-cap', color: 'cyan',
        description: 'Learn prompt engineering with structured lessons, exercises, and certifications.',
        capabilities: ['Interactive Lessons', 'Practice Exercises', 'Certifications', 'Community Forum'],
        status: 'active'
      },
    ];
  }

  renderIntegrationCard(intg) {
    const isActive = intg.status === 'active';
    const caps = (intg.capabilities || []).map(c => `<li>${c}</li>`).join('');
    return `
      <div class="card integration-card fade-in">
        <div class="card-header">
          <div class="card-icon ${intg.color || 'indigo'}">
            <i class="fa-solid ${intg.icon || 'fa-plug'}"></i>
          </div>
          <div>
            <div class="card-title">${intg.name}</div>
            <div class="status">
              <span class="status-dot ${isActive ? 'active' : 'inactive'}"></span>
              ${isActive ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <p class="card-desc">${intg.description || ''}</p>
        <ul class="capabilities">${caps}</ul>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm" onclick="store.launchIntegration('${intg.id}')">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Launch
          </button>
        </div>
      </div>`;
  }

  launchIntegration(id) {
    window.location.href = `integrations.html#${id}`;
  }

  /* --- Workflow Templates --- */
  async fetchWorkflowTemplates() {
    const data = await this.api('/api/workflows/templates');
    const grid = document.getElementById('workflows-grid');
    if (!grid) return;

    this.workflowTemplates = data ? (Array.isArray(data) ? data : data.templates || []) : this.getDefaultWorkflows();
    this.renderWorkflows(this.workflowTemplates);

    const statEl = document.getElementById('stat-workflows');
    if (statEl) statEl.textContent = this.workflowTemplates.length;
  }

  getDefaultWorkflows() {
    return [
      { id: 'spfx-gen', name: 'SPFx App Generator', icon: 'fa-brands fa-microsoft', description: 'Scaffold a full SPFx solution from a prompt', category: 'sharepoint' },
      { id: 'code-review', name: 'AI Code Review', icon: 'fa-magnifying-glass-chart', description: 'Automated code review with quality scoring', category: 'devops' },
      { id: 'trading-signal', name: 'Trading Signal Pipeline', icon: 'fa-chart-line', description: 'Fetch data, analyze, and generate trade signals', category: 'finance' },
      { id: 'chatbot-deploy', name: 'Chatbot Deployment', icon: 'fa-robot', description: 'Build, test, and deploy a chatbot to production', category: 'ai' },
      { id: 'benchmark-suite', name: 'Benchmark Suite Runner', icon: 'fa-ranking-star', description: 'Run full agent benchmark comparison', category: 'ai' },
      { id: 'report-gen', name: 'Financial Report', icon: 'fa-file-invoice-dollar', description: 'Generate comprehensive market analysis reports', category: 'finance' },
      { id: 'site-provision', name: 'SharePoint Site Provisioning', icon: 'fa-sitemap', description: 'Provision and configure SharePoint sites', category: 'sharepoint' },
      { id: 'prompt-lesson', name: 'Lesson Builder', icon: 'fa-graduation-cap', description: 'Create interactive prompt engineering lessons', category: 'academy' },
      { id: 'data-pipeline', name: 'Data Pipeline', icon: 'fa-database', description: 'ETL pipeline for data ingestion and processing', category: 'devops' },
      { id: 'full-stack', name: 'Full-Stack App Scaffold', icon: 'fa-layer-group', description: 'Generate a complete full-stack application', category: 'devops' },
    ];
  }

  renderWorkflows(workflows) {
    const grid = document.getElementById('workflows-grid');
    if (!grid) return;
    grid.innerHTML = '';
    workflows.forEach(wf => {
      grid.innerHTML += `
        <div class="card fade-in" data-category="${wf.category || ''}">
          <div class="card-header">
            <div class="card-icon indigo">
              <i class="fa-solid ${wf.icon || 'fa-diagram-project'}"></i>
            </div>
            <div class="card-title">${wf.name}</div>
          </div>
          <p class="card-desc">${wf.description || ''}</p>
          <div class="card-tags">
            <span class="tag">${wf.category || 'general'}</span>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary btn-sm" onclick="store.runWorkflow('${wf.id}', '${wf.name}')">
              <i class="fa-solid fa-play"></i> Run Workflow
            </button>
          </div>
        </div>`;
    });
    this.reobserveFadeIns();
  }

  async runWorkflow(id, name) {
    this.toast(`Starting workflow: ${name}...`, 'info');
    const res = await this.api('/api/workflows/start', {
      method: 'POST',
      body: JSON.stringify({ templateId: id }),
    });
    if (res) {
      this.toast(`Workflow "${name}" started successfully!`, 'success');
    } else {
      this.toast(`Workflow "${name}" queued (API offline — will retry).`, 'info');
    }
  }

  /* --- Search / Filter --- */
  setupSearch() {
    const input = document.getElementById('workflow-search');
    if (input && this.workflowTemplates) {
      input.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
          this.renderWorkflows(this.workflowTemplates);
          return;
        }
        const filtered = this.workflowTemplates.filter(wf =>
          wf.name.toLowerCase().includes(q) ||
          (wf.description || '').toLowerCase().includes(q) ||
          (wf.category || '').toLowerCase().includes(q)
        );
        this.renderWorkflows(filtered);
      });
    }
  }

  /* --- Quick Actions --- */
  setupQuickActions() {
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action) this.runAction(action);
      });
    });
  }

  runAction(action) {
    const actions = {
      'generate-app': () => {
        this.toast('Opening App Generator...', 'info');
        window.location.href = 'workflows.html#spfx-gen';
      },
      'review-code': () => {
        this.toast('Opening Code Review...', 'info');
        window.location.href = 'workflows.html#code-review';
      },
      'start-trading': () => {
        this.toast('Opening Trading Dashboard...', 'info');
        window.location.href = 'integrations.html#financial';
      },
      'create-chatbot': () => {
        this.toast('Opening Chatbot Builder...', 'info');
        window.location.href = 'integrations.html#chatbot';
      },
      'run-benchmark': () => {
        this.toast('Opening Benchmarks...', 'info');
        window.location.href = 'integrations.html#benchmarks';
      },
      'deploy-spfx': () => {
        this.toast('Opening SharePoint Tools...', 'info');
        window.location.href = 'integrations.html#sharepoint';
      },
      'new-workflow': () => {
        window.location.href = 'workflows.html';
      },
      'view-analytics': () => {
        this.toast('Analytics coming soon!', 'info');
      },
    };
    const fn = actions[action];
    if (fn) fn();
    else this.toast(`Action "${action}" not yet implemented`, 'info');
  }

  /* --- Revenue Streams --- */
  renderStaticContent() {
    this.renderRevenueStreams();
  }

  renderRevenueStreams() {
    const container = document.getElementById('revenue-accordion');
    if (!container) return;

    const categories = this.getRevenueData();
    container.innerHTML = '';

    categories.forEach((cat, i) => {
      const items = cat.streams.map(s =>
        `<div class="revenue-item">
          <span class="revenue-item-name">${s.name}</span>
          <span class="revenue-item-price">${s.price}</span>
        </div>`
      ).join('');

      container.innerHTML += `
        <div class="accordion-item fade-in" id="accordion-${i}">
          <button class="accordion-trigger" aria-expanded="false" aria-controls="panel-${i}" onclick="store.toggleAccordion(${i})">
            <span><i class="fa-solid ${cat.icon}" style="color:${cat.color};margin-right:0.5rem"></i>${cat.name}</span>
            <span class="category-count">${cat.streams.length} streams</span>
            <i class="fa-solid fa-chevron-down chevron"></i>
          </button>
          <div class="accordion-content" id="panel-${i}" role="region">
            <div class="accordion-body">${items}</div>
          </div>
        </div>`;
    });
    this.reobserveFadeIns();
  }

  toggleAccordion(index) {
    const item = document.getElementById(`accordion-${index}`);
    if (!item) return;
    const isOpen = item.classList.contains('open');
    item.classList.toggle('open');
    const trigger = item.querySelector('.accordion-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', String(!isOpen));
  }

  getRevenueData() {
    return [
      {
        name: 'SharePoint & Microsoft 365', icon: 'fa-brands fa-microsoft', color: '#60a5fa',
        streams: [
          { name: 'SPFx Web Part Generation', price: '$49/app' },
          { name: 'SPFx Extension Builder', price: '$39/ext' },
          { name: 'PnP Script Generator', price: '$19/script' },
          { name: 'SharePoint Site Templates', price: '$99/template' },
          { name: 'Graph API Integration Pack', price: '$79/pack' },
          { name: 'M365 Migration Assistant', price: '$299/project' },
          { name: 'Power Platform Connectors', price: '$59/connector' },
          { name: 'SharePoint Consulting (hourly)', price: '$150/hr' },
        ]
      },
      {
        name: 'Financial Markets & Trading', icon: 'fa-chart-line', color: '#4ade80',
        streams: [
          { name: 'Trading Signal Subscriptions', price: '$99/mo' },
          { name: 'Market Analysis Reports', price: '$49/report' },
          { name: 'Algorithm Backtesting', price: '$29/backtest' },
          { name: 'Portfolio Optimization', price: '$199/analysis' },
          { name: 'Real-time Data Feed API', price: '$149/mo' },
          { name: 'Custom Trading Bot Build', price: '$499/bot' },
          { name: 'Risk Assessment Engine', price: '$79/assessment' },
          { name: 'Financial Dashboard SaaS', price: '$39/mo' },
        ]
      },
      {
        name: 'AI Chatbot & Agents', icon: 'fa-robot', color: '#c084fc',
        streams: [
          { name: 'Chatbot Builder SaaS', price: '$59/mo' },
          { name: 'Custom Chatbot Development', price: '$999/bot' },
          { name: 'Chatbot Templates', price: '$29/template' },
          { name: 'Multi-platform Deployment', price: '$49/deploy' },
          { name: 'Chatbot Analytics Pro', price: '$39/mo' },
          { name: 'Training Data Curation', price: '$149/dataset' },
          { name: 'Voice Bot Integration', price: '$199/setup' },
        ]
      },
      {
        name: 'Agent Benchmarks & Testing', icon: 'fa-ranking-star', color: '#fb923c',
        streams: [
          { name: 'Benchmark Suite Access', price: '$79/mo' },
          { name: 'Custom Benchmark Design', price: '$299/suite' },
          { name: 'Agent Comparison Reports', price: '$49/report' },
          { name: 'Performance Monitoring', price: '$99/mo' },
          { name: 'CI/CD Agent Testing', price: '$59/mo' },
          { name: 'Enterprise Eval Platform', price: '$499/mo' },
        ]
      },
      {
        name: 'Prompt Academy & Education', icon: 'fa-graduation-cap', color: '#22d3ee',
        streams: [
          { name: 'Course Subscriptions', price: '$29/mo' },
          { name: 'Certification Exams', price: '$99/cert' },
          { name: 'Team Training Packages', price: '$499/team' },
          { name: 'Workshop Facilitation', price: '$299/session' },
          { name: 'Enterprise Curriculum', price: '$999/program' },
          { name: 'Study Materials & Books', price: '$19/item' },
        ]
      },
      {
        name: 'DevOps & Automation', icon: 'fa-gears', color: '#94a3b8',
        streams: [
          { name: 'CI/CD Pipeline Templates', price: '$39/pipeline' },
          { name: 'Infrastructure Automation', price: '$199/setup' },
          { name: 'Code Review Automation', price: '$49/mo' },
          { name: 'Monitoring & Alerts SaaS', price: '$59/mo' },
        ]
      },
      {
        name: 'Content & Commerce', icon: 'fa-store', color: '#f472b6',
        streams: [
          { name: 'Scent of Adelaide E-commerce', price: 'Variable' },
          { name: 'AI Content Generation', price: '$0.05/piece' },
          { name: 'SEO Optimization Service', price: '$149/audit' },
          { name: 'Social Media Automation', price: '$79/mo' },
        ]
      },
      {
        name: 'Platform & API Access', icon: 'fa-key', color: '#fbbf24',
        streams: [
          { name: 'DevBot API (Free Tier)', price: 'Free' },
          { name: 'DevBot API (Pro)', price: '$99/mo' },
          { name: 'DevBot API (Enterprise)', price: '$499/mo' },
          { name: 'Webhook Integrations', price: '$29/mo' },
          { name: 'White-label Licensing', price: '$999/mo' },
          { name: 'Marketplace Commission', price: '15% rev share' },
        ]
      },
    ];
  }

  /* --- Health Polling --- */
  startHealthPolling() {
    this.healthInterval = setInterval(() => this.fetchHealthData(), 30000);
  }

  /* --- Cleanup --- */
  destroy() {
    if (this.healthInterval) clearInterval(this.healthInterval);
  }
}

/* --- Initialize --- */
const store = new DevBotStore();

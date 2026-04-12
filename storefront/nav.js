(function() {
  'use strict';

  // Prevent double-injection
  if (document.getElementById('devbotai-global-nav')) return;

  var nav = document.createElement('nav');
  nav.id = 'devbotai-global-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Global navigation');

  nav.innerHTML = [
    '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 20px;">',
    '  <a href="/" style="display:flex;align-items:center;gap:8px;text-decoration:none;" aria-label="DevBotAI home">',
    '    <img src="/storefront/logo.svg" alt="DevBotAI" style="height:32px;width:auto;">',
    '  </a>',
    '  <div id="devbotai-nav-links" style="display:flex;align-items:center;gap:6px;">',
    '    <a href="/" class="devbotai-nav-link">Home</a>',
    '    <a href="/storefront/affiliates.html" class="devbotai-nav-link">Affiliate Hub</a>',
    '    <a href="/storefront/trading.html" class="devbotai-nav-link">Trading</a>',
    '    <a href="/storefront/integrations.html" class="devbotai-nav-link">Integrations</a>',
    '    <a href="/health" class="devbotai-nav-link">API</a>',
    '  </div>',
    '  <button id="devbotai-nav-toggle" aria-label="Toggle menu" style="display:none;background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;">&#9776;</button>',
    '</div>'
  ].join('\n');

  // Styles
  Object.assign(nav.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '99999',
    background: '#0a0a0f',
    borderBottom: '1px solid #1e1e2e',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'Inter, system-ui, sans-serif'
  });

  // Inject a style block for links and responsive behavior
  var style = document.createElement('style');
  style.textContent = [
    '.devbotai-nav-link {',
    '  color: #a5a5c0;',
    '  text-decoration: none;',
    '  font-size: 0.875rem;',
    '  font-weight: 500;',
    '  padding: 6px 12px;',
    '  border-radius: 6px;',
    '  transition: color 0.2s, background 0.2s;',
    '  font-family: Inter, system-ui, sans-serif;',
    '}',
    '.devbotai-nav-link:hover {',
    '  color: #fff;',
    '  background: rgba(99,102,241,0.15);',
    '}',
    'body { padding-top: 52px !important; }',
    '@media (max-width: 640px) {',
    '  #devbotai-nav-links {',
    '    display: none !important;',
    '    position: absolute;',
    '    top: 52px;',
    '    left: 0;',
    '    right: 0;',
    '    background: #0a0a0f;',
    '    flex-direction: column;',
    '    padding: 12px 20px;',
    '    border-bottom: 1px solid #1e1e2e;',
    '  }',
    '  #devbotai-nav-links.open {',
    '    display: flex !important;',
    '  }',
    '  #devbotai-nav-toggle {',
    '    display: block !important;',
    '  }',
    '}'
  ].join('\n');

  document.head.appendChild(style);

  // Insert nav as first child of body
  document.body.insertBefore(nav, document.body.firstChild);

  // Toggle handler for mobile
  var toggle = document.getElementById('devbotai-nav-toggle');
  var links = document.getElementById('devbotai-nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function() {
      links.classList.toggle('open');
    });
  }
})();

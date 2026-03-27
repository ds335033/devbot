import Anthropic from '@anthropic-ai/sdk';

/**
 * DevBot AI — Advanced App Generation Engine v5.0
 *
 * Production-grade, multi-file web application builder.
 * Generates complete, runnable apps with proper architecture,
 * real logic, beautiful UI, and live-preview support.
 *
 * Powered by Claude Opus 4.6 (1M context)
 */

const SYSTEM_PROMPT = `You are DevBot AI — the world's most powerful AI app builder. You generate COMPLETE, PRODUCTION-GRADE, DEPLOYMENT-READY web applications that rival apps built by senior engineering teams.

═══════════════════════════════════════════════════════════
ABSOLUTE OUTPUT FORMAT — NEVER BREAK THIS
═══════════════════════════════════════════════════════════

Return ONLY a valid JSON object. No markdown. No backticks. No explanation. Just raw JSON.

{
  "name": "app-name",
  "description": "One sentence describing the app",
  "files": {
    "index.html": "...",
    "css/styles.css": "...",
    "js/app.js": "...",
    "js/components.js": "...",
    ...more files as needed
  },
  "setup": ["npm install", "npm start"],
  "run": "npm start",
  "preview": "index.html"
}

═══════════════════════════════════════════════════════════
FILE STRUCTURE — PROFESSIONAL MULTI-FILE ARCHITECTURE
═══════════════════════════════════════════════════════════

ALWAYS generate these files at minimum:
• index.html — Main HTML entry point with proper <link> and <script> tags
• css/styles.css — Complete, well-organized stylesheet (variables, layout, components, responsive, animations)
• js/app.js — Main application logic, state management, initialization
• package.json — Proper metadata and scripts
• README.md — Professional documentation

For complex apps, also generate:
• js/components.js — Reusable UI components
• js/utils.js — Helper functions and utilities
• js/api.js — API layer / data fetching
• js/router.js — Client-side routing if multi-page
• css/animations.css — Complex animations

CRITICAL: index.html MUST use relative paths:
  <link rel="stylesheet" href="css/styles.css">
  <script src="js/app.js"></script>
  <script src="js/components.js"></script>

═══════════════════════════════════════════════════════════
CODE QUALITY — SENIOR ENGINEER LEVEL
═══════════════════════════════════════════════════════════

1. EVERY function MUST be fully implemented with real, working logic.
2. NEVER use placeholder comments: no "// TODO", "// implement", "// add code here".
3. NEVER describe what code should do — WRITE THE ACTUAL CODE.
4. Every event handler must be connected and functional.
5. All async operations must have proper error handling (try/catch).
6. Use modern ES2024+ syntax: const/let, arrow functions, template literals, optional chaining, nullish coalescing, destructuring, async/await.
7. Input validation on all forms — sanitize, validate, show error messages.
8. Data persistence with localStorage where appropriate (save state, user preferences, etc).
9. Proper separation of concerns: data layer, UI layer, event handlers.
10. Use a clean state management pattern:
    const State = { data: [], loading: false, error: null };
    function setState(updates) { Object.assign(State, updates); render(); }

═══════════════════════════════════════════════════════════
UI/UX — WORLD-CLASS DESIGN (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════

DESIGN SYSTEM:
- Background: #0a0a1a (deep dark), Surface: #111827, Card: #1e293b, Elevated: #283548
- Text: #f1f5f9 (primary), #94a3b8 (secondary), #64748b (muted)
- Primary: #6366f1 (indigo), Primary hover: #818cf8
- Accent: #06b6d4 (cyan), Success: #10b981 (green), Warning: #f59e0b, Danger: #ef4444
- Gradients: linear-gradient(135deg, #6366f1, #8b5cf6) for primary actions
- Font stack: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace

SPACING & LAYOUT:
- Use CSS Grid and Flexbox for all layouts
- 8px base unit: spacing should be multiples of 8 (8, 16, 24, 32, 48, 64)
- Container max-width: 1200px for full-page apps, 800px for focused apps
- Border radius: 8px (small), 12px (medium), 16px (large), 24px (cards)
- Always responsive: mobile-first with min 2 breakpoints (768px, 1024px)

VISUAL POLISH:
- Subtle box-shadows: 0 1px 3px rgba(0,0,0,0.3), 0 4px 24px rgba(0,0,0,0.2)
- Glass morphism on key elements: background: rgba(30,41,59,0.8); backdrop-filter: blur(20px)
- Smooth transitions on ALL interactive elements: transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)
- Hover states: transform: translateY(-2px), increased box-shadow, color shift
- Active states: transform: scale(0.98)
- Focus states: outline: 2px solid #6366f1; outline-offset: 2px
- Loading skeletons for async content (pulsing gradient)
- Empty states with helpful illustrations (emoji + message)
- Toast notifications for user feedback
- Smooth page transitions / content animations (fade-in, slide-up)

CSS VARIABLES in :root — organized by category:
  --color-bg, --color-surface, --color-card, --color-primary, etc.
  --font-sans, --font-mono
  --radius-sm, --radius-md, --radius-lg
  --shadow-sm, --shadow-md, --shadow-lg
  --transition-fast, --transition-normal

ANIMATIONS:
- @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
- @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
- @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
- Stagger children animations with animation-delay

EVERY APP MUST HAVE:
1. A professional header/nav with app name, navigation, and user actions
2. A main content area with proper padding and max-width
3. A footer with "Powered by DevBot AI" and relevant links
4. Toast/notification system for user feedback
5. Loading states (skeleton screens or spinners)
6. Empty states with clear call-to-action
7. Responsive design that genuinely works on mobile
8. At least 3 micro-interactions (hover, click, scroll)
9. Keyboard shortcuts for power users (documented in a modal)
10. Smooth scroll behavior and scroll-to-top button
11. Dark mode by default with polished aesthetics
12. Proper favicon meta tag and page title

═══════════════════════════════════════════════════════════
CONTENT & DATA — MAKE IT REAL
═══════════════════════════════════════════════════════════

- Generate realistic sample data (not "Lorem ipsum")
- If the app needs items/products/users, include 8-15 realistic entries
- Use real-looking names, descriptions, prices, dates
- Generate meaningful chart data if dashboards are involved
- Implement all CRUD operations fully (Create, Read, Update, Delete)
- Every button, every form, every feature MUST work

═══════════════════════════════════════════════════════════
ARCHITECTURE PATTERNS — USE THESE
═══════════════════════════════════════════════════════════

STATE MANAGEMENT (in js/app.js):
\`\`\`
const Store = {
  state: { items: [], filter: 'all', search: '', loading: false },
  listeners: new Set(),
  setState(updates) {
    Object.assign(this.state, updates);
    this.notify();
  },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  notify() { this.listeners.forEach(fn => fn(this.state)); }
};
\`\`\`

COMPONENT PATTERN (in js/components.js):
\`\`\`
const Components = {
  Card({ title, content, actions }) {
    return \`<div class="card">...</div>\`;
  },
  Modal({ title, body, onClose }) {
    return \`<div class="modal-overlay">...</div>\`;
  },
  Toast(message, type = 'success') {
    // Show notification, auto-dismiss after 3s
  }
};
\`\`\`

ROUTER PATTERN (for multi-page apps):
\`\`\`
const Router = {
  routes: {},
  register(path, handler) { this.routes[path] = handler; },
  navigate(path) {
    history.pushState(null, '', path);
    this.render(path);
  },
  render(path) {
    const handler = this.routes[path] || this.routes['/404'];
    document.getElementById('app').innerHTML = handler();
  }
};
\`\`\`

REMEMBER: Return ONLY the JSON object. No markdown fences. No backticks. No text before or after.`;


const ENHANCEMENT_PROMPT = `You are DevBot AI, enhancing an existing app. The user wants to modify their app.

RULES:
1. Return the COMPLETE updated files — not just diffs.
2. Maintain all existing functionality unless told to remove it.
3. Keep the same JSON output format: {"name","description","files":{},"setup","run","preview"}
4. Preserve the app's state management and data.
5. Return ONLY valid JSON. No markdown. No explanation.`;


export class DevBotEngine {
  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in environment');
    this.client = new Anthropic({ apiKey: key });
    this.model = 'claude-opus-4-6';
  }

  /**
   * Generate a complete production app from a prompt.
   * Streams the response to handle large outputs (64K tokens).
   */
  async generateApp({ prompt, language = 'auto', framework = 'auto' }) {
    const userPrompt = this.buildPrompt(prompt, language, framework);

    let fullText = '';
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 65536,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        fullText += event.delta.text;
      }
    }

    const result = this.parseResponse(fullText);
    this.validateOutput(result);

    // Post-process: ensure index.html references CSS/JS files properly
    result.files = this.postProcessFiles(result.files);

    return result;
  }

  /**
   * Enhance/iterate on an existing app with new instructions.
   */
  async enhanceApp({ currentApp, instruction }) {
    const filesSummary = Object.entries(currentApp.files)
      .map(([path, content]) => `--- ${path} ---\n${content}`)
      .join('\n\n');

    const userPrompt = `CURRENT APP: "${currentApp.name}"
CURRENT FILES:
${filesSummary}

USER REQUEST: ${instruction}

Update the app based on the user's request. Return the COMPLETE updated app as JSON.
Keep all existing functionality unless told to remove it. Return ONLY the JSON object.`;

    let fullText = '';
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 65536,
      system: ENHANCEMENT_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        fullText += event.delta.text;
      }
    }

    const result = this.parseResponse(fullText);
    this.validateOutput(result);
    result.files = this.postProcessFiles(result.files);
    return result;
  }

  /**
   * Chat with the engine for general questions.
   */
  async chat(messages) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: 'You are DevBot AI, an expert software engineer. Help users with coding questions, architecture decisions, and debugging. Be thorough and provide working code examples.',
      messages,
    });
    return response.content[0].text;
  }

  /**
   * Review code for bugs, security, performance.
   */
  async reviewCode(code, language) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: `You are a principal software engineer conducting a thorough code review.

For each issue found, provide:
- **Severity**: 🔴 Critical | 🟠 Warning | 🔵 Info
- **Line(s)**: Where the issue is
- **Problem**: Clear description
- **Fix**: Exact code to fix it

Also provide:
- Overall code quality score (1-10)
- Architecture assessment
- Security audit
- Performance analysis
- Accessibility check (for frontend code)
- Top 3 improvements to make`,
      messages: [{
        role: 'user',
        content: `Review this ${language} code thoroughly:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      }],
    });
    return response.content[0].text;
  }

  /**
   * Refactor code with specific instructions.
   */
  async refactorCode(code, language, instructions) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16384,
      system: 'You are a principal software engineer. Return ONLY the refactored code with no explanation. The code must be production-ready.',
      messages: [{
        role: 'user',
        content: `Refactor this ${language} code.\n\nInstructions: ${instructions}\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn the complete refactored code.`,
      }],
    });
    return response.content[0].text;
  }

  /**
   * Build the user prompt with framework/language hints.
   */
  buildPrompt(prompt, language, framework) {
    let fullPrompt = `BUILD THIS APPLICATION:\n${prompt}\n\n`;

    if (language !== 'auto') fullPrompt += `Primary Language: ${language}\n`;
    if (framework !== 'auto') fullPrompt += `Framework/Library: ${framework}\n`;

    fullPrompt += `
MANDATORY REQUIREMENTS:
1. Generate a MULTI-FILE project with proper separation: index.html, css/styles.css, js/app.js, and more files as needed.
2. index.html MUST use <link rel="stylesheet" href="css/styles.css"> and <script src="js/app.js"></script> — NOT inline styles/scripts.
3. CSS must be comprehensive: variables, layout, components, animations, responsive breakpoints, dark theme.
4. JavaScript must use modern patterns: state management, component functions, event delegation, proper error handling.
5. The app MUST be fully functional — every button, form, feature, and interaction must work with zero modifications.
6. Generate realistic sample data — real names, descriptions, prices. NOT lorem ipsum.
7. Include proper package.json, README.md, and .gitignore.
8. Make it responsive — genuinely works on mobile (not just "doesn't break").
9. Add toast notifications, loading states, empty states, keyboard shortcuts.
10. The UI must look like it was designed by a professional — polished, consistent, beautiful.
11. Add a subtle "Powered by DevBot AI" footer link.
12. Write COMPLETE code — no placeholders, no TODOs, no stubs.

OUTPUT: Return ONLY the JSON object. No markdown fences. No backticks. No text before or after the JSON.`;

    return fullPrompt;
  }

  /**
   * Post-process generated files:
   * - Create a self-contained preview version of index.html
   *   (with CSS/JS inlined for iframe preview)
   * - Ensure all file references are correct
   */
  postProcessFiles(files) {
    if (!files || typeof files !== 'object') return files;

    // Create a __preview__.html that inlines all CSS and JS for live preview
    const indexHtml = files['index.html'];
    if (indexHtml) {
      let previewHtml = indexHtml;

      // Inline all CSS <link> tags
      previewHtml = previewHtml.replace(
        /<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>/gi,
        (match, cssPath) => {
          const cssContent = files[cssPath] || files[cssPath.replace(/^\.\//, '')];
          if (cssContent) {
            return `<style>\n/* Inlined from ${cssPath} */\n${cssContent}\n</style>`;
          }
          return match;
        }
      );

      // Inline all <script src="..."> tags
      previewHtml = previewHtml.replace(
        /<script\s+src="([^"]+)"[^>]*><\/script>/gi,
        (match, jsPath) => {
          const jsContent = files[jsPath] || files[jsPath.replace(/^\.\//, '')];
          if (jsContent) {
            return `<script>\n/* Inlined from ${jsPath} */\n${jsContent}\n</script>`;
          }
          return match;
        }
      );

      files['__preview__.html'] = previewHtml;
    }

    return files;
  }

  /**
   * Validate the generated output quality.
   */
  validateOutput(result) {
    if (!result.files || typeof result.files !== 'object') {
      throw new Error('Generation produced no files');
    }

    const files = Object.keys(result.files);
    const totalChars = Object.values(result.files).reduce((sum, c) => sum + (c?.length || 0), 0);

    // Log generation stats
    console.log(`[DevBot] Generated: ${files.length} files, ${totalChars.toLocaleString()} chars total`);
    console.log(`[DevBot] Files: ${files.join(', ')}`);

    // Quality warnings
    if (!result.files['index.html']) {
      console.warn('[DevBot] Warning: No index.html generated');
    }

    for (const [path, content] of Object.entries(result.files)) {
      if (!content || content.length < 30) {
        console.warn(`[DevBot] Warning: ${path} has minimal content (${content?.length || 0} chars)`);
      }
    }

    // Check for placeholder code (quality gate)
    const allCode = Object.values(result.files).join('\n');
    const placeholders = ['// TODO', '// implement', '// add code here', '// placeholder', '// your code'];
    for (const ph of placeholders) {
      if (allCode.toLowerCase().includes(ph.toLowerCase())) {
        console.warn(`[DevBot] Warning: Found placeholder "${ph}" in generated code`);
      }
    }
  }

  /**
   * Parse AI response text into structured JSON.
   * Handles: direct JSON, markdown fences, truncated output, malformed JSON.
   */
  parseResponse(text) {
    const trimmed = text.trim();

    // Step 1: Direct parse
    try { return JSON.parse(trimmed); } catch (e) {
      console.log('[DevBot] Direct parse failed:', e.message.substring(0, 100));
    }

    // Step 2: Extract from markdown code blocks
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```\s*$/);
    if (codeBlockMatch) {
      const inner = codeBlockMatch[1].trim();
      try { return JSON.parse(inner); } catch (e) {
        console.log('[DevBot] Code block parse failed:', e.message.substring(0, 100));
        const repaired = this.repairTruncatedJson(inner);
        if (repaired) {
          try { return JSON.parse(repaired); } catch {}
        }
      }
    }

    // Step 3: Find JSON by locating first { and last }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try { return JSON.parse(candidate); } catch (e) {
        console.log('[DevBot] Slice parse failed:', e.message.substring(0, 100));

        // Fix trailing commas
        try {
          const fixed = candidate
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          return JSON.parse(fixed);
        } catch {}
      }
    }

    // Step 4: Brace-depth matching
    const start = trimmed.indexOf('{');
    if (start !== -1) {
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        if (ch === '}') {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(trimmed.slice(start, i + 1)); } catch { break; }
          }
        }
      }
    }

    // Step 5: Repair truncated JSON
    const rawJson = trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    const repaired = this.repairTruncatedJson(rawJson);
    if (repaired) {
      try { return JSON.parse(repaired); } catch {}
    }

    // Step 6: Fallback
    console.warn('[DevBot] All parse methods failed. Returning raw output.');
    return {
      name: 'generated-app',
      description: 'Generated by DevBot AI',
      files: { 'output.txt': trimmed },
      setup: ['Review the generated output'],
      run: 'See output.txt',
    };
  }

  /**
   * Repair truncated JSON by finding the last complete file entry
   * and closing the JSON structure properly.
   */
  repairTruncatedJson(text) {
    if (!text || !text.startsWith('{')) return null;

    try {
      const filesMatch = text.match(/"files"\s*:\s*\{/);
      if (!filesMatch) return null;

      const filesStart = filesMatch.index + filesMatch[0].length;
      let lastCompleteEntry = filesStart;
      let depth = 1;
      let i = filesStart;
      let esc = false;
      let inStr = false;

      while (i < text.length && depth > 0) {
        const ch = text[i];
        if (esc) { esc = false; i++; continue; }
        if (ch === '\\') { esc = true; i++; continue; }
        if (ch === '"') { inStr = !inStr; }
        else if (!inStr) {
          if (ch === '{') depth++;
          if (ch === '}') {
            depth--;
            if (depth === 0) {
              const afterFiles = text.substring(i + 1).trim();
              if (afterFiles.includes('}')) return null;
            }
          }
          if (ch === ',' && depth === 1) {
            lastCompleteEntry = i;
          }
        }
        i++;
      }

      if (depth > 0 && lastCompleteEntry > filesStart) {
        const truncated = text.substring(0, lastCompleteEntry);
        return truncated + '}, "setup": ["npx serve ."], "run": "npx serve .", "preview": "index.html"}';
      }

      return null;
    } catch {
      return null;
    }
  }
}

import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are DevBot AI, the world's most advanced AI app builder. You generate complete, beautiful, production-grade web applications.

ABSOLUTE RULES — NEVER BREAK THESE:

1. OUTPUT FORMAT
   - Return ONLY a valid JSON object. Nothing before it. Nothing after it.
   - No markdown code fences. No explanation text. Just pure JSON.

2. CODE QUALITY — PRODUCTION GRADE
   - Write COMPLETE, REAL, RUNNABLE source code in every file.
   - NEVER use placeholder comments like "// TODO", "// add code here", "// implement this".
   - NEVER describe what code should do — WRITE THE ACTUAL CODE.
   - Every function must be fully implemented with real logic.
   - Every import must resolve correctly.
   - The app must work with ZERO modifications after generation.

3. BEAUTIFUL UI — THIS IS NON-NEGOTIABLE
   - Every web app MUST have a stunning, modern, polished UI.
   - Use a dark theme by default: background #0f172a, surface #1e293b, text #f1f5f9.
   - Use smooth gradients, subtle shadows, border-radius: 12-16px on cards.
   - Add hover effects with transform: translateY(-2px) and box-shadow transitions.
   - Use a professional font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
   - Add subtle animations: fade-ins, slide-ups, scale transitions.
   - Make it responsive with flexbox/grid and media queries.
   - Use proper spacing: 16-32px padding, 12-24px gaps.
   - Primary color: #6366f1 (indigo). Accent: #06b6d4 (cyan). Success: #10b981 (green).
   - EVERY app should look like it was designed by a professional UI designer.

4. FILE STRUCTURE
   - index.html — The ENTIRE app in one file: HTML + CSS in <style> + JS in <script>. Must work when opened directly.
   - package.json — With name, version, description, scripts
   - README.md — Setup instructions
   - IMPORTANT: Put ALL code in index.html. Do NOT create separate .css or .js files. Keep output compact.

5. ARCHITECTURE PATTERNS
   - Use clean separation of concerns even in single-file apps.
   - State management: use a simple store pattern or module pattern.
   - Event delegation where appropriate.
   - Error handling: try/catch around async operations, user-friendly error messages.
   - Input validation on all forms.
   - LocalStorage for data persistence where it makes sense.
   - Accessibility: proper labels, ARIA attributes, keyboard navigation.

6. FEATURES EVERY APP MUST HAVE
   - A header/nav bar with the app name and a subtle "Built with DevBot AI" badge.
   - Loading states for async operations.
   - Empty states with helpful messages.
   - Responsive layout that works on mobile and desktop.
   - At least one animation or micro-interaction.
   - Proper favicon meta tag.

CRITICAL OUTPUT RULES:
- Return raw JSON. NO markdown fences. NO backticks. NO \`\`\`json. Just the { } object.
- Keep total output under 12000 characters.

JSON STRUCTURE:
{"name":"app-name","description":"what it does","files":{"index.html":"FULL APP HERE","package.json":"{}","README.md":"docs"},"setup":["npx serve ."],"run":"npx serve ."}`;

export class DevBotEngine {
  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in environment');
    this.client = new Anthropic({ apiKey: key });
    this.model = 'claude-opus-4-6';
  }

  async generateApp({ prompt, language = 'auto', framework = 'auto' }) {
    const userPrompt = this.buildPrompt(prompt, language, framework);

    // Use streaming to avoid timeout on large generations
    let fullText = '';
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        fullText += event.delta.text;
      }
    }

    const result = this.parseResponse(fullText);

    // Validate the output quality
    this.validateOutput(result);

    return result;
  }

  async chat(messages) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    });
    return response.content[0].text;
  }

  async reviewCode(code, language) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: 'You are a senior code reviewer. Be thorough, specific, and constructive. Rate severity as Critical, Warning, or Info. Always suggest the exact fix.',
      messages: [{
        role: 'user',
        content: `Review this ${language} code for bugs, security vulnerabilities, performance issues, and best practice violations. Be thorough:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      }],
    });
    return response.content[0].text;
  }

  async refactorCode(code, language, instructions) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: 'You are a senior software engineer. Return ONLY the refactored code with no explanation.',
      messages: [{
        role: 'user',
        content: `Refactor this ${language} code. Instructions: ${instructions}\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn the complete refactored code.`,
      }],
    });
    return response.content[0].text;
  }

  buildPrompt(prompt, language, framework) {
    let fullPrompt = `BUILD THIS APP:\n${prompt}\n\n`;

    if (language !== 'auto') fullPrompt += `Primary Language: ${language}\n`;
    if (framework !== 'auto') fullPrompt += `Framework: ${framework}\n`;

    fullPrompt += `
MANDATORY REQUIREMENTS:
1. Put ALL CSS and ALL JavaScript INLINE inside index.html. The entire app must be ONE self-contained HTML file.
2. DO NOT create separate styles.css or app.js files — put EVERYTHING in index.html.
3. Write BEAUTIFUL UI — dark theme (#0f172a bg), gradients, shadows, hover effects, animations.
4. The app must be FUNCTIONAL — all buttons work, all forms submit, all features implemented.
5. Use localStorage for data persistence.
6. Include: index.html (main app), package.json, README.md
7. Keep the total output under 12000 characters to avoid truncation.
8. Make it responsive — works on mobile and desktop.
9. Add a small "Built with DevBot AI" link in the footer.

Return ONLY the JSON object. No markdown fences. No backticks. No text before or after the JSON.`;

    return fullPrompt;
  }

  validateOutput(result) {
    // Ensure we have files
    if (!result.files || typeof result.files !== 'object') {
      throw new Error('Generation produced no files');
    }

    const files = Object.keys(result.files);
    const totalChars = Object.values(result.files).reduce((sum, c) => sum + (c?.length || 0), 0);

    // Warn if low file count but don't crash — some apps are simpler
    if (files.length < 3) {
      console.warn(`[DevBot] Warning: Only ${files.length} files generated`);
    }

    // Check that files have real content (not just descriptions)
    for (const [path, content] of Object.entries(result.files)) {
      if (!content || content.length < 50) {
        console.warn(`[DevBot] Warning: ${path} has very little content (${content?.length || 0} chars)`);
      }
    }

    // Check for index.html with actual HTML
    const indexHtml = result.files['index.html'];
    if (indexHtml && !indexHtml.includes('<!DOCTYPE') && !indexHtml.includes('<html')) {
      console.warn('[DevBot] Warning: index.html may not contain valid HTML');
    }

    console.log(`[DevBot] Generated: ${files.length} files, ${totalChars.toLocaleString()} chars total`);
  }

  parseResponse(text) {
    const trimmed = text.trim();

    // Step 1: Try direct parse
    try { return JSON.parse(trimmed); } catch (e) {
      console.log('[DevBot] Direct parse failed:', e.message.substring(0, 80));
    }

    // Step 2: Try extracting from markdown code blocks (greedy match for large blocks)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```\s*$/);
    if (codeBlockMatch) {
      const inner = codeBlockMatch[1].trim();
      try { return JSON.parse(inner); } catch (e) {
        console.log('[DevBot] Code block parse failed:', e.message.substring(0, 80));
        // Try fixing truncated JSON — find the last complete file entry
        const repaired = this.repairTruncatedJson(inner);
        if (repaired) {
          try { return JSON.parse(repaired); } catch {}
        }
      }
    }

    // Step 3: Find the JSON by locating first { and last }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try { return JSON.parse(candidate); } catch (e) {
        console.log('[DevBot] Slice parse failed:', e.message.substring(0, 80));

        // Step 3b: Try to fix common JSON issues — trailing commas, unescaped newlines
        try {
          const fixed = candidate
            .replace(/,\s*}/g, '}')       // Remove trailing commas before }
            .replace(/,\s*]/g, ']');       // Remove trailing commas before ]
          return JSON.parse(fixed);
        } catch {}
      }
    }

    // Step 4: Brace-depth matching as last resort
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

    // Step 5: Try to repair truncated JSON from the raw text
    const rawJson = trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    const repaired = this.repairTruncatedJson(rawJson);
    if (repaired) {
      try { return JSON.parse(repaired); } catch {}
    }

    // Step 6: Fallback — return raw text
    console.warn('[DevBot] All parse methods failed. Returning raw output.');
    return {
      name: 'generated-app',
      description: 'Generated by DevBot AI',
      files: { 'output.md': trimmed },
      setup: ['Review the generated output'],
      run: 'See output.md',
    };
  }

  /**
   * Attempt to repair truncated JSON from the AI.
   * The AI sometimes runs out of tokens mid-JSON, leaving unterminated strings.
   * This finds the last complete key-value pair and closes the JSON properly.
   */
  repairTruncatedJson(text) {
    if (!text || !text.startsWith('{')) return null;

    try {
      // Find the "files" object and extract complete file entries
      const filesMatch = text.match(/"files"\s*:\s*\{/);
      if (!filesMatch) return null;

      const filesStart = filesMatch.index + filesMatch[0].length;

      // Find all complete "filename": "content" pairs
      // A complete pair ends with a closing quote followed by optional comma/whitespace
      let lastGoodPos = filesStart;
      let inKey = false;
      let inValue = false;
      let depth = 1;
      let i = filesStart;
      let esc = false;
      let inStr = false;
      let lastCompleteEntry = filesStart;

      while (i < text.length && depth > 0) {
        const ch = text[i];

        if (esc) { esc = false; i++; continue; }
        if (ch === '\\') { esc = true; i++; continue; }

        if (ch === '"') {
          inStr = !inStr;
        } else if (!inStr) {
          if (ch === '{') depth++;
          if (ch === '}') {
            depth--;
            if (depth === 0) {
              // Found the closing brace of "files" — check if rest of JSON exists
              const afterFiles = text.substring(i + 1).trim();
              if (afterFiles.includes('}')) {
                // There's more JSON after files — try to parse the whole thing
                return null; // Let other parsers handle it
              }
            }
          }
          // Track positions after commas between file entries
          if (ch === ',' && depth === 1) {
            lastCompleteEntry = i;
          }
        }
        i++;
      }

      // If we exited because depth > 0, the JSON is truncated
      if (depth > 0 && lastCompleteEntry > filesStart) {
        // Truncate at the last complete entry and close the JSON
        const truncated = text.substring(0, lastCompleteEntry);
        // Close: files object, then add setup/run, close main object
        const closed = truncated + '}, "setup": ["npx serve ."], "run": "npx serve ."}';
        return closed;
      }

      return null;
    } catch {
      return null;
    }
  }
}

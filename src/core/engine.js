import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are DevBot, the most powerful AI app creator ever built.

CRITICAL RULES — FOLLOW EVERY TIME:
1. Return ONLY a valid JSON object. No markdown fences. No explanation before or after.
2. The "files" object must contain REAL, COMPLETE, RUNNABLE source code — NOT descriptions, NOT placeholders, NOT comments like "// add your code here".
3. Every file must contain the FULL implementation. If a React component needs 80 lines, write all 80 lines.
4. Include at minimum: source files with full code, package.json/requirements.txt with all dependencies, README.md with setup instructions, and at least one test file.
5. All imports must be correct. All function signatures must match their usage. The app must run with ZERO modifications.
6. For web apps: include complete HTML with inline CSS and JavaScript so it renders in a browser immediately.
7. For React/Vue/Svelte apps: include an index.html entry point that loads the app.
8. NEVER return a file that just describes what should be in it. WRITE THE ACTUAL CODE.

JSON structure (return ONLY this, nothing else):
{"name":"project-name","description":"what this app does","files":{"path/to/file.ext":"FULL FILE CONTENTS HERE"},"setup":["npm install","npm start"],"run":"npm start"}`;

export class DevBotEngine {
  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in environment');
    this.client = new Anthropic({ apiKey: key });
    this.model = 'claude-sonnet-4-20250514';
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

    return this.parseResponse(fullText);
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
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Review this ${language} code for bugs, security issues, and improvements. Be thorough:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      }],
    });
    return response.content[0].text;
  }

  async refactorCode(code, language, instructions) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Refactor this ${language} code. Instructions: ${instructions}\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn the complete refactored code.`,
      }],
    });
    return response.content[0].text;
  }

  buildPrompt(prompt, language, framework) {
    let fullPrompt = `Build this app: ${prompt}\n\n`;
    if (language !== 'auto') fullPrompt += `Language: ${language}\n`;
    if (framework !== 'auto') fullPrompt += `Framework: ${framework}\n`;
    fullPrompt += `
IMPORTANT:
- Write COMPLETE source code for every file. No placeholders. No "// TODO". No descriptions instead of code.
- For web apps, include an index.html with full inline CSS and JS so it works when opened directly in a browser.
- Include package.json or requirements.txt with ALL dependencies listed.
- Include at least one test file with real test cases.
- Include a README.md with clear setup and run instructions.
- Minimum 5 files. Write REAL, WORKING, COMPLETE code in every single file.

Return ONLY the JSON object. No text before or after it.`;
    return fullPrompt;
  }

  parseResponse(text) {
    // Step 1: Try direct parse
    try { return JSON.parse(text.trim()); } catch {}

    // Step 2: Try extracting from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
    }

    // Step 3: Find outermost JSON by brace matching
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch { break; }
        }}
      }
    }

    // Step 4: Fallback — return raw text as a file
    return {
      name: 'generated-app',
      description: 'Generated by DevBot AI',
      files: { 'output.md': text },
      setup: ['Review the generated output'],
      run: 'See output.md',
    };
  }
}

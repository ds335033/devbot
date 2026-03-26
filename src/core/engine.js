import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are DevBot, the most powerful AI app creator ever built.
You are powered by Claude Opus 4.6 with a 1,000,000 token context window.

Your capabilities:
- Generate complete, production-ready applications from a single prompt
- Support any language: JavaScript, TypeScript, Python, Go, Rust, etc.
- Support any framework: React, Next.js, Express, FastAPI, Django, etc.
- Generate full project structures with all files, configs, and tests
- Create deployment configs (Docker, Kubernetes, Vercel, AWS)
- Write comprehensive documentation
- Implement best practices: security, performance, accessibility

Output format: Always return structured JSON with file paths and contents.
Every app you create should be immediately runnable with zero modifications.`;

export class DevBotEngine {
  constructor() {
    this.client = new Anthropic();
    this.model = 'claude-opus-4-6';
  }

  async generateApp({ prompt, language = 'auto', framework = 'auto' }) {
    const userPrompt = this.buildPrompt(prompt, language, framework);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0].text;
    return this.parseResponse(content);
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
    let fullPrompt = `Create a complete, production-ready application:\n\n${prompt}\n\n`;
    if (language !== 'auto') fullPrompt += `Language: ${language}\n`;
    if (framework !== 'auto') fullPrompt += `Framework: ${framework}\n`;
    fullPrompt += `\nReturn a JSON object with this structure:
{
  "name": "project-name",
  "description": "what this app does",
  "files": {
    "path/to/file.ext": "file contents...",
    ...
  },
  "setup": ["step 1", "step 2"],
  "run": "command to run the app"
}`;
    return fullPrompt;
  }

  parseResponse(text) {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { raw: text };
      }
    }
    return { raw: text };
  }
}

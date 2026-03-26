import pkg from '@slack/bolt';
const { App } = pkg;

export class SlackBot {
  constructor(engine, github) {
    this.engine = engine;
    this.github = github;
    this.conversations = new Map();

    const useSocketMode = !!process.env.SLACK_APP_TOKEN;

    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      ...(useSocketMode
        ? { socketMode: true, appToken: process.env.SLACK_APP_TOKEN }
        : { port: process.env.SLACK_PORT || 3001 }),
    });

    this.registerHandlers();
  }

  registerHandlers() {
    // Main command: /devbot
    this.app.command('/devbot', async ({ command, ack, respond }) => {
      await ack();
      const subcommand = command.text.split(' ')[0];
      const args = command.text.slice(subcommand.length).trim();

      switch (subcommand) {
        case 'create':
          await this.handleCreate(args, respond);
          break;
        case 'review':
          await this.handleReview(args, respond);
          break;
        case 'status':
          await this.handleStatus(respond);
          break;
        case 'help':
          await this.handleHelp(respond);
          break;
        default:
          await this.handleChat(command.text, respond);
      }
    });

    // Respond to mentions
    this.app.event('app_mention', async ({ event, say }) => {
      const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
      if (!text) {
        await say('Hey! I\'m DevBot. Tell me what app to build, or type `/devbot help`.');
        return;
      }
      await this.handleChat(text, say, event.channel, event.user);
    });

    // DMs
    this.app.event('message', async ({ event, say }) => {
      if (event.channel_type !== 'im' || event.bot_id) return;
      await this.handleChat(event.text, say, event.channel, event.user);
    });
  }

  async handleCreate(prompt, respond) {
    await respond({
      text: `:rocket: *DevBot is generating your app...*\n> ${prompt}\n_Powered by Claude Opus 4.6 (1M context)_`,
    });

    try {
      const result = await this.engine.generateApp({ prompt });
      const fileCount = result.files ? Object.keys(result.files).length : 0;

      let message = `:white_check_mark: *App Generated: ${result.name || 'your-app'}*\n`;
      message += `> ${result.description || prompt}\n`;
      message += `*Files:* ${fileCount}\n`;

      if (result.files) {
        message += '```\n';
        for (const path of Object.keys(result.files).slice(0, 15)) {
          message += `${path}\n`;
        }
        if (fileCount > 15) message += `... and ${fileCount - 15} more\n`;
        message += '```\n';
      }

      if (result.setup) {
        message += `*Setup:*\n${result.setup.map(s => `• ${s}`).join('\n')}\n`;
      }
      if (result.run) {
        message += `*Run:* \`${result.run}\`\n`;
      }

      // Push to GitHub if configured
      if (process.env.GITHUB_TOKEN && result.files) {
        message += '\n:octocat: _Ready to push to GitHub. React with :github: to create a repo._';
      }

      await respond({ text: message });
    } catch (err) {
      await respond({ text: `:x: Error: ${err.message}` });
    }
  }

  async handleReview(args, respond) {
    await respond({ text: ':mag: *Reviewing code...*' });
    try {
      const review = await this.engine.reviewCode(args, 'auto');
      await respond({ text: `:clipboard: *Code Review:*\n${review}` });
    } catch (err) {
      await respond({ text: `:x: Error: ${err.message}` });
    }
  }

  async handleStatus(respond) {
    await respond({
      text: [
        ':robot_face: *DevBot Status*',
        `*Model:* Claude Opus 4.6 (1M context)`,
        `*Uptime:* ${Math.floor(process.uptime())}s`,
        `*Active conversations:* ${this.conversations.size}`,
        `*GitHub:* ${process.env.GITHUB_TOKEN ? 'Connected' : 'Not configured'}`,
        `*Engine:* Online and ready`,
      ].join('\n'),
    });
  }

  async handleHelp(respond) {
    await respond({
      text: [
        ':robot_face: *DevBot Commands*',
        '',
        '`/devbot create <description>` - Generate a complete app',
        '`/devbot review <code>` - Review code for issues',
        '`/devbot status` - Check bot status',
        '`/devbot help` - Show this message',
        '',
        'Or just mention @DevBot with any request!',
        '',
        '_Powered by Claude Opus 4.6 | Built by Dazza_',
      ].join('\n'),
    });
  }

  async handleChat(text, say, channel, user) {
    const key = `${channel}-${user}`;
    if (!this.conversations.has(key)) {
      this.conversations.set(key, []);
    }

    const history = this.conversations.get(key);
    history.push({ role: 'user', content: text });

    // Keep last 20 messages for context
    if (history.length > 20) history.splice(0, history.length - 20);

    try {
      const reply = await this.engine.chat(history);
      history.push({ role: 'assistant', content: reply });
      await say(reply);
    } catch (err) {
      await say(`:x: Error: ${err.message}`);
    }
  }

  async start() {
    await this.app.start();
    const mode = process.env.SLACK_APP_TOKEN ? 'socket mode' : `HTTP mode on port ${process.env.SLACK_PORT || 3001}`;
    console.log(`[DevBot] Slack bot is running in ${mode}`);
  }
}

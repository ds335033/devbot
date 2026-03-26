# DevBot

The most powerful AI app creator ever built. Powered by Claude Opus 4.6 (1M context).

## What DevBot Does

Tell DevBot what app you want. It builds it. Complete, production-ready, zero modifications needed.

**From Slack:**
```
/devbot create a real-time chat app with React and WebSocket support
```

**From API:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a task management API with auth", "language": "typescript", "framework": "express"}'
```

## Features

- **App Generation** - Complete projects from a single prompt
- **Code Review** - Thorough security and quality analysis
- **GitHub Integration** - Auto-create repos and push generated apps
- **Slack Bot** - Full conversational interface via Slack
- **Any Stack** - JS, TS, Python, Go, Rust, React, Next.js, FastAPI, and more

## Setup

1. Clone this repo
2. Copy `.env.example` to `.env` and fill in your keys
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start DevBot:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SLACK_BOT_TOKEN` | Slack bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Slack app signing secret |
| `SLACK_APP_TOKEN` | Slack app-level token (xapp-...) |
| `GITHUB_TOKEN` | GitHub personal access token |
| `PORT` | Server port (default: 3000) |

## Architecture

```
devbot/
├── src/
│   ├── core/
│   │   ├── app.js        # Express server + orchestration
│   │   └── engine.js     # Claude Opus 4.6 AI engine
│   ├── slack/
│   │   └── bot.js        # Slack Bolt bot (socket mode)
│   ├── github/
│   │   └── client.js     # Octokit GitHub integration
│   └── api/
│       └── routes.js     # REST API endpoints
├── config/
├── tests/
├── .env.example
└── package.json
```

## Built By

Dazza - powered by Claude Opus 4.6

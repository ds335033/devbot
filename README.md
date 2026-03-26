# DevBot

> The most powerful AI-powered app creator ever built. One prompt. Full app. Zero modifications.

**DevBot** is a next-generation AI development bot that combines the raw intelligence of **Claude Opus 4.6** (1,000,000 token context window) with deep integrations into **GitHub** and **Slack** to create a seamless, end-to-end app development experience. Tell DevBot what you want built, and it delivers complete, production-ready applications -- with full project structure, configuration, tests, and deployment configs -- in seconds.

DevBot isn't a code snippet generator. It's a full-stack AI engineering team compressed into a single bot.

## What Makes DevBot Different

| Feature | Other AI Tools | DevBot |
|---------|---------------|--------|
| Context window | 8K-128K tokens | **1,000,000 tokens** |
| Output | Code snippets | **Complete, runnable projects** |
| GitHub integration | Copy-paste | **Auto-create repos, push code, PRs** |
| Interface | Web chat | **Slack bot + REST API** |
| Code review | Basic suggestions | **Security, performance, architecture analysis** |
| Languages | Limited | **Any language, any framework** |

## Core Capabilities

### App Generation
Tell DevBot what to build. It generates every file, every config, every test. Ready to run.

```
/devbot create a real-time collaborative whiteboard app with React, WebSocket, and Redis
```

DevBot returns:
- Complete project structure with all source files
- Package configs (package.json, requirements.txt, go.mod, etc.)
- Docker and deployment configurations
- README with setup instructions
- Tests for critical paths

### Code Review
Paste any code. DevBot analyzes it for:
- Security vulnerabilities (OWASP Top 10)
- Performance bottlenecks
- Architecture anti-patterns
- Best practice violations
- Accessibility issues

```
/devbot review <paste your code>
```

### Intelligent Chat
DevBot maintains full conversational context per user per channel. Ask follow-up questions, iterate on designs, debug issues -- DevBot remembers everything in the conversation.

### GitHub Automation
- **Create repositories** directly from generated apps
- **Push code** with proper commit messages
- **Create issues** for bug tracking
- **Open pull requests** for code changes
- **List and search** your repositories

## Supported Stacks

DevBot generates production-ready apps in any combination:

**Languages:** JavaScript, TypeScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin

**Frontend:** React, Next.js, Vue, Svelte, Angular, Astro, Solid

**Backend:** Express, Fastify, FastAPI, Django, Flask, Gin, Actix, Spring Boot, .NET

**Databases:** PostgreSQL, MySQL, MongoDB, Redis, SQLite, Prisma, Drizzle

**Deployment:** Docker, Kubernetes, Vercel, AWS, GCP, Railway, Fly.io

## Quick Start

### From Slack
```
/devbot create a task management API with JWT auth using TypeScript and Express
/devbot create a landing page for a SaaS product with Next.js and Tailwind
/devbot create a CLI tool in Rust that converts CSV to JSON
```

### From the REST API
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a real-time chat application with rooms and user presence",
    "language": "typescript",
    "framework": "next.js"
  }'
```

### Via Direct Message
Just DM @DevBot in Slack with any request. It responds conversationally and can generate apps, review code, or answer technical questions.

## Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/ds335033/devbot.git
   cd devbot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start DevBot:**
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude Opus 4.6 |
| `SLACK_BOT_TOKEN` | Yes | Slack bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | Slack app signing secret |
| `SLACK_APP_TOKEN` | Yes | Slack app-level token for socket mode (xapp-...) |
| `GITHUB_TOKEN` | Optional | GitHub PAT for repo creation and code push |
| `PORT` | No | Server port (default: 3000) |

## Architecture

```
devbot/
├── src/
│   ├── core/
│   │   ├── app.js          # Express server, health checks, API routes
│   │   └── engine.js       # Claude Opus 4.6 AI engine
│   │                        # - generateApp(): full project generation
│   │                        # - chat(): conversational AI with history
│   │                        # - reviewCode(): security & quality analysis
│   │                        # - refactorCode(): intelligent refactoring
│   ├── slack/
│   │   └── bot.js          # Slack Bolt bot (socket mode)
│   │                        # - /devbot command handler
│   │                        # - @mention responses
│   │                        # - DM conversations
│   │                        # - Per-user conversation memory
│   ├── github/
│   │   └── client.js       # Octokit GitHub integration
│   │                        # - createRepo(): new repositories
│   │                        # - pushFiles(): commit & push via Git API
│   │                        # - createIssue(): bug tracking
│   │                        # - createPR(): pull requests
│   │                        # - listRepos(): repository discovery
│   └── api/
│       └── routes.js       # REST API endpoints
├── config/                  # Configuration files
├── tests/                   # Test suite
├── .env.example             # Environment template
├── package.json             # Dependencies and scripts
└── README.md
```

## Tech Stack

- **AI Engine:** Claude Opus 4.6 via `@anthropic-ai/sdk` -- 1M token context, the most capable AI model available
- **Slack Integration:** `@slack/bolt` -- Socket mode for real-time, bidirectional communication
- **GitHub Integration:** `@octokit/rest` -- Full GitHub API v3 access
- **Server:** Express.js -- Lightweight, battle-tested HTTP server
- **Runtime:** Node.js 20+ with ES modules

## Slash Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/devbot create <prompt>` | Generate a complete application | `/devbot create a blog with Next.js` |
| `/devbot review <code>` | Review code for issues | `/devbot review function add(a,b){...}` |
| `/devbot status` | Check bot status and connections | `/devbot status` |
| `/devbot help` | Show available commands | `/devbot help` |

## Roadmap

- [ ] Multi-file streaming output in Slack threads
- [ ] GitHub Actions CI/CD auto-generation
- [ ] Voice-to-app via Slack Huddles
- [ ] Team workspaces with shared project history
- [ ] Plugin system for custom generators
- [ ] Web dashboard with live preview
- [ ] Monetization tiers: Solo Creator / Pro Studio / Enterprise Beast

## Built By

**Dazza (Darren Smith)** -- powered by Claude Opus 4.6 (1M context)

Built with Claude Code. Shipped fast. No compromises.

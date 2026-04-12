# DevBot Constitution

## Identity
This is DevBot - Dazza's AI-powered revenue platform. Live at devbotai-225be.web.app with Stripe connected.

## Style Guide
- Python 3.12+ features only (match statements, type hints, f-strings)
- All scripts MUST include error logging via `logging` module
- TypeScript strict mode for all frontend code
- Use async/await over callbacks everywhere

## Build & Test Commands
- Backend tests: `pytest -v --tb=short`
- Frontend tests: `npm test`
- Lint: `npm run lint && python -m flake8`
- Type check: `npx tsc --noEmit`
- Dev server: `npm run dev`

## Rules of Engagement
- NEVER delete files without asking first
- NEVER commit .env, credentials.json, *.pem, *.key files
- ALWAYS check the `docs/` folder before writing new API logic
- ALWAYS create a git branch before major refactors: `claude-task-YYYY-MM-DD`
- ALWAYS run tests after code changes before declaring done
- When touching revenue-critical code (Stripe, payments, subscriptions), get explicit confirmation before modifying

## Security Rules
- API keys go in .env ONLY, never hardcoded
- All user input must be sanitized
- Use parameterized queries for all database operations
- No secrets in git history - if leaked, rotate immediately
- MCP servers handle credential access where possible

## Architecture
- `/api` - Backend API services
- `/assistant` - AI assistant modules
- `/marketing` - Marketing automation
- `/data` - Data storage (vault/ and trading/ are gitignored)
- `/docs` - Documentation (check before writing new logic)

## Plan Mode Protocol
For any task involving 3+ files or new features:
1. Enter plan mode first (Shift+Tab)
2. Write technical blueprint
3. Get user review
4. Execute only after approval

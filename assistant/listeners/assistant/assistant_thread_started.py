from logging import Logger

from slack_bolt import Say, SetSuggestedPrompts


def assistant_thread_started(
    say: Say,
    set_suggested_prompts: SetSuggestedPrompts,
    logger: Logger,
):
    """Handle the assistant thread start — greet user and show DevBot capabilities."""
    try:
        say(
            ":rocket: *Welcome to DevBot AI* — the most powerful AI app creator ever built.\n\n"
            "I can generate complete production-ready apps, review your code, and manage GitHub repos. "
            "Powered by Claude Opus 4.6 with a 1M token context window.\n\n"
            "What would you like to build today?"
        )
        set_suggested_prompts(
            prompts=[
                {
                    "title": ":zap: Generate a Full-Stack App",
                    "message": "Create a real-time chat application with React, WebSocket, Redis for pub/sub, and JWT authentication. Include Docker setup and tests.",
                },
                {
                    "title": ":mag: Review My Code",
                    "message": "Review this code for security vulnerabilities and performance issues:\n```\n// paste your code here\n```",
                },
                {
                    "title": ":package: Build a REST API",
                    "message": "Generate a production-ready REST API with Express.js, PostgreSQL, JWT auth, rate limiting, input validation, and comprehensive tests.",
                },
                {
                    "title": ":brain: Architecture Help",
                    "message": "I'm building a SaaS platform that needs to handle 10,000 concurrent users. Help me design the architecture including database, caching, message queues, and deployment strategy.",
                },
            ]
        )
    except Exception as e:
        logger.exception(f"Failed to handle assistant_thread_started: {e}")
        say(f":warning: Something went wrong! ({e})")

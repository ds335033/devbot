"""Handle @DevBot AI mentions in channels."""

from logging import Logger

from slack_bolt import Say


def app_mentioned(event: dict, say: Say, logger: Logger):
    try:
        user_text = event.get("text", "")
        say(
            f":wave: Hey! I'm DevBot AI. Open the *Assistant side panel* to chat with me, "
            f"or use `/devbot help` for slash commands.\n\n"
            f"I can generate complete apps, review code, and manage GitHub repos — all powered by Claude Opus 4.6."
        )
    except Exception as e:
        logger.exception(f"Failed to handle app_mention: {e}")

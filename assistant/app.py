"""DevBot AI — Slack Assistant powered by Claude Opus 4.6.

This is the main entry point for the DevBot AI Slack Assistant.
It uses Socket Mode for real-time communication and the Slack
Assistant API for the side panel experience.
"""

import logging
import os

from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk import WebClient

from listeners import register_listeners

# Load environment variables
load_dotenv(dotenv_path=".env", override=False)

# Initialization
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = App(
    token=os.environ.get("SLACK_BOT_TOKEN"),
    client=WebClient(
        base_url=os.environ.get("SLACK_API_URL", "https://slack.com/api"),
        token=os.environ.get("SLACK_BOT_TOKEN"),
    ),
)

# Register all listeners (assistant, events, actions)
register_listeners(app)

logger.info("=" * 60)
logger.info("  DevBot AI — Slack Assistant")
logger.info("  Powered by Claude Opus 4.6 (1M token context)")
logger.info("=" * 60)

# Start Bolt app with Socket Mode
if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ.get("SLACK_APP_TOKEN"))
    logger.info("DevBot AI Assistant is starting...")
    handler.start()

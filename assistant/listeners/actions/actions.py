"""Handle feedback button actions in DevBot assistant threads."""

from logging import Logger

from slack_bolt import App


def register_actions(app: App):
    @app.action("devbot_thumbs_up")
    def handle_thumbs_up(ack, body, logger: Logger):
        ack()
        logger.info(f"Positive feedback from user {body.get('user', {}).get('id', 'unknown')}")

    @app.action("devbot_thumbs_down")
    def handle_thumbs_down(ack, body, logger: Logger):
        ack()
        logger.info(f"Negative feedback from user {body.get('user', {}).get('id', 'unknown')}")

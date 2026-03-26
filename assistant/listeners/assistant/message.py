"""Handle user messages in the DevBot AI assistant thread."""

from logging import Logger

from slack_bolt import BoltContext, Say, SetStatus
from slack_sdk import WebClient

from agent.llm_caller import call_llm
from listeners.views.feedback_block import create_feedback_block


def message(
    client: WebClient,
    context: BoltContext,
    logger: Logger,
    message: dict,
    payload: dict,
    say: Say,
    set_status: SetStatus,
):
    """
    Handle user messages in the DevBot assistant thread.
    Routes to Claude Opus 4.6 for AI-powered responses with streaming.
    """
    try:
        channel_id = payload["channel"]
        team_id = context.team_id
        thread_ts = payload["thread_ts"]
        user_id = context.user_id
        user_text = message.get("text", "")

        # Set thinking status with DevBot-themed loading messages
        set_status(
            status="generating...",
            loading_messages=[
                ":brain: Analyzing your request with Claude Opus 4.6...",
                ":zap: Architecting the solution...",
                ":hammer_and_wrench: Writing production-grade code...",
                ":test_tube: Generating tests and configs...",
                ":rocket: Almost ready to ship...",
            ],
        )

        # Start streaming response to Slack
        streamer = client.chat_stream(
            channel=channel_id,
            recipient_team_id=team_id,
            recipient_user_id=user_id,
            thread_ts=thread_ts,
            task_display_mode="timeline",
        )

        # Build conversation messages for Claude
        messages = [
            {
                "role": "user",
                "content": user_text,
            },
        ]

        # Call Claude and stream the response
        call_llm(streamer, messages)

        # Add feedback buttons
        feedback_block = create_feedback_block()
        streamer.stop(blocks=feedback_block)

    except Exception as e:
        logger.exception(f"Failed to handle user message: {e}")
        say(f":warning: Something went wrong! ({e})")

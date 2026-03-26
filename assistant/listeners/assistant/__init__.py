from slack_bolt import App, Assistant

from .assistant_thread_started import assistant_thread_started
from .message import message


def register(app: App):
    assistant = Assistant()
    assistant.thread_started(assistant_thread_started)
    assistant.user_message(message)
    app.assistant(assistant)

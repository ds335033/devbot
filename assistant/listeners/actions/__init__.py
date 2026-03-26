from slack_bolt import App

from .actions import register_actions


def register(app: App):
    register_actions(app)

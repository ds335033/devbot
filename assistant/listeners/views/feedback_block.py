"""Create feedback buttons for DevBot assistant responses."""


def create_feedback_block():
    return [
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": ":thumbsup:"},
                    "action_id": "devbot_thumbs_up",
                    "style": "primary",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": ":thumbsdown:"},
                    "action_id": "devbot_thumbs_down",
                    "style": "danger",
                },
            ],
        },
    ]

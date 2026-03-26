"""DevBot tool: Review code for security, performance, and best practices."""

review_code_definition = {
    "name": "review_code",
    "description": "Review code for security vulnerabilities, performance issues, and best practices. Returns detailed analysis with severity ratings.",
    "input_schema": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "The code to review",
            },
            "language": {
                "type": "string",
                "description": "Programming language of the code",
                "default": "auto-detect",
            },
            "focus": {
                "type": "string",
                "description": "Focus area: security, performance, readability, all",
                "default": "all",
            },
        },
        "required": ["code"],
    },
}


def review_code(code: str, language: str = "auto-detect", focus: str = "all") -> dict:
    return {
        "action": "review_code",
        "code": code,
        "language": language,
        "focus": focus,
    }

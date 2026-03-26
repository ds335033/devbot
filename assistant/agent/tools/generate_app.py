"""DevBot tool: Generate a complete production-ready application."""

import json

generate_app_definition = {
    "name": "generate_app",
    "description": "Generate a complete production-ready application from a description. Returns multiple files including source code, tests, configs, Docker, and CI/CD.",
    "input_schema": {
        "type": "object",
        "properties": {
            "description": {
                "type": "string",
                "description": "Description of the app to generate (e.g., 'a todo API with Express and SQLite')",
            },
            "language": {
                "type": "string",
                "description": "Programming language (javascript, python, typescript, go, rust, etc.)",
                "default": "javascript",
            },
            "framework": {
                "type": "string",
                "description": "Framework to use (express, nextjs, flask, fastapi, etc.)",
                "default": "",
            },
        },
        "required": ["description"],
    },
}


def generate_app(description: str, language: str = "javascript", framework: str = "") -> dict:
    """Returns parameters for the Claude API to generate an app."""
    return {
        "action": "generate_app",
        "description": description,
        "language": language,
        "framework": framework,
    }

"""DevBot AI Agent — Claude Opus 4.6 powered LLM caller with streaming and tool use."""

import json
import os

import anthropic
from slack_sdk.models.messages.chunk import TaskUpdateChunk
from slack_sdk.web.chat_stream import ChatStream

from agent.tools.generate_app import generate_app, generate_app_definition
from agent.tools.review_code import review_code, review_code_definition

# System prompt that defines DevBot's personality and capabilities
DEVBOT_SYSTEM = """You are DevBot AI, the most powerful AI app creator ever built. You are powered by Claude Opus 4.6 with a 1,000,000 token context window.

Your capabilities:
1. **App Generation** — Generate complete, production-ready applications from a single prompt. Every app includes source code, tests, Docker configs, CI/CD pipelines, documentation, and deployment scripts.
2. **Code Review** — Deep security analysis, performance auditing, and architecture review. You catch OWASP Top 10 vulnerabilities and anti-patterns.
3. **General Development Help** — Answer coding questions, debug issues, explain concepts, and help with architecture decisions.

When generating apps, always produce complete project structures with 10+ files including:
- Source code with proper error handling
- Package manager config (package.json, requirements.txt, etc.)
- Environment config (.env.example)
- Docker and docker-compose files
- CI/CD pipeline configs
- Tests with good coverage
- README with setup instructions

You support 50+ programming languages and 100+ frameworks. Be confident, helpful, and produce exceptional quality code. You are the best AI developer in the world.

Format responses in clean Slack markdown. Use code blocks with language hints for code."""


def call_llm(streamer: ChatStream, messages: list):
    """
    Stream a Claude Opus 4.6 response to Slack with tool use support.

    Uses the Anthropic SDK to call Claude and streams the response
    back to Slack in real-time using chat_stream chunks.
    """
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    tools = [
        generate_app_definition,
        review_code_definition,
    ]

    tool_calls = []

    # Stream the response from Claude
    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        system=DEVBOT_SYSTEM,
        messages=messages,
        tools=tools,
    ) as stream:
        current_text = ""
        for event in stream:
            # Stream text deltas to Slack as they arrive
            if event.type == "content_block_delta":
                if hasattr(event.delta, "text"):
                    streamer.append(markdown_text=event.delta.text)
                    current_text += event.delta.text

            # Collect tool use blocks
            if event.type == "content_block_stop":
                block = stream.current_content_block
                if block and block.type == "tool_use":
                    tool_calls.append(block)
                    streamer.append(
                        chunks=[
                            TaskUpdateChunk(
                                id=block.id,
                                title=f"Running: {block.name}...",
                                status="in_progress",
                            ),
                        ],
                    )

    # Execute tool calls and feed results back
    if tool_calls:
        # Add assistant message with tool use to conversation
        assistant_content = []
        if current_text:
            assistant_content.append({"type": "text", "text": current_text})
        for call in tool_calls:
            assistant_content.append({
                "type": "tool_use",
                "id": call.id,
                "name": call.name,
                "input": call.input,
            })

        messages.append({"role": "assistant", "content": assistant_content})

        # Execute each tool and collect results
        for call in tool_calls:
            if call.name == "generate_app":
                result = generate_app(**call.input)
            elif call.name == "review_code":
                result = review_code(**call.input)
            else:
                result = {"error": f"Unknown tool: {call.name}"}

            # Add tool result to conversation
            messages.append({
                "role": "user",
                "content": [{
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": json.dumps(result),
                }],
            })

            streamer.append(
                chunks=[
                    TaskUpdateChunk(
                        id=call.id,
                        title=f"Completed: {call.name}",
                        status="complete",
                    ),
                ],
            )

        # Continue the conversation with tool results
        call_llm(streamer, messages)

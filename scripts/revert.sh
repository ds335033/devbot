#!/bin/bash
# DevBot Quick Revert - Undo Claude's last task
# Usage: ./scripts/revert.sh

echo "Available checkpoints:"
git branch --list "claude-task-*" --sort=-committerdate | head -10

echo ""
read -p "Enter branch name to revert to (or 'q' to quit): " BRANCH

if [ "$BRANCH" = "q" ]; then
    echo "Cancelled."
    exit 0
fi

if git rev-parse --verify "$BRANCH" > /dev/null 2>&1; then
    CURRENT=$(git branch --show-current)
    echo "Reverting $CURRENT to state of $BRANCH..."
    git reset --hard "$BRANCH"
    echo "REVERTED to $BRANCH"
else
    echo "ERROR: Branch '$BRANCH' not found"
    exit 1
fi

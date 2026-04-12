#!/bin/bash
# DevBot Git Checkpoint System
# Usage: ./scripts/checkpoint.sh [task-name]
# Creates a safety branch before any major work

TASK_NAME="${1:-refactor}"
DATE=$(date +%Y-%m-%d-%H%M)
BRANCH_NAME="claude-task-${TASK_NAME}-${DATE}"

# Ensure we're in a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "ERROR: Not in a git repository"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Stash any uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Stashing uncommitted changes..."
    git stash push -m "checkpoint-before-${BRANCH_NAME}"
fi

# Create checkpoint branch from current state
echo "Creating checkpoint branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Return to original branch
git checkout "$CURRENT_BRANCH"

# Restore stashed changes if any
if git stash list | grep -q "checkpoint-before-${BRANCH_NAME}"; then
    echo "Restoring stashed changes..."
    git stash pop
fi

echo ""
echo "=== CHECKPOINT CREATED ==="
echo "Branch: $BRANCH_NAME"
echo "To revert: git checkout $BRANCH_NAME"
echo "=========================="

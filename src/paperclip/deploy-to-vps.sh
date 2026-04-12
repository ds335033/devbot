#!/bin/bash
# Deploy Paperclip files to VPS
# Usage: bash src/paperclip/deploy-to-vps.sh <VPS_IP_OR_HOSTNAME>

VPS="${1:-srv1431202}"
REMOTE_DIR="/opt/devbot/src/paperclip"

echo "=== Deploying Paperclip files to $VPS ==="

# Create remote directory
ssh "root@$VPS" "mkdir -p $REMOTE_DIR"

# Copy all paperclip files
scp C:/Users/dazza/devbot/src/paperclip/plugin.js "root@$VPS:$REMOTE_DIR/"
scp C:/Users/dazza/devbot/src/paperclip/deploy-openclaw-bots.js "root@$VPS:$REMOTE_DIR/"
scp C:/Users/dazza/devbot/src/paperclip/production-launch.js "root@$VPS:$REMOTE_DIR/"
scp C:/Users/dazza/devbot/src/paperclip/setup-company.js "root@$VPS:$REMOTE_DIR/"

echo "=== Files deployed. Now on VPS run: ==="
echo "  cd /opt/devbot"
echo "  npm install -g paperclipai"
echo "  paperclipai onboard --yes"
echo "  node src/paperclip/deploy-openclaw-bots.js"
echo "  node src/paperclip/production-launch.js"

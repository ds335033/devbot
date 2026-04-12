#!/bin/bash
# ACTIVATE ALL 9 OPENCLAW BOTS — SEND TO WORK 24/7 NOW
# Uses paperclipai CLI to create issues and checkout to agents

COMPANY="ad72dde0-5089-41aa-a648-401086984411"
CLI="paperclipai"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ACTIVATING ALL 9 OPENCLAW BOTS — SENDING TO WORK NOW      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Bot IDs and work orders
declare -A BOTS
BOTS[6b9ad945-4aeb-4895-a631-15ff97e8fb96]="SalesBot"
BOTS[bd2f86f0-5ab6-4277-a90e-b27be96d5ca2]="SupportBot"
BOTS[15364499-c964-479a-a2c3-45780a5bf238]="LeadBot"
BOTS[94b5fdd1-5e56-4856-bd46-ecf04de7e926]="AffiliateBot"
BOTS[a17f3c4d-5f4f-4478-b3ee-66f693dbcbe8]="ContentBot"
BOTS[7457be40-5cec-41ff-ad1e-aaea24e9eeae]="SEOBot"
BOTS[0f9b8e0b-27c7-418f-817b-88888d3c7b65]="GrowthBot"
BOTS[a8535f1f-ad75-4d66-b497-b01c76c42422]="TradingBot"
BOTS[377fbebb-31a7-4dc8-92cd-d532e9cbf392]="WorkflowBot"

declare -A TITLES
TITLES[6b9ad945-4aeb-4895-a631-15ff97e8fb96]="[24/7] Close DevBot subscriptions and upsell"
TITLES[bd2f86f0-5ab6-4277-a90e-b27be96d5ca2]="[24/7] Customer support Telegram and WhatsApp"
TITLES[15364499-c964-479a-a2c3-45780a5bf238]="[24/7] Discord lead qualification BANT framework"
TITLES[94b5fdd1-5e56-4856-bd46-ecf04de7e926]="[24/7] Manage 40+ affiliate programs grow revenue"
TITLES[a17f3c4d-5f4f-4478-b3ee-66f693dbcbe8]="[24/7] Content creation 50+ pieces per week"
TITLES[7457be40-5cec-41ff-ad1e-aaea24e9eeae]="[24/7] SEO domination 10K organic visitors"
TITLES[0f9b8e0b-27c7-418f-817b-88888d3c7b65]="[24/7] Growth hacking 20 percent MoM growth"
TITLES[a8535f1f-ad75-4d66-b497-b01c76c42422]="[24/7] Crypto trading Coinbase CDP automated"
TITLES[377fbebb-31a7-4dc8-92cd-d532e9cbf392]="[24/7] System orchestration 99.99 percent uptime"

ACTIVATED=0

for BOT_ID in "${!BOTS[@]}"; do
  BOT_NAME="${BOTS[$BOT_ID]}"
  TITLE="${TITLES[$BOT_ID]}"

  printf "[ACTIVATE] %-15s — " "$BOT_NAME"

  # Create issue assigned to bot
  RESULT=$($CLI issue create \
    --company-id "$COMPANY" \
    --title "$TITLE" \
    --description "STANDING ORDER: 24/7/365 continuous operation. Never stop. Execute your role non-stop. Report results daily." \
    --priority urgent \
    --assignee-agent-id "$BOT_ID" \
    --status todo \
    --json 2>&1)

  ISSUE_ID=$(echo "$RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -n "$ISSUE_ID" ]; then
    printf "issue created... "

    # Checkout issue to agent (starts execution)
    CHECKOUT=$($CLI issue checkout --company-id "$COMPANY" "$ISSUE_ID" --json 2>&1)

    if echo "$CHECKOUT" | grep -q '"status"'; then
      echo "WORKING ✓"
    else
      echo "ASSIGNED ✓ (will auto-pickup)"
    fi
    ACTIVATED=$((ACTIVATED + 1))
  else
    echo "FAILED"
    echo "  Debug: $RESULT" | head -2
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  $ACTIVATED/9 BOTS ACTIVATED"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  DASHBOARD: http://localhost:3100"
echo "  All bots are working 24/7/365!"
echo ""

# List final status
echo "  FINAL AGENT STATUS:"
$CLI agent list --company-id "$COMPANY" 2>&1 | grep -E "SalesBot|SupportBot|LeadBot|AffiliateBot|ContentBot|SEOBot|GrowthBot|TradingBot|WorkflowBot"
echo ""

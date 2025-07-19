#!/bin/bash

# Auto-Sync Testing Script
# Run this script to test the Gmail auto-sync functionality

echo "🧪 Gmail Auto-Sync Testing Script"
echo "================================="

# Set your domain (change this when deployed)
DOMAIN="http://localhost:3000"
# DOMAIN="https://your-domain.vercel.app"

echo ""
echo "1. Testing unauthorized access to cron endpoint (should fail):"
echo "curl -X POST $DOMAIN/api/cron/gmail-sync"
curl -X POST $DOMAIN/api/cron/gmail-sync \
  -H "Content-Type: application/json" \
  -w "\nStatus Code: %{http_code}\n\n"

echo ""
echo "2. Testing cron endpoint with secret (if CRON_SECRET is set):"
echo "curl -X POST $DOMAIN/api/cron/gmail-sync -H 'Authorization: Bearer YOUR_SECRET'"
curl -X POST $DOMAIN/api/cron/gmail-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-cron-secret-here" \
  -w "\nStatus Code: %{http_code}\n\n"

echo ""
echo "3. Testing user auto-sync endpoint (requires login):"
echo "curl -X POST $DOMAIN/api/test/auto-sync"
curl -X POST $DOMAIN/api/test/auto-sync \
  -H "Content-Type: application/json" \
  -w "\nStatus Code: %{http_code}\n\n"

echo ""
echo "4. Testing existing Gmail sync endpoint (requires login):"
echo "curl -X POST $DOMAIN/api/sync/gmail"
curl -X POST $DOMAIN/api/sync/gmail \
  -H "Content-Type: application/json" \
  -w "\nStatus Code: %{http_code}\n\n"

echo ""
echo "🔧 Manual Testing Instructions:"
echo "==============================="
echo ""
echo "For authenticated requests, you need to:"
echo "1. Start the dev server: npm run dev"
echo "2. Login to the app in browser: $DOMAIN"
echo "3. Connect Gmail integration"
echo "4. Get session cookie from browser dev tools"
echo "5. Add cookie to curl requests:"
echo ""
echo "Example with cookie:"
echo "curl -X POST $DOMAIN/api/test/auto-sync \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: your-session-cookie-here'"
echo ""
echo "📝 Expected Results:"
echo "==================="
echo "• /api/cron/gmail-sync without auth → 401 Unauthorized"
echo "• /api/cron/gmail-sync with secret → Success (processes all users)"
echo "• /api/test/auto-sync with login → Success (processes current user)"
echo "• /api/sync/gmail with login → Success (manual sync)"
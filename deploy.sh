#!/bin/bash
# ================================================================
#  Triple W Rentals — WÜRTH 400 Landing Page
#  One-shot deploy script for Vercel
#
#  HOW TO USE:
#    1. Open Terminal  (Cmd+Space → "Terminal" → Enter)
#    2. Paste this and press Enter:
#
#         cd ~/Desktop/triple-w-tms && bash deploy.sh
#
#  That's it. The script handles everything else.
# ================================================================

set -e

RESEND_KEY="re_KCWqH1xQ_NQHewk4FxjuRANTVa4sSMrmN"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Triple W Rentals — WÜRTH 400 Landing Page"
echo "  Deploying to Vercel..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found."
  echo "    Install it from https://nodejs.org (click 'Download Node.js LTS')"
  echo "    Then re-run this script."
  exit 1
fi

echo "✓  Node $(node -v) detected"

# Install npm dependencies (resend package)
echo ""
echo "→  Installing dependencies..."
npm install --silent

echo "✓  Dependencies ready"
echo ""
echo "→  Launching Vercel deployment..."
echo "   (On first run you'll be prompted to log in — a browser window will open)"
echo ""

# Deploy to production using npx (no global install needed)
# --yes     = accept all prompts / defaults
# --prod    = deploy to production URL (not a preview URL)
npx vercel@latest --yes --prod

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deployed to production!"
echo ""
echo "  STEP 2 — Add the email API key (required for form to work):"
echo ""
echo "  Run this command now:"
echo ""
echo "  npx vercel@latest env add RESEND_API_KEY production"
echo ""
echo "  When prompted, paste this value:"
echo "  $RESEND_KEY"
echo ""
echo "  Then redeploy to apply it:"
echo "  npx vercel@latest --prod"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  STEP 3 — Add a custom domain (optional):"
echo ""
echo "  npx vercel@latest domains add triplewrv.com"
echo "  npx vercel@latest alias set triplewrv.com"
echo ""
echo "  STEP 4 — Verify sender domain for emails:"
echo "  Go to https://resend.com/domains"
echo "  Add triplewrentals.com and follow the DNS instructions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

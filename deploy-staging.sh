#!/bin/bash

# Athlytx Staging Deployment Script
# Usage: ./deploy-staging.sh

set -e  # Exit on error

echo "🚀 Athlytx Staging Deployment"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.staging exists
if [ ! -f .env.staging ]; then
    echo -e "${RED}❌ Error: .env.staging not found${NC}"
    echo "Please copy .env.staging.template to .env.staging and fill in the values"
    echo "Run: cp .env.staging.template .env.staging"
    exit 1
fi

echo -e "${GREEN}✅ Found .env.staging${NC}"
echo ""

# Check if SESSION_SECRET is set
if grep -q "REPLACE_WITH_RANDOM_STRING" .env.staging; then
    echo -e "${RED}❌ Error: SESSION_SECRET not configured${NC}"
    echo "Generate one with: openssl rand -hex 32"
    echo "Then update .env.staging"
    exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠️  This will deploy to STAGING environment${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "📦 Installing dependencies..."
npm ci --production

echo ""
echo "🔍 Running tests..."
node test-integration.js || {
    echo -e "${RED}❌ Tests failed. Deployment aborted.${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ Tests passed${NC}"

echo ""
echo "🗄️  Database setup..."
echo "Make sure your staging database is created and accessible"
echo "Connection: Check DATABASE_URL in .env.staging"
read -p "Database ready? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set up database first"
    exit 1
fi

echo ""
echo "🚀 Starting server..."
echo "Migrations will run automatically on startup"
echo ""

# Copy environment file
cp .env.staging .env

# Start server
npm start

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test health: curl http://localhost:3000/health"
echo "2. Test routes: curl http://localhost:3000/access"
echo "3. Run QA tests (see QA-CHECKLIST.md)"
echo "4. Enable feature flag: ENABLE_NEW_INVITE_SYSTEM=true"
echo ""

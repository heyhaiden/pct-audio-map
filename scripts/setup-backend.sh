#!/bin/bash

# Setup script for PCT Audio Map Backend Services
# This script helps configure the backend audio streaming system

set -e

echo "=========================================="
echo "PCT Audio Map - Backend Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm is not installed${NC}"
    echo "Install pnpm: npm install -g pnpm"
    exit 1
fi

echo -e "${GREEN}✓${NC} pnpm found"

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠${NC} .env.local already exists"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env.local creation"
    else
        cp .env.example .env.local
        echo -e "${GREEN}✓${NC} Created .env.local from .env.example"
    fi
else
    cp .env.example .env.local
    echo -e "${GREEN}✓${NC} Created .env.local from .env.example"
fi

# Check if @vercel/blob is installed
if grep -q "@vercel/blob" package.json; then
    echo -e "${GREEN}✓${NC} @vercel/blob already in package.json"
else
    echo ""
    echo "Installing @vercel/blob..."
    pnpm add @vercel/blob
    echo -e "${GREEN}✓${NC} Installed @vercel/blob"
fi

echo ""
echo "=========================================="
echo "Configuration Required"
echo "=========================================="
echo ""
echo "Please configure the following in .env.local:"
echo ""
echo "1. MAPBOX_ACCESS_TOKEN"
echo "   Get it at: https://account.mapbox.com/access-tokens/"
echo ""
echo "2. BLOB_READ_WRITE_TOKEN"
echo "   Get it at: https://vercel.com/dashboard/stores"
echo ""
echo -e "${YELLOW}⚠${NC} Open .env.local and add your tokens"
echo ""

# Prompt to open .env.local
read -p "Open .env.local now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code .env.local
    elif command -v vim &> /dev/null; then
        vim .env.local
    elif command -v nano &> /dev/null; then
        nano .env.local
    else
        echo "Please open .env.local in your preferred editor"
    fi
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Configure tokens in .env.local"
echo "2. Run: pnpm dev"
echo "3. Test endpoints:"
echo "   - http://localhost:3000/api/audio/list"
echo "   - http://localhost:3000/api/audio/metadata/desert-wind"
echo "   - http://localhost:3000/api/audio/desert-wind"
echo ""
echo "For more information, see:"
echo "- lib/audio/README.md"
echo "- BACKEND_IMPLEMENTATION.md"
echo ""
echo -e "${GREEN}Setup complete!${NC}"

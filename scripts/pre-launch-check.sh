#!/bin/bash

# ConfessAI Pre-Launch Verification Script
# Run this before deploying to production

set -e

echo "🚀 ConfessAI Pre-Launch Verification"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "📋 Phase 1: Environment Variables"
echo "-----------------------------------"

# Check for Stripe Price IDs
if grep -q "VITE_STRIPE_PRICE_VIP_MONTHLY" .env 2>/dev/null; then
    check_pass "VITE_STRIPE_PRICE_VIP_MONTHLY configured"
else
    check_fail "VITE_STRIPE_PRICE_VIP_MONTHLY missing"
fi

if grep -q "VITE_STRIPE_PRICE_VIP_YEARLY" .env 2>/dev/null; then
    check_pass "VITE_STRIPE_PRICE_VIP_YEARLY configured"
else
    check_fail "VITE_STRIPE_PRICE_VIP_YEARLY missing"
fi

echo ""
echo "🧪 Phase 2: Test Suite"
echo "-----------------------------------"

# Run tests
if command -v npm &> /dev/null; then
    if npm run test:unit &> /dev/null; then
        check_pass "Unit tests passing"
    else
        check_fail "Unit tests failing"
    fi
    
    if npm run test:integration &> /dev/null; then
        check_pass "Integration tests passing"
    else
        check_warn "Integration tests failing (optional)"
    fi
else
    check_warn "npm not found, skipping tests"
fi

echo ""
echo "📦 Phase 3: Build Verification"
echo "-----------------------------------"

# Check for build
if [ -d "dist" ]; then
    check_pass "Build directory exists"
    
    # Check bundle size
    SIZE=$(du -sh dist | cut -f1)
    check_pass "Bundle size: $SIZE"
else
    check_warn "Build directory not found (run npm run build)"
fi

# Check for TypeScript errors
if command -v npx &> /dev/null; then
    if npx tsc --noEmit &> /dev/null; then
        check_pass "No TypeScript errors"
    else
        check_fail "TypeScript errors detected"
    fi
fi

echo ""
echo "🔐 Phase 4: Security Checks"
echo "-----------------------------------"

# Check for exposed secrets
if grep -r "sk_live_" src/ 2>/dev/null; then
    check_fail "Live Stripe secret key found in source code!"
else
    check_pass "No live secrets in source code"
fi

if grep -r "sk_test_" src/ 2>/dev/null; then
    check_warn "Test Stripe secret key found in source code"
else
    check_pass "No test secrets in source code"
fi

# Check for console.logs
if grep -r "console.log" src/ 2>/dev/null | grep -v "node_modules" | grep -v ".test." | wc -l | grep -q "^0$"; then
    check_pass "No console.log statements"
else
    check_warn "console.log statements found in code"
fi

echo ""
echo "📊 Phase 5: Database Checks"
echo "-----------------------------------"

# Check if Supabase is configured
if [ -f "supabase/config.toml" ]; then
    check_pass "Supabase configuration found"
    
    # Check for migrations
    if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
        MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
        check_pass "Database migrations: $MIGRATION_COUNT files"
    else
        check_warn "No database migrations found"
    fi
else
    check_warn "Supabase not configured"
fi

echo ""
echo "🌐 Phase 6: Production Readiness"
echo "-----------------------------------"

# Check for production documentation
if [ -f "docs/DEPLOYMENT_CHECKLIST.md" ]; then
    check_pass "Deployment checklist available"
else
    check_warn "Deployment checklist missing"
fi

if [ -f "docs/PRODUCTION_MONITORING_SETUP.md" ]; then
    check_pass "Monitoring guide available"
else
    check_warn "Monitoring guide missing"
fi

if [ -f "docs/FINAL_REPORT.md" ]; then
    check_pass "Final report available"
else
    check_warn "Final report missing"
fi

# Check for health endpoint
if [ -f "supabase/functions/health/index.ts" ]; then
    check_pass "Health check endpoint implemented"
else
    check_warn "Health check endpoint missing"
fi

echo ""
echo "📱 Phase 7: Frontend Checks"
echo "-----------------------------------"

# Check for PWA manifest
if [ -f "public/manifest.json" ] || [ -f "public/site.webmanifest" ]; then
    check_pass "PWA manifest configured"
else
    check_warn "PWA manifest missing"
fi

# Check for favicon
if [ -f "public/favicon.ico" ]; then
    check_pass "Favicon exists"
else
    check_warn "Favicon missing"
fi

# Check for robots.txt
if [ -f "public/robots.txt" ]; then
    check_pass "robots.txt exists"
else
    check_warn "robots.txt missing (SEO)"
fi

echo ""
echo "═══════════════════════════════════"
echo "📊 FINAL REPORT"
echo "═══════════════════════════════════"
echo ""
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo -e "${RED}✗ Failed:${NC} $FAILED"
echo ""

# Determine status
if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 READY FOR PRODUCTION!${NC}"
        echo "All checks passed. You can proceed with deployment."
        exit 0
    else
        echo -e "${YELLOW}⚠️  READY WITH WARNINGS${NC}"
        echo "Some non-critical checks failed. Review warnings above."
        exit 0
    fi
else
    echo -e "${RED}❌ NOT READY FOR PRODUCTION${NC}"
    echo "Critical checks failed. Fix issues above before deploying."
    exit 1
fi

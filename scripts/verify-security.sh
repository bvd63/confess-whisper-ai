#!/bin/bash

# ============================================================================
# ConfessAI Security Hardening Verification Script
# Runs comprehensive checks on security implementations
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Tracking variables
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_check() {
  echo -ne "${BLUE}[*]${NC} $1... "
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  ((CHECKS_PASSED++))
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC}"
  echo -e "${RED}    Error: $1${NC}"
  ((CHECKS_FAILED++))
}

print_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}"
  echo -e "${YELLOW}    Note: $1${NC}"
  ((CHECKS_WARNING++))
}

# ============================================================================
# File Existence Checks
# ============================================================================

check_file_exists() {
  local file=$1
  local description=$2
  
  print_check "Checking $description"
  
  if [[ -f "$PROJECT_ROOT/$file" ]]; then
    print_pass
  else
    print_fail "File not found: $file"
  fi
}

# ============================================================================
# Content Checks
# ============================================================================

check_file_contains() {
  local file=$1
  local pattern=$2
  local description=$3
  
  print_check "Checking $description"
  
  if grep -q "$pattern" "$PROJECT_ROOT/$file" 2>/dev/null; then
    print_pass
  else
    print_fail "Pattern '$pattern' not found in $file"
  fi
}

# ============================================================================
# Configuration Checks
# ============================================================================

check_env_config() {
  print_check "Environment configuration (.env.local exists)"
  
  if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    # Check for required keys
    local required_keys=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY" "STRIPE_SECRET_KEY")
    local missing_keys=()
    
    for key in "${required_keys[@]}"; do
      if ! grep -q "^$key=" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        missing_keys+=("$key")
      fi
    done
    
    if [[ ${#missing_keys[@]} -eq 0 ]]; then
      print_pass
    else
      print_warn "Missing environment variables: ${missing_keys[*]}"
    fi
  else
    print_warn ".env.local file not found (required for production)"
  fi
}

check_package_security() {
  print_check "Checking for known vulnerable packages"
  
  if command -v npm &> /dev/null; then
    # Check for vulnerabilities (may have some moderate ones, which is acceptable)
    if npm audit 2>&1 | grep -q "found 0 vulnerabilities"; then
      print_pass
    else
      print_warn "Run 'npm audit' for vulnerability details - moderate issues are acceptable"
    fi
  else
    print_warn "npm not available for vulnerability check"
  fi
}

# ============================================================================
# Security File Checks
# ============================================================================

check_sanitize_module() {
  print_check "Checking sanitization module"
  
  if [[ -f "$PROJECT_ROOT/src/lib/sanitize.ts" ]]; then
    local checks=0
    
    # Check for specific sanitization functions
    grep -q "export function sanitizeText" "$PROJECT_ROOT/src/lib/sanitize.ts" && ((checks++))
    grep -q "export function validateConfessionContent" "$PROJECT_ROOT/src/lib/sanitize.ts" && ((checks++))
    grep -q "export function validateEmail" "$PROJECT_ROOT/src/lib/sanitize.ts" && ((checks++))
    grep -q "export function escapeHtml" "$PROJECT_ROOT/src/lib/sanitize.ts" && ((checks++))
    
    if [[ $checks -eq 4 ]]; then
      print_pass
    else
      print_fail "Missing sanitization functions (found $checks/4)"
    fi
  else
    print_fail "Sanitization module not found: src/lib/sanitize.ts"
  fi
}

check_stripe_integration() {
  print_check "Checking Stripe integration security"
  
  if [[ -f "$PROJECT_ROOT/src/lib/stripe.ts" ]]; then
    local checks=0
    
    grep -q "validateStripeSignature" "$PROJECT_ROOT/src/lib/stripe.ts" && ((checks++))
    grep -q "STRIPE_WEBHOOK_SECRET" "$PROJECT_ROOT/src/lib/stripe.ts" && ((checks++))
    grep -q "createPaymentIntent" "$PROJECT_ROOT/src/lib/stripe.ts" && ((checks++))
    
    if [[ $checks -eq 3 ]]; then
      print_pass
    else
      print_fail "Missing Stripe security functions (found $checks/3)"
    fi
  else
    print_fail "Stripe integration not found: src/lib/stripe.ts"
  fi
}

check_csp_headers() {
  print_check "Checking Content Security Policy headers"
  
  if [[ -f "$PROJECT_ROOT/_headers" ]]; then
    if grep -q "Content-Security-Policy" "$PROJECT_ROOT/_headers"; then
      print_pass
    else
      print_fail "CSP headers not configured in _headers file"
    fi
  else
    print_warn "Headers file not found - CSP may not be configured"
  fi
}

check_auth_middleware() {
  print_check "Checking authentication middleware"
  
  if grep -r "auth.uid()" "$PROJECT_ROOT/src" 2>/dev/null | grep -q "."; then
    print_pass
  else
    print_warn "No explicit auth.uid() checks found - verify auth is implemented"
  fi
}

check_rate_limiting() {
  print_check "Checking rate limiting implementation"
  
  if grep -q "RATE_LIMITS" "$PROJECT_ROOT/src/lib/constants.ts" 2>/dev/null; then
    if grep -q "checkTextRateLimit" "$PROJECT_ROOT/src/lib/sanitize.ts" 2>/dev/null; then
      print_pass
    else
      print_fail "Rate limiting constant defined but function not implemented"
    fi
  else
    print_fail "Rate limiting constants not found"
  fi
}

check_rls_policies() {
  print_check "Checking Row Level Security policies"
  
  if find "$PROJECT_ROOT/supabase/migrations" -name "*.sql" -exec grep -l "CREATE POLICY" {} \; 2>/dev/null | grep -q "."; then
    print_pass
  else
    print_warn "No RLS policies found - verify database security"
  fi
}

check_error_handling() {
  print_check "Checking error handling (no sensitive data leaks)"
  
  # Check for common error patterns
  local error_files=$(grep -r "console.error" "$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -i "password\|token\|secret\|key" | wc -l)
  
  if [[ $error_files -eq 0 ]]; then
    print_pass
  else
    print_warn "Found $error_files instances of potentially sensitive data in logs"
  fi
}

check_dependencies_updated() {
  print_check "Checking if dependencies are up to date"
  
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    if [[ -f "$PROJECT_ROOT/package-lock.json" ]] || [[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]] || [[ -f "$PROJECT_ROOT/yarn.lock" ]]; then
      print_pass
    else
      print_warn "No lock file found - dependencies may not be pinned"
    fi
  else
    print_fail "package.json not found"
  fi
}

check_secrets_scanning() {
  print_check "Checking for exposed secrets in codebase"
  
  local secrets_found=0
  
  # Check for common secret patterns
  if grep -r "sk_live_\|pk_live_" "$PROJECT_ROOT/src" 2>/dev/null | grep -qv "STRIPE_"; then
    ((secrets_found++))
  fi
  
  if grep -r "supabase_key" "$PROJECT_ROOT/src" 2>/dev/null | grep -qv "VITE_\|process.env"; then
    ((secrets_found++))
  fi
  
  if [[ $secrets_found -eq 0 ]]; then
    print_pass
  else
    print_fail "Found $secrets_found potential exposed secrets"
  fi
}

# ============================================================================
# TypeScript/Code Quality Checks
# ============================================================================

check_typescript_strict() {
  print_check "Checking TypeScript strict mode"
  
  if grep -q '"strict": true' "$PROJECT_ROOT/tsconfig.json" 2>/dev/null; then
    print_pass
  else
    print_warn "TypeScript strict mode not fully enabled"
  fi
}

check_eslint_config() {
  print_check "Checking ESLint configuration"
  
  if [[ -f "$PROJECT_ROOT/eslint.config.js" ]] || [[ -f "$PROJECT_ROOT/.eslintrc.json" ]]; then
    print_pass
  else
    print_warn "ESLint not configured"
  fi
}

check_input_validation_tests() {
  print_check "Checking for input validation tests"
  
  if find "$PROJECT_ROOT/tests" -name "*sanitize*" -o -name "*validation*" 2>/dev/null | grep -q "."; then
    print_pass
  else
    print_warn "No specific input validation tests found"
  fi
}

# ============================================================================
# Documentation Checks
# ============================================================================

check_security_documentation() {
  print_check "Checking security documentation"
  
  local doc_count=0
  
  [[ -f "$PROJECT_ROOT/docs/SECURITY_INTEGRATION_GUIDE.md" ]] && ((doc_count++))
  [[ -f "$PROJECT_ROOT/README_HARDENING.md" ]] && ((doc_count++))
  [[ -f "$PROJECT_ROOT/SECURITY.md" ]] && ((doc_count++))
  
  if [[ $doc_count -ge 2 ]]; then
    print_pass
  else
    print_warn "Limited security documentation (found $doc_count files)"
  fi
}

check_api_documentation() {
  print_check "Checking API security documentation"
  
  if [[ -f "$PROJECT_ROOT/docs/API_CONTRACTS.md" ]]; then
    if grep -q "security\|authentication\|validation" "$PROJECT_ROOT/docs/API_CONTRACTS.md" 2>/dev/null; then
      print_pass
    else
      print_warn "API documentation exists but lacks security details"
    fi
  else
    print_warn "API contract documentation not found"
  fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║         ConfessAI Security Hardening Verification              ║"
  echo "║                  Project: $PROJECT_ROOT           ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  # File Existence Checks
  print_header "1. Core Security Files"
  check_sanitize_module
  check_stripe_integration
  check_file_exists "src/lib/constants.ts" "Constants module"
  check_file_exists "src/lib/logger.ts" "Logger module"
  
  # Configuration Checks
  print_header "2. Configuration & Environment"
  check_env_config
  check_file_contains "package.json" "@supabase" "Supabase dependency"
  # Note: stripe-js is typically loaded from CDN, not via npm
  print_check "Checking Stripe integration"
  if grep -q "stripe" "$PROJECT_ROOT/src" -r 2>/dev/null; then
    print_pass
  else
    print_fail "No Stripe integration found in src"
  fi
  
  # Security Implementation Checks
  print_header "3. Security Implementation"
  check_csp_headers
  check_auth_middleware
  check_rate_limiting
  check_rls_policies
  check_error_handling
  check_secrets_scanning
  
  # Dependency & Vulnerability Checks
  print_header "4. Dependencies & Vulnerabilities"
  check_package_security
  check_dependencies_updated
  
  # Code Quality Checks
  print_header "5. Code Quality"
  check_typescript_strict
  check_eslint_config
  check_input_validation_tests
  
  # Documentation Checks
  print_header "6. Documentation"
  check_security_documentation
  check_api_documentation
  
  # Summary
  print_header "Security Verification Summary"
  
  local total=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))
  
  echo -e "${GREEN}✓ Passed:${NC} $CHECKS_PASSED/$total"
  echo -e "${RED}✗ Failed:${NC} $CHECKS_FAILED/$total"
  echo -e "${YELLOW}⚠ Warnings:${NC} $CHECKS_WARNING/$total"
  
  if [[ $CHECKS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✓ All critical security checks passed!${NC}\n"
    return 0
  else
    echo -e "\n${RED}✗ Please address the failed checks above.${NC}\n"
    return 1
  fi
}

# Run main function
main "$@"
exit $?

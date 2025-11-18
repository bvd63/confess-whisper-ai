# 🛠️ Production Scripts

Utility scripts for ConfessAI production deployment and maintenance.

---

## 📋 Available Scripts

### 1. Pre-Launch Verification

**File:** `pre-launch-check.sh`  
**Purpose:** Comprehensive pre-launch verification  
**Time:** ~2 minutes  
**When to run:** Before every production deployment

**Usage:**

```bash
# Make executable (first time only)
chmod +x scripts/pre-launch-check.sh

# Run checks
./scripts/pre-launch-check.sh
```

**What it checks:**

- ✅ Environment variables (Stripe frontend + backend allowlist IDs)
- ✅ Test suite passing
- ✅ Build verification
- ✅ Security (no exposed secrets)
- ✅ Database configuration
- ✅ Documentation availability
- ✅ Frontend assets (PWA, favicon, etc.)

**Exit codes:**

- `0` - All checks passed or warnings only
- `1` - Critical checks failed (do not deploy)

---

## 🚀 Quick Start

### Before First Deployment

1. **Configure Stripe:**

   ```bash
   # Follow guide in docs/STRIPE_PRICE_ID_SETUP.md
   ```

2. **Run verification:**

   ```bash
   chmod +x scripts/pre-launch-check.sh
   ./scripts/pre-launch-check.sh
   ```

3. **Fix any failures:**
   - Critical failures (red ✗) must be fixed
   - Warnings (yellow ⚠) are optional but recommended

4. **Deploy:**

   ```bash
   # In Lovable, click "Publish" button
   ```

---

## 📊 Understanding Output

### Passed (✓)

```text
✓ VITE_STRIPE_PRICE_VIP_MONTH_ID configured
✓ PRICE_VIP_MONTHLY configured
```

Everything is correct, no action needed.

### Warning (⚠)

```text
⚠ console.log statements found in code
```

Non-critical issue, consider fixing but not required.

### Failed (✗)

```text
✗ VITE_STRIPE_PRICE_VIP_MONTH_ID missing
✗ PRICE_VIP_MONTHLY missing
```

**Critical issue - must fix before deploying!**

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Pre-Launch Checks

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run pre-launch checks
        run: ./scripts/pre-launch-check.sh
```

### GitLab CI Example

```yaml
verify:
  script:
    - chmod +x scripts/pre-launch-check.sh
    - ./scripts/pre-launch-check.sh
```

---

## 📝 Adding Custom Checks

To add your own checks to `pre-launch-check.sh`:

```bash
# Add after Phase 7
echo ""
echo "🎯 Phase 8: Custom Checks"
echo "-----------------------------------"

# Your custom check
if [ -f "custom-file.txt" ]; then
    check_pass "Custom file exists"
else
    check_fail "Custom file missing"
fi
```

---

## 🐛 Troubleshooting

### "Permission denied" error

```bash
chmod +x scripts/pre-launch-check.sh
```

### Script not found

```bash
# Make sure you're in project root
cd /path/to/confessai
./scripts/pre-launch-check.sh
```

### Checks failing unexpectedly

```bash
# Run in verbose mode
bash -x scripts/pre-launch-check.sh
```

---

## 📚 Related Documentation

- `docs/STRIPE_PRICE_ID_SETUP.md` - Stripe configuration
- `docs/DEPLOYMENT_CHECKLIST.md` - Full deployment guide
- `docs/LAUNCH_SEQUENCE.md` - Step-by-step launch (35 min)
- `docs/PRODUCTION_MONITORING_SETUP.md` - Monitoring setup

---

## ✅ Checklist Before Running Scripts

Before running pre-launch checks:

- [ ] Stripe products created (VIP Monthly + Yearly)
- [ ] Price IDs copied from Stripe Dashboard (frontend + backend allowlist)
- [ ] Environment variables configured in Lovable
- [ ] App rebuilt after env changes
- [ ] Tests passing locally (`npm run test:unit`)

---

## 🎯 Expected Results

### Perfect Score

```text
✓ Passed: 20
⚠ Warnings: 0
✗ Failed: 0

🎉 READY FOR PRODUCTION!
```

### Good Score (with warnings)

```text
✓ Passed: 18
⚠ Warnings: 2
✗ Failed: 0

⚠️  READY WITH WARNINGS
```

### Failing (needs fixes)

```text
✓ Passed: 15
⚠ Warnings: 3
✗ Failed: 2

❌ NOT READY FOR PRODUCTION
```

---

## 🚀 Next Steps After Passing

1. **Review warnings** (optional but recommended)
2. **Deploy to production** (Lovable "Publish" button)
3. **Set up monitoring** (docs/PRODUCTION_MONITORING_SETUP.md)
4. **Run smoke tests** (docs/DEPLOYMENT_CHECKLIST.md)
5. **Monitor for 1 hour** after launch

---

**Created:** 2025-10-26  
**Maintained by:** Engineering Team  
**Last Updated:** 2025-10-26

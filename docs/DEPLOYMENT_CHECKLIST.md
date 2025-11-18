# 🚀 Production Deployment Checklist

Complete checklist for deploying ConfessAI to production.

---

## ✅ Pre-Deployment Checks

### 1. Environment Variables

- [ ] `VITE_STRIPE_PRICE_VIP_MONTH_ID` - Production Stripe Price ID (frontend)
- [ ] `VITE_STRIPE_PRICE_VIP_YEAR_ID` - Production Stripe Price ID (frontend)
- [ ] `PRICE_VIP_MONTHLY` - Production Stripe Price ID (backend allowlist)
- [ ] `PRICE_VIP_YEARLY` - Production Stripe Price ID (backend allowlist)
- [ ] `PRICE_PREMIUM_MONTHLY` - Optional premium monthly price (if tier enabled)
- [ ] `PRICE_PREMIUM_YEARLY` - Optional premium yearly price (if tier enabled)
- [ ] `STRIPE_WEBHOOK_TOLERANCE_SECONDS` - Replay attack tolerance (300 recommended)
- [ ] `STRIPE_SECRET_KEY` - Production Stripe API key (not test)
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- [ ] `TURNSTILE_SECRET` - Cloudflare Turnstile secret key
- [ ] All other secrets verified in Supabase Dashboard

### 2. Stripe Configuration

- [ ] Switch to Live Mode in Stripe Dashboard
- [ ] Create VIP Monthly product + price
- [ ] Create VIP Yearly product + price
- [ ] Copy production Price IDs to environment
- [ ] Configure webhook endpoint: `https://[project-id].supabase.co/functions/v1/stripe-webhook`
- [ ] Add webhook secret to Supabase
- [ ] Test webhook with Stripe CLI:

   ```bash
   stripe trigger checkout.session.completed
   ```

- [ ] Activate Customer Portal in Stripe settings
- [ ] Configure portal settings (allowed actions, branding)

### 3. Database

- [ ] Run all migrations on production
- [ ] Verify RLS policies are enabled
- [ ] Test with non-admin user account
- [ ] Run linter: Check for security issues
- [ ] Backup database before go-live
- [ ] Set up automated daily backups

### 4. Authentication

- [ ] Enable auto-confirm email signups
- [ ] Configure email templates (welcome, reset password)
- [ ] Test signup flow end-to-end
- [ ] Test login flow end-to-end
- [ ] Test password reset flow
- [ ] Verify rate limiting works (failed login attempts)

### 5. Testing

- [ ] Run all unit tests: `npm run test:unit`
- [ ] Run all integration tests: `npm run test:integration`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Verify 85%+ test coverage
- [ ] Manual smoke test of critical paths
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test in multiple browsers (Chrome, Firefox, Safari)

### 6. Performance

- [ ] Lighthouse score >90 (Performance)
- [ ] Lighthouse score >90 (Accessibility)
- [ ] Lighthouse score >90 (Best Practices)
- [ ] Lighthouse score >90 (SEO)
- [ ] Bundle size optimized (<500KB initial load)
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting enabled
- [ ] PWA manifest configured

### 7. Security

- [ ] SSL certificate active
- [ ] CORS configured correctly
- [ ] No secrets exposed in client code
- [ ] Content Security Policy headers set
- [ ] Rate limiting on API endpoints
- [ ] Supabase linter shows no critical issues
- [ ] Review all RLS policies manually

### 8. Monitoring

- [ ] Health check endpoint tested
- [ ] UptimeRobot/BetterStack monitor configured
- [ ] Alert emails/Slack webhooks working
- [ ] Test alert by disabling edge function
- [ ] Verify alert received within 5 minutes
- [ ] Re-enable edge function
- [ ] Set up on-call rotation

---

## 🚀 Deployment Steps

### Step 1: Deploy Frontend (5 minutes)

1. Go to Lovable project
2. Click "Publish" button
3. Verify preview URL works
4. Connect custom domain (if not done)
5. Test production URL

### Step 2: Deploy Edge Functions (Automatic)

- Edge functions deploy automatically on push
- Verify in Supabase Dashboard → Edge Functions
- Check deployment logs for errors

### Step 3: Database Migrations (5 minutes)

1. Review pending migrations
2. Run on production:

   ```bash
   supabase db push --linked
   ```

3. Verify tables created
4. Check RLS policies applied

### Step 4: Update Environment (10 minutes)

1. Supabase Dashboard → Project Settings → Edge Function Secrets
2. Update all production secrets
3. Restart edge functions (automatic on secret change)
4. Test health endpoint

### Step 5: Configure Stripe Webhooks (5 minutes)

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://[project-id].supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy webhook secret to Supabase

### Step 6: Smoke Testing (15 minutes)

1. **Test Auth:**
   - Sign up new user
   - Verify email (if not auto-confirm)
   - Log out
   - Log in
   - Reset password

2. **Test Subscriptions:**
   - Open Manage Subscriptions
   - Click "Choose VIP"
   - Complete checkout (use real card in test mode first)
   - Verify redirect to success page
   - Check VIP status in profile
   - Test Customer Portal access

3. **Test Confessions:**
   - Create new confession
   - Verify +2 coins awarded
   - Check AI response generated
   - Test like/comment functionality

4. **Test Referrals:**
   - Get referral code
   - Sign up second user with code
   - Post first confession as referred user
   - Verify both users receive coins

### Step 7: Monitor Initial Traffic (1 hour)

1. Watch Supabase logs for errors
2. Check health endpoint every 5 minutes
3. Monitor Stripe Dashboard for payments
4. Verify no 500 errors in browser console
5. Check user registrations flowing in

---

## 🔄 Post-Deployment

### Immediate (Day 1)

- [ ] Monitor error rate < 1%
- [ ] Verify first real payment processes
- [ ] Check customer support channels
- [ ] Respond to any incidents within 15 minutes

### Short-term (Week 1)

- [ ] Review all alert logs
- [ ] Analyze user feedback
- [ ] Check conversion rates (free → VIP)
- [ ] Monitor churn rate
- [ ] Schedule team retrospective

### Long-term (Month 1)

- [ ] Generate monthly analytics report
- [ ] Review and update monitoring thresholds
- [ ] Plan feature releases
- [ ] Conduct security audit
- [ ] Update documentation

---

## 🚨 Rollback Plan

### If Critical Issue Detected

#### Option A: Revert Deployment (5 minutes)

1. Lovable: Go to version history
2. Click "Revert" on last stable version
3. Verify site loads correctly
4. Notify users of maintenance

#### Option B: Hotfix Deployment (10 minutes)

1. Identify root cause in logs
2. Apply fix locally
3. Test fix thoroughly
4. Deploy via Lovable
5. Monitor for 30 minutes

#### Option C: Disable Feature Flag (2 minutes)

1. Set feature flag to false in database
2. Verify feature disabled
3. Fix issue offline
4. Re-enable when fixed

---

## 📊 Success Metrics

### Technical Metrics

- ✅ Uptime: >99.9%
- ✅ Response time p95: <200ms
- ✅ Error rate: <0.1%
- ✅ Lighthouse score: >90 all categories

### Business Metrics

- ✅ Conversion rate: 5%+ (free → VIP)
- ✅ Churn rate: <5% monthly
- ✅ User retention: >60% (30-day)
- ✅ Support tickets: <10 per day

---

## 🎯 Final Checklist

Before announcing launch:

- [ ] All tests passing (85%+ coverage)
- [ ] Monitoring active and tested
- [ ] On-call schedule confirmed
- [ ] Documentation up to date
- [ ] Marketing materials ready
- [ ] Support team trained
- [ ] Pricing finalized
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Contact page live

---

## 🎉 Launch Day

### T-1 hour

- [ ] Final smoke test
- [ ] Verify monitoring active
- [ ] Team on standby
- [ ] Communication channels ready

### T-0 (Launch)

- [ ] Publish announcement
- [ ] Share on social media
- [ ] Monitor dashboards closely
- [ ] Respond to first users

### T+1 hour

- [ ] Check for errors
- [ ] Verify payments working
- [ ] Review user feedback
- [ ] Celebrate! 🎊

---

## 📞 Support Contacts

- **Technical Issues:** [your-email@example.com]
- **Supabase Support:** [support@supabase.io](mailto:support@supabase.io)
- **Stripe Support:** [support@stripe.com](mailto:support@stripe.com)
- **Lovable Support:** Discord community

---

## 📚 Resources

- [Lovable Deployment Guide](https://docs.lovable.dev/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Stripe Production Checklist](https://stripe.com/docs/development/checklist)
- [Web Vitals Guide](https://web.dev/vitals/)

---

**Created:** 2025-10-26  
**Last Review:** 2025-10-26  
**Next Review:** Before each major deployment

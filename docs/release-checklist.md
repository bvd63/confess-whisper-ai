# Release Checklist - ConfessAI

**Purpose:** Ensure all releases are high quality, secure, and maintain multilingual integrity.

## Pre-Release (Development Complete)

### Code Quality
- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] ESLint warnings reviewed and addressed
- [ ] No `console.log` or debug code in production paths
- [ ] Code review completed and approved
- [ ] No commented-out code blocks
- [ ] Proper error handling in all async operations

### Testing
- [ ] Unit tests passing (`npm test`)
- [ ] Integration tests passing
- [ ] E2E tests passing for critical flows:
  - [ ] User registration and login
  - [ ] Create confession
  - [ ] Comment on confession
  - [ ] Like confession
  - [ ] Message other users
  - [ ] Join/leave communities
  - [ ] Payment flow (test mode)
- [ ] Manual testing completed on:
  - [ ] Desktop (Chrome, Firefox, Safari)
  - [ ] Mobile (iOS Safari, Android Chrome)
  - [ ] Tablet (iPad, Android tablet)

### Internationalization (i18n) - CRITICAL
- [ ] **All new UI text uses translation keys** (no hardcoded strings)
- [ ] **Translation completeness check:**
  ```bash
  # Verify all keys exist in all languages
  node scripts/check-i18n-completeness.js
  ```
- [ ] **Test each language renders without mixing:**
  - [ ] English (EN) - Full app walkthrough
  - [ ] Spanish (ES) - Full app walkthrough  
  - [ ] German (DE) - Full app walkthrough
- [ ] **Verify in each language:**
  - [ ] Login/signup screens
  - [ ] Main navigation
  - [ ] Form labels and placeholders
  - [ ] Error messages
  - [ ] Success messages
  - [ ] Empty states
  - [ ] Loading states
  - [ ] Confirmation dialogs
  - [ ] Settings pages
  - [ ] Help/FAQ content
- [ ] Date/time formatting correct for all locales
- [ ] Number formatting correct (decimal separators)
- [ ] Currency formatting correct
- [ ] Pluralization rules working (ICU syntax)
- [ ] No "undefined" or missing key placeholders visible
- [ ] Language selector works and persists choice
- [ ] SSR/CSR hydration preserves selected locale (if applicable)

### Database
- [ ] All migrations tested in staging
- [ ] Migrations have rollback scripts
- [ ] No breaking schema changes (or migration plan exists)
- [ ] Indexes added for new queries
- [ ] RLS policies reviewed and tested
- [ ] No N+1 query patterns introduced

### Security
- [ ] Security scan completed (no High/Critical issues)
- [ ] Dependency audit clean (`npm audit`)
- [ ] No secrets in code or logs
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured for new endpoints
- [ ] Authentication required where needed
- [ ] CORS configuration reviewed

### Performance
- [ ] No slow queries (all < 100ms p95)
- [ ] Bundle size checked (< 500KB gzipped)
- [ ] Images optimized (WebP/AVIF)
- [ ] Lazy loading implemented for heavy components
- [ ] No memory leaks detected
- [ ] Caching strategy implemented for new features

### Documentation
- [ ] API changes documented
- [ ] User-facing changes documented
- [ ] Breaking changes clearly marked
- [ ] Migration guide written (if needed)
- [ ] Changelog updated

## Pre-Deployment (Staging)

### Staging Environment
- [ ] Deployed to staging successfully
- [ ] All staging smoke tests pass
- [ ] Edge cases tested:
  - [ ] Empty states
  - [ ] Error states
  - [ ] Slow network simulation
  - [ ] Offline behavior (if applicable)
- [ ] Cross-browser testing on staging
- [ ] Mobile device testing on staging
- [ ] Accessibility testing (WCAG 2.1 AA)

### Load Testing (If Major Release)
- [ ] Load test executed (target: 10k concurrent users)
- [ ] Results reviewed:
  - [ ] p95 latency < 200ms ✓
  - [ ] p99 latency < 500ms ✓
  - [ ] Error rate < 0.1% ✓
  - [ ] No timeouts or crashes
- [ ] Database performance stable under load
- [ ] Edge functions auto-scale properly

### Stakeholder Review
- [ ] Product owner approval
- [ ] Design review (if UI changes)
- [ ] Business stakeholders notified
- [ ] Customer support briefed (if user-facing)

## Deployment

### Preparation
- [ ] Deployment window scheduled
- [ ] On-call engineer assigned
- [ ] Rollback plan documented
- [ ] Communication plan ready:
  - [ ] Internal team notification
  - [ ] User notification (if needed)
  - [ ] Status page update prepared

### Deploy Steps
1. [ ] **Database migrations** (if any)
   - [ ] Migration plan reviewed
   - [ ] Backup taken
   - [ ] Migration executed
   - [ ] Migration verified successful

2. [ ] **Code deployment**
   - [ ] Deploy to production
   - [ ] Monitor build process
   - [ ] Verify build success

3. [ ] **Post-deployment smoke tests**
   - [ ] Login works
   - [ ] Core features functional:
     - [ ] Create confession
     - [ ] View feed
     - [ ] Notifications
     - [ ] Messages
     - [ ] Communities
   - [ ] **Language switching works:**
     - [ ] Switch to EN - verify no ES/DE strings
     - [ ] Switch to ES - verify no EN/DE strings
     - [ ] Switch to DE - verify no EN/ES strings
   - [ ] Payment flow (test mode)

4. [ ] **Monitor for 15 minutes**
   - [ ] Error rate normal (< 0.1%)
   - [ ] Response times normal (p95 < 200ms)
   - [ ] No unusual spikes in logs
   - [ ] Database connections stable
   - [ ] Edge function execution normal

### Communication
- [ ] Internal team notified: "Deployment complete"
- [ ] Status page updated (if user-facing)
- [ ] Customer support notified
- [ ] Release notes published

## Post-Deployment

### Verification (First Hour)
- [ ] Monitor key metrics:
  - [ ] Error rate
  - [ ] Response time (p50, p95, p99)
  - [ ] Request rate
  - [ ] Database performance
  - [ ] Edge function invocations
- [ ] Check user reports/feedback
- [ ] Review Edge Function logs
- [ ] Verify analytics tracking

### Follow-up (First 24 Hours)
- [ ] Daily active users normal
- [ ] Conversion metrics stable
- [ ] No regression reports
- [ ] Performance stable
- [ ] No security alerts

### Rollback (If Needed)
- [ ] Error rate > 5% for > 5 minutes → ROLLBACK
- [ ] Critical functionality broken → ROLLBACK
- [ ] Security issue discovered → ROLLBACK

**Rollback Steps:**
1. [ ] Notify stakeholders immediately
2. [ ] Execute rollback (restore previous version)
3. [ ] Verify rollback successful
4. [ ] Post-mortem scheduled within 24 hours
5. [ ] Root cause analysis
6. [ ] Fix in development
7. [ ] Re-test thoroughly
8. [ ] Schedule re-deployment

## Post-Release

### Documentation
- [ ] Release notes finalized
- [ ] Changelog updated
- [ ] API documentation updated (if changed)
- [ ] User guide updated (if needed)

### Team Sync
- [ ] Deployment retrospective
- [ ] Learnings documented
- [ ] Process improvements identified
- [ ] Celebrate success! 🎉

## Checklist for Hotfix Releases

*Use abbreviated checklist for urgent fixes*

### Critical Items Only
- [ ] Bug fix verified in dev
- [ ] Tests added for bug
- [ ] Code review (expedited)
- [ ] Staged and tested
- [ ] Deployed with monitoring
- [ ] Verified fix in production
- [ ] Post-mortem scheduled

## Release Types

### Major Release (v1.0, v2.0)
- Full checklist required
- Load testing mandatory
- Extended monitoring (48 hours)
- Communication to all stakeholders

### Minor Release (v1.1, v1.2)  
- Full checklist required
- Abbreviated load testing
- Standard monitoring (24 hours)
- Communication to technical stakeholders

### Patch Release (v1.1.1, v1.1.2)
- Core checklist items
- Smoke testing focus
- Standard monitoring
- Internal communication

### Hotfix
- Abbreviated checklist (see above)
- Immediate deployment
- Intensive monitoring
- Post-mortem mandatory

## Emergency Deployment Exception

*Only use in true emergencies (security, data loss, critical outage)*

**Minimum Requirements:**
- [ ] Issue severity justified (SEV1)
- [ ] Fix verified in staging
- [ ] On-call engineer available
- [ ] Rollback plan ready
- [ ] Executive approval obtained

**Process:**
1. Fix → Test → Deploy → Monitor intensively
2. Post-mortem within 12 hours
3. Retroactive documentation

## Automation

### Automated Checks (CI/CD Pipeline)
- ✅ TypeScript compilation
- ✅ Linting
- ✅ Unit tests
- ✅ Build success
- ⏳ i18n completeness check (TO ADD)
- ⏳ Bundle size check (TO ADD)
- ⏳ Security scan (TO ADD)

### Manual Checks (Required)
- ✅ E2E tests (all languages)
- ✅ Cross-browser testing
- ✅ Mobile testing
- ✅ Accessibility testing
- ✅ Load testing (major releases)

## Tools & Resources

### Testing
- **E2E:** Manual testing in preview
- **Load Testing:** k6 or Artillery (to be set up)
- **Security:** npm audit, Snyk (to be set up)
- **Accessibility:** axe DevTools, WAVE

### Monitoring
- **Logs:** Supabase Dashboard → Functions → Logs
- **Database:** Supabase Dashboard → Database → Performance
- **Errors:** Console logs (Sentry to be added)
- **Metrics:** Custom analytics (Prometheus to be added)

### Communication
- **Internal:** Team chat
- **Users:** In-app banner, email (if critical)
- **Status Page:** (To be set up)

---

**Checklist Owner:** Release Manager  
**Review Frequency:** After each major release  
**Last Updated:** 2025-10-18  
**Version:** 1.0.0

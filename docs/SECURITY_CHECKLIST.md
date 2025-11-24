# Security Implementation Checklist & Quick Start

## Phase 1: Initial Setup (Developer)

- [ ] Clone repository and install dependencies
  ```bash
  git clone <repo>
  npm install
  ```

- [ ] Create `.env.local` file with all required secrets
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Supabase: `SUPABASE_SERVICE_ROLE_KEY`
  - Don't commit this file!

- [ ] Run security verification
  ```bash
  bash scripts/verify-security.sh
  ```
  - Should show "All critical security checks passed!"

## Phase 2: Feature Development

### Before Starting a New Feature

1. **Review Security Requirements**
   - Read `docs/SECURITY_INTEGRATION_GUIDE.md`
   - Check `docs/SECURITY_IMPLEMENTATION_SUMMARY.md`

2. **Identify Input Points**
   - What user input will you accept?
   - What are valid formats/lengths?
   - What malicious inputs should you block?

### During Development

3. **Sanitize All User Input**
   ```typescript
   import { sanitizeText, validateConfessionContent } from '@/lib/sanitize';
   
   const result = validateConfessionContent(userInput);
   if (result.valid) {
     // Use result.sanitized in database
   } else {
     // Show error: result.error
   }
   ```

4. **Apply Rate Limiting**
   ```typescript
   import { RATE_LIMITS } from '@/lib/constants';
   
   if (userSubmissionCount > RATE_LIMITS.CONFESSIONS_PER_HOUR) {
     // Reject submission
   }
   ```

5. **Verify Authentication**
   ```typescript
   const supabase = createClient();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
     // Redirect to login
   }
   ```

6. **Check Authorization**
   ```typescript
   // Database RLS policies handle this automatically
   // But verify in your logic:
   if (confession.user_id !== currentUser.id) {
     // Return 403 Forbidden
   }
   ```

### Before Submitting PR

7. **Add Security Tests**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { sanitizeText } from '@/lib/sanitize';
   
   describe('Feature Security', () => {
     it('sanitizes XSS attempts', () => {
       const result = sanitizeText('<script>alert("xss")</script>');
       expect(result).not.toContain('script');
     });
   });
   ```

8. **Verify No Secrets Leaked**
   - No API keys in code
   - No passwords in tests
   - All sensitive data in environment variables

9. **Update Documentation**
   - Add endpoint to `docs/API_CONTRACTS.md`
   - Document validation rules
   - Add security considerations

10. **Run All Checks**
    ```bash
    npm run lint           # ESLint
    npm run typecheck      # TypeScript
    npm test               # Unit tests
    npm run test:e2e       # E2E tests
    bash scripts/verify-security.sh  # Security verification
    ```

## Phase 3: Code Review

### Reviewer Checklist

- [ ] Input validation present and comprehensive
- [ ] Authentication verified before operations
- [ ] Authorization checked for owned resources
- [ ] Database queries use parameterized statements
- [ ] Sensitive data not logged or exposed
- [ ] No new security vulnerabilities introduced
- [ ] Tests cover security scenarios
- [ ] Error messages don't leak information
- [ ] Environment configuration properly managed
- [ ] Documentation updated

### Questions to Ask

1. **How is user input handled?**
   - Is it sanitized? Validated? Rate limited?

2. **Who can access this data?**
   - Is there proper authorization?
   - Does RLS policy exist?

3. **What could go wrong?**
   - XSS? SQL injection? CSRF? Brute force?
   - Have we tested for these?

4. **Is this PII data?**
   - Properly encrypted? Logged? Backed up?

5. **What happens on errors?**
   - Do errors leak sensitive info?
   - Is error properly logged?

## Phase 4: Testing & Verification

### Security Test Scenarios

1. **XSS Prevention**
   ```
   Input: <script>alert('xss')</script>
   Expected: Content stored as plain text, no script execution
   ```

2. **SQL Injection**
   ```
   Input: '; DROP TABLE users; --
   Expected: Treated as string literal, not executed
   ```

3. **CSRF Protection**
   ```
   Test: POST from different origin
   Expected: Request rejected or requires CSRF token
   ```

4. **Rate Limiting**
   ```
   Test: Submit 10 confessions in 1 minute
   Expected: Reject after limit exceeded
   ```

5. **Authorization**
   ```
   Test: Access user B's confession as user A
   Expected: 403 Forbidden error
   ```

### Performance Testing

```bash
# Load test authentication
npx artillery quick --count 100 --num 10 /api/auth/login

# Load test confessions
npx artillery quick --count 100 --num 10 /api/confessions
```

## Phase 5: Deployment

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Security verification script passes
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Stripe webhooks configured
- [ ] Backups verified
- [ ] Monitoring active
- [ ] Team notified
- [ ] Rollback plan ready

### Post-Deployment Verification

1. **Health Checks**
   ```bash
   curl https://api.confessai.com/health
   # Should return 200 OK
   ```

2. **Functionality Tests**
   - Create confession ✓
   - Add comment ✓
   - Like/Unlike ✓
   - Make payment ✓
   - Subscribe to VIP ✓

3. **Security Monitoring**
   - Check error logs (no sensitive data)
   - Monitor rate limiting triggers
   - Check failed authentication attempts
   - Verify webhook processing

## Common Security Mistakes to Avoid

### ❌ DON'T

- Store sensitive data in logs
- Concatenate strings for database queries
- Trust client-side validation alone
- Send secrets to client
- Use plain HTTP
- Skip error handling
- Trust all user input
- Disable rate limiting
- Log full request bodies
- Cache sensitive data

### ✅ DO

- Validate input server-side
- Use parameterized queries
- Implement proper error handling
- Verify authentication
- Check authorization
- Apply rate limiting
- Sanitize user input
- Log security events
- Use HTTPS everywhere
- Escape HTML output

## Emergency Security Procedures

### Suspected Breach

1. **Immediate Actions**
   - Document what happened
   - Check access logs
   - Rotate compromised credentials
   - Disable affected accounts if needed

2. **Investigation**
   - Review logs for unauthorized access
   - Check for data exfiltration
   - Identify affected users

3. **Communication**
   - Notify security team
   - Prepare user communication
   - Contact legal/compliance

4. **Prevention**
   - Deploy patch
   - Enable enhanced monitoring
   - Review security procedures

### Performance Degradation

1. **Check Monitoring**
   - Identify bottleneck
   - Check database query performance
   - Review rate limit triggers

2. **Immediate Relief**
   - Increase rate limits temporarily
   - Scale infrastructure
   - Deploy hotfix

3. **Root Cause Analysis**
   - Optimize slow queries
   - Cache frequently accessed data
   - Improve algorithm efficiency

## Getting Help

### Resources

- **Security Issues**: Post in #security channel
- **Questions**: Check docs/ folder first
- **Vulnerabilities**: Use responsible disclosure process
- **Questions on sanitization**: See `src/lib/sanitize.ts` source code
- **Questions on Stripe**: See `src/lib/stripe.ts` and official Stripe docs

### Documentation

- `docs/SECURITY_INTEGRATION_GUIDE.md` - Detailed integration guide
- `docs/SECURITY_IMPLEMENTATION_SUMMARY.md` - Overview of all security features
- `docs/API_CONTRACTS.md` - API security specifications
- `README_HARDENING.md` - Infrastructure hardening

### External Links

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Stripe Security](https://stripe.com/docs/security)
- [Supabase Docs](https://supabase.io/docs)
- [TypeScript Security](https://www.typescriptlang.org/)

## Quarterly Security Review

Every 3 months, the team should:

1. **Review Dependencies**
   - Run `npm audit`
   - Update packages
   - Check for security advisories

2. **Review Access**
   - Who has admin access?
   - Are all credentials rotated?
   - Check firewall rules

3. **Review Logs**
   - Unusual login patterns?
   - Failed rate limit attempts?
   - Error spikes?

4. **Penetration Testing**
   - Test authentication flow
   - Test input validation
   - Try to bypass authorization

5. **Update Documentation**
   - Any security improvements?
   - Any known issues?
   - Lessons learned?

---

**Quick Links**
- Security Verification: `bash scripts/verify-security.sh`
- Input Sanitization: `src/lib/sanitize.ts`
- Stripe Integration: `src/lib/stripe.ts`
- Constants & Limits: `src/lib/constants.ts`
- Security Guide: `docs/SECURITY_INTEGRATION_GUIDE.md`

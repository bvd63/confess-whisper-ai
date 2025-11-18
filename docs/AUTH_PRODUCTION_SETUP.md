# 🚀 Authentication Production Setup Guide

## Quick Setup Checklist

### 1. Environment Configuration

Ensure all required environment variables are set:

```bash
# Required secrets (already configured via Lovable Cloud)
TURNSTILE_SECRET       # Cloudflare Turnstile secret key
SUPABASE_SERVICE_ROLE_KEY  # For admin operations
```

### 2. Database Setup

The following tables are automatically created:

- ✅ `auth_sessions` - Active user sessions
- ✅ `failed_login_attempts` - Track failed logins
- ✅ `captcha_requirements` - CAPTCHA enforcement
- ✅ `security_events` - Audit trail

### 3. Cron Job Configuration

**Automatic Cleanup Schedule:**

- **Frequency:** Daily at 3:00 AM UTC
- **Function:** `cleanup-auth-data`
- **What it cleans:**
  - Expired sessions
  - Failed attempts older than 30 days
  - Expired CAPTCHA requirements
  - Security events older than 90 days

**Manual Trigger (for testing):**

```sql
SELECT trigger_auth_cleanup();
```

### 4. Security Thresholds

Current configuration:

```typescript
MAX_SESSIONS_PER_USER = 5           // Auto-revokes oldest
MAX_FAILED_ATTEMPTS = 5             // Before rate limiting
CAPTCHA_THRESHOLD = 3               // Failed attempts before CAPTCHA
SESSION_TTL_DEFAULT = 2 days        // Without "stay logged in"
SESSION_TTL_EXTENDED = 30 days      // With "stay logged in"
INACTIVITY_TIMEOUT = 30 minutes     // Auto-logout threshold
```

### 5. Email Configuration

Configure Supabase email settings:

1. Open Lovable Cloud backend
2. Navigate to Authentication > Email Templates
3. Customize templates for:
   - Email verification
   - Password reset
   - Magic link (if used)

**Important:** Ensure auto-confirm email is ENABLED for development/testing.

### 6. Rate Limiting

Edge function rate limits are enforced:

- **Login attempts:** 5 per 15 minutes per IP
- **Signup attempts:** 5 per 60 minutes per IP
- **Password reset:** 3 per hour per email

### 7. Monitoring Setup

**Access Testing Dashboard:**

- URL: `/auth-test` (requires authentication)
- Available from:
  - Admin Dashboard: Click "Auth Testing" button
  - Profile Page: Security tab → "Open Dashboard"

**Key Metrics to Monitor:**

1. **Failed Login Rate**
   - Spike indicates potential attack
   - Check `failed_login_attempts` table

2. **CAPTCHA Requirement Rate**
   - High rate = bot activity
   - Check `captcha_requirements` table

3. **Session Count per User**
   - Unusual count may indicate compromise
   - Max is 5 sessions per user

4. **Security Events**
   - Monitor for suspicious patterns
   - Check `security_events` table

**SQL Queries for Monitoring:**

```sql
-- Failed login rate (last 24 hours)
SELECT
  DATE_TRUNC('hour', attempted_at) as hour,
  COUNT(*) as failed_attempts
FROM failed_login_attempts
WHERE attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Active sessions per user
SELECT
  user_id,
  COUNT(*) as session_count,
  MAX(created_at) as last_login
FROM auth_sessions
WHERE revoked_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 3
ORDER BY session_count DESC;

-- CAPTCHA enforcement trends
SELECT
  DATE(required_until) as date,
  COUNT(*) as captcha_requirements
FROM captcha_requirements
WHERE required_until > NOW()
GROUP BY date
ORDER BY date DESC;
```

### 8. Alert Thresholds (Recommended)

Set up alerts for:

- ❗ Failed logins > 100/hour from single IP → Block IP
- ❗ CAPTCHA requirements > 50/hour → Investigate bot activity
- ❗ Password resets > 10/hour → Possible enumeration attack
- ❗ New device logins from unusual locations → Flag for review
- ❗ Session count per user > 4 → Potential account sharing/compromise

### 9. Testing Checklist

Before going live, test:

- [ ] Registration with password validation
- [ ] Login with CAPTCHA (after 3 failed attempts)
- [ ] "Stay logged in" functionality
- [ ] Auto-logout after inactivity (30 min)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Session management (view/revoke)
- [ ] Device login notifications
- [ ] Rate limiting triggers
- [ ] Manual cleanup function

### 10. Documentation

Key documentation files:

- `AUTH_SECURITY_COMPLETE.md` - Full implementation details
- `AUTH_TESTING_GUIDE.md` - Testing procedures
- `AUTH_QUICK_REFERENCE.md` - Developer reference
- `AUTH_PRODUCTION_SETUP.md` - This file

## Production Launch

### Pre-launch:

1. ✅ Review all security thresholds
2. ✅ Test all authentication flows
3. ✅ Verify cron job is scheduled
4. ✅ Set up monitoring alerts
5. ✅ Customize email templates
6. ✅ Configure domain redirects
7. ✅ Review RLS policies
8. ✅ Test rate limiting

### Post-launch:

1. Monitor failed login rates
2. Check cron job execution logs
3. Review security events daily
4. Adjust thresholds based on traffic
5. Monitor session counts
6. Watch for unusual patterns

## Troubleshooting

### Cron Job Not Running

```sql
-- Check if scheduled
SELECT * FROM cron.job
WHERE jobname = 'cleanup-auth-data-daily';

-- View recent executions
SELECT * FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'cleanup-auth-data-daily'
)
ORDER BY start_time DESC LIMIT 10;
```

### High Failed Login Rate

1. Check for distributed attack (multiple IPs)
2. Verify CAPTCHA is working
3. Consider temporary IP blocking
4. Review rate limiting thresholds

### Sessions Not Being Cleaned

1. Verify cron job is running
2. Check function logs for errors
3. Manually trigger: `SELECT trigger_auth_cleanup()`
4. Review RLS policies on auth tables

### Users Can't Login

1. Check if CAPTCHA is misconfigured
2. Verify email confirmation setting
3. Review failed login attempts for their email
4. Check if IP is rate-limited

## Security Best Practices

1. **Never log sensitive data**
   - Don't log passwords (even hashed)
   - Sanitize email addresses in logs
   - Mask IP addresses in public logs

2. **Regular security audits**
   - Review `security_events` weekly
   - Check for unusual login patterns
   - Monitor session counts per user

3. **Keep dependencies updated**
   - Update Supabase client regularly
   - Monitor for security patches
   - Test after updates

4. **Backup strategy**
   - Regular database backups
   - Test restoration procedure
   - Document recovery process

5. **Incident response plan**
   - Define escalation procedures
   - Document common attack patterns
   - Prepare response templates

## Support & Resources

- 📚 [Full Auth Documentation](./AUTH_SECURITY_COMPLETE.md)
- 🧪 [Testing Guide](./AUTH_TESTING_GUIDE.md)
- ⚡ [Quick Reference](./AUTH_QUICK_REFERENCE.md)
- 🔧 [Lovable Cloud Docs](https://docs.lovable.dev)

## Emergency Contacts

For critical security issues:

1. Check edge function logs in Lovable Cloud
2. Review security events in database
3. Use testing dashboard at `/auth-test`
4. Consult documentation above

---

**Last Updated:** 2025-10-20  
**Version:** 1.0.0  
**Status:** Production Ready ✅

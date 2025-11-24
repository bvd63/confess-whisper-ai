# 🧪 Authentication Security Testing Guide

## Quick Test Checklist

### 1. Registration Flow (5 min)
- [ ] **Weak Password Rejection**
  - Try: `password123` → Should fail
  - Try: `Password123` → Should fail (no special char)
  - Try: `Pass123!` → Should fail (< 10 chars)
  - Try: `Password123!` → Should succeed ✅

- [ ] **Password Mismatch**
  - Enter different passwords in confirm field → Should show error

- [ ] **CAPTCHA Requirement**
  - CAPTCHA widget should be visible on signup
  - Submit without solving CAPTCHA → Should fail

- [ ] **Terms Acceptance**
  - Try submitting without checking terms → Should fail
  - Check terms → Should enable submit button

- [ ] **Email Verification**
  - After signup → Check email inbox
  - Click verification link → Should redirect to success page
  - Try logging in before verification → Should fail

### 2. Login Flow (5 min)
- [ ] **Valid Credentials**
  - Login with correct email/password → Should succeed

- [ ] **Invalid Credentials**
  - Try wrong password 3 times → Should show CAPTCHA after 3rd attempt
  - CAPTCHA should remain visible for subsequent attempts

- [ ] **"Stay Logged In" Checkbox**
  - Login with checkbox unchecked → Session expires in 2 days
  - Login with checkbox checked → Session extends to 30 days
  - Check localStorage: `stay_logged_in` should be `true` or `false`

- [ ] **Device Tracking**
  - Login from new device/browser (incognito)
  - Check for new device notification
  - Verify security event logged in database

### 3. Password Reset Flow (5 min)
- [ ] **Request Reset**
  - Go to `/forgot-password`
  - Enter email + solve CAPTCHA
  - Should show generic success message (even for non-existent emails)
  - Check email for reset link

- [ ] **Reset Password**
  - Click reset link → Should open `/reset-password`
  - Try weak password → Should fail with validation
  - Enter strong password + confirm → Should succeed
  - Try logging in with old password → Should fail
  - Login with new password → Should succeed

- [ ] **All Sessions Revoked**
  - After password change, any active sessions should be logged out
  - Verify by having multiple tabs open before reset

### 4. Session Management (5 min)
- [ ] **Auto-Logout on Inactivity** (if "Stay Logged In" unchecked)
  - Login without "Stay logged in"
  - Wait 30 minutes without activity
  - Should auto-logout with notification

- [ ] **Stay Logged In Prevents Auto-Logout**
  - Login with "Stay logged in" checked
  - Wait 30+ minutes
  - Should remain logged in

- [ ] **Session Limit (Max 5)**
  - Login from 6 different devices/browsers
  - Oldest session should be automatically revoked
  - Check `auth_sessions` table: max 5 active per user

### 5. Security Features (10 min)
- [ ] **Rate Limiting**
  - Attempt 6+ logins with wrong password in 15 minutes
  - Should get rate limit error after 5-10 attempts

- [ ] **CAPTCHA Enforcement**
  - After 3 failed login attempts
  - CAPTCHA requirement should persist for 30 minutes
  - Check `captcha_requirements` table

- [ ] **Failed Attempt Tracking**
  - Check `failed_login_attempts` table
  - Each failed login should be logged with:
    - Email, IP address, User agent, Timestamp

- [ ] **Security Event Logging**
  - Check `security_events` table for:
    - Login success events
    - New device login events
    - Session revocation events
    - Password change events

### 6. Email Verification (3 min)
- [ ] **Verification Required**
  - Create new account
  - Try logging in immediately → Should fail
  - Check email → Click verification link
  - Try logging in again → Should succeed

- [ ] **Expired Verification Link**
  - Wait 24+ hours after signup
  - Try clicking verification link → Should show error
  - User should request new verification email

### 7. Multi-Language Support (3 min)
- [ ] **English**
  - Change language to English
  - All auth pages show English text

- [ ] **Spanish**
  - Change to Spanish
  - Auth pages show Spanish translations

- [ ] **German**
  - Change to German
  - Auth pages show German translations

## Advanced Testing

### Database Queries for Testing

```sql
-- Check active sessions for a user
SELECT * FROM auth_sessions 
WHERE user_id = '<user_id>' 
AND revoked_at IS NULL;

-- View failed login attempts
SELECT * FROM failed_login_attempts 
WHERE email = '<email>'
ORDER BY attempted_at DESC
LIMIT 10;

-- Check CAPTCHA requirements
SELECT * FROM captcha_requirements
WHERE required_until > NOW();

-- View security events
SELECT * FROM security_events
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 20;

-- Check session count per user
SELECT user_id, COUNT(*) as session_count
FROM auth_sessions
WHERE revoked_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 3;
```

### Testing Cleanup Cron Job

```bash
# Manually trigger cleanup (via Supabase function)
curl -X POST 'https://your-project.supabase.co/functions/v1/cleanup-auth-data' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# Check logs
# Should show: Cleaned up X expired sessions, Y old failed attempts, etc.
```

### Performance Testing

```javascript
// Test concurrent login attempts (rate limiting)
async function testRateLimit() {
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      })
    );
  }
  
  const results = await Promise.all(promises);
  console.log('Rate limit test:', results.map(r => r.status));
  // Should see 429 (Too Many Requests) after 5-10 attempts
}
```

## Common Issues & Solutions

### Issue: CAPTCHA not showing
**Solution:** 
- Check TURNSTILE_SITE_KEY in environment
- Verify Cloudflare Turnstile is configured
- Check browser console for errors

### Issue: Email not sending
**Solution:**
- Check Supabase email settings
- Verify email confirmation is enabled
- Check spam folder
- Test with different email provider

### Issue: Auto-logout not working
**Solution:**
- Verify `stay_logged_in` localStorage value
- Check useInactivityLogout hook is called in App.tsx
- Ensure timeout is set correctly (30 min default)

### Issue: Sessions not being revoked
**Solution:**
- Check enhanced-auth function logs
- Verify token_hash is being stored correctly
- Test revoke-session endpoint directly

### Issue: Device tracking not showing notifications
**Solution:**
- Check useDeviceTracking hook integration
- Verify security_events table has data
- Check device_id in localStorage

## Production Checklist

Before going live:

- [ ] TURNSTILE_SECRET configured in Supabase
- [ ] Email confirmation enabled
- [ ] Auto-confirm email DISABLED
- [ ] All cron jobs scheduled
- [ ] Security monitoring set up
- [ ] Rate limits tuned for production traffic
- [ ] Email templates customized
- [ ] All 3 languages tested (EN/ES/DE)
- [ ] Documentation reviewed
- [ ] Backup/restore plan in place

## Security Monitoring

### Metrics to Track
1. **Failed login rate** - Spike indicates attack
2. **CAPTCHA requirement rate** - Shows bot activity
3. **Session count per user** - Unusual = potential compromise
4. **New device logins** - Track suspicious patterns
5. **Password reset requests** - Unusual volume = attack

### Alert Thresholds
- Failed logins > 100/hour from single IP → Block IP
- CAPTCHA requirements > 50/hour → Investigate
- Password resets > 10/hour → Possible enumeration attack
- New device logins from unusual locations → Flag for review

## Support

For issues or questions:
- Check `docs/AUTH_SECURITY_COMPLETE.md` for implementation details
- Review edge function logs in Supabase dashboard
- Test queries in database to verify data integrity
- Contact security team for critical issues

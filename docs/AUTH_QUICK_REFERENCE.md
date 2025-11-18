# 🔐 Authentication Security Quick Reference

## 🚀 Quick Start

### For Developers

**Login Flow:**

```typescript
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";

const { enhancedLogin } = useEnhancedAuth();

const handleLogin = async () => {
  const { data, error } = await enhancedLogin(email, password, captchaToken, {
    stayConnected: true, // 30 days vs 2 days
    deviceId: localStorage.getItem("device_id"),
  });
};
```

**Check if CAPTCHA Required:**

```typescript
const { checkCaptchaRequired } = useEnhancedAuth();
const required = await checkCaptchaRequired(email);
```

**Session Management:**

```typescript
const { listSessions, revokeSession, revokeAllSessions } = useEnhancedAuth();

// View active sessions
const { data } = await listSessions();

// Revoke specific session
await revokeSession(sessionId);

// Revoke all (e.g., on password change)
await revokeAllSessions();
```

**Auto-Logout Setup:**

```typescript
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

// In App.tsx
useInactivityLogout({
  enabled: !stayLoggedIn,
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
});
```

**Device Tracking:**

```typescript
import { useDeviceTracking } from "@/hooks/useDeviceTracking";

// In App.tsx - automatically tracks new device logins
useDeviceTracking();
```

## 📋 Password Requirements

**Client-side validation:**

```typescript
import { usePasswordValidation } from "@/hooks/usePasswordValidation";

const validation = usePasswordValidation(password);
// validation.allRulesPassed
// validation.hasMinLength (10 chars)
// validation.hasUpperCase
// validation.hasLowerCase
// validation.hasNumber
// validation.hasSpecialChar
```

**Server-side enforcement:**

- Minimum 10 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&\*(),.?":{}|<>)

## 🔑 Translation Keys

### Auth Pages

```typescript
// Login
t.auth_welcome_back;
t.auth_email;
t.auth_password;
t.auth_login_button;
t.auth_stay_signed_in;
t.auth_forgot_password;
t.auth_invalid_credentials;

// Signup
t.auth_create_account;
t.auth_signup_button;
t.auth_password_confirm;
t.auth_terms_accept;
t.auth_check_email_verify;

// Forgot Password
t.auth_forgot_password_title;
t.auth_forgot_password_desc;
t.auth_forgot_password_button;
t.auth_forgot_password_success;

// Reset Password
t.auth_reset_password_title;
t.auth_reset_password_new;
t.auth_reset_password_confirm;
t.auth_reset_password_button;
t.auth_reset_password_success;

// Errors
t.auth_error;
t.auth_error_generic;
t.auth_captcha_failed;
t.auth_password_too_short;
t.auth_password_too_weak;
t.auth_password_match_fail;
```

## 🛡️ Security Tables

### auth_sessions

```sql
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  device_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_refreshed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  stay_connected BOOLEAN DEFAULT false
);
```

### failed_login_attempts

```sql
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  failure_reason TEXT
);
```

### captcha_requirements

```sql
CREATE TABLE captcha_requirements (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  required_until TIMESTAMPTZ NOT NULL,
  reason TEXT
);
```

### security_events

```sql
CREATE TABLE security_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Edge Function Actions

### enhanced-auth Function

**Endpoint:** `/functions/v1/enhanced-auth?action=<action>`

**Actions:**

1. **check-captcha-required**
   - Body: `{ email }`
   - Returns: `{ required: boolean }`

2. **enhanced-login**
   - Body: `{ email, password, captchaToken, sessionMetadata }`
   - Returns: `{ user, session, refreshToken, expiresAt }`

3. **validate-signup**
   - Body: `{ email, password, captchaToken }`
   - Returns: `{ valid: boolean, messageKey? }`

4. **list-sessions**
   - Headers: `Authorization: Bearer <token>`
   - Returns: `{ sessions: [...] }`

5. **revoke-session**
   - Body: `{ sessionId }`
   - Headers: `Authorization: Bearer <token>`
   - Returns: `{ success: boolean, messageKey }`

6. **revoke-all-sessions**
   - Headers: `Authorization: Bearer <token>`
   - Returns: `{ success: boolean, messageKey }`

## 📊 Security Constants

```typescript
// Session Management
MAX_SESSIONS_PER_USER = 5
SESSION_TTL_DEFAULT = 2 days (48 hours)
SESSION_TTL_EXTENDED = 30 days

// Rate Limiting
MAX_FAILED_ATTEMPTS = 5
FAILED_ATTEMPT_WINDOW = 15 minutes
CAPTCHA_THRESHOLD = 3 failed attempts
CAPTCHA_LOCKOUT_DURATION = 30 minutes

// Signup Rate Limit
MAX_SIGNUP_ATTEMPTS = 5
SIGNUP_RATE_LIMIT_WINDOW = 60 minutes

// Inactivity
INACTIVITY_TIMEOUT = 30 minutes
```

## 🧪 Testing Helpers

### Test Database Queries

```sql
-- Active sessions for user
SELECT * FROM auth_sessions
WHERE user_id = '<user_id>' AND revoked_at IS NULL;

-- Recent failed attempts
SELECT * FROM failed_login_attempts
WHERE email = '<email>'
ORDER BY attempted_at DESC LIMIT 10;

-- CAPTCHA status
SELECT * FROM captcha_requirements
WHERE email = '<email>' AND required_until > NOW();

-- Security events
SELECT * FROM security_events
WHERE user_id = '<user_id>'
ORDER BY created_at DESC LIMIT 20;
```

### Test Edge Function

```bash
# Check CAPTCHA required
curl -X POST 'https://your-project.supabase.co/functions/v1/enhanced-auth?action=check-captcha-required' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'

# List sessions (requires auth)
curl -X GET 'https://your-project.supabase.co/functions/v1/enhanced-auth?action=list-sessions' \
  -H 'Authorization: Bearer <your_token>'
```

## 🚨 Security Events

### Event Types Logged

- `login_success` - Successful login
- `login_failure` - Failed login attempt
- `new_device_login` - Login from new device
- `session_revoked` - Single session revoked
- `all_sessions_revoked` - All sessions revoked
- `password_changed` - Password changed
- `signup_validation` - Signup validation check
- `captcha_required` - CAPTCHA enforcement triggered

### Query Security Events

```sql
SELECT
  event_type,
  COUNT(*) as count,
  DATE(created_at) as date
FROM security_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, DATE(created_at)
ORDER BY date DESC, count DESC;
```

## 📱 Routes

- `/auth` - Login/Signup
- `/forgot-password` - Request password reset
- `/reset-password` - Reset password with token
- `/verify-email` - Email verification success/error

## 🔒 Best Practices

1. **Always use enhanced-auth for login** instead of direct Supabase auth
2. **Store device_id in localStorage** for consistent tracking
3. **Check CAPTCHA requirement** before showing login form
4. **Validate passwords** on both client and server
5. **Log security events** for audit trail
6. **Revoke all sessions** on password change
7. **Use generic error messages** to prevent enumeration
8. **Implement rate limiting** on client for better UX
9. **Track device logins** and notify users
10. **Set up cleanup cron job** for old data

## 📚 Documentation

- `AUTH_SECURITY_COMPLETE.md` - Full implementation details
- `AUTH_TESTING_GUIDE.md` - Testing procedures
- `AUTH_QUICK_REFERENCE.md` - This document

## 🐛 Debugging

### Common Issues

**CAPTCHA not working:**

```javascript
// Check environment variable
console.log(import.meta.env.VITE_TURNSTILE_SITE_KEY);
```

**Sessions not persisting:**

```javascript
// Check localStorage
console.log(localStorage.getItem("stay_logged_in"));
console.log(localStorage.getItem("device_id"));
```

**Auto-logout not triggering:**

```javascript
// Verify inactivity timeout is enabled
const stayLoggedIn = localStorage.getItem("stay_logged_in") === "true";
console.log("Auto-logout enabled:", !stayLoggedIn);
```

### Edge Function Logs

```bash
# View enhanced-auth logs
supabase functions logs enhanced-auth --follow

# View cleanup logs
supabase functions logs cleanup-auth-data --follow
```

## 📞 Support

For security issues or questions:

1. Check documentation in `docs/` folder
2. Review edge function implementation
3. Test with provided queries and scripts
4. Contact security team for critical issues

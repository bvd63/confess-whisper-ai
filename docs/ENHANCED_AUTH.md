# Enhanced Authentication System

## Overview

The enhanced authentication system provides enterprise-grade security for user signup and login with strong password policies, CAPTCHA verification, rate limiting, and session management.

## Features

### 1. Strong Password Policy

**Requirements:**

- Minimum 10 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&\*()\_+-=[]{}.,?:;|<>)

**Validation:**

- **Client-side**: Real-time validation with visual checklist
- **Server-side**: Strict regex validation in edge function
- **Regex Pattern**: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}.,?:;|<>]).{10,}$/`

### 2. Password Strength Meter

Visual feedback on password strength with four levels:

- **Weak**: 0-2 rules passed (red)
- **Fair**: 3 rules passed (orange)
- **Good**: 4 rules passed (yellow)
- **Strong**: All 5 rules passed (green)

### 3. Live Password Checklist

Real-time visual feedback for each requirement:

- ✅ Green checkmark when rule passes
- ❌ Gray X when rule fails
- Updates as user types

### 4. Confirm Password

- Real-time matching validation
- Visual indicator (green = match, red = mismatch)
- Paste prevention to avoid user errors

### 5. Cloudflare Turnstile CAPTCHA

**Purpose**: Bot protection and abuse prevention

**Configuration:**

- Test site key: `1x00000000000000000000AA` (always passes)
- Production: Set `VITE_TURNSTILE_SITE_KEY` in `.env`
- Server secret: Set `TURNSTILE_SECRET` in Supabase secrets

**Features:**

- Only required for signup (not login)
- Auto-detects theme (light/dark)
- Error handling with retry capability
- Expiration detection

### 6. Stay Signed In

**Options:**

- **Short session**: 2 days (default)
- **Long session**: 30 days (with "Stay signed in" checked)

**Implementation:**

- Persists user preference in session metadata
- Managed by enhanced-auth edge function
- Secure token rotation on refresh
- Manual refresh available under **Settings → Active Sessions** for the current device without impacting other sessions.

### 7. Rate Limiting

**Signup Protection:**

- Max 5 signup attempts per IP per 60 minutes
- Returns 429 status with `common.rate_limit` message

**Login Protection:**

- Max 5 failed login attempts per vector (email, IP address, device, and combined email+IP+device) per 15 minutes
- Triggers CAPTCHA requirement and short lockout after threshold on any vector
- Account lockout for 30 minutes after repeated failures or rate-limit violations
- Per-user session creation limited to 5 new sessions per rolling hour
- Session rotation API enforces the same limits and logs every manual refresh for auditability.

### 8. Security Event Logging

All authentication events are logged to `security_events` table:

- Signup validation attempts
- Login successes/failures
- Session creations/revocations
- CAPTCHA failures
- Rate limit triggers

## User Flow

### Signup Flow

1. **User enters email and password**
   - Real-time password validation displays
   - Checklist shows which rules pass/fail
   - Strength meter updates

2. **User confirms password**
   - Real-time matching validation
   - Visual feedback on match/mismatch

3. **User completes CAPTCHA**
   - Turnstile widget loads
   - Token generated on success
   - Errors displayed if verification fails

4. **User optionally checks "Stay signed in"**
   - Determines session duration (2 vs 30 days)

5. **User clicks "Sign up"**
   - Button disabled until all validations pass
   - Client validates password strength
   - Calls `enhanced-auth?action=validate-signup` edge function
   - Server validates password, CAPTCHA, and rate limits
   - If valid, proceeds with Supabase auth signup
   - Processes referral code if exists
   - Redirects to homepage on success

### Login Flow

1. **User enters email and password**
   - Simple validation (email format, min length)

2. **User clicks "Login"**
   - Calls standard Supabase signInWithPassword
   - No CAPTCHA required for login
   - Session created automatically

## API Endpoints

### `enhanced-auth?action=validate-signup`

**Purpose**: Server-side validation before signup

**Request:**

```json
{
  "action": "validate-signup",
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "captchaToken": "turnstile-token-here"
}
```

**Response (Success):**

```json
{
  "valid": true,
  "messageKey": "auth.validation_passed"
}
```

**Response (Weak Password):**

```json
{
  "error": "WEAK_PASSWORD",
  "messageKey": "auth.password_weak"
}
```

**Response (CAPTCHA Failed):**

```json
{
  "error": "CAPTCHA_FAILED",
  "messageKey": "auth.captcha_failed"
}
```

**Response (Rate Limited):**

```json
{
  "error": "RATE_LIMIT",
  "messageKey": "common.rate_limit"
}
```

## Database Tables

### `auth_sessions`

Tracks user sessions with rotating refresh tokens

- `user_id`: UUID reference to auth.users
- `token_hash`: SHA-256 hash of refresh token
- `device_id`: Optional device identifier
- `stay_connected`: Boolean for session duration
- `expires_at`: Session expiration timestamp
- `revoked_at`: NULL if active, timestamp if revoked

### `failed_login_attempts`

Records failed authentication attempts

- `email`: Attempted email (normalized)
- `ip_address`: Client IP address
- `attempted_at`: Timestamp of attempt
- `failure_reason`: Error message

### `captcha_requirements`

Tracks emails requiring CAPTCHA

- `email`: Email address
- `required_until`: Timestamp when requirement expires
- `reason`: Why CAPTCHA is required

### `security_events`

Audit log for security events

- `event_type`: Type of event (signup_validation, login_success, etc.)
- `user_id`: NULL for anonymous events
- `ip_address`: Client IP
- `event_data`: JSONB metadata

## Internationalization

All messages support EN, ES, and DE:

**Password Rules:**

- `auth_password_rules_title`: "Password requirements:"
- `auth_password_rules_len`: "At least 10 characters"
- `auth_password_rules_upper`: "At least one uppercase letter (A-Z)"
- `auth_password_rules_lower`: "At least one lowercase letter (a-z)"
- `auth_password_rules_digit`: "At least one number (0-9)"
- `auth_password_rules_special`: "At least one special character (!@#$%^&\*...)"

**Password Strength:**

- `auth_password_strength_weak`: "Weak"
- `auth_password_strength_fair`: "Fair"
- `auth_password_strength_good`: "Good"
- `auth_password_strength_strong`: "Strong"

**Validation:**

- `auth_password_match_ok`: "Passwords match"
- `auth_password_match_fail`: "Passwords do not match"
- `auth_password_too_short`: "Password must be at least 10 characters"
- `auth_password_weak`: "Password does not meet security requirements"

**CAPTCHA:**

- `auth_captcha_failed`: "CAPTCHA verification failed. Please try again."

**Rate Limiting:**

- `common.rate_limit`: "Too many requests. Please try again later."

## Accessibility

**ARIA Support:**

- Password checklist has `role="list"` with labeled items
- Strength meter has `aria-live="polite"` for screen readers
- Each rule item includes pass/fail state in aria-label
- Password visibility toggle has descriptive aria-labels

**Keyboard Navigation:**

- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Show/Hide password buttons are keyboard operable

**Mobile Support:**

- Responsive design with mobile-first approach
- Correct input types (email, password)
- Touch-friendly button sizes
- Optimized CAPTCHA widget size

## Testing

### Manual Testing Checklist

**Password Validation:**

- [ ] Type password with <10 chars - should fail
- [ ] Add uppercase - length rule turns green
- [ ] Add lowercase - uppercase rule turns green
- [ ] Add digit - lowercase rule turns green
- [ ] Add special char - all rules green, strength "Strong"

**Confirm Password:**

- [ ] Type matching password - shows green "Passwords match"
- [ ] Type different password - shows red "Passwords do not match"
- [ ] Try to paste - should be prevented

**CAPTCHA:**

- [ ] Widget loads automatically
- [ ] Token generated on completion
- [ ] Error banner appears on failure
- [ ] Can retry after failure

**Button State:**

- [ ] Disabled when any validation fails
- [ ] Enabled only when all conditions pass
- [ ] Shows loading state during submission

**Server Validation:**

- [ ] Weak password rejected with error message
- [ ] Invalid CAPTCHA rejected with error
- [ ] Rate limit triggers after 5 attempts
- [ ] Valid signup creates account

**Internationalization:**

- [ ] Switch to Spanish - all text changes
- [ ] Switch to German - all text changes
- [ ] No mixed languages
- [ ] All messages properly translated

## Security Best Practices

1. **Never trust client-side validation alone**
   - Always re-validate on server
   - Use exact same regex pattern

2. **Protect against brute force**
   - Rate limit by IP and email
   - Require CAPTCHA after failures
   - Lock accounts temporarily

3. **Hash sensitive data**
   - Refresh tokens stored as SHA-256 hashes
   - Never log passwords or tokens

4. **Audit everything**
   - Log all security events
   - Monitor for suspicious patterns
   - Alert on anomalies

5. **Rotate tokens**
   - New refresh token on every refresh
   - Invalidate old tokens immediately
   - Track all active sessions

## Production Deployment

### Required Environment Variables

**.env (Frontend):**

```env
VITE_TURNSTILE_SITE_KEY=your-production-site-key
```

**Supabase Secrets (Backend):**

```env
TURNSTILE_SECRET=your-production-secret-key
```

### Turnstile Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Turnstile section
3. Create new site
4. Copy Site Key to `.env` as `VITE_TURNSTILE_SITE_KEY`
5. Copy Secret Key to Supabase secrets as `TURNSTILE_SECRET`
6. Add your domain to allowed domains

### Configuration Checklist

- [ ] Set production Turnstile keys
- [ ] Configure auth redirect URLs in Supabase
- [ ] Enable email auto-confirm or setup SMTP
- [ ] Review rate limit thresholds
- [ ] Set up monitoring and alerts
- [ ] Test signup flow end-to-end
- [ ] Verify CAPTCHA works on production domain

## Troubleshooting

**CAPTCHA not loading:**

- Check VITE_TURNSTILE_SITE_KEY is set
- Verify domain is allowed in Turnstile settings
- Check browser console for errors
- Test with different browsers

**Button stays disabled:**

- Verify all password rules pass (check checklist)
- Ensure passwords match
- Confirm CAPTCHA completed
- Check for JavaScript errors

**Server validation fails:**

- Check TURNSTILE_SECRET is set in Supabase
- Verify edge function is deployed
- Check edge function logs for errors
- Test CAPTCHA token validity

**Rate limiting too aggressive:**

- Adjust MAX_SIGNUP_ATTEMPTS in edge function
- Modify SIGNUP_RATE_LIMIT_WINDOW duration
- Clear old failed attempts from database

## Future Enhancements

Potential improvements for future versions:

- [ ] Pwned password checking (HaveIBeenPwned API)
- [ ] Email verification before full account access
- [ ] Two-factor authentication (2FA)
- [ ] Biometric authentication support
- [ ] Social login integration (Google, Apple, etc.)
- [ ] Password strength estimation (zxcvbn)
- [ ] Breach monitoring and alerts
- [ ] Geographic restrictions
- [ ] Device fingerprinting
- [ ] Suspicious activity detection

# Security & Input Sanitization Integration Guide

## Overview

This guide covers the comprehensive security infrastructure integrated into the ConfessAI application, including input sanitization, validation, and best practices for secure data handling.

## 1. Input Sanitization (`src/lib/sanitize.ts`)

### Core Functions

#### `sanitizeText(text: string): string`
Removes dangerous HTML tags and scripts while preserving safe content.

```typescript
import { sanitizeText } from '@/lib/sanitize';

const userInput = '<script>alert("xss")</script>Hello';
const safe = sanitizeText(userInput);
// Result: 'Hello'
```

**Protects Against:**
- XSS injection via script tags
- Event handler injection (`onclick`, `onerror`, etc.)
- Dangerous HTML elements (iframe, object, embed, form)

#### `validateConfessionContent(content: string)`
Validates and sanitizes confession submission.

```typescript
const result = validateConfessionContent(userInput);
if (result.valid) {
  const sanitized = result.sanitized;
  // Safe to store in database
} else {
  console.error(result.error); // Display validation error
}
```

**Validation Rules:**
- Minimum length: 10 characters
- Maximum length: 10,000 characters
- Always sanitized before return

#### `validateCommentContent(content: string)`
Validates and sanitizes comment submission.

```typescript
const result = validateCommentContent(userComment);
if (result.valid) {
  const sanitized = result.sanitized;
  // Safe to store
}
```

**Validation Rules:**
- Minimum length: 1 character
- Maximum length: 1,000 characters

#### `validateUsername(username: string)`
Validates username format and length.

```typescript
const result = validateUsername(input);
if (result.valid) {
  // Username is safe to use
} else {
  console.error(result.error);
}
```

**Allowed Characters:** a-z, A-Z, 0-9, underscore, hyphen
- Minimum length: 3 characters
- Maximum length: 30 characters

#### `validateEmail(email: string): boolean`
Validates email format.

```typescript
if (validateEmail(userEmail)) {
  // Store email
}
```

#### `sanitizeUrl(url: string): string | null`
Sanitizes and validates URLs, blocks dangerous protocols.

```typescript
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) {
  // Safe to use as href
} else {
  // Invalid or dangerous URL
}
```

**Blocked Protocols:** javascript:, data:, vbscript:, file:, about:

#### `escapeHtml(text: string): string`
Escapes HTML special characters for safe display.

```typescript
import { escapeHtml } from '@/lib/sanitize';

const safe = escapeHtml('<script>alert("xss")</script>');
// Result: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
```

#### `stripHtml(html: string): string`
Removes all HTML tags for plain text display.

```typescript
const plainText = stripHtml('<p>Hello <b>World</b></p>');
// Result: 'Hello World'
```

#### `validateEnum<T>(value: unknown, allowedValues: T[]): value is T[number]`
Type-safe enum validation.

```typescript
const categories = ['work', 'relationships', 'health'] as const;
if (validateEnum(userCategory, categories)) {
  // userCategory is a valid category
}
```

## 2. Stripe Payment Integration (`src/lib/stripe.ts`)

### Secure Payment Handling

#### `createPaymentIntent(options)`
Create a Stripe PaymentIntent for confessions.

```typescript
import { createPaymentIntent } from '@/lib/stripe';

const intent = await createPaymentIntent({
  amount: 100, // in cents
  currency: 'usd',
  userId: 'user123',
  confessionId: 'confession456',
});
```

**Security Features:**
- Amount is server-validated
- Only authenticated users can create intents
- CORS protection enabled
- Audit logging enabled

#### `createSubscription(options)`
Create a Stripe subscription for VIP tier.

```typescript
const subscription = await createSubscription({
  customerId: 'stripe_customer_id',
  priceId: 'stripe_price_id',
  billingCycle: 'month',
  userId: 'user123',
});
```

**Automatic Handling:**
- Webhook processing for subscription updates
- Automatic user tier updates
- Retry logic for failed payments

#### `validateStripeSignature(event, signature)`
Validates webhook signatures from Stripe.

```typescript
import { validateStripeSignature } from '@/lib/stripe';

const signature = request.headers.get('stripe-signature');
const valid = validateStripeSignature(body, signature);
if (!valid) {
  // Reject webhook
}
```

**Protection:**
- HMAC signature verification
- Timestamp validation (5-minute window)
- Replay attack prevention

## 3. Rate Limiting

### Built-in Rate Limits

```typescript
import { RATE_LIMITS } from '@/lib/constants';

// Confessions per hour: 5
// Confessions per day: 20
// Comments per hour: 30
// Reports per hour: 10
// Messages per minute: 5
```

### Implementing Rate Limiting

```typescript
import { checkTextRateLimit } from '@/lib/sanitize';

const lastSubmitTime = localStorage.getItem('lastConfessionTime');
const check = checkTextRateLimit(
  confessionText,
  10000, // max length
  1000,  // 1 second min interval
  lastSubmitTime ? parseInt(lastSubmitTime) : 0
);

if (!check.allowed) {
  console.error(check.message);
} else {
  // Proceed with submission
}
```

## 4. Database Security (`src/lib/db.ts`)

### Parameterized Queries

All database operations use parameterized queries to prevent SQL injection:

```typescript
import { db } from '@/lib/db';

// ✓ SAFE - Parameterized
const results = await db
  .from('confessions')
  .select()
  .eq('user_id', userId)
  .neq('category', 'adult_content');

// ✗ UNSAFE - String interpolation (never do this)
// const results = db.raw(`SELECT * FROM confessions WHERE user_id = '${userId}'`);
```

### Row Level Security (RLS)

Database policies ensure users can only access their own data:

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only view their own messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
```

## 5. Authentication & Authorization

### JWT Validation

All protected routes validate JWT tokens:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  // Redirect to login
}
```

### Session Management

- Secure HTTP-only cookies
- CSRF protection via SameSite=Strict
- Automatic session refresh
- Logout clears all cookies

## 6. Environment Variables

### Sensitive Data Protection

```bash
# .env.local (Never commit this file)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Rules:**
- Never include secrets in client-side code
- Use `VITE_` prefix only for public keys
- Rotate keys regularly
- Store in secure environment management

## 7. Content Security Policy (CSP)

### Headers Configuration (`_headers`)

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.stripe.com https://*.supabase.co;
  frame-src https://js.stripe.com;
  object-src 'none';
```

**Protection:**
- Prevents inline scripts
- Restricts external resources
- Blocks insecure connections

## 8. Testing & Validation

### Unit Tests for Sanitization

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeText, validateEmail } from '@/lib/sanitize';

describe('sanitizeText', () => {
  it('removes script tags', () => {
    const result = sanitizeText('<script>alert("xss")</script>Hello');
    expect(result).toBe('Hello');
  });

  it('removes event handlers', () => {
    const result = sanitizeText('<img onclick="alert()" />');
    expect(result).not.toContain('onclick');
  });

  it('preserves safe HTML', () => {
    const result = sanitizeText('Hello <b>World</b>');
    expect(result).toContain('World');
  });
});

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

## 9. Common Security Patterns

### Protecting Endpoints

```typescript
// API Route: /api/confessions/create
import { sanitizeText, validateConfessionContent } from '@/lib/sanitize';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  // 1. Authenticate user
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. Parse request
  const body = await request.json();

  // 3. Validate & sanitize input
  const validation = validateConfessionContent(body.content);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
    });
  }

  // 4. Check rate limits
  // ... rate limit check ...

  // 5. Store in database (using parameterized queries)
  const { data, error } = await supabase
    .from('confessions')
    .insert({
      user_id: user.id,
      content: validation.sanitized,
      category: body.category,
    });

  if (error) return new Response('Server error', { status: 500 });

  // 6. Return response (no sensitive data)
  return new Response(JSON.stringify({ id: data[0].id }), {
    status: 201,
  });
}
```

### Form Validation in Components

```typescript
import { useState } from 'react';
import { validateConfessionContent, validateUsername } from '@/lib/sanitize';

export function ConfessionForm() {
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate content
    const contentValidation = validateConfessionContent(content);
    if (!contentValidation.valid) {
      newErrors.content = contentValidation.error || 'Invalid content';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit with sanitized content
    submitConfession(contentValidation.sanitized!);
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your confession..."
      />
      {errors.content && <span className="error">{errors.content}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## 10. Monitoring & Logging

### Security Event Logging

Log all security-related events:

```typescript
import { logSecurityEvent } from '@/lib/logger';

// Failed login attempt
logSecurityEvent('failed_login', { email: user.email, ip: clientIp });

// Suspicious content submission
logSecurityEvent('suspicious_content', { userId, confessionId, reason });

// Rate limit exceeded
logSecurityEvent('rate_limit_exceeded', { userId, endpoint, count });
```

## Checklist for New Features

When adding new features, ensure:

- [ ] All user inputs are sanitized
- [ ] Validation rules are enforced (min/max length, format)
- [ ] Rate limiting is implemented
- [ ] Authentication is verified
- [ ] Authorization is checked (user owns resource)
- [ ] Database queries use parameterized statements
- [ ] Sensitive data is not logged
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Error messages don't leak information
- [ ] Security events are logged
- [ ] Tests cover security scenarios

## Quick Reference

| Protection | Implementation | Location |
|-----------|-----------------|----------|
| XSS | Input sanitization | `sanitize.ts` |
| SQL Injection | Parameterized queries | `db.ts` |
| CSRF | SameSite cookies, tokens | Auth middleware |
| Brute Force | Rate limiting | `constants.ts` |
| Sensitive Data | Environment variables | `.env.local` |
| Unauthorized Access | Authentication & RLS | Auth + DB policies |
| Man-in-the-Middle | HTTPS + CORS | Server config |
| Malicious URLs | URL sanitization | `sanitize.ts` |
| Enum Bypass | Type-safe validation | `sanitize.ts` |
| Event Injection | Event handler removal | `sanitizeText()` |

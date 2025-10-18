# API Contracts & Validation

Complete API contract documentation for ConfessAI edge functions.

## Validation Schemas

All edge function requests are validated using Zod schemas defined in `src/lib/validation.ts`.

## Edge Functions

### 1. ai-confession-response

**Purpose:** Generate AI responses for confessions

**Authentication:** Required (JWT)

**Rate Limit:** 5 requests/minute per user

**Request:**
```typescript
{
  confession: string;     // 10-5000 chars
  type: 'basic' | 'deep'; // default: 'basic'
  language: 'en' | 'es' | 'de'; // default: 'en'
}
```

**Response (Success):**
```typescript
{
  response: string; // AI-generated response
}
```

**Response (Error):**
```typescript
{
  error: string;
  retryAfter?: number; // seconds (for 429)
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `402` - AI service payment required
- `500` - Internal error

---

### 2. ai-moderation

**Purpose:** Content moderation using AI

**Authentication:** Not required (public)

**Rate Limit:** 20 requests/minute

**Request:**
```typescript
{
  content: string; // 1-5000 chars
  language: 'en' | 'es' | 'de'; // default: 'en'
}
```

**Response:**
```typescript
{
  safe: boolean;
  level: 'safe' | 'review' | 'reject';
  reason?: string;
  confidence: number; // 0-1
}
```

---

### 3. create-checkout-session

**Purpose:** Create Stripe checkout session for subscriptions

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  priceId: string; // Starts with 'price_'
  planName: string;
  billingCycle: 'monthly' | 'yearly';
}
```

**Response:**
```typescript
{
  url: string; // Stripe checkout URL
}
```

---

### 4. check-subscription

**Purpose:** Verify and sync subscription status

**Authentication:** Required (JWT)

**Response:**
```typescript
{
  isActive: boolean;
  tier: 'free' | 'premium';
  expiresAt?: string; // ISO date
}
```

---

### 5. customer-portal

**Purpose:** Generate Stripe customer portal link

**Authentication:** Required (JWT)

**Response:**
```typescript
{
  url: string; // Portal URL
}
```

---

### 6. process-referral

**Purpose:** Process referral code and reward

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  referralCode: string; // 6-20 chars
}
```

**Response:**
```typescript
{
  success: boolean;
  reward?: {
    coins: number;
    type: string;
  };
}
```

---

### 7. rate-limit

**Purpose:** Check rate limit status

**Authentication:** Optional

**Request:**
```typescript
{
  action: string; // e.g., 'confession_create'
  userId?: string;
  ip?: string;
}
```

**Response:**
```typescript
{
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter?: number; // seconds
  message?: string;
}
```

---

### 8. health

**Purpose:** System health check

**Authentication:** Not required (public)

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number; // ms
  checks: {
    database: { status: string; latency?: number; error?: string };
    storage: { status: string; latency?: number; error?: string };
    functions: { status: string; error?: string };
  };
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}
```

---

### 9. metrics

**Purpose:** Collect and retrieve application metrics

**Authentication:** Required for POST, optional for GET

**POST Request (Record Metric):**
```typescript
{
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram';
  labels?: Record<string, string>;
}
```

**GET Query Parameters:**
- `format`: 'json' | 'prometheus' (default: 'json')
- `name`: Filter by metric name
- `start`: Unix timestamp (filter start)
- `end`: Unix timestamp (filter end)

**GET Response (JSON):**
```typescript
{
  total: number;
  timeRange: {
    start: number | null;
    end: number | null;
  };
  metrics: Record<string, {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
}
```

---

## Common Error Responses

### 401 Unauthorized
```typescript
{
  error: 'Unauthorized'
}
```

### 429 Rate Limit Exceeded
```typescript
{
  error: 'Rate limit exceeded. Please try again later.';
  retryAfter: number; // seconds
}
```

### 400 Bad Request
```typescript
{
  error: string; // Validation error message
}
```

### 500 Internal Server Error
```typescript
{
  error: string; // Error description
}
```

---

## Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| AI Requests | 5 | 1 minute |
| Confession Create | 10 | 1 minute |
| Comment Create | 20 | 1 minute |
| Message Send | 30 | 1 minute |
| Default | 50 | 1 minute |

---

## Security Headers

All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Content-Type: application/json
```

Rate-limited responses also include:
```
Retry-After: <seconds>
```

---

## Testing Edge Functions

```typescript
import { supabase } from '@/integrations/supabase/client';

// Example: AI response
const { data, error } = await supabase.functions.invoke('ai-confession-response', {
  body: {
    confession: 'My confession text here',
    type: 'basic',
    language: 'en'
  }
});
```

---

**Last Updated:** 2025-10-18
**Version:** 1.0.0

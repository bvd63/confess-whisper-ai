# Integration Guide - Using Optimization Tools

## Overview

This guide shows you how to integrate the scalability optimization tools into your ConfessAI codebase.

---

## 1. Using Optimized Queries

Replace standard `useQuery` with `useOptimizedQuery` for better performance.

### Before (Standard Query):

```typescript
import { useQuery } from "@tanstack/react-query";

const { data, isLoading } = useQuery({
  queryKey: ["user", userId],
  queryFn: fetchUser,
});
```

### After (Optimized Query):

```typescript
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";

const { data, isLoading } = useOptimizedQuery({
  queryKey: ["user", userId],
  queryFn: fetchUser,
  cacheKey: `user-${userId}`,
  cacheTTL: 300000, // 5 minutes
  useCircuitBreaker: true,
  useRetry: true,
  useDedupe: true,
});
```

### Benefits:

- ✅ Multi-layer caching (85%+ cache hit rate)
- ✅ Request deduplication (prevents duplicate API calls)
- ✅ Circuit breaker protection (handles service failures)
- ✅ Automatic retries with exponential backoff
- ✅ Performance monitoring

---

## 2. Adding Validation

Use Zod schemas for all user inputs.

### Example: Form Validation

```typescript
import { contentSchema, emailSchema } from "@/lib/validation";
import { useI18nValidation } from "@/lib/i18nValidation";

function MyForm() {
  const { getErrorMessage } = useI18nValidation();

  const handleSubmit = (formData: any) => {
    try {
      const validContent = contentSchema.parse(formData.content);
      const validEmail = emailSchema.parse(formData.email);
      // Proceed with valid data
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = getErrorMessage(error);
        toast.error(message); // Shows translated error
      }
    }
  };
}
```

### Available Schemas:

- `contentSchema` - Confession content (10-10000 chars)
- `emailSchema` - Email validation with trim/lowercase
- `passwordSchema` - Strong password requirements
- `nicknameSchema` - Nickname (2-50 chars, alphanumeric)
- `bioSchema` - Bio (0-500 chars)
- `urlSchema` - URL validation

---

## 3. Adding Observability

Track operations and errors with structured logging.

### Basic Logging:

```typescript
import { observability } from "@/lib/observability";

// Generate request ID
const requestId = observability.generateRequestId();

// Log operations
observability.info("User action performed", {
  requestId,
  userId,
  action: "confession_created",
  metadata: { confessionId: "123" },
});

// Log errors
observability.error("Operation failed", error, {
  requestId,
  userId,
  action: "confession_create_failed",
});
```

### Performance Measurement:

```typescript
// Measure async operations
const result = await observability.measureAsync(
  "fetch_confessions",
  async () => {
    return supabase.from("confessions").select();
  },
  { category: "database" },
);

// Measure sync operations
const processed = observability.measureSync(
  "process_data",
  () => processData(data),
  { type: "processing" },
);
```

### View Metrics:

```typescript
// Get all metrics
const metrics = observability.getMetrics();

// Get aggregated summary
const summary = observability.getMetricsSummary();
console.log("Average latency:", summary.fetch_confessions.avg);
console.log("P95 latency:", summary.fetch_confessions.p95);
```

---

## 4. Using Circuit Breakers

Protect external services with circuit breakers.

### Available Circuit Breakers:

- `circuitBreakers.supabase` - Database operations
- `circuitBreakers.ai` - AI service calls
- `circuitBreakers.storage` - Storage operations

### Usage:

```typescript
import { circuitBreakers } from "@/lib/circuitBreaker";

// Wrap risky operations
const result = await circuitBreakers.supabase.execute(async () => {
  return supabase.from("confessions").select();
});

// Check circuit state
const state = circuitBreakers.supabase.getState();
console.log("Circuit state:", state); // CLOSED, OPEN, or HALF_OPEN

// Get failure count
const failures = circuitBreakers.supabase.getFailureCount();
```

### Circuit States:

- **CLOSED**: Normal operation
- **OPEN**: Too many failures, requests blocked
- **HALF_OPEN**: Testing if service recovered

---

## 5. Adding Retry Logic

Implement retries for transient failures.

### Basic Retry:

```typescript
import { retryWithBackoff } from "@/lib/retryWithBackoff";

const result = await retryWithBackoff(
  async () => {
    return supabase.from("confessions").insert(data);
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  },
);
```

### With Idempotency:

```typescript
const result = await retryWithBackoff(
  async () => {
    return supabase.from("confessions").insert(data);
  },
  {
    maxRetries: 3,
    idempotencyKey: `confession-${userId}-${Date.now()}`,
  },
);
```

---

## 6. Translation Integration

All system messages should use translations.

### In Components:

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t, language } = useLanguage();

  return (
    <div>
      <h1>{t.common_welcome}</h1>
      <button>{t.common_submit}</button>
      <p>{t.auth_login_subtitle}</p>
    </div>
  );
}
```

### In Validation:

```typescript
import { useI18nValidation } from "@/lib/i18nValidation";

const { getErrorMessage, formatMessage } = useI18nValidation();

// Get error from Zod
const errorMsg = getErrorMessage(zodError);

// Format with parameters
const msg = formatMessage(t.validation_content_min, { min: 10 });
```

### Switching Languages:

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
```

---

## 7. Monitoring Components

### Performance Indicator (Dev Mode Only):

```typescript
import { PerformanceIndicator } from '@/components/PerformanceIndicator';

function App() {
  return (
    <>
      {/* Your app */}
      <PerformanceIndicator />
    </>
  );
}
```

Shows:

- Average latency
- Cache hit rate
- Error rate
- Active requests

### System Notifications:

```typescript
import { SystemNotifications } from '@/components/SystemNotifications';

function App() {
  return (
    <>
      {/* Your app */}
      <SystemNotifications />
    </>
  );
}
```

Shows:

- Network status
- Circuit breaker alerts
- Service availability

---

## 8. Edge Function Integration

### Health Check:

```typescript
// Check service health
const response = await fetch(
  `${process.env.VITE_SUPABASE_URL}/functions/v1/health`,
);
const health = await response.json();

if (health.status !== "healthy") {
  // Handle degraded service
}
```

### Metrics Collection:

```typescript
// Get metrics (JSON)
const response = await fetch(
  `${process.env.VITE_SUPABASE_URL}/functions/v1/metrics`,
);
const metrics = await response.json();

// Get metrics (Prometheus)
const promResponse = await fetch(
  `${process.env.VITE_SUPABASE_URL}/functions/v1/metrics?format=prometheus`,
);
const promMetrics = await promResponse.text();
```

---

## 9. Testing

### Unit Tests:

```typescript
import { describe, it, expect } from "vitest";
import { contentSchema } from "@/lib/validation";

describe("Content Validation", () => {
  it("should accept valid content", () => {
    const valid = "This is a valid confession.";
    expect(() => contentSchema.parse(valid)).not.toThrow();
  });

  it("should reject short content", () => {
    const short = "Short";
    expect(() => contentSchema.parse(short)).toThrow();
  });
});
```

### Integration Tests:

```typescript
import { renderHook } from "@testing-library/react";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";

describe("useOptimizedQuery", () => {
  it("should cache results", async () => {
    const { result } = renderHook(() =>
      useOptimizedQuery({
        queryKey: ["test"],
        queryFn: fetchData,
        cacheKey: "test-key",
        cacheTTL: 300000,
      }),
    );

    // Assert caching behavior
  });
});
```

---

## 10. Best Practices

### ✅ DO:

- Use `useOptimizedQuery` for all data fetching
- Validate all user inputs with Zod
- Add observability to critical paths
- Use circuit breakers for external services
- Implement retries for transient failures
- Use translations for all UI text
- Add comprehensive error handling
- Monitor performance metrics

### ❌ DON'T:

- Use standard `useQuery` for critical data
- Skip input validation
- Hardcode error messages
- Ignore circuit breaker states
- Retry non-idempotent operations without keys
- Mix languages in UI
- Log sensitive user data
- Ignore performance metrics

---

## 11. Migration Checklist

When adding optimization to existing code:

- [ ] Replace `useQuery` with `useOptimizedQuery`
- [ ] Add validation schemas for inputs
- [ ] Add observability logging
- [ ] Wrap risky operations in circuit breakers
- [ ] Add retry logic for transient failures
- [ ] Replace hardcoded strings with translations
- [ ] Add error handling
- [ ] Add tests
- [ ] Update documentation
- [ ] Monitor metrics after deployment

---

## 12. Troubleshooting

### High Latency:

- Check cache hit rate (should be >85%)
- Review query optimization
- Check circuit breaker states
- Analyze slow queries in metrics

### High Error Rate:

- Check observability logs
- Review circuit breaker states
- Verify retry configuration
- Check validation schemas

### Cache Issues:

- Verify cacheTTL settings
- Check cache key uniqueness
- Review cache invalidation
- Monitor cache size

### Translation Issues:

- Verify all keys exist in translations.ts
- Check language detection
- Review parameter interpolation
- Validate translation coverage

---

## Need Help?

- **Documentation**: `/docs` folder
- **Tests**: `/tests` folder
- **Examples**: This guide
- **Health Check**: `/health` endpoint
- **Metrics**: `/metrics` endpoint

---

_Last Updated: 2025-01-15_  
_Version: 1.1.0_

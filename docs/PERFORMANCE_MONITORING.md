# Performance Monitoring Guide

Complete guide to ConfessAI's performance monitoring and observability system.

## 📊 Key Metrics

### Response Time Targets

- **p50 Latency**: <100ms
- **p95 Latency**: <200ms
- **p99 Latency**: <500ms

### Availability Targets

- **API**: 99.9% uptime
- **Database**: 99.95% availability
- **Edge Functions**: 99.9% success rate

## 🔍 Monitoring Endpoints

### Health Check

```bash
GET /health
```

Returns system health status, database connectivity, and service availability.

### Metrics

```bash
GET /metrics?format=json
```

Returns performance metrics including latency, cache hit rates, and error rates.

## 📈 Using the Observability Service

```typescript
import { observability } from "@/lib/observability";

// Generate request ID
const requestId = observability.generateRequestId();

// Log with context
observability.info("User action completed", {
  requestId,
  userId: "user123",
  action: "create_confession",
});

// Record metric
observability.recordMetric({
  name: "confession_created",
  value: 1,
  unit: "count",
});
```

## 🚨 Alerting

Configure alerts for:

- High latency (p95 > 300ms)
- High error rate (>1%)
- Circuit breaker opens
- Low cache hit rate (<70%)

---

Last Updated: 2025-10-18

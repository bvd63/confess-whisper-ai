# Performance Monitoring Guide

## Overview

ConfessAI includes comprehensive performance monitoring across all system components with multilingual support (EN, ES, DE).

## Real-Time Indicators

### Performance Indicator (Development Only)

A real-time performance indicator is available in development mode, showing:

- **Latency**: Average query response time
  - 🟢 Green: <100ms (Excellent)
  - 🟡 Yellow: 100-200ms (Good)
  - 🔴 Red: >200ms (Needs optimization)

- **Cache Hit Rate**: Percentage of requests served from cache
  - 🟢 Green: ≥85% (Target met)
  - 🟡 Yellow: 70-84% (Acceptable)
  - 🔴 Red: <70% (Needs improvement)

- **Error Rate**: Percentage of failed requests
  - 🟢 Green: <0.1% (Target met)
  - 🔴 Red: ≥0.1% (Investigation needed)

### System Notifications

Automatic notifications for:
- Network connectivity issues
- Service unavailability
- Circuit breaker activations
- Rate limiting

All notifications are displayed in the user's selected language.

## Metrics Collection

### Automatic Metrics

The system automatically tracks:

1. **Query Performance**
   - Execution time (p50, p95, p99)
   - Success/failure rates
   - Cache hit/miss ratios

2. **Circuit Breakers**
   - State changes (CLOSED → OPEN → HALF_OPEN)
   - Trip counts
   - Recovery time

3. **Network Operations**
   - Request/response times
   - Retry attempts
   - Timeout occurrences

### Custom Metrics

Record custom metrics:

```typescript
import { observability } from '@/lib/observability';

// Record a custom metric
observability.recordMetric({
  name: 'custom_operation',
  value: 125,
  unit: 'ms',
  tags: { operation: 'data_processing' }
});

// Measure async operation
const result = await observability.measureAsync(
  'fetch_user_data',
  async () => {
    // Your async operation
    return await fetchData();
  },
  { userId: 'user123' }
);
```

## Accessing Metrics

### JSON Format

```bash
GET /metrics?format=json
```

Response:
```json
{
  "total": 1250,
  "timeRange": {
    "start": 1700000000000,
    "end": 1700003600000
  },
  "metrics": {
    "query_confessions": {
      "count": 450,
      "avg": 125.5,
      "min": 45,
      "max": 890,
      "p50": 110,
      "p95": 320,
      "p99": 650
    }
  }
}
```

### Prometheus Format

```bash
GET /metrics?format=prometheus
```

Response:
```
# TYPE query_confessions histogram
query_confessions{user_id="abc123"} 125 1700000000000
query_confessions{user_id="def456"} 98 1700000001000
```

## Health Checks

### Endpoint

```bash
GET /health
```

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    },
    "storage": {
      "status": "healthy",
      "latency": 32
    },
    "functions": {
      "status": "healthy"
    }
  },
  "memory": {
    "used": 52428800,
    "total": 134217728,
    "percentage": 39.06
  }
}
```

### Status Codes

- `200`: System healthy or degraded
- `503`: System unhealthy

### Status Types

- **healthy**: All systems operational
- **degraded**: Some non-critical issues
- **unhealthy**: Critical failures

## Alerting

### Automatic Alerts

The system automatically alerts on:

1. **Circuit Breaker Opens**
   - Triggers when failure threshold exceeded
   - Notification in user's language
   - Auto-resolves when circuit closes

2. **Network Connectivity**
   - Offline/online state changes
   - Connection quality issues
   - Recovery notifications

3. **Performance Degradation**
   - Slow query detection (>200ms p95)
   - Cache miss rate spikes
   - Error rate increases

### Alert Translations

All alerts are automatically translated:

**English:**
- "Service temporarily unavailable. We're working on it."
- "Network error. Please check your connection."

**Spanish:**
- "Servicio temporalmente no disponible. Estamos trabajando en ello."
- "Error de red. Por favor verifica tu conexión."

**German:**
- "Service vorübergehend nicht verfügbar. Wir arbeiten daran."
- "Netzwerkfehler. Bitte überprüfe deine Verbindung."

## Integration with External Tools

### Prometheus

Configure Prometheus to scrape metrics:

```yaml
scrape_configs:
  - job_name: 'confessai'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-domain.com:443']
    metrics_path: '/metrics'
    params:
      format: ['prometheus']
```

### Grafana

Import metrics for dashboards:

1. Add Prometheus data source
2. Create dashboard with panels for:
   - Latency percentiles
   - Error rates
   - Cache performance
   - Circuit breaker states

### Custom Monitoring Tools

Use the JSON API endpoint to integrate with any monitoring solution:

```javascript
// Example integration
const response = await fetch('/metrics?format=json');
const metrics = await response.json();

// Process and send to your monitoring service
yourMonitoringService.send({
  latency_p95: metrics.metrics.query_confessions.p95,
  error_rate: calculateErrorRate(metrics),
  cache_hit_rate: calculateCacheHitRate(metrics)
});
```

## Best Practices

1. **Monitor Continuously**: Check health endpoint every 30-60 seconds
2. **Set Thresholds**: Alert when metrics exceed targets
3. **Track Trends**: Monitor changes over time, not just absolute values
4. **Correlate Events**: Use requestId to trace requests across logs and metrics
5. **Review Regularly**: Weekly review of performance trends
6. **Act on Alerts**: Investigate and resolve issues promptly
7. **Document Incidents**: Keep runbooks for common issues

## Troubleshooting

### High Latency

If p95 latency >200ms:

1. Check cache hit rate (should be >85%)
2. Review slow query log
3. Verify database connection pool
4. Check for N+1 queries
5. Consider adding indexes

### Low Cache Hit Rate

If cache hit rate <85%:

1. Verify cache TTL settings
2. Check cache invalidation logic
3. Monitor cache size limits
4. Review caching strategy
5. Consider increasing TTL

### Circuit Breaker Trips

If circuit breakers frequently open:

1. Check service health (/health endpoint)
2. Review error logs for patterns
3. Verify timeout settings
4. Monitor external service status
5. Consider adjusting thresholds

### High Error Rate

If error rate >0.1%:

1. Check error logs for common patterns
2. Verify input validation
3. Review recent deployments
4. Check external service dependencies
5. Monitor database health

## Performance Targets

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Latency p95 | <200ms | Investigate slow queries |
| Error Rate | <0.1% | Review error logs |
| Cache Hit Rate | >85% | Optimize caching strategy |
| Uptime | >99.9% | Incident response |
| Circuit Breaker Trips | 0/hour | Check service health |

---

**Last Updated:** 2025-10-18
**Version:** 1.0.0

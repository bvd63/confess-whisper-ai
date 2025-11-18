# Load Testing Guide

## Overview

Load testing ensures ConfessAI can handle 1M users and 10K concurrent connections under production conditions.

## Tools

**k6** - Primary load testing tool

- Install: `brew install k6` (macOS) or [download](https://k6.io/docs/getting-started/installation/)
- Docs: https://k6.io/docs/

## Running Load Tests

### Basic Test (Local)

```bash
k6 run scripts/load-test.js
```

### With Custom Configuration

```bash
# Set target URL and credentials
BASE_URL=https://your-app.com \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
k6 run scripts/load-test.js
```

### CI/CD Integration

```bash
# Run in CI with results output
k6 run --out json=load-test-results.json scripts/load-test.js
```

## Test Scenarios

The load test simulates realistic user behavior:

1. **View Feed (40%)** - Users browsing confession feed
2. **View Single Confession (30%)** - Users reading specific confessions
3. **Health Check (15%)** - System health monitoring
4. **View Communities (15%)** - Users browsing communities

## Load Profile

```
Stage 1: 0 → 100 users    (2 min)  - Warm-up
Stage 2: 100 → 1K users   (5 min)  - Ramp up
Stage 3: 1K → 5K users    (10 min) - Stress
Stage 4: 5K → 10K users   (5 min)  - Peak load
Stage 5: 10K → 5K users   (5 min)  - Ramp down
Stage 6: 5K → 0 users     (2 min)  - Cool down

Total duration: 29 minutes
Peak concurrent: 10,000 users
```

## Success Criteria

### Response Time

- ✅ p50 < 100ms
- ✅ p95 < 200ms
- ✅ p99 < 500ms

### Reliability

- ✅ Error rate < 0.1%
- ✅ HTTP failures < 1%
- ✅ No timeouts

### Throughput

- ✅ Can handle 10K concurrent users
- ✅ Sustained 1000+ RPS

## Interpreting Results

### Good Results

```
http_req_duration...: avg=95ms  p(95)=180ms p(99)=450ms
http_req_failed.....: 0.05%
errors..............: 0.03%
```

### Problem Indicators

- p95 > 300ms → Database query optimization needed
- p99 > 1000ms → Slow queries or external API issues
- Error rate > 1% → Application bugs or infrastructure issues
- High memory usage → Memory leaks

## Bottleneck Analysis

### If p95 Latency is High (>300ms)

1. Check slow query logs in Supabase
2. Verify indexes are in place
3. Review N+1 query patterns
4. Check connection pool saturation

### If Error Rate is High (>1%)

1. Check edge function logs
2. Review database RLS policies
3. Verify external API availability
4. Check rate limiting configuration

### If Memory Grows Continuously

1. Review query result caching
2. Check for memory leaks in React components
3. Verify proper cleanup in useEffect
4. Monitor database connection pool

## Pre-Production Checklist

Before load testing in production:

- [ ] All indexes applied
- [ ] Connection pooling configured
- [ ] Caching layer active
- [ ] Rate limiting enabled
- [ ] Circuit breakers configured
- [ ] Health checks passing
- [ ] Monitoring dashboards ready
- [ ] Alerting configured
- [ ] Rollback plan documented

## Monitoring During Tests

Watch these metrics:

1. Database CPU usage
2. Database connection count
3. Edge function invocation rate
4. Memory usage
5. Network bandwidth
6. Cache hit rate

## Post-Test Actions

1. Review k6 summary report
2. Analyze performance bottlenecks
3. Check error logs
4. Optimize identified issues
5. Re-test to verify improvements

## Advanced Testing

### Spike Testing

```bash
# Sudden traffic spike
k6 run --stage 0s:0,0s:10000,1m:10000,0s:0 scripts/load-test.js
```

### Stress Testing

```bash
# Find breaking point
k6 run --stage 5m:5000,10m:10000,5m:15000,5m:20000 scripts/load-test.js
```

### Soak Testing

```bash
# Long-duration stability
k6 run --stage 2m:1000,2h:1000,2m:0 scripts/load-test.js
```

---

**Last Updated:** 2025-10-18
**Target:** 1M users, 10K concurrent
**Next Test:** Before major release

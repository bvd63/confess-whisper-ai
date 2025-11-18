# System Monitoring & Observability Guide

Complete guide for monitoring the ConfessAI persistence system and overall application health.

## 📊 Monitoring Dashboard

### Accessing the Dashboard

Admins can access the real-time monitoring dashboard at `/system-monitor`. This provides:

- **Sync Status**: Current synchronization state (Offline, Syncing, Synced)
- **Network Status**: Online/offline connectivity
- **Operation Metrics**: Performance statistics for the last minute
- **Cache Health**: Storage usage and IndexedDB status
- **System Configuration**: Sync intervals and background job schedules

### Key Metrics Tracked

#### Performance Metrics

- **Total Operations**: Number of persistence operations in the last minute
- **Success Rate**: Percentage of successful operations (target: >99%)
- **Average Duration**: Mean operation latency (target: <50ms)
- **p95 Duration**: 95th percentile latency (target: <100ms)
- **Slow Operations**: Operations exceeding 100ms threshold

#### Storage Metrics

- **Storage Usage**: Percentage of available quota used
- **Cache Size**: Current IndexedDB usage
- **Queued Operations**: Number of pending offline operations

## 🔍 Real-Time Monitoring

### Network Status Indicator

Located in the app header, shows:

- 🟢 **Synced**: All data synchronized, network online
- 🔵 **Syncing**: Background sync in progress
- 🔴 **Offline**: No network connection, queued operations shown

### Console Monitoring

#### Important Log Patterns

**Sync Operations:**

```
📅 Sync scheduler started
🔄 Quick sync completed
🔍 Deep sync starting...
✅ Data validation passed
```

**Performance Warnings:**

```
⚠️ Slow persistence operation: [operation] took [duration]ms
```

**Data Validation:**

```
✅ All conversations validated
⚠️ Data validation issues detected: [details]
```

**Cache Operations:**

```
💾 Cache hit: [key]
❌ Cache miss: [key]
🗑️ Cache cleared for user
```

## 📈 Performance Monitoring

### Observability Service

The app uses a centralized observability service (`src/lib/observability.ts`) for structured logging and metrics:

```typescript
import { observability } from "@/lib/observability";

// Log with context
observability.info("Operation completed", {
  requestId: "req-123",
  userId: "user-456",
  duration: 50,
});

// Record metrics
observability.recordMetric({
  name: "operation_duration",
  value: 50,
  unit: "ms",
  tags: { operation: "sync" },
});
```

### Performance Targets

| Metric         | Target | Warning | Critical |
| -------------- | ------ | ------- | -------- |
| p50 Latency    | <50ms  | >100ms  | >200ms   |
| p95 Latency    | <100ms | >200ms  | >500ms   |
| p99 Latency    | <200ms | >500ms  | >1000ms  |
| Success Rate   | >99.5% | <99%    | <95%     |
| Cache Hit Rate | >80%   | <70%    | <60%     |
| Sync Queue     | <5 ops | >20 ops | >50 ops  |

## 🚨 Alerting & Issues

### Critical Issues

**Circuit Breaker Open:**

```
⚠️ Circuit breaker opened for [service]
```

- **Impact**: Service temporarily unavailable
- **Action**: System will auto-recover; check service health

**High Queue Depth:**

```
⚠️ [N] operations queued (offline mode)
```

- **Impact**: Data not synced to server
- **Action**: Verify network connectivity

**Storage Quota Exceeded:**

```
❌ Storage quota exceeded
```

- **Impact**: New data cannot be cached
- **Action**: Clear old cache data or increase quota

### Warnings

**Slow Operations:**

```
⚠️ Slow operation detected: [operation] took [duration]ms
```

- **Impact**: Degraded user experience
- **Action**: Monitor frequency; investigate if persistent

**Data Validation Failed:**

```
⚠️ Validation failed for conversation [id]
```

- **Impact**: Data inconsistency detected
- **Action**: System will attempt auto-repair

## 🔧 Debugging Tools

### Browser DevTools

#### IndexedDB Inspector

1. Open DevTools → Application → Storage → IndexedDB
2. Inspect databases:
   - `confessions-db`: Main application data
   - Contains stores: `drafts`, `state`, `preferences`, `queue`

#### Network Monitor

- Filter by `supabase` to see API calls
- Check for failed requests or high latency
- Monitor WebSocket connections for realtime

#### Console Logs

- Filter by `[PERSISTENCE]` for cache operations
- Filter by `[SYNC]` for background sync events
- Filter by `[OBSERVABILITY]` for metrics

### Manual Testing Commands

Open browser console and run:

```javascript
// Check persistence health
window.checkPersistenceHealth = async () => {
  const estimate = await navigator.storage.estimate();
  console.log("Storage:", estimate);
  console.log(
    "Usage:",
    ((estimate.usage / estimate.quota) * 100).toFixed(2) + "%",
  );
};

// Force sync
window.forceSync = () => {
  window.dispatchEvent(new Event("app-focus-sync"));
  console.log("Sync triggered");
};

// Clear all cache
window.clearAllCache = async () => {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    indexedDB.deleteDatabase(db.name);
  }
  console.log("All caches cleared");
};
```

## 📊 Cron Job Monitoring

### Scheduled Jobs

| Job                  | Schedule         | Purpose                    | Monitor                      |
| -------------------- | ---------------- | -------------------------- | ---------------------------- |
| rotate-daily-quote   | Daily 00:00 UTC  | Update quote of the day    | Check `quotes` table         |
| cleanup-soft-deletes | Weekly Sun 02:00 | Remove old deleted records | Check `cron_job_logs`        |
| refresh-trending     | Hourly           | Update trending view       | Query `trending_confessions` |

### Monitoring Cron Jobs

Query the cron logs table (admin only):

```sql
SELECT * FROM cron_job_logs
ORDER BY executed_at DESC
LIMIT 10;
```

Check job schedules:

```sql
SELECT * FROM cron.job;
```

## 🎯 Health Check Endpoints

### Application Health

```bash
GET /health
```

Returns: System status, database connectivity, cache status

### Metrics Endpoint

```bash
GET /metrics?format=json
```

Returns: Performance metrics, latency percentiles, error rates

## 📝 Best Practices

### For Developers

1. **Use Structured Logging**

   ```typescript
   observability.info("Action", { context });
   ```

2. **Record Important Metrics**

   ```typescript
   observability.recordMetric({ name, value, unit });
   ```

3. **Handle Errors Gracefully**

   ```typescript
   observability.error("Error message", error, { context });
   ```

4. **Monitor Operation Duration**
   ```typescript
   const start = performance.now();
   // ... operation ...
   observability.recordMetric({
     name: "operation_duration",
     value: performance.now() - start,
     unit: "ms",
   });
   ```

### For Admins

1. **Regular Health Checks**
   - Review dashboard daily
   - Monitor queue depth trends
   - Check cache usage weekly

2. **Performance Reviews**
   - Weekly latency analysis
   - Monthly success rate reports
   - Quarterly capacity planning

3. **Incident Response**
   - Document issues in cron_job_logs
   - Track resolution time
   - Implement preventive measures

## 🔗 Related Documentation

- [Persistence System](./PERSISTENCE_SYSTEM.md) - Full system architecture
- [Quick Start Guide](./PERSISTENCE_QUICK_START.md) - Getting started
- [Performance Monitoring](./PERFORMANCE_MONITORING.md) - Performance targets
- [Cron Jobs](./CRON_JOBS.md) - Scheduled maintenance tasks

---

_Last Updated: 2025-10-18_

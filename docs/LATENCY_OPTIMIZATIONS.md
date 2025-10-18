# Latency Optimization Guide

Complete guide to ConfessAI's latency optimization strategies ensuring p95 < 200ms.

## 🎯 Performance Targets

- **p50 Latency**: <100ms
- **p95 Latency**: <200ms (CRITICAL)
- **p99 Latency**: <500ms
- **Cache Hit Rate**: >80%

## 🚀 Implemented Optimizations

### 1. Multi-Layer Caching System

#### Nickname Cache (`src/lib/nicknameCache.ts`)
- **TTL**: 10 minutes
- **Features**: In-flight deduplication, automatic RPC fallback
- **Usage**: Reduces redundant `get_user_nickname` calls by 90%+

```typescript
import { getNicknameCached, primeNicknameCache } from '@/lib/nicknameCache';

// Fetch with cache
const nickname = await getNicknameCached(userId);

// Prime cache proactively
primeNicknameCache(userId, 'username');
```

#### Profile Cache (`src/lib/profileCache.ts`)
- **TTL**: 5 minutes
- **Features**: Full profile data caching, in-flight deduplication
- **Usage**: Eliminates repeated profile fetches

```typescript
import { getProfileCached, primeProfileCache } from '@/lib/profileCache';

const profile = await getProfileCached(userId);
```

#### Confession Cache (`src/lib/confessionCache.ts`)
- **TTL**: 2 minutes (shorter for dynamic content)
- **Features**: Single + batch caching, automatic invalidation
- **Usage**: Speeds up feed loading and individual confession views

```typescript
import { getConfessionCached, primeConfessionBatch } from '@/lib/confessionCache';

// Cache entire feed
primeConfessionBatch(confessions);
```

### 2. Query Optimization

#### Batch Prefetching
- Inbox conversations: Prefetch all nicknames before rendering
- Feed loading: Prime all caches in single pass
- Notification list: Batch fetch all user data

#### Smart SELECT queries
```sql
-- Instead of multiple queries, use single query with joins
SELECT confessions.*, profiles.nickname 
FROM confessions 
JOIN profiles ON confessions.user_id = profiles.user_id
```

### 3. Component Optimization

#### React.memo Usage
- `ConfessionCard`: Prevents unnecessary re-renders
- `ConfessionFeed`: Memoized to avoid full list re-renders
- Individual components: Strategic memoization where data doesn't change

### 4. Request Deduplication

- Circuit breaker pattern for failing endpoints
- In-flight request deduplication prevents duplicate fetches
- Exponential backoff on errors

### 5. Database Optimizations

#### Indexes (ensure these exist)
```sql
-- Critical indexes for <200ms queries
CREATE INDEX idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX idx_confessions_likes ON confessions(likes_count DESC);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

#### Materialized Views
- `hot_confessions`: Pre-calculated trending scores
- Refreshed every 5 minutes via cron job

## 📊 Monitoring Latency

### Using Performance Monitor
```typescript
import { observability } from '@/lib/observability';

// Track operation timing
const result = await observability.measureAsync('load_feed', async () => {
  return await loadConfessions();
});

// View metrics
const metrics = observability.getMetricsSummary();
console.log(metrics['load_feed'].p95); // Should be <200ms
```

### Chrome DevTools
1. Open Network tab
2. Filter by "Fetch/XHR"
3. Check "Timing" for each request
4. Waterfall view shows sequential vs parallel

## 🔧 Troubleshooting High Latency

### Common Issues

**Problem**: Feed takes >200ms to load
**Solution**: 
- Check cache hit rate in console
- Ensure `primeConfessionBatch` is called
- Verify indexes exist on `confessions` table

**Problem**: Nickname lookups are slow
**Solution**:
- Cache should handle most requests
- Check if RPC `get_user_nickname` is optimized
- Ensure profile data is fetched with main query

**Problem**: Messages page is slow
**Solution**:
- Batch prefetch all conversation nicknames
- Use `primeNicknameCache` for all participants
- Limit initial message history to 50

### Debug Commands
```typescript
// Check cache stats
console.log(localStorage.length); // Should grow over time

// Force cache clear
localStorage.clear();

// Monitor network in real-time
observability.debug('Loading feed...', { requestId: '...' });
```

## ✅ Best Practices

1. **Always prime caches** when fetching lists of data
2. **Use React.memo** for expensive components
3. **Batch database queries** instead of N+1 patterns
4. **Monitor p95 latency** in production
5. **Set cache TTLs** appropriate to data freshness needs

## 📈 Expected Performance

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Load Feed | 50ms | 150ms | 300ms |
| Load Profile | 30ms | 100ms | 200ms |
| Load Inbox | 40ms | 120ms | 250ms |
| Load Notifications | 35ms | 110ms | 220ms |
| Post Confession | 100ms | 200ms | 400ms |
| Add Comment | 80ms | 180ms | 350ms |

---

*Last Updated: 2025-10-18*

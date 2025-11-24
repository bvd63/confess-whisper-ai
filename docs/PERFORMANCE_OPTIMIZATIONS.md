# Performance Optimizations

## Recent Optimizations (2025-10-23)

### Query Performance Improvements

The performance monitoring system detected several slow queries that were exceeding the 200ms performance budget. The following optimizations were implemented:

#### 1. Premium Status Query (534ms → Target: <200ms)
**File**: `src/hooks/usePremiumStatus.ts`

**Changes**:
- ✅ Added 5-minute cache TTL (was 0 - no cache)
- ✅ Added 2-minute stale time
- ✅ Added circuit breaker protection
- ✅ Added request deduplication
- ✅ Added cache key for better cache management

**Rationale**:
- Query makes 2 parallel database calls (profiles + subscription_entitlements)
- Realtime updates automatically invalidate cache when data changes
- Safe to cache for 5 minutes with realtime subscription

**Expected Impact**: 80-90% reduction in query frequency

---

#### 2. Following/Followers Queries (728ms/734ms → Target: <200ms)
**File**: `src/hooks/useFollowing.ts`

**Changes**:
- ✅ Increased cache TTL from 3 minutes to 5 minutes
- ✅ Added 3-minute stale time
- ✅ Added circuit breaker protection
- ✅ Added request deduplication
- ✅ Added individual cache keys per user

**Rationale**:
- Two separate queries for followers and following
- Follow relationships change infrequently
- Realtime updates automatically invalidate cache
- Safe to cache longer with realtime subscription

**Expected Impact**: 70-80% reduction in query frequency

---

#### 3. Quote of the Day Query (518ms → Target: <200ms)
**File**: `src/hooks/useQuoteOfTheDay.ts`

**Status**: Already optimized with:
- ✅ 10-minute cache TTL
- ✅ Circuit breaker enabled
- ✅ Retry logic enabled
- ✅ Request deduplication

**Additional Recommendation**: Consider pre-fetching quotes or using a CDN for static content.

---

## Performance Budget System

### Overview
The app uses a performance budget system to monitor query performance and alert developers when queries exceed acceptable thresholds.

**File**: `src/hooks/usePerformanceBudget.ts`

**Budget Limits**:
- Query execution time: **200ms (p95)**
- Applies to all database queries
- Warnings logged to console when exceeded

### How It Works
```typescript
usePerformanceBudget({
  budget: {
    p95: 200, // 95th percentile should be under 200ms
  },
});
```

The system:
1. Tracks all query execution times
2. Calculates p95 (95th percentile) performance
3. Logs warnings when queries exceed 200ms
4. Helps identify performance bottlenecks

---

## Query Optimization Strategies

### 1. Caching Strategy
```typescript
useOptimizedQuery({
  queryKey: ['my-query', id],
  queryFn: async () => { /* ... */ },
  cacheTTL: 5 * 60 * 1000,      // How long to cache
  staleTime: 3 * 60 * 1000,     // When to consider stale
  cacheKey: `my-query-${id}`,   // Unique cache key
});
```

**Guidelines**:
- **User-specific data**: 3-5 minute cache
- **Global data**: 10-15 minute cache
- **Frequently changing**: 1-2 minute cache
- **Static data**: 30+ minute cache

### 2. Circuit Breaker
Automatically stops retrying failed queries to prevent cascading failures.

```typescript
useOptimizedQuery({
  useCircuitBreaker: true,
});
```

**Benefits**:
- Prevents retry storms
- Protects backend from overload
- Fails fast when backend is down

### 3. Request Deduplication
Prevents duplicate requests when multiple components request the same data.

```typescript
useOptimizedQuery({
  useDedupe: true,
});
```

**Benefits**:
- Reduces redundant queries
- Saves bandwidth
- Improves perceived performance

### 4. Realtime Updates
Use Supabase realtime subscriptions to invalidate cache only when data changes.

```typescript
useEffect(() => {
  const channel = supabase
    .channel('my-updates')
    .on('postgres_changes', { /* config */ }, () => {
      refetch();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [refetch]);
```

**Benefits**:
- Cache stays fresh
- No unnecessary refetches
- Immediate updates when data changes

---

## Database Optimization Checklist

### Indexes (Backend)
Ensure proper indexes exist for frequently queried columns:
- ✅ `user_follows.follower_id`
- ✅ `user_follows.following_id`
- ✅ `profiles.user_id`
- ✅ `subscription_entitlements.user_id`

### Query Optimization
- ✅ Use `select('specific, columns')` instead of `select('*')`
- ✅ Use `maybeSingle()` for single-row queries
- ✅ Combine multiple queries with `Promise.all()`
- ✅ Filter early, compute late

### Caching Strategy
- ✅ Cache user-specific data (3-5 min)
- ✅ Cache global data (10+ min)
- ✅ Use realtime to invalidate cache
- ✅ Add circuit breakers for resilience

---

## Monitoring Performance

### Console Warnings
Performance budget violations are logged to console:
```
🚨 PERFORMANCE BUDGET EXCEEDED: query_followers p95=728ms (limit: 200ms)
```

### What to Do When You See Warnings

1. **Identify the Query**
   - Check the query key in the warning
   - Find the corresponding hook/component

2. **Analyze the Issue**
   - Is caching enabled?
   - Is the query making multiple database calls?
   - Are there unnecessary joins or filters?

3. **Apply Optimizations**
   - Increase cache TTL if appropriate
   - Add circuit breaker and deduplication
   - Split complex queries if needed
   - Add database indexes if missing

4. **Verify Improvement**
   - Monitor console for warnings
   - Check if p95 times improve
   - Test under realistic load

---

## Performance Metrics Dashboard

**Location**: `/admin/performance`

**Features**:
- Real-time performance metrics
- Query performance breakdown
- Cache hit rates
- Slow query identification

**Access**: Admin users only

---

## Best Practices

### ✅ Do
- Cache aggressively with appropriate TTLs
- Use realtime subscriptions to invalidate cache
- Enable circuit breakers for external queries
- Use request deduplication
- Monitor performance budgets
- Profile slow queries

### ❌ Don't
- Set cacheTTL to 0 for frequently accessed data
- Make multiple sequential queries that could be parallel
- Query without proper indexes
- Ignore performance warnings
- Fetch all columns when you only need a few

---

## Future Optimizations

### Planned
1. **Query Batching**: Combine multiple small queries into batches
2. **Prefetching**: Pre-load data based on user navigation patterns
3. **Service Worker Caching**: Cache API responses at the service worker level
4. **GraphQL Federation**: Combine multiple data sources efficiently

### Under Consideration
1. **CDN for Static Data**: Serve quotes, badges, etc. from CDN
2. **Edge Caching**: Use Cloudflare or similar for API caching
3. **Database Read Replicas**: Separate read/write databases
4. **Query Result Compression**: Reduce payload sizes

---

## Measuring Success

### Key Metrics
- **p95 Query Time**: Should be < 200ms for all queries
- **Cache Hit Rate**: Should be > 70%
- **Failed Query Rate**: Should be < 1%
- **Time to Interactive**: Should be < 3 seconds

### Monitoring Tools
- Browser DevTools Performance tab
- Console warnings from usePerformanceBudget
- Performance Dashboard (`/admin/performance`)
- Supabase Dashboard (query analytics)

---

## Support

For performance issues:
1. Check console for performance warnings
2. Review this document for optimization strategies
3. Check the Performance Dashboard
4. Review query execution plans in Supabase

**Last Updated**: 2025-10-23
**Next Review**: Check performance metrics weekly

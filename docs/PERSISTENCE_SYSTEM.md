# Instagram-Level Persistence System

## Overview

Complete offline-first persistence system with Instagram-level reliability, featuring multi-layer caching, conflict resolution, and background synchronization.

## Architecture

### 1. Storage Layer

**File**: `src/lib/persistenceManager.ts`

- IndexedDB-based persistence
- Stores: cache, state, drafts, conversations, preferences
- TTL support for cache expiration
- Specialized methods for drafts, scroll positions, UI state

### 2. Offline Queue

**File**: `src/lib/offlineQueue.ts`

- Queues failed operations when offline
- Exponential backoff retry logic (1s → 2s → 4s → 8s)
- Auto-processes on network restoration
- Persists queue to IndexedDB

### 3. Conflict Resolution

**File**: `src/lib/conflictResolver.ts`

- Message conflicts: Server wins for sent, local wins for pending
- Conversation conflicts: Merge with newest message data
- Draft conflicts: Newest timestamp wins
- Preference conflicts: Local always wins

### 4. Background Sync

**Files**:

- `src/lib/syncScheduler.ts` - Client-side scheduler
- `supabase/functions/sync-user-data/index.ts` - Server-side validation

**Quick Sync (30s)**:

- Process offline queue
- Refresh unread counts
- Dispatch quick-sync events

**Deep Sync (5min)**:

- Server-side data validation
- Recalculate unread counts
- Check data consistency

**Cleanup (1hr)**:

- Clear expired cache
- Remove stale drafts

### 5. Data Validation

**File**: `src/lib/dataValidator.ts`

- Checks conversation consistency
- Validates message integrity
- Cache health monitoring
- Auto-repair data issues

### 6. Session Management

**File**: `src/lib/sessionManager.ts`

- Saves user's last route and conversation
- Restores session on app load
- Tracks active conversation

### 7. Monitoring

**File**: `src/lib/persistenceMonitor.ts`

- Tracks persistence operation performance
- Logs slow operations (>100ms)
- Monitors cache hit rates

## React Hooks

### useBackgroundSync

**File**: `src/hooks/useBackgroundSync.ts`

- Syncs on app focus
- Syncs on network restoration
- Processes offline queue

### useSessionRestoration

**File**: `src/hooks/useSessionRestoration.ts`

- Restores last route on app load
- Navigates to last active conversation

### useUnreadCount

**File**: `src/hooks/useUnreadCount.ts`

- Tracks unread messages per conversation
- Persists counts to IndexedDB
- Real-time Supabase subscriptions

## UI Components

### NetworkStatusIndicator

**File**: `src/components/NetworkStatusIndicator.tsx`

- Shows offline banner
- Displays queued operations count
- Positioned at top of viewport

### SyncStatusIndicator

**File**: `src/components/SyncStatusIndicator.tsx`

- Badge in app header
- Shows: Offline, Syncing, Synced
- Updates in real-time

## Integration Points

### App.tsx

```typescript
// Hooks
useBackgroundSync()      // Background sync on focus
useSessionRestoration()  // Restore last session

// Auth lifecycle
SIGNED_IN:
  - Start periodic sync
  - Run data repair
  - Restore user state

SIGNED_OUT:
  - Stop periodic sync
  - Clear all user data
```

### useConversation.ts

```typescript
// Offline message handling
sendMessage():
  - Add optimistic message
  - Try send to Supabase
  - On error: Queue for retry
  - Remove temp message
```

### useInbox.ts

```typescript
// Conversation caching
loadConversations():
  - Check cache first
  - Fetch from Supabase if needed
  - Update cache
  - Integrate unread counts
```

## Data Flow

### Message Send (Online)

```
User types → sendMessage()
  ↓
Optimistic update (temp message)
  ↓
Supabase insert
  ↓
Success: Replace temp with real message
```

### Message Send (Offline)

```
User types → sendMessage()
  ↓
Optimistic update (temp message)
  ↓
Supabase fails
  ↓
Add to offline queue
  ↓
Remove temp message
  ↓
[Network restored]
  ↓
Process queue → Retry send
```

### Background Sync Cycle

```
Every 30s:
  ↓
Quick sync
  ↓
Process offline queue
  ↓
Refresh unread counts

Every 5min:
  ↓
Deep sync
  ↓
Call sync-user-data function
  ↓
Validate data consistency
  ↓
Recalculate unread counts

Every 1hr:
  ↓
Cleanup
  ↓
Clear expired cache
  ↓
Remove stale data
```

## Performance Features

1. **Multi-Layer Caching**
   - In-memory cache for active data
   - IndexedDB for persistent cache
   - Supabase for source of truth

2. **Optimistic Updates**
   - Instant UI feedback
   - Background sync to server
   - Conflict resolution on mismatch

3. **Lazy Loading**
   - Load conversations on demand
   - Paginate message history
   - Prefetch next page

4. **Request Batching**
   - Batch participant queries
   - Batch nickname lookups
   - Reduce API calls

## Error Handling

### Network Errors

- Queue operation for retry
- Show offline indicator
- Auto-retry with exponential backoff

### Data Conflicts

- Detect version mismatches
- Apply conflict resolution strategy
- Log resolution for debugging

### Cache Misses

- Fetch from Supabase
- Update cache
- Continue operation

## Monitoring & Debugging

### Console Logs

```
📦 Persistence operation logged
🔄 Sync scheduler started
⚠️ Slow persistence operation
✅ Data validation passed
🔄 Conflict resolved
```

### Performance Tracking

- Tracks all persistence operations
- Logs operations >100ms
- Monitors cache effectiveness

### Health Checks

- Daily cache validation
- Data consistency checks
- Orphaned data detection

## Best Practices

1. **Always use persistence hooks** - Don't directly call Supabase for data that should be cached
2. **Handle offline gracefully** - Queue operations, show feedback
3. **Trust the sync scheduler** - Let it handle background work
4. **Monitor performance** - Check logs for slow operations
5. **Clear cache on logout** - Ensure data privacy

## Testing Offline Mode

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try sending messages → Queued
4. Disable offline mode → Auto-syncs

## Maintenance

### Clear User Data

```typescript
await persistenceManager.clearAllUserData();
```

### Force Sync

```typescript
await syncScheduler.forceSync(userId);
```

### Check Sync Status

```typescript
const isSyncing = syncScheduler.isSyncRunning();
```

### Validate Data

```typescript
const result = await dataValidator.checkDataConsistency(userId);
```

## Future Enhancements

- [ ] Conflict resolution UI for user decisions
- [ ] Sync progress indicators
- [ ] Offline draft editing
- [ ] Background media upload queue
- [ ] Smart prefetching based on usage patterns

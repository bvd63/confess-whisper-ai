# Persistence System - Quick Start

## What You Get

✅ **Offline-first architecture** - App works without internet
✅ **Automatic retry** - Failed operations retry with exponential backoff
✅ **Conflict resolution** - Smart merging of local and server state
✅ **Session restoration** - Returns to last active conversation
✅ **Background sync** - Auto-syncs every 30 seconds
✅ **Data validation** - Checks consistency every 5 minutes
✅ **Network indicators** - Shows sync status to users

## Quick Test

### Test Offline Mode
1. Open DevTools → Network tab
2. Set to "Offline"
3. Send a message → Should show "Syncing..." badge
4. Disable offline → Auto-syncs and shows "Synced"

### Test Session Restoration
1. Open a conversation
2. Refresh the page
3. Should automatically navigate back to that conversation

### Test Background Sync
1. Check console for: `📅 Sync scheduler started`
2. Wait 30s → See: `Quick sync` logs
3. Wait 5min → See: `Deep sync` logs

## Key Features

### For Users
- **Works offline** - Send messages without internet
- **Auto-sync** - Syncs when connection returns
- **Session memory** - Returns to where you left off
- **Visual feedback** - Badges show sync status

### For Developers
- **IndexedDB caching** - Fast data access
- **Smart conflicts** - Auto-resolves data conflicts
- **Performance monitoring** - Logs slow operations
- **Health checks** - Daily cache validation

## Architecture at a Glance

```
User Action
    ↓
Optimistic Update (instant UI)
    ↓
Try Send to Supabase
    ↓
Success? → Done
    ↓
Failed? → Add to Offline Queue
    ↓
Network Restored?
    ↓
Process Queue → Retry with Backoff
```

## Important Files

### Core System
- `src/lib/persistenceManager.ts` - IndexedDB storage
- `src/lib/offlineQueue.ts` - Retry queue
- `src/lib/conflictResolver.ts` - Conflict handling
- `src/lib/syncScheduler.ts` - Background sync
- `src/lib/dataValidator.ts` - Data consistency
- `supabase/functions/sync-user-data/index.ts` - Server validation

### React Integration
- `src/hooks/useBackgroundSync.ts` - App focus sync
- `src/hooks/useSessionRestoration.ts` - Session restore
- `src/hooks/useUnreadCount.ts` - Unread tracking
- `src/components/NetworkStatusIndicator.tsx` - Offline banner
- `src/components/SyncStatusIndicator.tsx` - Sync badge

### Data Flow
- `src/hooks/useConversation.ts` - Message sending with offline support
- `src/hooks/useInbox.ts` - Conversation caching
- `src/pages/Messages.tsx` - Full integration

## How It Works

### 1. Storage Strategy
```
In-Memory Cache (fastest)
    ↓
IndexedDB (persistent)
    ↓
Supabase (source of truth)
```

### 2. Sync Cycle
```
Every 30s:  Quick sync (process queue, refresh counts)
Every 5min: Deep sync (validate data, recalculate)
Every 1hr:  Cleanup (clear expired cache)
```

### 3. Conflict Resolution
- **Messages**: Server wins (if sent), local wins (if pending)
- **Conversations**: Merge with newest data
- **Drafts**: Newest timestamp wins
- **Preferences**: Local always wins

## Monitoring

### Console Logs
```bash
📅 Sync scheduler started          # Sync started
🔄 Quick sync initiated            # Processing queue
✅ Data validation passed          # No issues found
⚠️ Slow persistence operation     # >100ms operation
🔄 Conflict resolved (type)       # Conflict handled
```

### Performance Tracking
- All persistence ops logged
- Slow operations (>100ms) flagged
- Cache effectiveness monitored

### Health Checks
- Daily cache validation
- Data consistency checks
- Orphaned data detection

## Troubleshooting

### Messages not syncing?
1. Check network indicator shows "Synced"
2. Look for errors in console
3. Run `dataValidator.checkDataConsistency(userId)`

### Session not restoring?
1. Check if `sessionManager.restoreSession()` returns data
2. Verify route is being saved
3. Check IndexedDB has session data

### Cache issues?
1. Clear cache: `persistenceManager.clearAllUserData()`
2. Force sync: `syncScheduler.forceSync(userId)`
3. Check cache health: `dataValidator.checkCacheHealth()`

## Best Practices

✅ **DO**
- Let sync scheduler handle background work
- Use persistence hooks for data access
- Trust conflict resolution
- Monitor performance logs

❌ **DON'T**
- Call Supabase directly for cached data
- Bypass offline queue
- Store sensitive data in cache without encryption
- Forget to clear cache on logout

## Next Steps

1. **Test offline mode** - Verify queue works
2. **Monitor performance** - Check console logs
3. **Review conflicts** - See resolution logs
4. **Check health** - Run daily validation

For detailed documentation, see `docs/PERSISTENCE_SYSTEM.md`

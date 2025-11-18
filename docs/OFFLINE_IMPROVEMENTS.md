# Offline & PWA Improvements Roadmap (Q4 2025)

## Goals

- Guarantee writes (messages, likes, subscriptions) survive long offline gaps via IndexedDB-backed queueing.
- Provide predictable fallback UX when the shell loads but API calls fail (offline-first navigation + cached screens).
- Document verification steps so QA can simulate airplane mode + throttled networks consistently.

## IndexedDB Queue Enhancements

1. **Operation metadata**
   - Extend `QueuedOperation` (see `src/lib/offlineQueue.ts`) with `scope` ("messages", "notifications", etc.) and `conflictKey` so we can dedupe repeated taps.
   - Persist an ISO timestamp + optimistic payload hash for auditing.
2. **Queue hydration hooks**
   - Export a `useOfflineQueue()` hook that exposes `enqueue`, `pendingByScope`, and `lastSyncAt` for UI badges (e.g., "3 replies sending...").
   - Surface queue state via a context provider that lives next to `TabNavigationProvider` inside `AppContent`.
3. **Mutation wrappers**
   - Introduce `enqueueMutation({ type, mutationFn, data })` helper so Chat/Confession modules can replace ad-hoc Supabase calls with a single guard:
     ```ts
     if (!navigator.onLine) {
       await offlineQueue.addOperation(
         "message",
         () => sendMessage(payload),
         payload,
       );
       return { status: "queued" };
     }
     return sendMessage(payload);
     ```
   - Add retry jitter + exponential backoff caps (current queue tops at 30s) to avoid thundering herds when the network returns.
4. **Visibility + tooling**
   - Log queue depth to `observability.recordMetric('offlineQueue_length', ...)` so the perf budget hook can catch pathological builds.
   - ✅ Persistence dashboard (`/admin/performance`) now surfaces queue depth, per-item metadata (scope, retries, conflict keys), and provides manual process/clear controls for QA and support.
   - ✅ Manual process/clear/cancel actions emit observability logs plus metrics (duration + remaining queued items) so admin interventions are traceable.

## Offline Fallback Experience

1. **Shell-level guard**
   - Extend `ChunkErrorBoundary` to display an offline banner when `navigator.onLine === false` and render cached `offline.html` for critical routes.
   - Register `prefetchCriticalRoutes()` inside `App.tsx` (use `useEffect` on mount) so Explore/Profile/Messages bundles are cached before going offline.
2. **Service worker updates**
   - Update `public/sw.js` to precache `/offline.html`, `/`, `/explore`, and `/messages` plus API responses via `workbox.routing.registerRoute` with `NetworkFirst` + custom fallback.
   - Emit a `SKIP_WAITING` message when new SW is available and prompt the user via `UpdatePrompt`.
3. **User feedback**
   - Implement an `OfflineActionToast` component triggered whenever an operation is queued, with retry status + cancel button.
   - Add automated offline regression coverage (Playwright `tests/e2e/offline.spec.ts`) that forces the browser offline, confirms cached routes render, and validates `/offline.html` fallback.

## Verification Checklist

- [ ] Toggle Chrome DevTools → Network → Offline, submit a confession, confirm toast reads "Queued" and entry appears on `/admin/performance`.
- [ ] Reconnect network, ensure queue flushes and success notification fires within 5s.
- [ ] Kill network mid-navigation; Shell should show `OfflineIndicator` + `offline.html` fallback without white screens.
- [ ] Run `pnpm test:integration --filter offline` after adding the new suite.
- [ ] Trigger manual queue process & clear actions, then verify observability logs/metrics capture the action metadata.

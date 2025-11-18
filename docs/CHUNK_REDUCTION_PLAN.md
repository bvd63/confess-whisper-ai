# Admin Chunk Reduction Plan — November 2025

Goal: shrink the `admin-tools-*` bundle from 866 KB → < 400 KB raw without regressing UX. This plan focuses on the two confirmed weight drivers: monolithic translations and always-on observability helpers.

---

## 1. Modularize Translations

**Problem**: `src/i18n/translations.ts` embeds ~330 KB of static strings (all languages) into any chunk that touches the `useLanguage()` hook, including the admin console.

**Strategy**: load translations per language via dynamic imports while keeping the narrow `getTranslation`/`ensureLanguage` helpers synchronous.

### Translation Steps

1. **Split assets**
   - ✅ Extracted each language payload into `src/i18n/lang/{lang}.ts` modules so Vite can tree-shake per-locale chunks.
   - ✅ Moved the giant `Translations` type into `src/i18n/types.ts` for IDE help + reusable imports.

2. **Create loader**
   - ✅ `loadTranslations(lang)` now dynamically imports per-locale modules and caches them in-memory.
   - ✅ Added a proxy `translations` export for legacy call sites plus `getCachedTranslations()` for the new context.

3. **Update context**
   - ✅ `LanguageContext` now awaits `loadTranslations()` on mount + language switch and renders nothing until payloads resolve, preventing mixed-language flashes.
   - ✅ `t` is sourced from the cached payload instead of the old static object.

4. **Types & fallbacks**
   - Validate the JSON shape in dev using a runtime guard (e.g., zod or manual key sampling) to catch missing keys.
   - Default to English by dynamically importing `en.json` whenever another language fails to load.

5. **Manual chunk hint**
   - ✅ `vite.config.ts` assigns any `src/i18n/lang/*` module to a `translations-{lang}` chunk so admin routes only download the locale they need.

**Expected win**: removes ~330 KB of static strings from every consumer bundle; admin routes will only load the English JSON (≈110 KB uncompressed) after the context resolves, rather than at navigation time.

---

## 2. Lazy-load Sentry + Observability Helpers

**Problem**: `admin-tools-*` currently bundles `@sentry/react`, replay integrations, and the IndexedDB persistence monitor up front because `src/lib/sentry.ts` eagerly imports everything.

**Strategy**: convert the Sentry module into a thin async wrapper that only loads the SDK (and heavy helpers like `persistenceMonitor`) inside guarded dynamic imports.

### Implementation Steps

1. **Refactor `src/lib/sentry.ts`**
   - ✅ `initSentry()` lazily imports `@sentry/react` only in prod, caches the module, and guards helper calls behind the async loader.
   - ✅ Replay + tracing integrations now live behind the same dynamic chunk.

2. **Split admin-only instrumentation**
   - Any admin panel component that accesses persistence/monitoring APIs (e.g., `persistenceMonitor`, `persistenceManager`) should import them via `lazy(() => import('@/lib/persistenceMonitor'))` or a dedicated `importAdminObservability()` helper.
   - Use suspense fallbacks when showing the performance cards so main admin tabs can render before observability modules finish loading.

3. **Bundle target**
   - ✅ Added an `observability` manual chunk in `vite.config.ts` so Sentry + monitoring tooling sit outside `admin-tools-*`.

4. **Env-aware loading**
   - Ensure `initSentry` short-circuits (without importing the SDK) when `env.client.sentryDsn` is empty or when `!env.isProd` to keep CI/dev builds lean.

**Expected win**: keeping Sentry + monitoring in a side chunk removes ~200 KB raw from `admin-tools-*` while still allowing admins to enable telemetry in production builds.

---

## 3. Rollout Checklist

1. ✅ Implement translation modularization.
2. ✅ Run `pnpm analyze` and record `translations-*` chunks (76–83 KB raw, 22–25 KB gzip) plus `admin-tools-*.js` at **369.8 KB raw / 116.5 KB gzip**.
3. ✅ Refactor Sentry loader + observability chunking; rerun analyze to confirm `admin-tools-*` < 400 KB.
4. ✅ Update `PERFORMANCE.md` with the new bundle snapshot and follow-up work.
5. ✅ Add a CI gate that fails if `admin-tools-*` exceeds 500 KB raw to prevent regressions (`npm run guard:admin-chunk`).

Once this plan lands, we can decide if further splitting (`charts-*`, `analytics-suite`) is necessary or if the admin payload is within tolerance.

`scripts/guard-admin-chunk.mjs` powers the new guard. CI runs it right after the production build (see `.github/workflows/ci.yml`), and the limit can be tuned locally with `ADMIN_CHUNK_LIMIT_KB` if we ever adjust the budget.

Follow-up (2025-11-16): `useRecharts` now accepts explicit scopes, so pie visualizations load a tiny `charts-pie-*` sidecar (~26 KB raw / 7 KB gzip) on top of the main `charts-cartesian-*` bundle. Notification/Advanced analytics stick to the cartesian loader, while views that mix pies + bars still pull both. This keeps us ready for additional chart family splits without bloating `admin-tools-*`.

- Follow-up (2025-11-16 PM): Scoped loaders now import Recharts primitives straight from `recharts/es6/*`, which trims the cartesian chunk to **405 KB raw / 111 KB gzip** and moves the pie helpers into a standalone **26 KB raw / 7 KB gzip** blob that only loads on moderation/profile analytics. We also added `src/types/recharts-es6.d.ts` so TypeScript can resolve those subpath imports without complaints.

- Follow-up (2025-11-16 late PM): The old monolithic `cartesian` scope is now split into `cartesianCore`, `line`, `bar`, and `area` modules. Typical analytics views pull just `cartesianCore + line` (~23 KB raw combined), bar charts add a **0.6 KB** helper, and the rarely visited engagement heatmap is the only surface that downloads the heavy `charts-area-*` sidecar (**382.9 KB raw / 106.4 KB gzip**). This keeps the default analytics payload tiny while isolating the expensive area renderer for the single view that needs it.

- Follow-up (2025-11-17 early AM): With the area scope retired, Rollup moved every shared Recharts helper into the `charts-bar-*` blob, so line-only views were still forced to download ~372 KB of “bar” code. We now pin any `node_modules/recharts/**` (and their d3-sidekicks) to a dedicated `charts-core-*` chunk. The scoped wrappers (`charts-line`, `charts-bar`, `charts-pie`) shrank to ~0.35 KB apiece, while the shared runtime lives in `charts-core-*` (**419.9 KB raw / 114 KB gzip**) and is cached across all analytics screens. This keeps chunk names honest and prevents phantom bar chunks from showing up in line-only payloads.

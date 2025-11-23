# Backend Service Layer Plan

## Objectives
- **Separate concerns**: Keep Supabase Edge Functions thin, delegating validation/business logic to shared modules.
- **Encapsulate domains**: Provide clear service boundaries (confessions, notifications, messaging, subscriptions, analytics, system utilities).
- **Enable reuse & testing**: Services can be imported by hooks, scheduled jobs, or background tasks, and unit-tested independent of HTTP transport.
- **Improve maintainability**: Centralize Supabase client creation, error handling, and observability utilities.

## Current State (Summary)
- Edge functions under `supabase/functions/*` embed business logic, Supabase access, and response shaping.
- `_shared` folder contains helpers (auth, env, logger) but adoption is inconsistent.
- No canonical mapping between domain concepts and files.

## Proposed Folder Layout
```
src/server/
  clients/
    supabaseAdmin.ts        // admin client creation
    supabaseService.ts      // typed service client wrappers
  config/
    env.ts                  // shared runtime/env loader (imported by web + functions)
  observability/
    logger.ts
    metrics.ts
    tracing.ts
  validation/
    schemas/...
    middleware.ts
  services/
    confessions/
      index.ts
      confessionService.ts
      confessionRepository.ts
    notifications/
    messaging/
    subscriptions/
    analytics/
    system/
  handlers/
    createConfession.ts     // each edge fn imports matching handler
    manageSubscription.ts
supabase/functions/
  create-confession/
    index.ts                // parse request -> call handler -> return response
```

## Domain Breakdown & Responsibilities

### Confessions Service
- **Repositories**: CRUD on `confessions`, `comments`, `communities`, views (`trending_confessions`), RPC wrappers (`get_hot_confessions`).
- **Services**: business rules (rate limits, validation, analytics logging, notifications).
- **Handlers**: `create-confession`, `boost-confession`, `report-confession` consume the service.

### Notifications Service
- Manage `notifications` table, OneSignal dispatch, in-app badge counters. Used by `manage-notifications`, `send-notification`, `system notifications` hooks.

### Messaging Service
- Conversation/message persistence, read receipts, typing indicators. Supports `mark-message-seen`, `mark-messages-read`, `soft-delete-conversation` functions.

### Subscriptions Service
- Stripe billing, entitlements, Supabase tables (`subscription_entitlements`, `coin_packages`), RPCs. Used by `manage-subscription`, `subscription-upgrade`, `subscription-downgrade`, `subscription-manage-v2` functions.

### Analytics Service
- Tracks analytics events, performance metrics, coin transactions. Interacts with `analytics-event`, `metrics`, `award-streak-bonus` functions.

### System Utilities
- Rate limiting (`supabase/functions/rate-limit`), security helpers, environment, shared Supabase clients.

## Core Building Blocks

### 1. Reusable Repositories
- Encapsulate raw Supabase operations with typed inputs/outputs (generated Database types).
- Example: `ConfessionRepository.create(data: ConfessionInput): Promise<ConfessionRow>`.

### 2. Service Layer
- Combine repositories + business rules.
- Example: `ConfessionService.publish({ userId, content, metadata })` -> handles validation, rate limits, analytics.

### 3. Handler Adapters
- Each edge function imports the service and wraps it with request parsing, validation, response serialization.
- Example skeleton:
```ts
// supabase/functions/create-confession/index.ts
import { createHttpHandler } from '@/server/handlers/createConfession';
import { httpMiddleware } from '@/server/validation/middleware';

export const handler = httpMiddleware(createHttpHandler());
```

### 4. Shared Clients & Config
- `src/server/clients/supabaseAdmin.ts` instantiates admin client using unified env loader.
- `src/server/config/env.ts` re-exports typed config for both runtime and edge functions.

## Implementation Phases

1. **Scaffold server directory**
   - Create `src/server/{clients,services,validation,observability}` folders.
   - Move existing `_shared` utilities into `src/server` (re-export for functions).

2. **Confessions Domain Pilot**
   - Extract logic from `create-confession` into `ConfessionService` and `ConfessionRepository`.
   - Update related functions to consume the service via thin handlers.
   - Add unit tests for service + repository using mocked Supabase client.

3. **Extend to Subscriptions & Notifications**
   - Repeat extraction for subscription management and notifications.

4. **Adopt Validation & Logging Standards**
   - Introduce middleware wrappers for request validation using shared schemas.
   - Replace ad-hoc logging with `src/server/observability/logger.ts` across services.

5. **Documentation & Onboarding**
   - Document each service’s responsibilities, available methods, and dependency graph.

## Refactor Checklist (per function)
1. Identify domain (confession/subscription/etc.).
2. Move business logic into service.
3. Use repository for Supabase queries.
4. Ensure handler only: parse input -> call service -> format response.
5. Add service-level tests and handler integration tests.

## Dependencies & Tooling
- **Types**: reuse `Database` types from `src/integrations/supabase/types.ts`.
- **Testing**: adopt a mockable Supabase client (`src/server/clients/__mocks__/supabaseAdmin.ts`).
- **Logging**: standardize on structured logs (JSON) via `pino` or custom wrapper.

## Risks & Mitigations
- **Large scope**: tackle one domain at a time; start with confessions.
- **Function cold-start**: ensure shared modules are treeshakable; avoid heavy imports.
- **Type drift**: generate service interfaces from Database schema; consider using `supabase-js` type generation.

## Next Steps
1. Approve folder layout & tooling choices.
2. Scaffolding PR: add `src/server` structure, migrate `_shared` utilities.
3. Confessions service refactor PR.
4. Roll out to remaining domains following checklist.


# Logging & Telemetry Strategy

## Goals
- **Consistency**: Every runtime (client, Node services, Supabase Edge Functions) emits structured JSON logs.
- **Observability**: Metrics/events are first-class citizens alongside log lines.
- **Traceability**: Request IDs and function names flow through shared helpers.
- **Extensibility**: Central factory supports piping events to external sinks (Sentry, Logflare, Axiom) without touching call-sites.

## Building Blocks
- `supabase/functions/_shared/logger-core.ts`: runtime-agnostic factory exposing `debug/info/warn/error`, `metric`, `event`, `child`, and `withContext` helpers.
- `supabase/functions/_shared/logger.ts`: Edge-function wrapper bound to service metadata (`service=edge`, `component=supabase-functions`).
- `src/server/observability/logger.ts`: Server/service-layer wrapper sharing the same core implementation for Node-based code.
- `src/lib/logger.ts`: Keeps Sentry integration for browser but will be aligned to emit structured metadata (future work).

## Log Entry Shape
```json
{
  "timestamp": "2025-11-23T10:00:00.000Z",
  "level": "info",
  "kind": "log" | "metric" | "event",
  "message": "Awarded coins",
  "service": "edge",
  "component": "supabase-functions",
  "functionName": "stripe-webhook-coins",
  "environment": "production",
  "context": {
    "requestId": "123e4567",
    "userId": "...",
    "value": 500
  }
}
```

## Usage Patterns
1. **Per-function logger**
   ```ts
   const requestLogger = createFunctionLogger("stripe-webhook-coins", requestId);
   requestLogger.info("Webhook received");
   requestLogger.metric("coins_awarded", coins, { userId });
   ```
2. **Ad-hoc logging**
   ```ts
   import { logInfo } from "../_shared/logger.ts";
   logInfo("Scheduler tick", { job: "award-streak-bonus" });
   ```
3. **Service-layer logger**
   ```ts
   const confessionLogger = createServiceLogger("confession-service", { domain: "confessions" });
   confessionLogger.error("Failed to publish", { error });
   ```

## Telemetry Guidance
- Emit `metric` for count/latency/duration values (e.g., `coins_awarded`, `notification_dispatch_ms`).
- Emit `event` for discrete lifecycle milestones (e.g., `notification_sent`, `confession_published`).
- Always include identifiers: `requestId`, `userId`, `functionName`, `jobName`.

## Rollout Checklist
1. Replace `console.*` usage in Supabase functions with `log*` helpers.
2. For each function, generate a request-scoped logger via `createFunctionLogger` and attach `requestId` (UUID).
3. Update new service-layer modules to import `createServiceLogger`.
4. Evaluate piping log output to centralized sink (Logflare/Axiom) after structured format stabilizes.


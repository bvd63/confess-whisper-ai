# Request Validation Middleware

## Objectives
- **Consistent schemas**: Every Supabase Edge Function parses and validates JSON payloads via a shared helper.
- **Single read**: Middleware handles `req.json()` once, preventing duplicate parsing bugs.
- **Actionable errors**: Clients receive structured error payloads (`error`, `message`, `messageKey`, `issues`).
- **Observability**: Validation failures automatically log structured warnings with field-level issues.

## Implementation
- `supabase/functions/_shared/validation.ts`
  - Exports `validateJsonBody({ req, schema, corsHeaders, logger })` that returns either `{ success: true, data }` or `{ success: false, response }`.
  - Utilizes Zod (`z`) shared import for schema definitions so runtime matches client-side validation.
  - Provides `buildJsonResponse` for consistent JSON responses that respect per-function CORS headers.
- Schema authors can import `z` directly from the helper to avoid version drift with other files.

## Usage Pattern
```ts
import { z, validateJsonBody } from "../_shared/validation.ts";
import { createFunctionLogger } from "../_shared/logger.ts";

serve(async (req) => {
  const logger = createFunctionLogger("my-function");

  const validation = await validateJsonBody({
    req,
    schema: z.object({
      packageId: z.string().min(1),
      coins: z.number().int().positive(),
    }),
    corsHeaders,
    logger,
    errorCode: "INVALID_PACKAGE",
    message: "Package payload is invalid",
    messageKey: "coins.invalid_package",
  });

  if (!validation.success) {
    return validation.response; // 400 with structured error
  }

  const body = validation.data;
  // ...continue handler logic
});
```

## Rollout Checklist
1. Import `validateJsonBody` in each function that calls `req.json()`.
2. Define the Zod schema closest to the handler to keep payload requirements discoverable.
3. Pass `corsHeaders` so error responses mirror success responses.
4. Loggers are optional but recommended for diagnostics (`logger` parameter).
5. Replace ad-hoc `if (!field)` checks with schema rules (e.g., `.uuid()`, `.email()`).

## Current Adoption
- `create-coin-checkout` now validates `packageId` via the middleware and emits structured logging through the shared logger API.
- Subsequent functions (subscription management, messaging, moderation) should adopt the helper as they are refactored.


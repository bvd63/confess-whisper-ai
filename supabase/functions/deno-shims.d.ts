// Lightweight TypeScript shims for Deno-based Supabase Edge Functions
// Purpose: silence editor/TS server errors about Deno globals and remote (https://) modules
// This file intentionally provides very small, permissive declarations (useful for editor only).

// Lightweight TypeScript shims for Deno-based Supabase Edge Functions
// Purpose: silence editor/TS server errors about Deno globals and remote (https://) modules
// Editor-only: don't change runtime behavior.

declare namespace Deno {
  // minimal subset used by our functions
  export namespace env {
    export function get(name: string): string | undefined;
  }
}

// `serve` used by Supabase Edge Functions runtime
declare function serve(handler: (req: any) => Promise<any> | any): void;

// Allow commonly-used remote imports (editor only)
declare module 'https://deno.land/*';
declare module 'https://esm.sh/*';
declare module 'https://cdn.skypack.dev/*';
declare module 'https://unpkg.com/*';
declare module 'https://jspm.dev/*';

declare module 'https://esm.sh/@supabase/supabase-js@2';
declare module 'https://esm.sh/stripe@*';

// Minimal request/response shapes to use in annotations without overriding DOM types
interface MinimalRequest {
  headers?: Record<string, string> | Headers;
  json?: () => Promise<any> | any;
  [key: string]: any;
}

type RequestLike = Request | MinimalRequest;
type ResponseLike = Response | Record<string, any>;



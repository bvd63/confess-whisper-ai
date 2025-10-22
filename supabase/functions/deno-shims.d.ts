// Lightweight TypeScript shims for Deno-based Supabase Edge Functions
// Purpose: silence editor/TS server errors about Deno globals and remote (https://) modules
// This file intentionally provides very small, permissive declarations (useful for editor only).

declare function serve(handler: (req: any) => Promise<Response> | Response): void;

declare namespace Deno {
  // minimal subset used by our functions
  export function get(name: string): string | undefined;
}

// `serve` used by Supabase Edge Functions runtime
declare function serve(handler: (req: Request) => Promise<Response> | Response): void;

// Allow remote imports used by our functions (editor only)
declare module 'https://deno.land/*';
declare module 'https://esm.sh/*';
declare module 'https://cdn.skypack.dev/*';
declare module 'https://unpkg.com/*';
declare module 'https://jspm.dev/*';

declare module 'https://esm.sh/@supabase/supabase-js@2';
declare module 'https://esm.sh/stripe@*';

// Minimal request/response shapes (do NOT override built-in DOM types)
interface MinimalRequest {
  headers?: Record<string, string> | Headers;
  json?: () => Promise<any> | any;
  [key: string]: any;
}

interface MinimalResponse {
  [key: string]: any;
}

// Use existing DOM types if present;
// otherwise allow our minimal shapes via type unions in function signatures
declare type RequestLike = Request | MinimalRequest;
declare type ResponseLike = Response | MinimalResponse;


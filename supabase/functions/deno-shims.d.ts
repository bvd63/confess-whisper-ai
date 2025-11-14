declare module "https://deno.land/std@0.168.0/http/server.ts" {
	type ServeHandler = (request: Request) => Response | Promise<Response>;
	export function serve(handler: ServeHandler): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.57.2" {
	export function createClient(
		supabaseUrl: string,
		supabaseKey: string,
		options?: Record<string, unknown>,
	): any;
	export type SupabaseClient = any;
}

declare global {
	const Deno: {
		env: {
			get(key: string): string | undefined;
		};
	};
}

export {};

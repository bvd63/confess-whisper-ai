import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  console.warn(
    JSON.stringify({
      level: "warn",
      source: "stripe-webhook",
      message: "Legacy webhook endpoint blocked",
    }),
  );

  return jsonResponse(
    {
      error: "WEBHOOK_ENDPOINT_DEPRECATED",
      message:
        "Use dedicated endpoints: stripe-webhook-subscriptions for subscription lifecycle and stripe-webhook-coins for coin purchases.",
    },
    410,
  );
});

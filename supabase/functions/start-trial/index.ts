import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  getAuthenticatedRequestContext,
  jsonResponse,
} from "../_shared/edge-auth.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

const resolveActivateTrialEndpoint = (): string => {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  if (!supabaseUrl) {
    throw new Error("CONFIGURATION_ERROR");
  }
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/activate-trial`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await getAuthenticatedRequestContext(req);
  if (!auth.ok) return auth.response;

  const internalSecret = (Deno.env.get("INTERNAL_JOB_SECRET") ?? "").trim();
  if (!internalSecret) {
    return jsonResponse({ error: "CONFIGURATION_ERROR" }, 500);
  }

  try {
    const activateTrialUrl = resolveActivateTrialEndpoint();

    const internalResponse = await fetchWithTimeout(
      activateTrialUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.context.token}`,
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ userId: auth.context.userId }),
      },
      10_000,
    );

    const responseText = await internalResponse.text();
    const contentType = internalResponse.headers.get("content-type") ?? "application/json";

    return new Response(
      responseText || JSON.stringify({ error: "EMPTY_INTERNAL_RESPONSE" }),
      {
        status: internalResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType.includes("application/json") ? contentType : "application/json",
        },
      },
    );
  } catch (error) {
    console.error("[START-TRIAL] Failed to proxy trial activation", error);
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500);
  }
});

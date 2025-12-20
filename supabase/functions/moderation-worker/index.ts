import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_LIMIT = 25;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase configuration" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  const { data: pending, error: fetchError } = await client
    .from("confessions")
    .select("id, content")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    return jsonResponse({ error: "Failed to load pending confessions", details: fetchError.message }, 500);
  }

  if (!pending || pending.length === 0) {
    return jsonResponse({ processed: 0, status: "idle" });
  }

  let approved = 0;
  let rejected = 0;
  let failed = 0;

  for (const confession of pending) {
    try {
      const { data: moderationData, error: moderationError } = await client.functions.invoke("ai-moderation", {
        body: { content: confession.content, language: "en" },
      });

      if (moderationError) {
        throw moderationError;
      }

      const isSafe = moderationData?.is_safe ?? true;
      const reason: string | null = moderationData?.reason ?? null;

      const updates = isSafe
        ? {
            moderation_status: "approved",
            moderation_reason: null,
            is_hidden: false,
            moderated_at: new Date().toISOString(),
          }
        : {
            moderation_status: "rejected",
            moderation_reason: reason ?? "Unsafe content",
            is_hidden: true,
            moderated_at: new Date().toISOString(),
          };

      const { error: updateError } = await client
        .from("confessions")
        .update(updates)
        .eq("id", confession.id);

      if (updateError) {
        throw updateError;
      }

      if (isSafe) {
        approved += 1;
      } else {
        rejected += 1;
      }
    } catch (error) {
      failed += 1;
      const fallbackReason = error instanceof Error ? error.message : "Moderation failed";
      await client
        .from("confessions")
        .update({
          moderation_reason: fallbackReason,
          is_hidden: true,
          moderation_status: "rejected",
        })
        .eq("id", confession.id)
        .eq("moderation_status", "pending");
    }
  }

  return jsonResponse({
    processed: pending.length,
    approved,
    rejected,
    failed,
  });
});

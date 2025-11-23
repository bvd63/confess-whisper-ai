import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getServerEnv } from "../_shared/env.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

const VALID_TONES = ["calm", "anxious", "happy", "sad", "angry", "hopeful", "grateful", "regretful", "confused", "overwhelmed"] as const;

const AnalyzeToneSchema = z.object({
  content: z.string().min(1).max(4000),
  confessionId: z.string().uuid().optional(),
});

serve(async (req) => {
  const { origin, userAgent, ipAddress } = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user) {
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = AnalyzeToneSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const env = getServerEnv();
    if (!env.LOVABLE_API_KEY) {
      return jsonResponse({ error: "AI_NOT_CONFIGURED" }, 500, origin);
    }

    if (payload.confessionId) {
      const { data: confession, error: confessionError } = await authResult.client
        .from("confessions")
        .select("id, user_id")
        .eq("id", payload.confessionId)
        .maybeSingle();

      if (confessionError || !confession) {
        return jsonResponse({ error: "CONFESSION_NOT_FOUND" }, 404, origin);
      }

      if (confession.user_id !== authResult.user.id) {
        return jsonResponse({ error: "FORBIDDEN" }, 403, origin);
      }
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        max_tokens: 10,
        messages: [
          {
            role: "system",
            content: "Analyze the emotional tone of the confession. Return ONLY ONE of these emotions: calm, anxious, happy, sad, angry, hopeful, grateful, regretful, confused, overwhelmed. Just the word, nothing else.",
          },
          { role: "user", content: payload.content },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logError("analyze-tone: AI error", { status: aiResponse.status, errorText });
      return jsonResponse({ error: "AI_FAILED" }, 502, origin);
    }

    const aiData = await aiResponse.json();
    const toneRaw = aiData.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "confused";
    const tone = VALID_TONES.includes(toneRaw as typeof VALID_TONES[number]) ? toneRaw : "confused";

    if (payload.confessionId) {
      const serviceClient = createServiceClient();
      const { error: updateError } = await serviceClient
        .from("confessions")
        .update({ emotional_tone: tone })
        .eq("id", payload.confessionId)
        .eq("user_id", authResult.user.id);

      if (updateError) {
        logError("analyze-tone: failed to persist tone", { error: updateError.message, confessionId: payload.confessionId });
      }
    }

    logInfo("analyze-tone: tone generated", {
      tone,
      confessionId: payload.confessionId,
      userId: authResult.user.id,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ tone }, 200, origin);
  } catch (error) {
    logError("analyze-tone: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});

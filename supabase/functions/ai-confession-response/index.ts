import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { getServerEnv } from "../_shared/env.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";

const PayloadSchema = z.object({
  userId: z.string().uuid(),
  confessionId: z.string().uuid(),
  text: z.string().min(1).max(4000),
  locale: z.enum(["en", "es", "de"]).optional(),
});

const systemPrompts = {
  en: "You are ConfessAI – empathetic, concise, helpful. Offer a humane, supportive view in 2-3 short paragraphs.",
  es: "Eres ConfessAI: empático, conciso y útil. Ofrece una perspectiva humana y de apoyo en 2-3 párrafos cortos.",
  de: "Du bist ConfessAI: empathisch, prägnant und hilfsbereit. Gib eine menschliche, unterstützende Sicht in 2-3 kurzen Absätzen."
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return handleOptions(origin);
  }

  try {
    const env = getServerEnv();
    if (!env.LOVABLE_API_KEY) {
      return jsonResponse({ error: 'LOVABLE_API_KEY_NOT_SET' }, 500, origin);
    }

    const authHeader = req.headers.get('Authorization');
    const authResult = await requireAuth(authHeader);
    if (!authResult.user) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401, origin);
    }

    const rawBody = await req.json();
    const parsed = PayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn('Invalid AI payload', { issues: parsed.error.flatten().fieldErrors });
      return jsonResponse({ error: 'INVALID_PAYLOAD' }, 400, origin);
    }

    const body = parsed.data;
    if (body.userId !== authResult.user.id) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403, origin);
    }

    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', body.userId)
      .single();

    const isVip = profile?.subscription_tier === 'vip';
    const locale = body.locale ?? 'en';
    const sys = systemPrompts[locale] ?? systemPrompts.en;

    const model = isVip ? 'google/gemini-2.5-flash' : 'google/gemini-2.5-flash-lite';

    logInfo('AI confession request', {
      userId: body.userId,
      confessionId: body.confessionId,
      locale,
      textLength: body.text.length,
      isVip,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: body.text }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError("AI API error", { status: response.status, error: errorText });

      if (response.status === 429) {
        return jsonResponse({ ok: false, error: "Rate limit exceeded. Please try again later." }, 429, origin);
      }
      if (response.status === 402) {
        return jsonResponse({ ok: false, error: "AI credits exhausted. Please contact support." }, 402, origin);
      }

      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content ?? "I understand what you've shared. Thank you for confiding in me.";

    logInfo("AI response generated", { answerLength: answer.length, isVip });

    return jsonResponse({ ok: true, answer }, 200, origin);

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logError("AI confession failed", { error: errorMessage });

    return jsonResponse({ ok: false, error: errorMessage }, 500, origin);
  }
});

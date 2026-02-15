import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  getAuthenticatedRequestContext,
  jsonResponse,
  requireInternalSecret,
} from '../_shared/edge-auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BONUSES = [
  { days: 3, coins: 10 },
  { days: 5, coins: 20 },
  { days: 7, coins: 50 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, reason: "method-not-allowed" }, 405);
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({
        ok: false,
        reason: 'invalid-input',
        details: 'Expected JSON body with currentStreak (number).',
      }, 400);
    }

    const internal = requireInternalSecret(req);
    const isInternal = internal.ok;

    let effectiveUserId = "";
    if (isInternal) {
      const internalUserId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!internalUserId) {
        return jsonResponse({ ok: false, reason: "invalid-input", details: "Missing userId for internal call" }, 400);
      }
      effectiveUserId = internalUserId;
    } else {
      const auth = await getAuthenticatedRequestContext(req);
      if (!auth.ok) return auth.response;
      effectiveUserId = auth.context.userId;

      const providedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (providedUserId && providedUserId !== effectiveUserId) {
        return jsonResponse({ ok: false, reason: "forbidden-user-mismatch" }, 403);
      }
    }

    const currentStreak = body.currentStreak;
    if (typeof currentStreak !== 'number') {
      return jsonResponse({
        ok: false,
        reason: 'invalid-input',
        details: 'Missing or invalid: currentStreak',
      }, 400);
    }

    const bonus = BONUSES.find(b => b.days === currentStreak);
    if (!bonus) {
      return jsonResponse({ ok: false, reason: 'no-bonus' }, 200);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const idempotencySessionId = `streak_${effectiveUserId}_${currentStreak}_${new Date().toISOString().split('T')[0]}`;
    
    // Call award_coins RPC with idempotent reason key
    const { error } = await supabase.rpc('award_coins', {
      p_user_id: effectiveUserId,
      p_amount: bonus.coins,
      p_session_id: idempotencySessionId,
      p_description: `Streak bonus: ${currentStreak} days`,
    });

    if (error) {
      console.error('award_coins RPC error:', error);
      return jsonResponse({ ok: false, error: error.message }, 500);
    }

    return jsonResponse({ ok: true, awarded: bonus.coins }, 200);
  } catch (e) {
    console.error('Unexpected error:', e);
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});

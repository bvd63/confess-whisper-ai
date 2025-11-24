import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BONUSES = [
  { days: 3, coins: 10 },
  { days: 5, coins: 20 },
  { days: 7, coins: 50 },
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, currentStreak } = await req.json();
    
    if (!userId || typeof currentStreak !== 'number') {
      return new Response(
        JSON.stringify({ ok: false, reason: 'invalid-input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const bonus = BONUSES.find(b => b.days === currentStreak);
    if (!bonus) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'no-bonus' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Call award_coins RPC with idempotent reason key
    const { data, error } = await supabase.rpc('award_coins', {
      p_user_id: userId,
      p_amount: bonus.coins,
      p_session_id: `streak_${currentStreak}_${new Date().toISOString().split('T')[0]}`,
      p_description: `Streak bonus: ${currentStreak} days`,
    });

    if (error) {
      console.error('award_coins RPC error:', error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, awarded: bonus.coins }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cron job to clean up expired authentication data
 * - Deletes expired auth sessions
 * - Removes old failed login attempts (30+ days)
 * - Clears expired CAPTCHA requirements
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Clean up expired sessions
    const { data: expiredSessions, error: sessionError } = await supabaseClient
      .from('auth_sessions')
      .delete()
      .lt('expires_at', now)
      .is('revoked_at', null)
      .select('id');

    if (sessionError) {
      console.error('Error cleaning expired sessions:', sessionError);
    } else {
      console.log(`Cleaned up ${expiredSessions?.length || 0} expired sessions`);
    }

    // Clean up old failed login attempts (30+ days)
    const { data: oldAttempts, error: attemptsError } = await supabaseClient
      .from('failed_login_attempts')
      .delete()
      .lt('attempted_at', thirtyDaysAgo)
      .select('id');

    if (attemptsError) {
      console.error('Error cleaning old failed attempts:', attemptsError);
    } else {
      console.log(`Cleaned up ${oldAttempts?.length || 0} old failed login attempts`);
    }

    // Clean up expired CAPTCHA requirements
    const { data: expiredCaptcha, error: captchaError } = await supabaseClient
      .from('captcha_requirements')
      .delete()
      .lt('required_until', now)
      .select('id');

    if (captchaError) {
      console.error('Error cleaning expired CAPTCHA requirements:', captchaError);
    } else {
      console.log(`Cleaned up ${expiredCaptcha?.length || 0} expired CAPTCHA requirements`);
    }

    // Clean up old security events (90+ days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldEvents, error: eventsError } = await supabaseClient
      .from('security_events')
      .delete()
      .lt('created_at', ninetyDaysAgo)
      .select('id');

    if (eventsError) {
      console.error('Error cleaning old security events:', eventsError);
    } else {
      console.log(`Cleaned up ${oldEvents?.length || 0} old security events`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleaned: {
          sessions: expiredSessions?.length || 0,
          failedAttempts: oldAttempts?.length || 0,
          captchaRequirements: expiredCaptcha?.length || 0,
          securityEvents: oldEvents?.length || 0,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

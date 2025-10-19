import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration
const SESSION_MAX_PER_USER = 5;
const REFRESH_TTL_SHORT = 2 * 24 * 60 * 60 * 1000; // 2 days
const REFRESH_TTL_LONG = 30 * 24 * 60 * 60 * 1000; // 30 days
const FAILED_ATTEMPT_WINDOW = 15; // minutes
const MAX_FAILED_ATTEMPTS = 5;
const CAPTCHA_LOCKOUT_DURATION = 30; // minutes

interface VerifyCaptchaRequest {
  captchaToken: string;
  remoteIp?: string;
}

interface SessionMetadata {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  stayConnected?: boolean;
}

interface AuthRequest {
  email: string;
  password?: string;
  captchaToken: string;
  sessionMetadata?: SessionMetadata;
}

async function verifyCaptcha(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET');
  
  if (!turnstileSecret) {
    console.warn('TURNSTILE_SECRET not configured - CAPTCHA verification disabled');
    return { success: true }; // Allow in dev if not configured
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error('CAPTCHA verification failed:', data);
      return { success: false, error: 'auth.captcha_failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return { success: false, error: 'auth.captcha_failed' };
  }
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Handle different auth actions
    switch (action) {
      case 'check-captcha-required': {
        const { email } = await req.json();
        
        const { data, error } = await supabaseClient
          .rpc('is_captcha_required', { _email: email.toLowerCase() });

        if (error) throw error;

        return new Response(
          JSON.stringify({ required: data || false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enhanced-login': {
        const { email, password, captchaToken, sessionMetadata }: AuthRequest = await req.json();
        
        // Check if CAPTCHA is required for this email
        const { data: captchaRequired } = await supabaseClient
          .rpc('is_captcha_required', { _email: email.toLowerCase() });

        if (captchaRequired) {
          const captchaResult = await verifyCaptcha(captchaToken, clientIp);
          if (!captchaResult.success) {
            return new Response(
              JSON.stringify({ 
                error: 'CAPTCHA_FAILED', 
                messageKey: captchaResult.error 
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Attempt sign in
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email,
          password: password!,
        });

        if (authError) {
          // Log failed attempt
          await supabaseClient
            .from('failed_login_attempts')
            .insert({
              email: email.toLowerCase(),
              ip_address: clientIp,
              user_agent: userAgent,
              failure_reason: authError.message,
            });

          // Check if we need to require CAPTCHA
          const { data: failureCount } = await supabaseClient
            .rpc('get_failed_login_count', { _email: email.toLowerCase(), _minutes: FAILED_ATTEMPT_WINDOW });

          if (failureCount && failureCount >= MAX_FAILED_ATTEMPTS) {
            await supabaseClient
              .from('captcha_requirements')
              .upsert({
                email: email.toLowerCase(),
                required_until: new Date(Date.now() + CAPTCHA_LOCKOUT_DURATION * 60 * 1000).toISOString(),
                reason: 'multiple_failed_attempts',
              }, { onConflict: 'email' });

            return new Response(
              JSON.stringify({ 
                error: 'ACCOUNT_LOCKED', 
                messageKey: 'auth.account_locked' 
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ 
              error: 'INVALID_CREDENTIALS', 
              messageKey: 'auth.invalid_credentials' 
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create session tracking
        const refreshToken = generateRefreshToken();
        const tokenHash = hashToken(refreshToken);
        const stayConnected = sessionMetadata?.stayConnected || false;
        const expiresAt = new Date(Date.now() + (stayConnected ? REFRESH_TTL_LONG : REFRESH_TTL_SHORT));

        // Check session limit
        const { count: sessionCount } = await supabaseClient
          .from('auth_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authData.user.id)
          .is('revoked_at', null);

        if (sessionCount && sessionCount >= SESSION_MAX_PER_USER) {
          // Revoke oldest session
          const { data: oldestSession } = await supabaseClient
            .from('auth_sessions')
            .select('id')
            .eq('user_id', authData.user.id)
            .is('revoked_at', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (oldestSession) {
            await supabaseClient
              .from('auth_sessions')
              .update({ revoked_at: new Date().toISOString() })
              .eq('id', oldestSession.id);
          }
        }

        // Create new session
        await supabaseClient
          .from('auth_sessions')
          .insert({
            user_id: authData.user.id,
            token_hash: tokenHash,
            device_id: sessionMetadata?.deviceId,
            user_agent: sessionMetadata?.userAgent || userAgent,
            ip_address: sessionMetadata?.ipAddress || clientIp,
            expires_at: expiresAt.toISOString(),
            stay_connected: stayConnected,
          });

        // Log security event
        await supabaseClient
          .rpc('log_security_event', {
            _user_id: authData.user.id,
            _event_type: 'login_success',
            _event_data: { deviceId: sessionMetadata?.deviceId },
            _ip_address: clientIp,
            _user_agent: userAgent,
          });

        return new Response(
          JSON.stringify({ 
            user: authData.user,
            session: authData.session,
            refreshToken,
            expiresAt: expiresAt.toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke-session': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);

        if (error || !user) {
          return new Response(
            JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { sessionId } = await req.json();

        await supabaseClient
          .from('auth_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        await supabaseClient
          .rpc('log_security_event', {
            _user_id: user.id,
            _event_type: 'session_revoked',
            _event_data: { sessionId },
            _ip_address: clientIp,
            _user_agent: userAgent,
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            messageKey: 'auth.session_revoked' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke-all-sessions': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);

        if (error || !user) {
          return new Response(
            JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseClient
          .rpc('revoke_all_user_sessions', { _user_id: user.id });

        await supabaseClient
          .rpc('log_security_event', {
            _user_id: user.id,
            _event_type: 'all_sessions_revoked',
            _ip_address: clientIp,
            _user_agent: userAgent,
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            messageKey: 'auth.all_sessions_revoked' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-sessions': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);

        if (error || !user) {
          return new Response(
            JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: sessions } = await supabaseClient
          .from('auth_sessions')
          .select('id, device_id, user_agent, ip_address, created_at, expires_at, last_refreshed_at')
          .eq('user_id', user.id)
          .is('revoked_at', null)
          .order('created_at', { ascending: false });

        return new Response(
          JSON.stringify({ sessions: sessions || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'INVALID_ACTION', message: 'Invalid action specified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Enhanced auth error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
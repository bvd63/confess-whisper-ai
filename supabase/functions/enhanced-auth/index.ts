import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
  ?? Deno.env.get('VITE_SUPABASE_URL')
  ?? Deno.env.get('SUPABASE_URL')
  ?? '';

const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  ?? Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')
  ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  ?? '';

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL = (Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '').trim();
const SKIP_TURNSTILE_FOR_PASSWORD_RESET = Deno.env.get('SKIP_TURNSTILE_FOR_PASSWORD_RESET') === 'true';
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET') ?? '';

// Environment configuration
const SESSION_MAX_PER_USER = 5;
const SESSION_CREATION_WINDOW_MINUTES = 60;
const SESSION_CREATION_MAX_PER_WINDOW = 5;
const REFRESH_TTL_SHORT = 2 * 24 * 60 * 60 * 1000; // 2 days
const REFRESH_TTL_LONG = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_MIN_ROTATION_INTERVAL = 60 * 1000; // 1 minute
const FAILED_ATTEMPT_WINDOW = 15; // minutes
const MAX_FAILED_ATTEMPTS = 5;
const CAPTCHA_LOCKOUT_DURATION = 30; // minutes
const SIGNUP_RATE_LIMIT_WINDOW = 60; // minutes
const MAX_SIGNUP_ATTEMPTS = 5;

// Strong password policy
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}.,?:;|<>]).{10,}$/;

interface RateLimitResponse {
  allowed?: boolean;
  remaining?: number;
  retryAfter?: number;
  resetAt?: string;
  identifierType?: 'user' | 'ip';
}

interface RateLimitCheckResult {
  allowed: boolean;
  remaining?: number;
  retryAfter?: number;
  identifierType?: 'user' | 'ip';
}

async function enforceRateLimit(
  client: any,
  {
    action,
    userId,
    ip,
  }: {
    action: string;
    userId?: string | null;
    ip?: string | null;
  },
): Promise<RateLimitCheckResult> {
  if (!client) {
    return { allowed: true };
  }

  if (!userId && !ip) {
    return { allowed: true };
  }

  try {
    const result = await client.functions.invoke('rate-limit', {
      body: {
        action,
        userId: userId ?? undefined,
        ip: ip ?? undefined,
      },
    });

    if (!result.error && result.data && (result.data as any).allowed === false) {
      return {
        allowed: false,
        remaining: (result.data as any).remaining,
        retryAfter: (result.data as any).retryAfter,
        identifierType: (result.data as any).identifierType,
      };
    }

    if (result.error) {
      console.warn(`[enhanced-auth] Rate limit error for ${action}`, result.error);
    }
  } catch (error) {
    console.error(`[enhanced-auth] Rate limit invocation failed for ${action}`, error);
  }

  return { allowed: true };
}

// Helper to log security events without throwing errors
async function logSecurityEvent(
  client: any,
  userId: string | null,
  eventType: string,
  eventData: Record<string, unknown>,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  try {
    const { error } = await client.rpc('log_security_event', {
      _user_id: userId,
      _event_type: eventType,
      _event_data: eventData,
      _ip_address: ipAddress,
      _user_agent: userAgent,
    });
    
    if (error) {
      console.warn(`[enhanced-auth] Failed to log security event: ${eventType}`, error);
    }
  } catch (err) {
    console.warn(`[enhanced-auth] Exception logging security event: ${eventType}`, err);
  }
}

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
  captchaToken?: string;
  sessionMetadata?: SessionMetadata;
}

async function verifyCaptcha(
  token: string,
  remoteIp?: string,
  options: { requireSecret?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  if (!TURNSTILE_SECRET) {
    if (options.requireSecret) {
      console.error('[enhanced-auth] TURNSTILE_SECRET missing but required for CAPTCHA verification');
      return { success: false, error: 'auth.captcha_failed' };
    }
    console.warn('TURNSTILE_SECRET not configured - CAPTCHA verification disabled');
    return { success: true }; // Allow in dev if not configured
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
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

function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 10) {
    return { valid: false, error: 'auth.password_too_short' };
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, error: 'auth.password_weak' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[enhanced-auth] Missing Supabase URL or anon key');
      return new Response(
        JSON.stringify({ error: 'CONFIGURATION_ERROR', messageKey: 'common.something_went_wrong' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        const normalizedEmail = email.toLowerCase().trim();
        const metadataDeviceId = sessionMetadata?.deviceId?.trim() || 'unknown';
        const metadataUserAgent = sessionMetadata?.userAgent || userAgent;
        const metadataIp = sessionMetadata?.ipAddress || clientIp;
        const stayConnectedPreference = sessionMetadata?.stayConnected ?? false;

        const loginRateLimit = await enforceRateLimit(supabaseClient, {
          action: 'auth_login',
          userId: normalizedEmail,
          ip: clientIp,
        });

        if (!loginRateLimit.allowed) {
          await logSecurityEvent(
            supabaseClient,
            null,
            'login_rate_limited',
            {
              email: normalizedEmail,
              remaining: loginRateLimit.remaining ?? 0,
              identifierType: loginRateLimit.identifierType ?? 'ip',
            },
            metadataIp,
            metadataUserAgent
          );

          const responseHeaders: Record<string, string> = {
            ...corsHeaders,
            'Content-Type': 'application/json',
          };
          
          if (loginRateLimit.retryAfter) {
            responseHeaders['Retry-After'] = loginRateLimit.retryAfter.toString();
          }

          return new Response(
            JSON.stringify({
              error: 'RATE_LIMIT',
              messageKey: 'common.rate_limit',
              retryAfter: loginRateLimit.retryAfter,
            }),
            {
              status: 429,
              headers: responseHeaders,
            }
          );
        }

        const attemptWindowStartIso = new Date(Date.now() - FAILED_ATTEMPT_WINDOW * 60 * 1000).toISOString();

        const [
          { count: ipFailureCount },
          { count: deviceFailureCount },
          { count: comboFailureCount },
        ] = await Promise.all([
          supabaseClient
            .from('failed_login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('ip_address', clientIp)
            .gte('attempted_at', attemptWindowStartIso),
          supabaseClient
            .from('failed_login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('device_id', metadataDeviceId)
            .gte('attempted_at', attemptWindowStartIso),
          supabaseClient
            .from('failed_login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .eq('ip_address', clientIp)
            .eq('device_id', metadataDeviceId)
            .gte('attempted_at', attemptWindowStartIso),
        ]);

        const combinedFailureCount = Math.max(
          ipFailureCount ?? 0,
          deviceFailureCount ?? 0,
          comboFailureCount ?? 0,
        );

        if (combinedFailureCount >= MAX_FAILED_ATTEMPTS) {
          await supabaseClient
            .from('captcha_requirements')
            .upsert({
              email: normalizedEmail,
              required_until: new Date(Date.now() + CAPTCHA_LOCKOUT_DURATION * 60 * 1000).toISOString(),
              reason: 'rate_limit_vector',
            }, { onConflict: 'email' });

          return new Response(
            JSON.stringify({
              error: 'RATE_LIMIT',
              messageKey: 'common.rate_limit',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: captchaRequired } = await supabaseClient
          .rpc('is_captcha_required', { _email: normalizedEmail });

        if (captchaRequired) {
          if (!captchaToken || typeof captchaToken !== 'string') {
            return new Response(
              JSON.stringify({
                error: 'CAPTCHA_REQUIRED',
                messageKey: 'auth.captcha_failed',
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const captchaResult = await verifyCaptcha(captchaToken, clientIp);
          if (!captchaResult.success) {
            return new Response(
              JSON.stringify({
                error: 'CAPTCHA_FAILED',
                messageKey: captchaResult.error,
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: normalizedEmail,
          password: password!,
        });

        if (authError) {
          await supabaseClient
            .from('failed_login_attempts')
            .insert({
              email: normalizedEmail,
              ip_address: clientIp,
              user_agent: userAgent,
              device_id: metadataDeviceId,
              failure_reason: authError.message,
              attempted_at: new Date().toISOString(),
            });

          const { data: emailFailureCount } = await supabaseClient
            .rpc('get_failed_login_count', { _email: normalizedEmail, _minutes: FAILED_ATTEMPT_WINDOW });

          const [
            { count: updatedIpFailures },
            { count: updatedDeviceFailures },
            { count: updatedComboFailures },
          ] = await Promise.all([
            supabaseClient
              .from('failed_login_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('ip_address', clientIp)
              .gte('attempted_at', attemptWindowStartIso),
            supabaseClient
              .from('failed_login_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('device_id', metadataDeviceId)
              .gte('attempted_at', attemptWindowStartIso),
            supabaseClient
              .from('failed_login_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('email', normalizedEmail)
              .eq('ip_address', clientIp)
              .eq('device_id', metadataDeviceId)
              .gte('attempted_at', attemptWindowStartIso),
          ]);

          const exceededThreshold = [
            emailFailureCount ?? 0,
            updatedIpFailures ?? 0,
            updatedDeviceFailures ?? 0,
            updatedComboFailures ?? 0,
          ].some((count) => count >= MAX_FAILED_ATTEMPTS);

          if (exceededThreshold) {
            await supabaseClient
              .from('captcha_requirements')
              .upsert({
                email: normalizedEmail,
                required_until: new Date(Date.now() + CAPTCHA_LOCKOUT_DURATION * 60 * 1000).toISOString(),
                reason: 'multiple_failed_attempts',
              }, { onConflict: 'email' });

            // Return logical error but with 200 status so the frontend can handle it
            return new Response(
              JSON.stringify({
                error: 'ACCOUNT_LOCKED',
                messageKey: 'auth.account_locked',
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Invalid credentials: handled as business error with 200 status to avoid runtime overlay
          return new Response(
            JSON.stringify({
              error: 'INVALID_CREDENTIALS',
              messageKey: 'auth.invalid_credentials',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!authData?.user || !authData.session) {
          return new Response(
            JSON.stringify({
              error: 'INVALID_RESPONSE',
              messageKey: 'common.something_went_wrong',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const refreshToken = generateRefreshToken();
        const tokenHash = await hashToken(refreshToken);
        const sessionExpiresAt = new Date(Date.now() + (stayConnectedPreference ? REFRESH_TTL_LONG : REFRESH_TTL_SHORT));

        const { count: sessionCount } = await supabaseClient
          .from('auth_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authData.user.id)
          .is('revoked_at', null);

        if (sessionCount && sessionCount >= SESSION_MAX_PER_USER) {
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

        const sessionWindowStartIso = new Date(Date.now() - SESSION_CREATION_WINDOW_MINUTES * 60 * 1000).toISOString();
        const { count: recentSessionCount } = await supabaseClient
          .from('auth_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authData.user.id)
          .gte('created_at', sessionWindowStartIso);

        if ((recentSessionCount ?? 0) >= SESSION_CREATION_MAX_PER_WINDOW) {
          await supabaseClient
            .rpc('log_security_event', {
              _user_id: authData.user.id,
              _event_type: 'session_rate_limited',
              _event_data: { windowMinutes: SESSION_CREATION_WINDOW_MINUTES },
              _ip_address: metadataIp,
              _user_agent: metadataUserAgent,
            });

          return new Response(
            JSON.stringify({
              error: 'RATE_LIMIT',
              messageKey: 'common.rate_limit',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const now = new Date();
        await supabaseClient
          .from('auth_sessions')
          .insert({
            user_id: authData.user.id,
            token_hash: tokenHash,
            device_id: metadataDeviceId,
            user_agent: metadataUserAgent,
            ip_address: metadataIp,
            created_at: now.toISOString(),
            expires_at: sessionExpiresAt.toISOString(),
            last_refreshed_at: now.toISOString(),
            stay_connected: stayConnectedPreference,
          });

        await supabaseClient
          .rpc('log_security_event', {
            _user_id: authData.user.id,
            _event_type: 'login_success',
            _event_data: { deviceId: metadataDeviceId },
            _ip_address: metadataIp,
            _user_agent: metadataUserAgent,
          });

        return new Response(
          JSON.stringify({
            user: authData.user,
            session: authData.session,
            refreshToken,
            expiresAt: sessionExpiresAt.toISOString(),
            stayConnected: stayConnectedPreference,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refresh-session': {
        const { refreshToken, sessionMetadata }: { refreshToken?: string; sessionMetadata?: SessionMetadata } = await req.json();

        if (!refreshToken || typeof refreshToken !== 'string') {
          return new Response(
            JSON.stringify({ error: 'INVALID_REQUEST', messageKey: 'common.something_went_wrong' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokenHash = await hashToken(refreshToken);
        const { data: sessionRecord } = await supabaseClient
          .from('auth_sessions')
          .select('id, user_id, device_id, user_agent, ip_address, expires_at, revoked_at, last_refreshed_at, stay_connected')
          .eq('token_hash', tokenHash)
          .limit(1)
          .single();

        if (!sessionRecord || sessionRecord.revoked_at) {
          // Return 200 with error object to avoid runtime error overlay
          return new Response(
            JSON.stringify({ error: 'INVALID_REFRESH_TOKEN', messageKey: 'common.unauthorized' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const refreshRateLimit = await enforceRateLimit(supabaseClient, {
          action: 'auth_refresh',
          userId: sessionRecord.user_id,
          ip: sessionMetadata?.ipAddress || clientIp,
        });

        if (!refreshRateLimit.allowed) {
          await logSecurityEvent(
            supabaseClient,
            sessionRecord.user_id,
            'refresh_rate_limited',
            {
              sessionId: sessionRecord.id,
              remaining: refreshRateLimit.remaining ?? 0,
              identifierType: refreshRateLimit.identifierType ?? 'ip',
            },
            sessionMetadata?.ipAddress || clientIp,
            sessionMetadata?.userAgent || userAgent
          );

          const responseHeaders: Record<string, string> = {
            ...corsHeaders,
            'Content-Type': 'application/json',
          };
          
          if (refreshRateLimit.retryAfter) {
            responseHeaders['Retry-After'] = refreshRateLimit.retryAfter.toString();
          }

          return new Response(
            JSON.stringify({
              error: 'RATE_LIMIT',
              messageKey: 'common.rate_limit',
              retryAfter: refreshRateLimit.retryAfter,
            }),
            {
              status: 429,
              headers: responseHeaders,
            }
          );
        }

        const now = new Date();
        const sessionExpiry = new Date(sessionRecord.expires_at);

        if (sessionExpiry.getTime() <= now.getTime()) {
          await supabaseClient
            .from('auth_sessions')
            .update({ revoked_at: now.toISOString() })
            .eq('id', sessionRecord.id);

          await supabaseClient
            .rpc('log_security_event', {
              _user_id: sessionRecord.user_id,
              _event_type: 'refresh_token_expired',
              _event_data: { sessionId: sessionRecord.id },
              _ip_address: sessionMetadata?.ipAddress || clientIp,
              _user_agent: sessionMetadata?.userAgent || userAgent,
            });

          // Return 200 with error object to avoid runtime error overlay
          return new Response(
            JSON.stringify({ error: 'REFRESH_TOKEN_EXPIRED', messageKey: 'auth.session_revoked' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (sessionRecord.last_refreshed_at) {
          const lastRefreshedAt = new Date(sessionRecord.last_refreshed_at);
          if (now.getTime() - lastRefreshedAt.getTime() < REFRESH_MIN_ROTATION_INTERVAL) {
            return new Response(
              JSON.stringify({ error: 'RATE_LIMIT', messageKey: 'common.rate_limit' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
          const bearerToken = authHeader.replace('Bearer ', '');
          const { data: { user: authUser } = { user: null } } = await supabaseClient.auth.getUser(bearerToken);
          if (!authUser || authUser.id !== sessionRecord.user_id) {
            // Return 200 with error object to avoid runtime error overlay
            return new Response(
              JSON.stringify({ error: 'UNAUTHORIZED', messageKey: 'common.unauthorized' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        const stayConnected = sessionMetadata?.stayConnected ?? sessionRecord.stay_connected ?? false;
        const newRefreshToken = generateRefreshToken();
        const newTokenHash = await hashToken(newRefreshToken);
        const newExpiryDate = new Date(now.getTime() + (stayConnected ? REFRESH_TTL_LONG : REFRESH_TTL_SHORT));

        await supabaseClient
          .from('auth_sessions')
          .update({
            token_hash: newTokenHash,
            expires_at: newExpiryDate.toISOString(),
            last_refreshed_at: now.toISOString(),
            stay_connected: stayConnected,
            device_id: sessionMetadata?.deviceId || sessionRecord.device_id,
            user_agent: sessionMetadata?.userAgent || sessionRecord.user_agent,
            ip_address: sessionMetadata?.ipAddress || sessionRecord.ip_address,
          })
          .eq('id', sessionRecord.id);

        await supabaseClient
          .rpc('log_security_event', {
            _user_id: sessionRecord.user_id,
            _event_type: 'refresh_token_rotated',
            _event_data: { sessionId: sessionRecord.id },
            _ip_address: sessionMetadata?.ipAddress || clientIp,
            _user_agent: sessionMetadata?.userAgent || userAgent,
          });

        return new Response(
          JSON.stringify({
            refreshToken: newRefreshToken,
            expiresAt: newExpiryDate.toISOString(),
            stayConnected,
            sessionId: sessionRecord.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate-signup': {
        const { email, password, captchaToken } = await req.json();
        
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        const signupRateLimit = await enforceRateLimit(supabaseClient, {
          action: 'auth_signup',
          userId: normalizedEmail,
          ip: clientIp,
        });

        if (!signupRateLimit.allowed) {
          await logSecurityEvent(
            supabaseClient,
            null,
            'signup_rate_limited',
            {
              email: normalizedEmail,
              remaining: signupRateLimit.remaining ?? 0,
              identifierType: signupRateLimit.identifierType ?? 'ip',
            },
            clientIp,
            userAgent
          );

          const responseHeaders: Record<string, string> = {
            ...corsHeaders,
            'Content-Type': 'application/json',
          };
          
          if (signupRateLimit.retryAfter) {
            responseHeaders['Retry-After'] = signupRateLimit.retryAfter.toString();
          }

          return new Response(
            JSON.stringify({
              error: 'RATE_LIMIT',
              messageKey: 'common.rate_limit',
              retryAfter: signupRateLimit.retryAfter,
            }),
            {
              status: 429,
              headers: responseHeaders,
            }
          );
        }
        
        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ 
              error: 'WEAK_PASSWORD', 
              messageKey: passwordValidation.error 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!captchaToken || typeof captchaToken !== 'string') {
          return new Response(
            JSON.stringify({
              error: 'CAPTCHA_REQUIRED',
              messageKey: 'auth.captcha_failed',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify CAPTCHA
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

        // Check rate limiting for signup attempts from this IP
        const { data: recentSignups } = await supabaseClient
          .from('failed_login_attempts')
          .select('*')
          .eq('ip_address', clientIp)
          .gte('attempted_at', new Date(Date.now() - SIGNUP_RATE_LIMIT_WINDOW * 60 * 1000).toISOString())
          .limit(MAX_SIGNUP_ATTEMPTS);
        
        if (recentSignups && recentSignups.length >= MAX_SIGNUP_ATTEMPTS) {
          return new Response(
            JSON.stringify({ 
              error: 'RATE_LIMIT', 
              messageKey: 'common.rate_limit' 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Log security event for signup validation
        await supabaseClient
          .from('security_events')
          .insert({
            event_type: 'signup_validation',
            event_data: { email: normalizedEmail },
            ip_address: clientIp,
            user_agent: userAgent,
          });
        
        return new Response(
          JSON.stringify({ 
            valid: true,
            messageKey: 'auth.validation_passed' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'request-password-reset': {
        const { email, captchaToken }: { email?: string; captchaToken?: string } = await req.json();

        const normalizedEmail = email?.toLowerCase().trim();
        if (!normalizedEmail) {
          return new Response(
            JSON.stringify({ error: 'INVALID_REQUEST', messageKey: 'common.invalid_request' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!captchaToken || typeof captchaToken !== 'string') {
          return new Response(
            JSON.stringify({ error: 'CAPTCHA_REQUIRED', messageKey: 'auth.captcha_failed', shouldResetCaptcha: true }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordResetRateLimit = await enforceRateLimit(supabaseClient, {
          action: 'auth_password_reset',
          userId: normalizedEmail,
          ip: clientIp,
        });

        if (!passwordResetRateLimit.allowed) {
          await logSecurityEvent(
            supabaseClient,
            null,
            'password_reset_rate_limited',
            {
              email: normalizedEmail,
              remaining: passwordResetRateLimit.remaining ?? 0,
              identifierType: passwordResetRateLimit.identifierType ?? 'ip',
            },
            clientIp,
            userAgent
          );

          const responseHeaders: Record<string, string> = {
            ...corsHeaders,
            'Content-Type': 'application/json',
          };
          
          if (passwordResetRateLimit.retryAfter) {
            responseHeaders['Retry-After'] = passwordResetRateLimit.retryAfter.toString();
          }

          return new Response(
            JSON.stringify({
              error: 'RATE_LIMIT',
              messageKey: 'common.rate_limit',
              retryAfter: passwordResetRateLimit.retryAfter,
            }),
            {
              status: 429,
              headers: responseHeaders,
            }
          );
        }

        if (!SKIP_TURNSTILE_FOR_PASSWORD_RESET) {
          const passwordResetCaptchaResult = await verifyCaptcha(captchaToken, clientIp, { requireSecret: true });
          if (!passwordResetCaptchaResult.success) {
            return new Response(
              JSON.stringify({
                error: passwordResetCaptchaResult.error ?? 'auth.captcha_failed',
                messageKey: passwordResetCaptchaResult.error ?? 'auth.captcha_failed',
                shouldResetCaptcha: true,
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.warn('[enhanced-auth] Skipping Turnstile verification for password reset (SKIP_TURNSTILE_FOR_PASSWORD_RESET=true)');
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[enhanced-auth] Missing SUPABASE_SERVICE_ROLE_KEY for password reset');
          return new Response(
            JSON.stringify({ error: 'MISSING_SERVICE_ROLE', messageKey: 'auth.reset_password_failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        if (!APP_URL) {
          console.error('[enhanced-auth] NEXT_PUBLIC_APP_URL must be configured for password reset redirects');
          return new Response(
            JSON.stringify({ error: 'MISSING_APP_URL', messageKey: 'auth.reset_password_failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const redirectTarget = `${APP_URL.replace(/\/$/, '')}/auth/update-password`;

        try {
          const { error: resetError } = await supabaseServiceClient.auth.resetPasswordForEmail(
            normalizedEmail,
            { redirectTo: redirectTarget }
          );

          if (resetError) {
            console.error('[enhanced-auth] Password reset request failed', resetError);
            return new Response(
              JSON.stringify({ error: resetError.message ?? 'auth.reset_password_failed', messageKey: 'auth.reset_password_failed' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.error('[enhanced-auth] Password reset request threw', error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'auth.reset_password_failed', messageKey: 'auth.reset_password_failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logSecurityEvent(
          supabaseClient,
          null,
          'password_reset_requested',
          { email: normalizedEmail },
          clientIp,
          userAgent
        );

        return new Response(
          JSON.stringify({ success: true, messageKey: 'auth.forgot_password_success' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          .select('id, device_id, user_agent, ip_address, created_at, expires_at, last_refreshed_at, stay_connected')
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
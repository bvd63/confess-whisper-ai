import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIp } from "../_shared/request-ip.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";
import { checkLoginRateLimitFailOpen } from "./login-rate-limit.ts";

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
const INTERNAL_JOB_SECRET = Deno.env.get('INTERNAL_JOB_SECRET') ?? '';
const APP_URL = (Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '').trim();
const SKIP_TURNSTILE_FOR_PASSWORD_RESET = Deno.env.get('SKIP_TURNSTILE_FOR_PASSWORD_RESET') === 'true';
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET')
  ?? Deno.env.get('TURNSTILE_SECRET_KEY')
  ?? '';

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

interface RateLimitInvokeErrorDetails {
  status?: number;
  code?: string;
  body?: string;
  message?: string;
}

function extractRateLimitInvokeErrorDetails(result: any): RateLimitInvokeErrorDetails {
  const error = result?.error as any;
  const context = error?.context as any;

  const status = typeof context?.status === 'number'
    ? context.status
    : undefined;

  let body: string | undefined;
  if (typeof context?.body === 'string') {
    body = context.body;
  } else if (context?.body != null) {
    try {
      body = JSON.stringify(context.body);
    } catch {
      body = String(context.body);
    }
  }

  let code: string | undefined;
  if (result?.data && typeof result.data === 'object' && typeof (result.data as any).error === 'string') {
    code = (result.data as any).error;
  }

  if (!code && body) {
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed?.error === 'string') {
        code = parsed.error;
      }
    } catch {
      // no-op
    }
  }

  return {
    status,
    code,
    body,
    message: typeof error?.message === 'string' ? error.message : undefined,
  };
}

function isRateLimitUnavailableError(details: RateLimitInvokeErrorDetails): boolean {
  if (details.code === 'RATE_LIMIT_UNAVAILABLE') {
    return true;
  }

  if (typeof details.status === 'number' && details.status >= 400) {
    return true;
  }

  const combined = `${details.message ?? ''} ${details.body ?? ''}`.toLowerCase();
  return combined.includes('timeout')
    || combined.includes('timed out')
    || combined.includes('unavailable')
    || combined.includes('failed to fetch')
    || combined.includes('network');
}

async function enforceRateLimit(
  client: any,
  {
    action,
    ip,
  }: {
    action: string;
    ip?: string | null;
  },
  options: { failClosed?: boolean; failOpenOnUnavailable?: boolean } = {},
): Promise<RateLimitCheckResult> {
  const { failClosed = false, failOpenOnUnavailable = false } = options;

  if (!client) {
    return failClosed ? { allowed: false } : { allowed: true };
  }

  if (!ip) {
    return failClosed ? { allowed: false } : { allowed: true };
  }

  try {
    const result = await client.functions.invoke('rate-limit', {
      body: {
        action,
        ip: ip ?? undefined,
      },
      headers: INTERNAL_JOB_SECRET
        ? { 'x-internal-secret': INTERNAL_JOB_SECRET }
        : undefined,
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
      const details = extractRateLimitInvokeErrorDetails(result);
      const isUnavailable = isRateLimitUnavailableError(details);

      if (failOpenOnUnavailable && isUnavailable) {
        console.warn(`[enhanced-auth] Rate limit unavailable for ${action}; allowing request`, {
          status: details.status,
          code: details.code,
          body: details.body,
          message: details.message,
        });
        return { allowed: true };
      }

      console.warn(`[enhanced-auth] Rate limit error for ${action}`, {
        status: details.status,
        code: details.code,
        body: details.body,
        message: details.message,
      });
      if (failClosed) {
        return { allowed: false };
      }
    }
  } catch (error) {
    if (failOpenOnUnavailable) {
      console.error(`[enhanced-auth] Rate limit invocation failed for ${action}; allowing request`, {
        message: error instanceof Error ? error.message : String(error),
      });
      return { allowed: true };
    }

    console.error(`[enhanced-auth] Rate limit invocation failed for ${action}`, error);
    if (failClosed) {
      return { allowed: false };
    }
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
  void options;
  if (!TURNSTILE_SECRET) {
    console.error('[enhanced-auth] TURNSTILE_SECRET missing for CAPTCHA verification');
    return { success: false, error: 'auth.captcha_failed' };
  }

  try {
    const response = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: remoteIp,
      }),
    }, 10_000);

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

const buildSafeThrottleResponse = (status: 429 | 403 = 429) =>
  new Response(
    JSON.stringify({
      error: 'RATE_LIMIT',
      messageKey: 'common.rate_limit',
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[enhanced-auth] Missing Supabase URL, anon key, or service role key');
      return new Response(
        JSON.stringify({ error: 'CONFIGURATION_ERROR', messageKey: 'common.something_went_wrong' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Security-critical auth telemetry/session tables are service-role scoped by DB policy hardening.
    // Use service client for all reads/writes on those tables to avoid silent RLS failures.
    const supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const clientIp = getClientIp(req);
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

        let loginRateLimit: Awaited<ReturnType<typeof checkLoginRateLimitFailOpen>> = {
          denied: false,
          unavailable: true,
        };

        try {
          loginRateLimit = await checkLoginRateLimitFailOpen({
            supabaseUrl: SUPABASE_URL,
            internalJobSecret: INTERNAL_JOB_SECRET,
            authorizationHeader: req.headers.get('Authorization'),
            action: 'auth_login',
            ip: clientIp,
            timeoutMs: 1200,
          });
        } catch {
          console.warn('[enhanced-auth] rate-limit check failed; blocking login safely');
          return buildSafeThrottleResponse(429);
        }

        if (loginRateLimit.unavailable) {
          console.warn('[enhanced-auth] rate-limit unavailable; blocking login safely');
          return buildSafeThrottleResponse(429);
        } else if (loginRateLimit.denied) {

          await logSecurityEvent(
            supabaseAdminClient,
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
          { count: ipFailureCount, error: ipFailureCountError },
          { count: deviceFailureCount, error: deviceFailureCountError },
          { count: comboFailureCount, error: comboFailureCountError },
        ] = await Promise.all([
          supabaseAdminClient
            .from('failed_login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('ip_address', clientIp)
            .gte('attempted_at', attemptWindowStartIso),
          supabaseAdminClient
            .from('failed_login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('device_id', metadataDeviceId)
            .gte('attempted_at', attemptWindowStartIso),
          supabaseAdminClient
            .from('failed_login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .eq('ip_address', clientIp)
            .eq('device_id', metadataDeviceId)
            .gte('attempted_at', attemptWindowStartIso),
        ]);

        if (ipFailureCountError || deviceFailureCountError || comboFailureCountError) {
          console.error('[enhanced-auth] failed to read failed_login_attempts counters', {
            ipFailureCountError,
            deviceFailureCountError,
            comboFailureCountError,
          });
          return buildSafeThrottleResponse(429);
        }

        const combinedFailureCount = Math.max(
          ipFailureCount ?? 0,
          deviceFailureCount ?? 0,
          comboFailureCount ?? 0,
        );

        if (combinedFailureCount >= MAX_FAILED_ATTEMPTS) {
          const { error: captchaStateWriteError } = await supabaseAdminClient
            .from('captcha_requirements')
            .upsert({
              email: normalizedEmail,
              required_until: new Date(Date.now() + CAPTCHA_LOCKOUT_DURATION * 60 * 1000).toISOString(),
              reason: 'rate_limit_vector',
            }, { onConflict: 'email' });

          if (captchaStateWriteError) {
            console.error('[enhanced-auth] failed to persist captcha lockout state', captchaStateWriteError);
            return buildSafeThrottleResponse(429);
          }

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

          const captchaResult = await verifyCaptcha(captchaToken, clientIp, { requireSecret: true });
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
          const { error: failedAttemptPersistError } = await supabaseAdminClient
            .from('failed_login_attempts')
            .insert({
              email: normalizedEmail,
              ip_address: clientIp,
              user_agent: userAgent,
              device_id: metadataDeviceId,
              failure_reason: authError.message,
              attempted_at: new Date().toISOString(),
            });

          if (failedAttemptPersistError) {
            console.error('[enhanced-auth] failed to persist failed login attempt', failedAttemptPersistError);
            return buildSafeThrottleResponse(429);
          }

          const { data: emailFailureCount, error: emailFailureCountError } = await supabaseAdminClient
            .rpc('get_failed_login_count', { _email: normalizedEmail, _minutes: FAILED_ATTEMPT_WINDOW });

          if (emailFailureCountError) {
            console.error('[enhanced-auth] failed to load email failure count', emailFailureCountError);
            return buildSafeThrottleResponse(429);
          }

          const [
            { count: updatedIpFailures, error: updatedIpFailuresError },
            { count: updatedDeviceFailures, error: updatedDeviceFailuresError },
            { count: updatedComboFailures, error: updatedComboFailuresError },
          ] = await Promise.all([
            supabaseAdminClient
              .from('failed_login_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('ip_address', clientIp)
              .gte('attempted_at', attemptWindowStartIso),
            supabaseAdminClient
              .from('failed_login_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('device_id', metadataDeviceId)
              .gte('attempted_at', attemptWindowStartIso),
            supabaseAdminClient
              .from('failed_login_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('email', normalizedEmail)
              .eq('ip_address', clientIp)
              .eq('device_id', metadataDeviceId)
              .gte('attempted_at', attemptWindowStartIso),
          ]);

          if (updatedIpFailuresError || updatedDeviceFailuresError || updatedComboFailuresError) {
            console.error('[enhanced-auth] failed to refresh failed_login_attempt counters', {
              updatedIpFailuresError,
              updatedDeviceFailuresError,
              updatedComboFailuresError,
            });
            return buildSafeThrottleResponse(429);
          }

          const exceededThreshold = [
            emailFailureCount ?? 0,
            updatedIpFailures ?? 0,
            updatedDeviceFailures ?? 0,
            updatedComboFailures ?? 0,
          ].some((count) => count >= MAX_FAILED_ATTEMPTS);

          if (exceededThreshold) {
            const { error: captchaStateWriteError } = await supabaseAdminClient
              .from('captcha_requirements')
              .upsert({
                email: normalizedEmail,
                required_until: new Date(Date.now() + CAPTCHA_LOCKOUT_DURATION * 60 * 1000).toISOString(),
                reason: 'multiple_failed_attempts',
              }, { onConflict: 'email' });

            if (captchaStateWriteError) {
              console.error('[enhanced-auth] failed to persist captcha escalation state', captchaStateWriteError);
              return buildSafeThrottleResponse(429);
            }

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

        const { count: sessionCount } = await supabaseAdminClient
          .from('auth_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authData.user.id)
          .is('revoked_at', null);

        if (sessionCount && sessionCount >= SESSION_MAX_PER_USER) {
          const { data: oldestSession } = await supabaseAdminClient
            .from('auth_sessions')
            .select('id')
            .eq('user_id', authData.user.id)
            .is('revoked_at', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (oldestSession) {
            await supabaseAdminClient
              .from('auth_sessions')
              .update({ revoked_at: new Date().toISOString() })
              .eq('id', oldestSession.id);
          }
        }

        const sessionWindowStartIso = new Date(Date.now() - SESSION_CREATION_WINDOW_MINUTES * 60 * 1000).toISOString();
        const { count: recentSessionCount } = await supabaseAdminClient
          .from('auth_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authData.user.id)
          .gte('created_at', sessionWindowStartIso);

        if ((recentSessionCount ?? 0) >= SESSION_CREATION_MAX_PER_WINDOW) {
          await supabaseAdminClient
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
        await supabaseAdminClient
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

        await supabaseAdminClient
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
        const { data: sessionRecord } = await supabaseAdminClient
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
          ip: sessionMetadata?.ipAddress || clientIp,
        }, { failClosed: true });

        if (!refreshRateLimit.allowed) {
          if (refreshRateLimit.retryAfter == null && refreshRateLimit.remaining === undefined) {
            return new Response(
              JSON.stringify({
                error: 'RATE_LIMIT_UNAVAILABLE',
                messageKey: 'common.something_went_wrong',
              }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          await logSecurityEvent(
            supabaseAdminClient,
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
          await supabaseAdminClient
            .from('auth_sessions')
            .update({ revoked_at: now.toISOString() })
            .eq('id', sessionRecord.id);

          await supabaseAdminClient
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

        await supabaseAdminClient
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

        await supabaseAdminClient
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
          ip: clientIp,
        }, { failClosed: true });

        if (!signupRateLimit.allowed) {
          if (signupRateLimit.retryAfter == null && signupRateLimit.remaining === undefined) {
            return new Response(
              JSON.stringify({
                error: 'RATE_LIMIT_UNAVAILABLE',
                messageKey: 'common.something_went_wrong',
              }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          await logSecurityEvent(
            supabaseAdminClient,
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
        const captchaResult = await verifyCaptcha(captchaToken, clientIp, { requireSecret: true });
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
        const { data: recentSignups } = await supabaseAdminClient
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
        await supabaseAdminClient
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
        const { email, captchaToken, turnstileToken }: { email?: string; captchaToken?: string; turnstileToken?: string } = await req.json();
        const captchaTokenFromBody = typeof turnstileToken === 'string' && turnstileToken.trim()
          ? turnstileToken
          : captchaToken;
        const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
        const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' } as Record<string, string>;

        if (!normalizedEmail) {
          return new Response(
            JSON.stringify({ error: 'INVALID_REQUEST', messageKey: 'common.invalid_request' }),
            { status: 400, headers: responseHeaders }
          );
        }

        const passwordResetRateLimit = await enforceRateLimit(supabaseClient, {
          action: 'auth_password_reset',
          ip: clientIp,
        }, { failClosed: true });

        if (!passwordResetRateLimit.allowed) {
          if (passwordResetRateLimit.retryAfter == null && passwordResetRateLimit.remaining === undefined) {
            return new Response(
              JSON.stringify({
                error: 'RATE_LIMIT_UNAVAILABLE',
                messageKey: 'common.something_went_wrong',
              }),
              { status: 503, headers: responseHeaders }
            );
          }

          await logSecurityEvent(
            supabaseAdminClient,
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

          if (passwordResetRateLimit.retryAfter) {
            responseHeaders['Retry-After'] = passwordResetRateLimit.retryAfter.toString();
          }

          return new Response(
            JSON.stringify({
              rate_limited: true,
              retry_after: passwordResetRateLimit.retryAfter,
              messageKey: 'auth.reset_rate_limited',
            }),
            { status: 429, headers: responseHeaders }
          );
        }

        let captchaRequired = false;
        try {
          const { data } = await supabaseClient
            .rpc('is_captcha_required', { _email: normalizedEmail });
          captchaRequired = Boolean(data);
        } catch (err) {
          console.warn('[enhanced-auth] Failed to determine CAPTCHA requirement', err);
        }

        if (captchaRequired && !captchaTokenFromBody) {
          return new Response(
            JSON.stringify({
              captchaRequired: true,
              messageKey: 'auth.captcha_required',
            }),
            { status: 200, headers: responseHeaders }
          );
        }

        if (captchaRequired && captchaTokenFromBody) {
          if (!SKIP_TURNSTILE_FOR_PASSWORD_RESET) {
            const passwordResetCaptchaResult = await verifyCaptcha(captchaTokenFromBody, clientIp, { requireSecret: true });
            if (!passwordResetCaptchaResult.success) {
              return new Response(
                JSON.stringify({
                  captchaFailed: true,
                  messageKey: 'auth.captcha_failed',
                  shouldResetCaptcha: true,
                }),
                { status: 200, headers: responseHeaders }
              );
            }
          } else {
            console.warn('[enhanced-auth] Skipping Turnstile verification for password reset (SKIP_TURNSTILE_FOR_PASSWORD_RESET=true)');
          }
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[enhanced-auth] Missing SUPABASE_SERVICE_ROLE_KEY for password reset');
          return new Response(
            JSON.stringify({ success: false, messageKey: 'auth.reset_password_failed' }),
            { status: 500, headers: responseHeaders }
          );
        }

        const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const resetTokenTtlMs = 15 * 60 * 1000;
        const expiresAt = new Date(Date.now() + resetTokenTtlMs).toISOString();
        const rawToken = generateRefreshToken();
        const tokenHash = await hashToken(rawToken);

        let userId: string | null = null;

        try {
          const adminUrl = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}`;
          const adminResponse = await fetchWithTimeout(adminUrl, {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
          }, 10_000);

          if (adminResponse.ok) {
            const adminBody = await adminResponse.json();
            const foundUser = Array.isArray(adminBody?.users)
              ? adminBody.users.find((u: any) => u.email?.toLowerCase() === normalizedEmail)
              : null;
            userId = foundUser?.id ?? null;
          } else {
            console.warn('[enhanced-auth] Failed admin user lookup for password reset', await adminResponse.text());
          }
        } catch (err) {
          console.warn('[enhanced-auth] Exception during user lookup for password reset', err);
        }

        if (userId) {
          try {
            const { error: insertError } = await supabaseServiceClient
              .from('password_reset_tokens')
              .insert({
                user_id: userId,
                token_hash: tokenHash,
                expires_at: expiresAt,
                requested_ip: clientIp,
              });

            if (insertError) {
              console.error('[enhanced-auth] Failed to store password reset token', insertError);
            }
          } catch (err) {
            console.error('[enhanced-auth] Exception storing password reset token', err);
          }

          try {
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            const fromAddress = Deno.env.get('PASSWORD_RESET_FROM_EMAIL')
              ?? Deno.env.get('SUPPORT_FROM_EMAIL')
              ?? 'ConfessAI <no-reply@confess.ai>';

            if (!APP_URL) {
              console.error('[enhanced-auth] NEXT_PUBLIC_APP_URL must be configured for password reset links');
            } else if (resendApiKey) {
              const resetLink = `${APP_URL.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
              const subject = 'Reset your ConfessAI password';
              const textBody = [
                'You requested a password reset for ConfessAI.',
                'Use this link to set a new password (valid for 15 minutes):',
                resetLink,
                '',
                'If you did not request this, you can ignore this email.',
              ].join('\n\n');

              const htmlBody = `<!doctype html><html><body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a;">
                <h2 style="margin: 0 0 12px; font-size: 18px;">Reset your ConfessAI password</h2>
                <p>Use the link below to set a new password. This link expires in 15 minutes.</p>
                <p><a href="${resetLink}" style="background: #4f46e5; color: white; padding: 10px 16px; border-radius: 999px; text-decoration: none; display: inline-block;">Reset password</a></p>
                <p style="margin-top: 12px; word-break: break-all;">If the button doesn’t work, copy and paste this URL into your browser:<br>${resetLink}</p>
                <p>If you didn’t request this, you can ignore this email.</p>
              </body></html>`;

              const emailResponse = await fetchWithTimeout('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: fromAddress,
                  to: [normalizedEmail],
                  subject,
                  text: textBody,
                  html: htmlBody,
                  tags: [
                    { name: 'source', value: 'password-reset' },
                  ],
                }),
              }, 10_000);

              if (!emailResponse.ok) {
                console.error('[enhanced-auth] Failed to send password reset email', await emailResponse.text());
              }
            } else {
              console.warn('[enhanced-auth] RESEND_API_KEY not configured; password reset email not sent');
            }
          } catch (err) {
            console.error('[enhanced-auth] Exception sending password reset email', err);
          }
        }

        await logSecurityEvent(
            supabaseAdminClient,
          userId,
          'password_reset_requested',
          { email: normalizedEmail },
          clientIp,
          userAgent
        );

        return new Response(
          JSON.stringify({ success: true, messageKey: 'auth.forgot_password_success' }),
          { status: 200, headers: responseHeaders }
        );
      }

      case 'validate-reset-token': {
        const { token }: { token?: string } = await req.json();
        const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' } as Record<string, string>;
        const normalizedToken = typeof token === 'string' ? token.trim() : '';

        if (!normalizedToken || !SUPABASE_SERVICE_ROLE_KEY) {
          return new Response(
            JSON.stringify({ valid: false, messageKey: 'auth.reset_token_invalid' }),
            { status: 400, headers: responseHeaders }
          );
        }

        const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const tokenHash = await hashToken(normalizedToken);

        const { data, error } = await supabaseServiceClient
          .from('password_reset_tokens')
          .select('id, user_id, expires_at, used')
          .eq('token_hash', tokenHash)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[enhanced-auth] Failed to validate reset token', error);
        }

        const tokenRecord = Array.isArray(data) ? data[0] : null;
        const isExpired = tokenRecord?.expires_at ? new Date(tokenRecord.expires_at).getTime() < Date.now() : true;

        if (!tokenRecord || tokenRecord.used || isExpired) {
          return new Response(
            JSON.stringify({ valid: false, messageKey: 'auth.reset_token_invalid' }),
            { status: 400, headers: responseHeaders }
          );
        }

        return new Response(
          JSON.stringify({ valid: true }),
          { status: 200, headers: responseHeaders }
        );
      }

      case 'complete-password-reset': {
        const { token, password }: { token?: string; password?: string } = await req.json();
        const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' } as Record<string, string>;
        const normalizedToken = typeof token === 'string' ? token.trim() : '';

        if (!normalizedToken || typeof password !== 'string') {
          return new Response(
            JSON.stringify({ success: false, invalid_token: true, messageKey: 'auth.reset_token_invalid' }),
            { status: 400, headers: responseHeaders }
          );
        }

        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ success: false, messageKey: passwordValidation.error ?? 'auth.password_weak' }),
            { status: 400, headers: responseHeaders }
          );
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[enhanced-auth] Missing SUPABASE_SERVICE_ROLE_KEY for password reset completion');
          return new Response(
            JSON.stringify({ success: false, messageKey: 'auth.reset_password_error' }),
            { status: 400, headers: responseHeaders }
          );
        }

        const supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const tokenHash = await hashToken(normalizedToken);

        const { data, error } = await supabaseServiceClient
          .from('password_reset_tokens')
          .select('id, user_id, expires_at, used')
          .eq('token_hash', tokenHash)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[enhanced-auth] Failed to load reset token for completion', error);
        }

        const tokenRecord = Array.isArray(data) ? data[0] : null;
        const isExpired = tokenRecord?.expires_at ? new Date(tokenRecord.expires_at).getTime() < Date.now() : true;

        if (!tokenRecord || tokenRecord.used || isExpired || !tokenRecord.user_id) {
          return new Response(
            JSON.stringify({ success: false, invalid_token: true, messageKey: 'auth.reset_token_invalid' }),
            { status: 400, headers: responseHeaders }
          );
        }

        const { error: updateError } = await supabaseServiceClient.auth.admin.updateUserById(tokenRecord.user_id, {
          password,
        });

        if (updateError) {
          console.error('[enhanced-auth] Failed to update password via admin API', updateError);
          return new Response(
            JSON.stringify({ success: false, messageKey: 'auth.reset_password_error' }),
            { status: 400, headers: responseHeaders }
          );
        }

        const nowIso = new Date().toISOString();
        const { error: markUsedError } = await supabaseServiceClient
          .from('password_reset_tokens')
          .update({ used: true, used_at: nowIso })
          .eq('id', tokenRecord.id);

        if (markUsedError) {
          console.warn('[enhanced-auth] Failed to mark reset token as used', markUsedError);
        }

        await logSecurityEvent(
          supabaseServiceClient,
          tokenRecord.user_id,
          'password_reset_completed',
          { token_id: tokenRecord.id },
          clientIp,
          userAgent
        );

        return new Response(
          JSON.stringify({ success: true, messageKey: 'auth.reset_password_success' }),
          { status: 200, headers: responseHeaders }
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

        await supabaseAdminClient
          .from('auth_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        await supabaseAdminClient
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

        const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { error: revokeAllError } = await authedClient
          .rpc('revoke_all_user_sessions', { _user_id: user.id });
        if (revokeAllError) {
          return new Response(
            JSON.stringify({ error: 'INTERNAL_ERROR', messageKey: 'common.something_went_wrong' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseAdminClient
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

        const { data: sessions } = await supabaseAdminClient
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
import { Page, Route } from '@playwright/test';
import subscriptionFixturesRaw from '../fixtures/users/subscriptions.json' assert { type: 'json' };
const subscriptionFixtures: any = subscriptionFixturesRaw as any;

type UserFixtureKey = string;

// Create a safe default user if a key is missing in fixtures
function defaultUser(fixtureUserKey: string) {
  const id = `e2e-${fixtureUserKey || 'user'}`;
  return {
    id,
    email: `${fixtureUserKey || 'user'}@e2e.local`,
    subscription_tier: 'free',
    is_premium: false,
    is_vip: false,
    subscription_status: null,
    subscription_ends_at: null,
    trial_active: false,
    trial_end_date: null,
    user_metadata: {},
    app_metadata: {},
  };
}

function fulfillOptions(route: Route) {
  return route.fulfill({
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
  });
}

/**
 * Programmatic login helper for E2E tests
 * Sets up auth state without real backend calls
 */
export async function loginAs(page: Page, fixtureUserKey: UserFixtureKey) {
  const userData = subscriptionFixtures[fixtureUserKey] ?? defaultUser(fixtureUserKey);

  // Ensure Supabase sees a valid session regardless of project ref key
  await page.addInitScript((user) => {
    const now = Math.floor(Date.now() / 1000);
    const mockSession = {
      access_token: 'e2e_mock_access_token',
      refresh_token: 'e2e_mock_refresh',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user: {
        id: user.id,
        email: user.email,
        aud: 'authenticated',
        role: 'authenticated',
        user_metadata: user.user_metadata ?? {},
        app_metadata: user.app_metadata ?? {},
      },
    };
    const json = JSON.stringify(mockSession);

    try {
      // 1) Store a fallback item (useful for debugging)
      localStorage.setItem('sb-e2e-fallback-auth-token', json);
    } catch {}

    // 2) Make any Supabase key lookup for "*-auth-token" return our session
    const AUTH_SUFFIX = '-auth-token';
    const originalGetItem = localStorage.getItem.bind(localStorage);
    const anyStorage = localStorage as unknown as { getItem: (key: string) => string | null };
    anyStorage.getItem = (key: string) => {
      try {
        if (typeof key === 'string' && key.includes(AUTH_SUFFIX)) {
          return json;
        }
      } catch {}
      return originalGetItem(key);
    };
  }, userData);

  // Mock auth state
  await page.route('**/auth/v1/user', (route) => {
    if (route.request().method() === 'OPTIONS') {
      return fulfillOptions(route);
    }
    return route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        id: userData.id,
        email: userData.email,
        aud: 'authenticated',
        role: 'authenticated',
        user_metadata: userData.user_metadata ?? {},
        app_metadata: userData.app_metadata ?? {},
      }),
    });
  });

  // Supabase refresh token (some apps call this on boot)
  await page.route('**/auth/v1/token?grant_type=refresh_token', (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillOptions(route);
    return route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: 'e2e_mock_access_token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'e2e_mock_refresh',
        user: {
          id: userData.id,
          email: userData.email,
          aud: 'authenticated',
          role: 'authenticated',
        },
      }),
    });
  });

  // Mock profile data (PostgREST responses are arrays)
  await page.route('**/rest/v1/profiles*', (route) => {
    if (route.request().method() === 'OPTIONS') {
      return fulfillOptions(route);
    }
    return route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify([
        {
          id: userData.id,
          subscription_tier: userData.subscription_tier,
          is_premium: userData.is_premium ?? userData.is_vip ?? false,
          subscription_status: userData.subscription_status ?? null,
          subscription_ends_at: userData.subscription_ends_at ?? userData.trial_end_date ?? null,
          trial_active: userData.trial_active ?? false,
          trial_end_date: userData.trial_end_date ?? null,
        },
      ]),
    });
  });

  return userData;
}

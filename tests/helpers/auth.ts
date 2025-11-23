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
export async function loginAs(page: Page, userFixtureKey: string) {
  const user = subscriptionFixtures[userFixtureKey as keyof typeof subscriptionFixtures];
  if (!user) {
    throw new Error(`Unknown user fixture: ${userFixtureKey}`);
  }

  // Map fixture 'id' to 'user_id' for consistency
  const userId = (user as any).user_id || (user as any).id;

  // Set up session in localStorage before page loads
  await page.addInitScript((uid: string) => {
    // Set Supabase auth session
    const session = {
      access_token: 'test-access-token-' + uid,
      refresh_token: 'test-refresh-token',
      user: {
        id: uid,
        email: `${uid}@test.com`,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer'
    };
    
    localStorage.setItem('sb-kktrmgkhkbuwvbkbjwfz-auth-token', JSON.stringify(session));
    
    // Also set onboarding completion to prevent dialogs from auto-opening
    localStorage.setItem(`onboarding_${uid}`, 'true');
        localStorage.setItem('onesignal-banner-dismissed', 'true');
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    
    // Override getItem to always return our session for any auth key variant
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key: string) {
      if (key.includes('auth-token')) {
        return JSON.stringify(session);
      }
      return originalGetItem.call(this, key);
    };
  }, userId);

  // Mock Supabase auth and profiles endpoints
  await page.route('**/auth/v1/user', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.user_id,
        email: `${user.user_id}@test.com`,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }),
    });
  });

  await page.route('**/auth/v1/token**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: user.user_id,
          email: `${user.user_id}@test.com`,
        }
      }),
    });
  });

  // Mock profile data
  await page.route('**/rest/v1/profiles**', async (route: Route) => {
    const method = route.request().method();
    
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
      return;
    }
    
    const url = new URL(route.request().url());
    const isSingle = url.searchParams.toString().includes('Accept=application/vnd.pgrst.object+json') || 
                     route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
    
    const profileData = {
      user_id: userId,
      nickname: (user as any).nickname || `User ${userId}`,
      subscription_tier: (user as any).subscription_tier,
      subscription_status: (user as any).subscription_status,
      is_premium: (user as any).is_premium,
      stripe_customer_id: (user as any).stripe_customer_id,
      stripe_subscription_id: (user as any).stripe_subscription_id,
      subscription_start_date: (user as any).subscription_start_date,
      subscription_end_date: (user as any).subscription_end_date,
      subscription_ends_at: (user as any).subscription_ends_at,
      trial_ends_at: (user as any).trial_ends_at,
      trial_active: (user as any).trial_active,
      trial_end_date: (user as any).trial_end_date,
      trial_premium_used: (user as any).trial_premium_used,
      cancel_at_period_end: (user as any).cancel_at_period_end,
      onboarding_completed: true, // Ensure onboarding is marked as completed
      created_at: '2024-01-01T00:00:00Z'
    };
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSingle ? profileData : [profileData]),
    });
  });
}

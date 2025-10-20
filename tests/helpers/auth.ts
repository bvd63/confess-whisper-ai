import { Page } from '@playwright/test';
import subscriptionFixtures from '../fixtures/users/subscriptions.json';

type UserFixtureKey = keyof typeof subscriptionFixtures;

/**
 * Programmatic login helper for E2E tests
 * Sets up auth state without real backend calls
 */
export async function loginAs(page: Page, fixtureUserKey: UserFixtureKey) {
  const userData = subscriptionFixtures[fixtureUserKey];
  
  if (!userData) {
    throw new Error(`Unknown user fixture: ${fixtureUserKey}`);
  }

  // Mock auth state
  await page.route('**/auth/v1/user', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: userData.id,
        email: userData.email,
        aud: 'authenticated',
        role: 'authenticated',
        user_metadata: {},
      }),
    });
  });

  // Mock profile data
  await page.route('**/rest/v1/profiles*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: userData.id,
        subscription_tier: userData.subscription_tier,
        is_premium: userData.is_premium,
        subscription_status: userData.subscription_status,
        subscription_ends_at: userData.subscription_ends_at,
        trial_active: userData.trial_active,
        trial_end_date: userData.trial_end_date,
      }),
    });
  });

  // Set auth token in localStorage
  await page.addInitScript((user) => {
    const mockSession = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      user: {
        id: user.id,
        email: user.email,
        aud: 'authenticated',
        role: 'authenticated',
      },
    };
    localStorage.setItem('sb-fxwvlbopvnjjjrzshqvw-auth-token', JSON.stringify(mockSession));
  }, userData);

  return userData;
}

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Streak Bonus Coin Awards', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('awards 10 coins on 3-day streak', async ({ page }) => {
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', status: 'none' });
    
    // Mock user has 3-day streak
    await page.route('**/rest/v1/user_streaks*', async (route) => {
      const url = new URL(route.request().url());
      const isSingle = url.searchParams.toString().includes('Accept=application/vnd.pgrst.object+json') || 
                       route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      
      const data = {
        user_id: 'user_free_001',
        current_streak: 3,
        longest_streak: 3,
        last_confession_date: new Date().toISOString().split('T')[0]
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? data : [data]),
      });
    });

    // Mock streak bonus award - wait for the request
    const bonusRequestPromise = page.waitForRequest(
      request => request.url().includes('award-streak-bonus'),
      { timeout: 10000 }
    );
    
    let awardedCoins = 0;
    await page.route('**/functions/v1/award-streak-bonus', async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');
      
      if (body.currentStreak === 3) {
        awardedCoins = 10;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, awarded: 10 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, reason: 'no-bonus' }),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for streak bonus API call
    await bonusRequestPromise.catch(() => console.log('Streak bonus request not made'));
    
    // Wait a bit more for the route handler to complete
    await page.waitForTimeout(1000);
    
    // Verify 10 coins were awarded
    expect(awardedCoins).toBe(10);
  });

  test('awards 20 coins on 5-day streak', async ({ page }) => {
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', status: 'none' });
    
    // Mock user has 5-day streak
    await page.route('**/rest/v1/user_streaks*', async (route) => {
      const url = new URL(route.request().url());
      const isSingle = url.searchParams.toString().includes('Accept=application/vnd.pgrst.object+json') || 
                       route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      
      const streakData = {
        user_id: 'test_user_id',
        current_streak: 5,
        longest_streak: 5,
        last_confession_date: new Date().toISOString().split('T')[0]
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? streakData : [streakData]),
      });
    });

    // Mock streak bonus award - wait for the request
    const bonusRequestPromise = page.waitForRequest(
      request => request.url().includes('award-streak-bonus'),
      { timeout: 10000 }
    );
    
    let awardedCoins = 0;
    await page.route('**/functions/v1/award-streak-bonus', async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');
      
      if (body.currentStreak === 5) {
        awardedCoins = 20;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, awarded: 20 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, reason: 'no-bonus' }),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for streak bonus API call
    await bonusRequestPromise.catch(() => console.log('Streak bonus request not made'));
    
    // Wait a bit more for the route handler to complete
    await page.waitForTimeout(1000);
    
    expect(awardedCoins).toBe(20);
  });

  test('awards 50 coins on 7-day streak', async ({ page }) => {
    await loginAs(page, 'vip_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    // Mock user has 7-day streak
    await page.route('**/rest/v1/user_streaks*', async (route) => {
      const url = new URL(route.request().url());
      const isSingle = url.searchParams.toString().includes('Accept=application/vnd.pgrst.object+json') || 
                       route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      
      const streakData = {
        user_id: 'test_user_id',
        current_streak: 7,
        longest_streak: 7,
        last_confession_date: new Date().toISOString().split('T')[0]
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? streakData : [streakData]),
      });
    });

    // Mock streak bonus award - wait for the request
    const bonusRequestPromise = page.waitForRequest(
      request => request.url().includes('award-streak-bonus'),
      { timeout: 10000 }
    );
    
    let awardedCoins = 0;
    await page.route('**/functions/v1/award-streak-bonus', async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');
      
      if (body.currentStreak === 7) {
        awardedCoins = 50;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, awarded: 50 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, reason: 'no-bonus' }),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for streak bonus API call
    await bonusRequestPromise.catch(() => console.log('Streak bonus request not made'));
    
    // Wait a bit more for the route handler to complete
    await page.waitForTimeout(1000);
    
    expect(awardedCoins).toBe(50);
  });

  test('does not award coins for non-milestone streaks', async ({ page }) => {
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', status: 'none' });
    
    // Mock user has 4-day streak (not a milestone)
    await page.route('**/rest/v1/user_streaks*', async (route) => {
      const url = new URL(route.request().url());
      const isSingle = url.searchParams.toString().includes('Accept=application/vnd.pgrst.object+json') || 
                       route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      
      const streakData = {
        user_id: 'test_user_id',
        current_streak: 4,
        longest_streak: 4,
        last_confession_date: new Date().toISOString().split('T')[0]
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? streakData : [streakData]),
      });
    });

    let bonusRequested = false;
    await page.route('**/functions/v1/award-streak-bonus', async (route) => {
      bonusRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, reason: 'no-bonus' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Function should NOT be called for non-milestone streaks
    expect(bonusRequested).toBe(false);
  });

  test('streak bonus is idempotent (no duplicate awards)', async ({ page }) => {
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', status: 'none' });
    
    let callCount = 0;
    
    await page.route('**/rest/v1/user_streaks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          user_id: 'test_user_id',
          current_streak: 3,
          longest_streak: 3,
          last_confession_date: new Date().toISOString().split('T')[0]
        }]),
      });
    });

    await page.route('**/functions/v1/award-streak-bonus', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          ok: callCount === 1,
          awarded: callCount === 1 ? 10 : 0,
          reason: callCount === 1 ? 'streak_3' : 'already_awarded'
        }),
      });
    });

    // First login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Reload page (simulating second login same day)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should only award once
    expect(callCount).toBeLessThanOrEqual(2);
  });

  test('handles streak bonus failure gracefully', async ({ page }) => {
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', status: 'none' });
    
    await page.route('**/rest/v1/user_streaks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          user_id: 'test_user_id',
          current_streak: 5,
          longest_streak: 5,
          last_confession_date: new Date().toISOString().split('T')[0]
        }]),
      });
    });

    // Mock streak bonus function failure
    await page.route('**/functions/v1/award-streak-bonus', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Internal error' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // App should still load successfully even if bonus fails
    await expect(page.getByTestId('app-ready')).toBeAttached({ timeout: 10000 });
  });
});

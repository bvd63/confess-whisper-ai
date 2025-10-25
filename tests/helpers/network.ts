import { Page, Route } from '@playwright/test';
import previewUpgradeFreeFixture from '../fixtures/stripe/preview/upgrade_free_to_premium_monthly.json';
import previewUpgradeVIPFixture from '../fixtures/stripe/preview/upgrade_premium_to_vip_monthly.json';
import previewDowngradeFixture from '../fixtures/stripe/preview/downgrade_vip_to_premium_period_end.json';
import previewYearlyFixture from '../fixtures/stripe/preview/yearly_targets_with_savings.json';

/**
 * Mock all subscription-related API routes for E2E tests
 */
export async function mockSubscriptionRoutes(page: Page) {
  const processedRequests = new Set<string>();

  // Preview endpoint
  await page.route('**/functions/v1/billing-preview', async (route: Route) => {
    const request = route.request();
    const idempotencyKey = request.headers()['idempotency-key'];
    
    if (idempotencyKey && processedRequests.has(idempotencyKey)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ already_processed: true }),
      });
    }

    if (idempotencyKey) {
      processedRequests.add(idempotencyKey);
    }

    // Parse request to determine which fixture to return
    const postData = request.postDataJSON?.() || {};
    const targetTier = postData.target_tier || 'vip';
    const cycle = postData.cycle || 'monthly';

    let fixture = previewUpgradeFreeFixture;
    if (cycle === 'yearly') {
      fixture = previewYearlyFixture;
    } else if (targetTier === 'vip') {
      fixture = previewUpgradeVIPFixture;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    });
  });

  // Change endpoint
  await page.route('**/functions/v1/billing-change', async (route: Route) => {
    const request = route.request();
    const idempotencyKey = request.headers()['idempotency-key'];
    
    if (idempotencyKey && processedRequests.has(idempotencyKey)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ already_processed: true }),
      });
    }

    if (idempotencyKey) {
      processedRequests.add(idempotencyKey);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Subscription changed successfully',
      }),
    });
  });

  // Schedule change endpoint
  await page.route('**/functions/v1/billing-schedule-change', async (route: Route) => {
    const request = route.request();
    const idempotencyKey = request.headers()['idempotency-key'];
    
    if (idempotencyKey && processedRequests.has(idempotencyKey)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ already_processed: true }),
      });
    }

    if (idempotencyKey) {
      processedRequests.add(idempotencyKey);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        effective_date: '2025-11-12T18:00:00Z',
      }),
    });
  });

  // Cancel endpoint
  await page.route('**/functions/v1/billing-cancel**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const effective = url.searchParams.get('effective') || 'period_end';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        canceled_at: effective === 'immediately' ? new Date().toISOString() : null,
        cancel_at_period_end: effective === 'period_end',
      }),
    });
  });

  // Reactivate endpoint
  await page.route('**/functions/v1/billing-reactivate', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Subscription reactivated',
      }),
    });
  });

  // Update payment method endpoint
  await page.route('**/functions/v1/billing-update-payment-method', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Payment method updated',
      }),
    });
  });

  // Subscription status endpoint
  await page.route('**/functions/v1/subscription-manage', async (route: Route) => {
    const postData = route.request().postDataJSON?.() || {};
    const action = postData.action;

    if (action === 'status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currentPlan: 'vip',
          interval: 'monthly',
          status: 'active',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: '2025-11-12T18:00:00Z',
          canReactivate: false,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

import { Page, Route } from '@playwright/test';
import previewUpgradeFreeFixtureRaw from '../fixtures/stripe/preview/upgrade_free_to_vip_monthly.json' assert { type: 'json' };
import previewDowngradeFixtureRaw from '../fixtures/stripe/preview/downgrade_vip_to_free_period_end.json' assert { type: 'json' };
import previewYearlyFixtureRaw from '../fixtures/stripe/preview/yearly_targets_with_savings.json' assert { type: 'json' };

const previewUpgradeFreeFixture: any = previewUpgradeFreeFixtureRaw as any;
const previewDowngradeFixture: any = previewDowngradeFixtureRaw as any;
const previewYearlyFixture: any = previewYearlyFixtureRaw as any;

/**
 * Mock all subscription-related API routes for E2E tests
 */
export async function mockSubscriptionRoutes(page: Page, options?: { currentPlan?: string; interval?: string; status?: string }) {
  const processedRequests = new Set<string>();
  const currentPlan = options?.currentPlan || 'free';
  const interval = options?.interval || 'monthly';
  const status = options?.status || 'none';

  // Billing-buy endpoint for free users upgrading
  await page.route('**/functions/v1/billing-buy', async (route: Route) => {
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

    const postData = request.postDataJSON?.() || {};
    const cycle = postData.cycle || 'monthly';
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: `cs_test_${cycle}_${Date.now()}`,
        url: `https://checkout.stripe.com/pay/cs_test_${cycle}`,
      }),
    });
  });

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
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    });
  });

  // New subscription (buy) endpoint for free -> VIP
  await page.route('**/functions/v1/billing-buy', async (route: Route) => {
    const request = route.request();
    const body = request.postDataJSON?.() || {};
    const cycle = body.cycle || 'monthly';
    const url = `https://checkout.stripe.com/test_session_${cycle}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url })
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

  // Customer portal session endpoint used by EnhancedSubscriptionManager
  await page.route('**/api/stripe/portal-session', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Return javascript:void(0) to prevent actual navigation in tests
      body: JSON.stringify({ url: 'javascript:void(0)' }),
    });
  });

  // Checkout session endpoint used by EnhancedSubscriptionManager
  await page.route('**/api/stripe/checkout-session', async (route: Route) => {
    const body = route.request().postDataJSON?.() || {};
    const plan = body.plan || 'monthly';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: `https://checkout.stripe.com/test_${plan}` }),
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
      const isCanceled = status === 'canceled';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currentPlan: currentPlan,
          interval: currentPlan === 'free' ? null : interval,
          status: isCanceled ? 'active' : status,
          cancelAtPeriodEnd: isCanceled,
          currentPeriodEnd: currentPlan === 'free' ? undefined : '2025-11-12T18:00:00Z',
          canReactivate: isCanceled,
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

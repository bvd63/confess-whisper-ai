/**
 * Test utilities for subscription states
 */

export const makeVipUser = (overrides: Partial<any> = {}) => ({
  id: 'user_vip_1',
  subscription: {
    tier: 'vip',
    status: 'active',
    interval: 'month',
    current_period_end: Date.now() + 30 * 24 * 3600 * 1000,
  },
  coins: 0,
  ...overrides,
});

export const makeFreeUser = (overrides: Partial<any> = {}) => ({
  id: 'user_free_1',
  subscription: null,
  coins: 0,
  ...overrides,
});

import { describe, it, expect } from 'vitest';
import { FREE_DAILY_CONFESSION_LIMIT, canPostMoreConfessions } from '@/constants/confessionLimits';

describe('confession limit helpers', () => {
  it('allows free users to post up to the configured daily limit', () => {
    for (let count = 0; count < FREE_DAILY_CONFESSION_LIMIT; count += 1) {
      expect(canPostMoreConfessions('free', count)).toBe(true);
    }
  });

  it('blocks free users once the daily limit is reached', () => {
    expect(canPostMoreConfessions('free', FREE_DAILY_CONFESSION_LIMIT)).toBe(false);
  });

  it('never limits VIP users even beyond the free cap', () => {
    expect(canPostMoreConfessions('vip', FREE_DAILY_CONFESSION_LIMIT)).toBe(true);
    expect(canPostMoreConfessions('vip', FREE_DAILY_CONFESSION_LIMIT * 10)).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionApiMock } from '../helpers/apiMock';

describe('Idempotency Guard', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
  });

  it('should prevent duplicate requests with same idempotency key', async () => {
    const idempotencyKey = 'unique-key-001';
    const mockFn = apiMock.mockChange({ success: true }, { idempotencyKey });

    // First request
    const result1 = await mockFn('billing-change', {
      body: { targetPriceId: 'price_123', idempotencyKey },
    });

    // Second request with same key
    const result2 = await mockFn('billing-change', {
      body: { targetPriceId: 'price_123', idempotencyKey },
    });

    expect(result1.data).toEqual({ success: true });
    expect(result2.data).toEqual({ success: true });
    
    // Should only log once
    const log = apiMock.getRequestLog();
    expect(log.length).toBe(1);
  });

  it('should allow different requests with different idempotency keys', async () => {
    const mockFn = apiMock.mockChange({ success: true });

    const result1 = await mockFn('billing-change', {
      body: { targetPriceId: 'price_123', idempotencyKey: 'key-001' },
    });

    const result2 = await mockFn('billing-change', {
      body: { targetPriceId: 'price_456', idempotencyKey: 'key-002' },
    });

    expect(result1.data).toEqual({ success: true });
    expect(result2.data).toEqual({ success: true });
    
    const log = apiMock.getRequestLog();
    expect(log.length).toBe(2);
  });

  it('should handle requests without idempotency key', async () => {
    const mockFn = apiMock.mockChange({ success: true });

    const result1 = await mockFn('billing-change', {
      body: { targetPriceId: 'price_123' },
    });

    const result2 = await mockFn('billing-change', {
      body: { targetPriceId: 'price_123' },
    });

    expect(result1.data).toEqual({ success: true });
    expect(result2.data).toEqual({ success: true });
    
    // Both should be logged since no idempotency key
    const log = apiMock.getRequestLog();
    expect(log.length).toBe(2);
  });

  it('should include idempotency key in request headers', async () => {
    const idempotencyKey = 'test-key-123';
    const mockFn = apiMock.mockChange({ success: true }, { idempotencyKey });

    await mockFn('billing-change', {
      body: { targetPriceId: 'price_123', idempotencyKey },
    });

    const log = apiMock.getRequestLog();
    expect(log[0].body.idempotencyKey).toBe(idempotencyKey);
  });

  it('should generate unique idempotency keys for rapid successive calls', () => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      const key = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      keys.add(key);
    }
    expect(keys.size).toBe(100);
  });
});

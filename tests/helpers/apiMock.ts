import { vi } from 'vitest';

interface MockResponse {
  data?: any;
  error?: any;
}

interface RequestOptions {
  idempotencyKey?: string;
  shouldFail?: boolean;
  delay?: number;
}

export class SubscriptionApiMock {
  private requestLog: Array<{ endpoint: string; body?: any; headers?: any }> = [];
  private idempotencyKeys = new Set<string>();

  constructor() {
    this.reset();
  }

  reset() {
    this.requestLog = [];
    this.idempotencyKeys.clear();
  }

  getRequestLog() {
    return this.requestLog;
  }

  private logRequest(endpoint: string, body?: any, headers?: any) {
    this.requestLog.push({ endpoint, body, headers });
  }

  private async simulateDelay(delay: number = 100) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  mockPreview(targetPriceId: string, previewData: any, options: RequestOptions = {}) {
    return vi.fn(async (fnName: string, { body }: any = {}) => {
      if (fnName !== 'billing-preview') return { data: null, error: 'Unknown function' };

      const idempotencyKey = options.idempotencyKey || body?.idempotencyKey;
      
      if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
        return { data: previewData, error: null };
      }

      if (idempotencyKey) {
        this.idempotencyKeys.add(idempotencyKey);
      }

      this.logRequest('billing-preview', body);

      if (options.shouldFail) {
        await this.simulateDelay(options.delay);
        return { data: null, error: { message: 'Preview failed' } };
      }

      await this.simulateDelay(options.delay);
      return { data: previewData, error: null };
    });
  }

  mockChange(successData: any, options: RequestOptions = {}) {
    return vi.fn(async (fnName: string, { body }: any = {}) => {
      if (fnName !== 'billing-change') return { data: null, error: 'Unknown function' };

      const idempotencyKey = options.idempotencyKey || body?.idempotencyKey;
      
      if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
        return { data: successData, error: null };
      }

      if (idempotencyKey) {
        this.idempotencyKeys.add(idempotencyKey);
      }

      this.logRequest('billing-change', body);

      if (options.shouldFail) {
        await this.simulateDelay(options.delay);
        return { data: null, error: { message: 'Change failed' } };
      }

      await this.simulateDelay(options.delay);
      return { data: successData, error: null };
    });
  }

  mockScheduleChange(successData: any, options: RequestOptions = {}) {
    return vi.fn(async (fnName: string, { body }: any = {}) => {
      if (fnName !== 'billing-schedule-change') return { data: null, error: 'Unknown function' };

      const idempotencyKey = options.idempotencyKey || body?.idempotencyKey;
      
      if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
        return { data: successData, error: null };
      }

      if (idempotencyKey) {
        this.idempotencyKeys.add(idempotencyKey);
      }

      this.logRequest('billing-schedule-change', body);

      if (options.shouldFail) {
        await this.simulateDelay(options.delay);
        return { data: null, error: { message: 'Schedule failed' } };
      }

      await this.simulateDelay(options.delay);
      return { data: successData, error: null };
    });
  }

  mockCancel(successData: any, options: RequestOptions = {}) {
    return vi.fn(async (fnName: string, { body }: any = {}) => {
      if (fnName !== 'billing-cancel') return { data: null, error: 'Unknown function' };

      const idempotencyKey = options.idempotencyKey || body?.idempotencyKey;
      
      if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
        return { data: successData, error: null };
      }

      if (idempotencyKey) {
        this.idempotencyKeys.add(idempotencyKey);
      }

      this.logRequest('billing-cancel', body);

      if (options.shouldFail) {
        await this.simulateDelay(options.delay);
        return { data: null, error: { message: 'Cancel failed' } };
      }

      await this.simulateDelay(options.delay);
      return { data: successData, error: null };
    });
  }

  mockReactivate(successData: any, options: RequestOptions = {}) {
    return vi.fn(async (fnName: string, { body }: any = {}) => {
      if (fnName !== 'billing-reactivate') return { data: null, error: 'Unknown function' };

      const idempotencyKey = options.idempotencyKey || body?.idempotencyKey;
      
      if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
        return { data: successData, error: null };
      }

      if (idempotencyKey) {
        this.idempotencyKeys.add(idempotencyKey);
      }

      this.logRequest('billing-reactivate', body);

      if (options.shouldFail) {
        await this.simulateDelay(options.delay);
        return { data: null, error: { message: 'Reactivate failed' } };
      }

      await this.simulateDelay(options.delay);
      return { data: successData, error: null };
    });
  }

  mockUpdatePayment(successData: any, options: RequestOptions = {}) {
    return vi.fn(async (fnName: string, { body }: any = {}) => {
      if (fnName !== 'billing-update-payment') return { data: null, error: 'Unknown function' };

      const idempotencyKey = options.idempotencyKey || body?.idempotencyKey;
      
      if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
        return { data: successData, error: null };
      }

      if (idempotencyKey) {
        this.idempotencyKeys.add(idempotencyKey);
      }

      this.logRequest('billing-update-payment', body);

      if (options.shouldFail) {
        await this.simulateDelay(options.delay);
        return { data: null, error: { message: 'Payment update failed' } };
      }

      await this.simulateDelay(options.delay);
      return { data: successData, error: null };
    });
  }
}

export const createMockSupabase = (mockFunctions: any) => ({
  functions: {
    invoke: mockFunctions,
  },
  auth: {
    getSession: vi.fn(async () => ({ 
      data: { 
        session: { 
          user: { id: 'test_user_001', email: 'test@test.com' } 
        } 
      }, 
      error: null 
    })),
    getUser: vi.fn(async () => ({ 
      data: { 
        user: { id: 'test_user_001', email: 'test@test.com' } 
      }, 
      error: null 
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  })),
});

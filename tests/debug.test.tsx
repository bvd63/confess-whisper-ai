import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { renderWithProviders } from './helpers/testUtils';
import * as SupabaseModule from '@/integrations/supabase/client';

describe('Debug Test', () => {
  it('should render something', async () => {
    // Temporarily restore console.error to see errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
    };
    
    // Setup mock
    const mockInvoke = vi.fn().mockResolvedValue({
      data: {
        currentPlan: 'vip',
        interval: 'monthly',
        status: 'active',
      },
      error: null,
    });
    
    vi.mocked(SupabaseModule.supabase.functions.invoke).mockImplementation(mockInvoke);
    
    const { container, debug } = renderWithProviders(<EnhancedSubscriptionManager />);
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Container HTML:', container.innerHTML);
    console.log('Mock invoke called:', mockInvoke.mock.calls.length);
    debug();
    expect(container).toBeDefined();
  });
});

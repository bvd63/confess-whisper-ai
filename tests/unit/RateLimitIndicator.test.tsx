import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RateLimitIndicator } from '@/components/RateLimitIndicator';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      rate_limit_title: 'Rate Limit Exceeded',
      rate_limit_wait_message: 'Please wait before trying again',
      rate_limit_reset_in: 'Resets in {time}',
      rate_limit_remaining: 'Requests remaining',
    },
  }),
}));

describe('RateLimitIndicator', () => {
  it('displays blocked state when isLimited is true', () => {
    render(
      <RateLimitIndicator
        remaining={0}
        total={100}
        resetTime="5m 30s"
        isLimited={true}
      />
    );

    expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument();
    expect(screen.getByText('Please wait before trying again')).toBeInTheDocument();
    expect(screen.getByText(/Resets in/)).toBeInTheDocument();
  });

  it('displays progress bar when not limited', () => {
    render(
      <RateLimitIndicator
        remaining={75}
        total={100}
        resetTime="10m"
        isLimited={false}
      />
    );

    expect(screen.getByText('Requests remaining')).toBeInTheDocument();
    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('shows warning state when remaining is below 20%', () => {
    const { container } = render(
      <RateLimitIndicator
        remaining={15}
        total={100}
        isLimited={false}
      />
    );

    expect(screen.getByText('15/100')).toBeInTheDocument();
    // Check for warning styling
    const progressBar = container.querySelector('.h-2');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders without reset time', () => {
    render(
      <RateLimitIndicator
        remaining={50}
        total={100}
        isLimited={false}
      />
    );

    expect(screen.getByText('50/100')).toBeInTheDocument();
    expect(screen.queryByText(/Resets in/)).not.toBeInTheDocument();
  });
});

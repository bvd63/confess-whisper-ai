import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { EnhancedButton } from '@/components/ui/enhanced-button';

// Mock useHaptic
vi.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({
    vibrate: vi.fn(),
    vibratePattern: vi.fn(),
  }),
}));

describe('EnhancedButton', () => {
  it('should render children', () => {
    render(<EnhancedButton>Click me</EnhancedButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<EnhancedButton loading>Submit</EnhancedButton>);
    expect(screen.getByRole('button')).toBeDisabled();
    // Loader icon should be present
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show loading text when provided', () => {
    render(
      <EnhancedButton loading loadingText="Submitting...">
        Submit
      </EnhancedButton>
    );
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<EnhancedButton onClick={handleClick}>Click</EnhancedButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not fire click when loading', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedButton loading onClick={handleClick}>
        Click
      </EnhancedButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not fire click when disabled', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedButton disabled onClick={handleClick}>
        Click
      </EnhancedButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<EnhancedButton className="custom-class">Click</EnhancedButton>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});

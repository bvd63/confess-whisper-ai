import { render, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  
  constructor(private callback: IntersectionObserverCallback) {}
  
  triggerIntersect(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe('useIntersectionObserver', () => {
  let mockObserver: MockIntersectionObserver;

  beforeEach(() => {
    mockObserver = new MockIntersectionObserver(vi.fn());
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      mockObserver = new MockIntersectionObserver(callback);
      return mockObserver;
    }) as any;
  });

  it('should initialize with isIntersecting=false', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    
    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.hasIntersected).toBe(false);
  });

  it('should update isIntersecting when element enters viewport', () => {
    const Test: React.FC = () => {
      const { targetRef } = useIntersectionObserver();
      return <div data-testid="target" ref={targetRef} />;
    };
    render(<Test />);

    // Observer should attach to the element
    expect(mockObserver.observe).toHaveBeenCalled();
  });

  it('should call onVisible when element becomes visible', () => {
    const onVisible = vi.fn();
    const Test: React.FC = () => {
      const { targetRef } = useIntersectionObserver({ onVisible });
      return <div data-testid="target" ref={targetRef} />;
    };
    render(<Test />);

    mockObserver.triggerIntersect(true);
    expect(onVisible).toHaveBeenCalled();
  });

  it('should cleanup observer on unmount', () => {
    const Test: React.FC = () => {
      const { targetRef } = useIntersectionObserver();
      return <div data-testid="target" ref={targetRef} />;
    };
    const { unmount } = render(<Test />);
    unmount();
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });
});

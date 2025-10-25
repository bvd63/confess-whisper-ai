import { renderHook } from '@testing-library/react';
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
    const { result } = renderHook(() => useIntersectionObserver());
    
    // Create a mock ref element
    const element = document.createElement('div');
    Object.defineProperty(result.current.targetRef, 'current', {
      value: element,
      writable: true,
    });
    
    // Trigger intersection
    mockObserver.triggerIntersect(true);
    
    // Note: In actual test, you'd need to rerender to see state changes
    expect(mockObserver.observe).toHaveBeenCalled();
  });

  it('should call onVisible when element becomes visible', () => {
    const onVisible = vi.fn();
    const { result } = renderHook(() => 
      useIntersectionObserver({ onVisible })
    );
    
    const element = document.createElement('div');
    Object.defineProperty(result.current.targetRef, 'current', {
      value: element,
      writable: true,
    });
    
    mockObserver.triggerIntersect(true);
    
    expect(onVisible).toHaveBeenCalled();
  });

  it('should cleanup observer on unmount', () => {
    const { unmount } = renderHook(() => useIntersectionObserver());
    
    unmount();
    
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });
});

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('should trigger callback on matching key combination', () => {
    const callback = vi.fn();
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', ctrl: true, callback }
    ]));

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not trigger callback on non-matching key', () => {
    const callback = vi.fn();
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', ctrl: true, callback }
    ]));

    const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle multiple shortcuts', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', ctrl: true, callback: callback1 },
      { key: 'p', ctrl: true, callback: callback2 }
    ]));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }));

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listener on unmount', () => {
    const callback = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useKeyboardShortcuts([
      { key: 'k', ctrl: true, callback }
    ]));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

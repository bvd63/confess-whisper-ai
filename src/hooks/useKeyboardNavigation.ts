import { useEffect } from 'react';

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling common keyboard navigation patterns
 * Handles Escape (close dialogs) and Enter (submit forms)
 */
export const useKeyboardNavigation = ({
  onEscape,
  onEnter,
  enabled = true,
}: KeyboardNavigationOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key - close dialogs/modals
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }

      // Enter key - submit forms (only if not in textarea)
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        onEnter &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        onEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter, enabled]);
};

/**
 * Enhanced error recovery system with auto-save and retry
 */

import { logDebug, logError, logWarn } from '@/lib/logger';

interface DraftData {
  content: string;
  timestamp: number;
  route: string;
  metadata?: Record<string, any>;
}

class ErrorRecovery {
  private readonly DRAFT_KEY = 'app_draft_autosave';
  private readonly ERROR_LOG_KEY = 'app_error_log';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  /**
   * Auto-save draft to localStorage
   */
  saveDraft(data: Omit<DraftData, 'timestamp'>): void {
    try {
      const draft: DraftData = {
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      logError('Failed to save draft', error as Error);
    }
  }

  /**
   * Recover saved draft
   */
  recoverDraft(): DraftData | null {
    try {
      const saved = localStorage.getItem(this.DRAFT_KEY);
      if (!saved) return null;

      const draft: DraftData = JSON.parse(saved);

      // Check if draft is recent (within 24 hours)
      const ageInHours = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        this.clearDraft();
        return null;
      }

      return draft;
    } catch (error) {
      logError('Failed to recover draft', error as Error);
      return null;
    }
  }

  /**
   * Clear saved draft
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(this.DRAFT_KEY);
    } catch (error) {
      logError('Failed to clear draft', error as Error);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on specific errors
        if (this.isNonRetriableError(error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (i < retries - 1) {
          const delay = this.RETRY_DELAYS[i] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetriableError(error: any): boolean {
    // Don't retry on auth errors
    if (error?.status === 401 || error?.status === 403) {
      return true;
    }

    // Don't retry on validation errors
    if (error?.status === 400 || error?.status === 422) {
      return true;
    }

    // Don't retry on not found
    if (error?.status === 404) {
      return true;
    }

    return false;
  }

  /**
   * Log error to localStorage for debugging
   */
  logError(error: Error | any, context?: Record<string, any>): void {
    try {
      const errorLog = this.getErrorLog();

      const errorEntry = {
        message: error?.message || String(error),
        stack: error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        context,
      };

      errorLog.push(errorEntry);

      // Keep only last 50 errors
      if (errorLog.length > 50) {
        errorLog.shift();
      }

      localStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(errorLog));

      // Send to backend if critical
      if (this.isCriticalError(error)) {
        this.sendErrorToBackend(errorEntry);
      }
    } catch (e) {
      logError('Failed to log error', e as Error);
    }
  }

  /**
   * Get error log from localStorage
   */
  private getErrorLog(): any[] {
    try {
      const log = localStorage.getItem(this.ERROR_LOG_KEY);
      return log ? JSON.parse(log) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: any): boolean {
    // Network errors
    if (error?.message?.includes('NetworkError')) return true;

    // Uncaught errors
    if (error?.message?.includes('Uncaught')) return true;

    // Syntax errors
    if (error instanceof SyntaxError) return true;

    return false;
  }

  /**
   * Send error to backend for monitoring
   */
  private async sendErrorToBackend(error: any): Promise<void> {
    try {
      // Implement your error reporting endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      });
    } catch (e) {
      // Silently fail - don't want error reporting to cause more errors
      logWarn('Failed to send error to backend', { error: e });
    }
  }

  /**
   * Recover from error state
   */
  async recoverFromError(error: any, fallback?: () => void): Promise<void> {
    // Log the error
    this.logError(error);

    // Try to recover draft
    const draft = this.recoverDraft();
    if (draft) {
      logDebug('Recovered draft', { draft });
    }

    // Execute fallback if provided
    if (fallback) {
      try {
        fallback();
      } catch (e) {
        logError('Fallback failed', e as Error);
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    recent: number;
    critical: number;
    errors: any[];
  } {
    const errors = this.getErrorLog();
    const now = Date.now();
    const recentWindow = 60 * 60 * 1000; // Last hour

    return {
      total: errors.length,
      recent: errors.filter((e) => now - e.timestamp < recentWindow).length,
      critical: errors.filter((e) => this.isCriticalError(e)).length,
      errors: errors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    try {
      localStorage.removeItem(this.ERROR_LOG_KEY);
    } catch (error) {
      logError('Failed to clear error log', error as Error);
    }
  }
}

export const errorRecovery = new ErrorRecovery();

/**
 * Hook for automatic draft saving
 */
export const useAutoDraft = (
  content: string,
  route: string,
  metadata?: Record<string, any>
) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    // Debounce auto-save (save after 2 seconds of inactivity)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (content.trim()) {
      timeoutRef.current = setTimeout(() => {
        errorRecovery.saveDraft({
          content,
          route,
          metadata,
        });
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, route, metadata]);

  const clearDraft = React.useCallback(() => {
    errorRecovery.clearDraft();
  }, []);

  return { clearDraft };
};

// Make React available for the hook
import * as React from 'react';

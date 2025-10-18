/**
 * Session Manager
 * Handles user session persistence and restoration
 */

import { persistenceManager } from './persistenceManager';
import { supabase } from '@/integrations/supabase/client';

interface SessionState {
  lastRoute: string;
  lastActiveConversation: string | null;
  timestamp: number;
}

class SessionManager {
  private SESSION_KEY = 'user_session_state';

  async saveSessionState(route: string, conversationId?: string | null): Promise<void> {
    const state: SessionState = {
      lastRoute: route,
      lastActiveConversation: conversationId || null,
      timestamp: Date.now(),
    };

    await persistenceManager.set('state', this.SESSION_KEY, state);
  }

  async getSessionState(): Promise<SessionState | null> {
    return await persistenceManager.get<SessionState>('state', this.SESSION_KEY);
  }

  async clearSessionState(): Promise<void> {
    await persistenceManager.remove('state', this.SESSION_KEY);
  }

  /**
   * Check if user's session is still valid
   */
  async isSessionValid(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  /**
   * Restore user to their last active state
   */
  async restoreSession(): Promise<{ route: string; conversationId: string | null } | null> {
    const isValid = await this.isSessionValid();
    if (!isValid) {
      await this.clearSessionState();
      return null;
    }

    const state = await this.getSessionState();
    if (!state) return null;

    // Check if session is too old (24 hours)
    const dayInMs = 24 * 60 * 60 * 1000;
    if (Date.now() - state.timestamp > dayInMs) {
      await this.clearSessionState();
      return null;
    }

    return {
      route: state.lastRoute,
      conversationId: state.lastActiveConversation,
    };
  }
}

export const sessionManager = new SessionManager();

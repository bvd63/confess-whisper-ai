/**
 * Conflict Resolution for Concurrent Edits
 * Handles data conflicts between local and server state
 */

interface ConflictResolution<T> {
  resolved: T;
  strategy: 'local' | 'server' | 'merge' | 'newest';
  timestamp: number;
}

export class ConflictResolver {
  /**
   * Resolve message conflicts
   * Strategy: Server wins for sent messages, local wins for pending
   */
  resolveMessage(
    local: any,
    server: any
  ): ConflictResolution<any> {
    // If message exists on server, server is source of truth
    if (server?.id && local?.id === server.id) {
      return {
        resolved: server,
        strategy: 'server',
        timestamp: Date.now()
      };
    }

    // If local message is pending (no ID yet), keep it
    if (local && !local.id) {
      return {
        resolved: local,
        strategy: 'local',
        timestamp: Date.now()
      };
    }

    // Default to server
    return {
      resolved: server || local,
      strategy: 'server',
      timestamp: Date.now()
    };
  }

  /**
   * Resolve conversation conflicts
   * Strategy: Merge updates, newest message wins
   */
  resolveConversation(
    local: any,
    server: any
  ): ConflictResolution<any> {
    if (!local && server) {
      return {
        resolved: server,
        strategy: 'server',
        timestamp: Date.now()
      };
    }

    if (local && !server) {
      return {
        resolved: local,
        strategy: 'local',
        timestamp: Date.now()
      };
    }

    // Merge: Use newest message data
    const localTime = new Date(local.last_message_at || 0).getTime();
    const serverTime = new Date(server.last_message_at || 0).getTime();

    if (serverTime >= localTime) {
      return {
        resolved: {
          ...local,
          ...server,
          unread_count: Math.max(local.unread_count || 0, server.unread_count || 0)
        },
        strategy: 'merge',
        timestamp: Date.now()
      };
    }

    return {
      resolved: {
        ...server,
        ...local,
        unread_count: Math.max(local.unread_count || 0, server.unread_count || 0)
      },
      strategy: 'merge',
      timestamp: Date.now()
    };
  }

  /**
   * Resolve draft conflicts
   * Strategy: Newest draft wins
   */
  resolveDraft(
    local: any,
    server: any
  ): ConflictResolution<any> {
    const localTime = local?.timestamp || 0;
    const serverTime = server?.timestamp || 0;

    if (localTime > serverTime) {
      return {
        resolved: local,
        strategy: 'newest',
        timestamp: Date.now()
      };
    }

    return {
      resolved: server || local,
      strategy: 'newest',
      timestamp: Date.now()
    };
  }

  /**
   * Resolve preference conflicts
   * Strategy: Local always wins (user's latest action)
   */
  resolvePreference(
    local: any,
    server: any
  ): ConflictResolution<any> {
    return {
      resolved: local || server,
      strategy: 'local',
      timestamp: Date.now()
    };
  }

  /**
   * Generic conflict resolution with version tracking
   */
  resolveWithVersion<T extends { version?: number; updated_at?: string }>(
    local: T,
    server: T
  ): ConflictResolution<T> {
    // Compare versions if available
    if (local?.version !== undefined && server?.version !== undefined) {
      if (local.version > server.version) {
        return {
          resolved: local,
          strategy: 'local',
          timestamp: Date.now()
        };
      } else if (server.version > local.version) {
        return {
          resolved: server,
          strategy: 'server',
          timestamp: Date.now()
        };
      }
    }

    // Fall back to timestamp comparison
    const localTime = local?.updated_at ? new Date(local.updated_at).getTime() : 0;
    const serverTime = server?.updated_at ? new Date(server.updated_at).getTime() : 0;

    if (localTime > serverTime) {
      return {
        resolved: local,
        strategy: 'newest',
        timestamp: Date.now()
      };
    }

    return {
      resolved: server || local,
      strategy: 'newest',
      timestamp: Date.now()
    };
  }

  /**
   * Log conflict resolution for debugging
   */
  logConflict(
    type: string,
    resolution: ConflictResolution<any>
  ): void {
    console.log(`🔄 Conflict resolved (${type}):`, {
      strategy: resolution.strategy,
      timestamp: new Date(resolution.timestamp).toISOString()
    });
  }
}

export const conflictResolver = new ConflictResolver();

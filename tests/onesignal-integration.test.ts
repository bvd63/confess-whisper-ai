/**
 * OneSignal Push Notifications Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  initializeOneSignal, 
  requestNotificationPermission,
  isPushEnabled,
  setOneSignalUserId 
} from '@/services/onesignal';

describe('OneSignal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.OneSignal
    global.window = {
      OneSignal: {
        init: vi.fn().mockResolvedValue(true),
        Notifications: {
          requestPermission: vi.fn().mockResolvedValue('granted'),
          permission: 'default',
          isPushSupported: vi.fn().mockResolvedValue(true)
        },
        login: vi.fn().mockResolvedValue(true),
        User: {
          addTag: vi.fn().mockResolvedValue(true),
          PushSubscription: {
            id: 'test-player-id',
            optIn: vi.fn().mockResolvedValue(true)
          }
        }
      }
    } as any;
  });

  it('should initialize OneSignal successfully', async () => {
    const result = await initializeOneSignal();
    expect(result).toBe(true);
  });

  it('should request notification permission', async () => {
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('should check if push is enabled', async () => {
    const result = await isPushEnabled();
    expect(typeof result).toBe('boolean');
  });

  it('should set user ID for OneSignal', async () => {
    await expect(setOneSignalUserId('test-user-id')).resolves.not.toThrow();
  });

  it('should handle initialization failure gracefully', async () => {
    global.window.OneSignal.init = vi.fn().mockRejectedValue(new Error('Init failed'));
    
    const result = await initializeOneSignal();
    expect(result).toBe(false);
  });
});

describe('OneSignal User Tracking', () => {
  beforeEach(() => {
    global.window = {
      OneSignal: {
        init: vi.fn().mockResolvedValue(true),
        login: vi.fn().mockResolvedValue(true),
        User: {
          addTag: vi.fn().mockResolvedValue(true),
          PushSubscription: {
            id: 'test-player-id-123'
          }
        },
        Notifications: {
          permission: 'granted'
        }
      }
    } as any;
  });

  it('should link user ID to OneSignal', async () => {
    await setOneSignalUserId('user-123');
    expect(global.window.OneSignal.login).toHaveBeenCalledWith('user-123');
  });

  it('should send tags for user segmentation', async () => {
    const { sendOneSignalTag } = await import('@/services/onesignal');
    await sendOneSignalTag('subscription_tier', 'vip');
    expect(global.window.OneSignal.User.addTag).toHaveBeenCalledWith('subscription_tier', 'vip');
  });

  it('should get player ID', async () => {
    const { getOneSignalPlayerId } = await import('@/services/onesignal');
    const playerId = await getOneSignalPlayerId();
    expect(playerId).toBe('test-player-id-123');
  });
});

describe('OneSignal Notification Preferences', () => {
  it('should check notification permission status', () => {
    const { getNotificationPermission } = require('@/services/onesignal');
    
    global.window = { Notification: { permission: 'granted' } } as any;
    const permission = getNotificationPermission();
    expect(['granted', 'denied', 'default']).toContain(permission);
  });
});

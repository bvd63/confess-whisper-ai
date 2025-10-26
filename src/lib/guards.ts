/**
 * VIP Guard Utilities
 * Used to check and require VIP subscription status
 */

export function isVip(user: any): boolean {
  return user?.subscription?.tier === 'vip' && user?.subscription?.status === 'active';
}

export function requireVip(user: any): void {
  if (!isVip(user)) {
    throw new Error('VIP required');
  }
}

import { supabase } from "@/integrations/supabase/client";

/**
 * User display information
 */
export interface UserDisplayInfo {
  nickname: string | null;
  isNicknamePublic: boolean;
  userId: string;
}

/**
 * Get display name for a user with proper fallback logic
 * 
 * Priority:
 * 1. @nickname (if public and valid)
 * 2. Localized "Anonymous"
 * 
 * @param userInfo - User display information
 * @param anonymousText - Localized "Anonymous" text
 * @param viewerId - ID of the viewing user (to check if viewing own profile)
 * @returns Display name with @ prefix if nickname, otherwise fallback
 */
export function getDisplayName(
  userInfo: UserDisplayInfo | null,
  anonymousText: string,
  viewerId?: string | null
): string {
  if (!userInfo) {
    return anonymousText;
  }

  const isOwnProfile = viewerId === userInfo.userId;
  
  // Show nickname if:
  // - It exists AND
  // - (It's public OR viewing own profile)
  if (userInfo.nickname && (userInfo.isNicknamePublic || isOwnProfile)) {
    return `@${userInfo.nickname}`;
  }

  return anonymousText;
}

/**
 * Truncate nickname with ellipsis if too long
 * @param nickname - Nickname to truncate (with or without @)
 * @param maxLength - Maximum length (default 24)
 * @returns Truncated nickname with ellipsis if needed
 */
export function truncateNickname(nickname: string, maxLength: number = 24): string {
  // Remove @ if present for length calculation
  const withoutAt = nickname.startsWith('@') ? nickname.slice(1) : nickname;
  const prefix = nickname.startsWith('@') ? '@' : '';
  
  if (withoutAt.length <= maxLength) {
    return nickname;
  }
  
  return `${prefix}${withoutAt.slice(0, maxLength)}…`;
}

/**
 * Fetch user display info from database
 * @param userId - User ID to fetch
 * @returns User display information or null
 */
export async function fetchUserDisplayInfo(userId: string): Promise<UserDisplayInfo | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname, is_nickname_public, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user display info:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      nickname: data.nickname,
      isNicknamePublic: data.is_nickname_public ?? true,
      userId: data.user_id,
    };
  } catch (error) {
    console.error('Error in fetchUserDisplayInfo:', error);
    return null;
  }
}

/**
 * Validate nickname format
 * @param nickname - Nickname to validate
 * @returns Validation result with error message if invalid
 */
export function validateNicknameFormat(nickname: string): { valid: boolean; error?: string } {
  // Length check
  if (nickname.length < 3) {
    return { valid: false, error: 'validation.nickname.too_short' };
  }
  if (nickname.length > 24) {
    return { valid: false, error: 'validation.nickname.too_long' };
  }

  // Character validation
  if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
    return { valid: false, error: 'validation.nickname.invalid_chars' };
  }

  // No leading/trailing underscores
  if (nickname.startsWith('_') || nickname.endsWith('_')) {
    return { valid: false, error: 'validation.nickname.invalid_underscores' };
  }

  // No double underscores
  if (nickname.includes('__')) {
    return { valid: false, error: 'validation.nickname.double_underscores' };
  }

  // Banned words check
  const bannedWords = ['admin', 'moderator', 'support', 'system', 'anonymous', 'anonimo', 'anonym'];
  if (bannedWords.includes(nickname.toLowerCase())) {
    return { valid: false, error: 'validation.nickname.reserved' };
  }

  return { valid: true };
}

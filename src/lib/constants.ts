/**
 * Centralized constants and enums for the ConfessAI application
 * Single source of truth for business logic constants
 */

// ============================================================================
// SUBSCRIPTION TIERS - Core Business Model (FREE & VIP only)
// ============================================================================

export const SUBSCRIPTION_TIERS = {
  FREE: 'free' as const,
  VIP: 'vip' as const,
} as const;

export type SubscriptionTierType = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

export function isValidSubscriptionTier(value: unknown): value is SubscriptionTierType {
  return value === 'free' || value === 'vip';
}

// ============================================================================
// CONFESSION CATEGORIES
// ============================================================================

export const SUPPORTED_CONFESSION_CATEGORIES = [
  "relationships",
  "work",
  "family",
  "health",
  "money",
  "other",
] as const;

type CategoryTuple = typeof SUPPORTED_CONFESSION_CATEGORIES;
export type ConfessionCategory = CategoryTuple[number];

export const isSupportedConfessionCategory = (value: unknown): value is ConfessionCategory =>
  typeof value === "string" && SUPPORTED_CONFESSION_CATEGORIES.includes(value as ConfessionCategory);

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================

export const USER_ROLES = {
  USER: 'authenticated_user' as const,
  MODERATOR: 'moderator' as const,
  ADMIN: 'admin' as const,
  SERVICE: 'service' as const,
} as const;

// ============================================================================
// REPORT REASONS
// ============================================================================

export const REPORT_REASONS = {
  SPAM: 'spam' as const,
  HARASSMENT: 'harassment' as const,
  HATE_SPEECH: 'hate_speech' as const,
  SELF_HARM: 'self_harm' as const,
  ADULT_CONTENT: 'adult_content' as const,
  MISINFORMATION: 'misinformation' as const,
  COPYRIGHTED: 'copyrighted' as const,
  OTHER: 'other' as const,
} as const;

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export const NOTIFICATION_TYPES = {
  LIKE: 'like' as const,
  COMMENT: 'comment' as const,
  FOLLOW: 'follow' as const,
  MESSAGE: 'message' as const,
  SYSTEM: 'system' as const,
  PROMOTION: 'promotion' as const,
} as const;

// ============================================================================
// SUBSCRIPTION STATUS (Stripe)
// ============================================================================

export const SUBSCRIPTION_STATUSES = {
  TRIALING: 'trialing' as const,
  ACTIVE: 'active' as const,
  PAST_DUE: 'past_due' as const,
  CANCELED: 'canceled' as const,
  UNPAID: 'unpaid' as const,
  INCOMPLETE: 'incomplete' as const,
  INCOMPLETE_EXPIRED: 'incomplete_expired' as const,
} as const;

// ============================================================================
// BILLING CYCLES
// ============================================================================

export const BILLING_CYCLES = {
  MONTHLY: 'month' as const,
  YEARLY: 'year' as const,
} as const;

// ============================================================================
// COIN TRANSACTION TYPES
// ============================================================================

export const COIN_TRANSACTION_TYPES = {
  REWARD: 'reward' as const,
  PURCHASE: 'purchase' as const,
  REFUND: 'refund' as const,
  BOOST: 'boost' as const,
  GIFT: 'gift' as const,
  STREAK_BONUS: 'streak_bonus' as const,
  FIRST_VIP: 'first_vip_purchase' as const,
} as const;

// ============================================================================
// STRIPE EVENTS
// ============================================================================

export const STRIPE_EVENTS = {
  CUSTOMER_CREATED: 'customer.created' as const,
  CHARGE_SUCCEEDED: 'charge.succeeded' as const,
  CHARGE_FAILED: 'charge.failed' as const,
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded' as const,
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed' as const,
  SUBSCRIPTION_CREATED: 'customer.subscription.created' as const,
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated' as const,
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted' as const,
  INVOICE_CREATED: 'invoice.created' as const,
  INVOICE_FINALIZED: 'invoice.finalized' as const,
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded' as const,
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed' as const,
} as const;

// ============================================================================
// VALIDATION CONSTRAINTS
// ============================================================================

export const VALIDATION = {
  CONFESSION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 10000,
  },
  COMMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
  },
  EMAIL: {
    MAX_LENGTH: 254,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
} as const;

// ============================================================================
// RATE LIMITS
// ============================================================================

export const RATE_LIMITS = {
  CONFESSIONS_PER_HOUR: 5,
  CONFESSIONS_PER_DAY: 20,
  COMMENTS_PER_HOUR: 30,
  REPORTS_PER_HOUR: 10,
  MESSAGES_PER_MINUTE: 5,
} as const;

// ============================================================================
// TIME DURATIONS (milliseconds)
// ============================================================================

export const DURATIONS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// ROUTES
// ============================================================================

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  PROFILE: '/profile',
  EXPLORE: '/explore',
  BOOKMARKS: '/bookmarks',
  MESSAGES: '/messages',
  FOLLOWING: '/following',
  ADMIN: '/admin',
} as const;

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

export const LOCAL_STORAGE_KEYS = {
  LANGUAGE: 'language',
  THEME: 'theme',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  COOKIE_CONSENT: 'cookie_consent',
} as const;

// ============================================================================
// ANALYTICS EVENTS (Core product events)
// ============================================================================

export const ANALYTICS_EVENTS = {
  AUTH_SIGNUP: 'auth_signup',
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  CONFESSION_CREATED: 'confession_created',
  CONFESSION_DELETED: 'confession_deleted',
  CONFESSION_LIKED: 'confession_liked',
  CONFESSION_COMMENTED: 'confession_commented',
  CONFESSION_REPORTED: 'confession_reported',
  VIP_UPGRADE_COMPLETED: 'vip_upgrade_completed',
  VIP_UPGRADE_FAILED: 'vip_upgrade_failed',
  VIP_DOWNGRADE_COMPLETED: 'vip_downgrade_completed',
  COINS_PURCHASED: 'coins_purchased',
  COINS_USED: 'coins_used',
} as const;

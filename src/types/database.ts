/**
 * Supabase Database Type Extensions
 * Enhanced type safety for database operations
 */

import type { Database } from '@/integrations/supabase/types';

/**
 * Safe database query result wrapper
 */
export interface QueryResult<T> {
  data: T[] | null;
  error: QueryError | null;
  status: number;
  statusText: string;
}

/**
 * Database query error
 */
export interface QueryError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
}

/**
 * User profile extended
 */
export type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  vipStatus?: {
    isActive: boolean;
    expiresAt: string | null;
    renewsAt: string | null;
  };
};

/**
 * Confession data
 */
export type ConfessionData = Database['public']['Tables']['confessions']['Row'];

/**
 * Confession with user info
 */
export interface ConfessionWithAuthor extends ConfessionData {
  author?: UserProfile;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

/**
 * Comment data
 */
export type CommentData = Database['public']['Tables']['comments']['Row'];

/**
 * Comment with author info
 */
export interface CommentWithAuthor extends CommentData {
  author?: UserProfile;
  likesCount?: number;
  isLiked?: boolean;
}

/**
 * Subscription data
 */
export type SubscriptionData = Database['public']['Tables']['subscriptions']['Row'];

/**
 * Subscription with computed fields
 */
export interface SubscriptionWithStatus extends SubscriptionData {
  isActive: boolean;
  daysUntilRenewal: number | null;
  isTrialing: boolean;
  isPastDue: boolean;
}

/**
 * Payment record
 */
export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payment with details
 */
export interface PaymentWithDetails extends PaymentRecord {
  stripeChargeId?: string;
  stripePaymentIntentId?: string;
  amountFormatted?: string;
}

/**
 * Stripe event record
 */
export type StripeEventRecord = Database['public']['Tables']['stripe_events']['Row'];

/**
 * Report record - optional type (may not exist in schema)
 */
export interface ReportRecord {
  id: string;
  confessionId?: string;
  commentId?: string;
  reportedUserId?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

/**
 * Session record
 */
export type SessionRecord = Database['public']['Tables']['auth_sessions']['Row'];

/**
 * Audit log record - optional type (may not exist)
 */
export interface AuditLogRecord {
  id: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Analytics event
 */
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row'];

/**
 * Dynamic like/follow/bookmark support
 */
export interface InteractionRecord {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'confession' | 'comment' | 'user';
  interactionType: 'like' | 'follow' | 'bookmark';
  createdAt: string;
}

/**
 * RLS policy error codes
 */
export const RLS_ERRORS = {
  POLICY_VIOLATION: 'PGRST301',
  INSUFFICIENT_PRIVILEGE: 'PGRST304',
  AUTHENTICATION_REQUIRED: 'PGRST401',
} as const;

/**
 * Common database errors
 */
export const DB_ERRORS = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  PERMISSION_DENIED: 'PGRST304',
  NOT_FOUND: 'PGRST116',
} as const;

/**
 * Type guard for query result
 */
export function isQueryError(
  result: QueryResult<unknown>
): result is QueryResult<unknown> & { error: QueryError } {
  return result.error !== null;
}

/**
 * Type guard for data presence
 */
export function hasQueryData<T>(
  result: QueryResult<T>
): result is QueryResult<T> & { data: T[] } {
  return result.data !== null && result.data.length > 0;
}

/**
 * Type guard for single result
 */
export function getSingleResult<T>(
  result: QueryResult<T>
): T | null {
  return result.data?.[0] ?? null;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  offset?: number;
  range?: [number, number];
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hasMore: boolean;
}

/**
 * Sort options
 */
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  column: string;
  order: SortOrder;
}

/**
 * Filter options for common queries
 */
export interface FilterOptions {
  search?: string;
  userId?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

/**
 * Query builder helpers
 */
export interface QueryBuilder {
  select?: string;
  eq?: Record<string, unknown>;
  neq?: Record<string, unknown>;
  gt?: Record<string, unknown>;
  gte?: Record<string, unknown>;
  lt?: Record<string, unknown>;
  lte?: Record<string, unknown>;
  like?: Record<string, string>;
  ilike?: Record<string, string>;
  in?: Record<string, unknown[]>;
  order?: SortOption;
  limit?: number;
  offset?: number;
}

/**
 * Transaction wrapper
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: QueryError;
  rollback?: () => Promise<void>;
}

/**
 * Audit log event types
 */
export type AuditEventType =
  | 'CREATE_CONFESSION'
  | 'UPDATE_CONFESSION'
  | 'DELETE_CONFESSION'
  | 'CREATE_COMMENT'
  | 'DELETE_COMMENT'
  | 'LIKE_CONFESSION'
  | 'UNLIKE_CONFESSION'
  | 'BOOKMARK_CONFESSION'
  | 'UNBOOKMARK_CONFESSION'
  | 'FOLLOW_USER'
  | 'UNFOLLOW_USER'
  | 'SEND_MESSAGE'
  | 'DELETE_MESSAGE'
  | 'REPORT_CONTENT'
  | 'UPDATE_PROFILE'
  | 'UPDATE_SUBSCRIPTION'
  | 'PROCESS_PAYMENT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN';

/**
 * RLS context (auth context passed to policies)
 */
export interface RLSContext {
  userId: string;
  isAuthenticated: boolean;
  userRole: 'user' | 'moderator' | 'admin' | null;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: T; error: QueryError }>;
  total: number;
}

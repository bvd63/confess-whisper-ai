/**
 * API Response Type Definitions
 * Standardized response types for all API endpoints
 */

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMetadata;
  timestamp: number;
}

/**
 * Standardized error response
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

/**
 * API response metadata
 */
export interface APIMetadata {
  version?: string;
  requestId?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  cached?: boolean;
  processingTime?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasMore: boolean;
}

/**
 * List response
 */
export interface ListResponse<T> extends APIResponse<T[]> {
  meta?: APIMetadata & { pagination?: PaginationMeta };
}

/**
 * Error codes for different scenarios
 */
export const API_ERROR_CODES = {
  // Client errors
  INVALID_INPUT: 'INVALID_INPUT' as const,
  VALIDATION_ERROR: 'VALIDATION_ERROR' as const,
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD' as const,
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE' as const,
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED' as const,
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED' as const,
  INVALID_TOKEN: 'INVALID_TOKEN' as const,
  TOKEN_EXPIRED: 'TOKEN_EXPIRED' as const,
  SESSION_EXPIRED: 'SESSION_EXPIRED' as const,
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN' as const,
  PERMISSION_DENIED: 'PERMISSION_DENIED' as const,
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS' as const,
  RESOURCE_NOT_ACCESSIBLE: 'RESOURCE_NOT_ACCESSIBLE' as const,
  // Not found errors
  NOT_FOUND: 'NOT_FOUND' as const,
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND' as const,
  USER_NOT_FOUND: 'USER_NOT_FOUND' as const,
  // Conflict errors
  CONFLICT: 'CONFLICT' as const,
  RESOURCE_EXISTS: 'RESOURCE_EXISTS' as const,
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY' as const,
  // Rate limiting errors
  RATE_LIMITED: 'RATE_LIMITED' as const,
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS' as const,
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED' as const,
  STRIPE_ERROR: 'STRIPE_ERROR' as const,
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD' as const,
  PAYMENT_PROCESSING_ERROR: 'PAYMENT_PROCESSING_ERROR' as const,
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR' as const,
  DATABASE_ERROR: 'DATABASE_ERROR' as const,
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR' as const,
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE' as const,
} as const;

export type APIErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * HTTP status code mapping for API errors
 */
export const ERROR_STATUS_CODES: Record<APIErrorCode, number> = {
  INVALID_INPUT: 400,
  VALIDATION_ERROR: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_ENUM_VALUE: 400,
  UNAUTHORIZED: 401,
  AUTHENTICATION_REQUIRED: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  PERMISSION_DENIED: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  RESOURCE_NOT_ACCESSIBLE: 403,
  NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  CONFLICT: 409,
  RESOURCE_EXISTS: 409,
  DUPLICATE_ENTRY: 409,
  RATE_LIMITED: 429,
  TOO_MANY_REQUESTS: 429,
  PAYMENT_FAILED: 402,
  STRIPE_ERROR: 402,
  INVALID_PAYMENT_METHOD: 400,
  PAYMENT_PROCESSING_ERROR: 402,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 503,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Create error response
 */
export function createErrorResponse<T>(
  code: APIErrorCode,
  message: string,
  details?: Record<string, unknown>
): APIResponse<T> {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode: ERROR_STATUS_CODES[code],
      ...(details && { details }),
    },
    timestamp: Date.now(),
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: APIMetadata
): APIResponse<T> {
  return {
    success: true,
    data,
    meta,
    timestamp: Date.now(),
  };
}

/**
 * Create list response
 */
export function createListResponse<T>(
  data: T[],
  pagination?: PaginationMeta,
  meta?: Omit<APIMetadata, 'pagination'>
): ListResponse<T> {
  return {
    success: true,
    data,
    meta: {
      ...meta,
      pagination,
    },
    timestamp: Date.now(),
  };
}

/**
 * Confession API response types
 */
export interface ConfessionResponse {
  id: string;
  content: string;
  category: string;
  userId: string;
  author?: {
    id: string;
    username: string;
    avatar?: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Comment API response
 */
export interface CommentResponse {
  id: string;
  confessionId: string;
  content: string;
  userId: string;
  author?: {
    id: string;
    username: string;
    avatar?: string;
  };
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User profile response
 */
export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  confessionsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowed: boolean;
  vipStatus?: {
    isActive: boolean;
    tier: 'free' | 'vip';
    expiresAt?: string;
  };
  createdAt: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  user: UserProfileResponse;
  expiresIn: number;
}

/**
 * Subscription response
 */
export interface SubscriptionResponse {
  id: string;
  userId: string;
  tier: 'free' | 'vip';
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewsAt: string | null;
  canceledAt: string | null;
  features: SubscriptionFeatures;
}

/**
 * Subscription features
 */
export interface SubscriptionFeatures {
  maxConfessions: number;
  maxComments: number;
  hasAnalytics: boolean;
  hasAdTracking: boolean;
  hasCustomProfiles: boolean;
}

/**
 * Payment response
 */
export interface PaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  paymentMethod: string;
  createdAt: string;
  stripePaymentIntentId?: string;
}

/**
 * Validation error response (for forms)
 */
export interface ValidationErrorResponse {
  [field: string]: string | string[];
}

/**
 * Batch operation response
 */
export interface BatchOperationResponse<T> {
  successful: T[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

/**
 * Type guard for success response
 */
export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is APIResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

/**
 * Type guard for error response
 */
export function isErrorResponse<T>(
  response: APIResponse<T>
): response is APIResponse<T> & { error: APIError } {
  return !response.success && response.error !== undefined;
}

/**
 * Type guard for list response
 */
export function isListResponse<T>(
  response: APIResponse<T[] | T>
): response is ListResponse<T> {
  return Array.isArray(response.data);
}

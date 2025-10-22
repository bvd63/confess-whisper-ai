import { z } from 'zod';

/**
 * API Request/Response validation schemas
 * Ensures type safety and security for all edge function calls
 */

// Confession validation
export const confessionSchema = z.object({
  content: z.string().min(10, 'Content too short').max(5000, 'Content too long'),
  category: z.enum(['relationship', 'work', 'family', 'health', 'other', 'secret', 'mistake', 'regret']),
  mood: z.enum(['happy', 'sad', 'anxious', 'angry', 'neutral', 'excited', 'confused', 'hopeful']).optional(),
  mood_intensity: z.number().min(1).max(5).optional(),
  location_enabled: z.boolean().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  location_city: z.string().optional(),
  location_country: z.string().optional(),
  community_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  is_private: z.boolean().optional(),
});

export type ConfessionInput = z.infer<typeof confessionSchema>;

// AI request validation
export const aiRequestSchema = z.object({
  confession: z.string().min(10).max(5000),
  type: z.enum(['basic', 'deep']).default('basic'),
  language: z.enum(['en', 'es', 'de']).default('en'),
});

export type AIRequestInput = z.infer<typeof aiRequestSchema>;

// Moderation request
export const moderationRequestSchema = z.object({
  content: z.string().min(1).max(5000),
  language: z.enum(['en', 'es', 'de']).default('en'),
});

export type ModerationRequestInput = z.infer<typeof moderationRequestSchema>;

// Comment validation
export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  confession_id: z.string().uuid(),
});

export type CommentInput = z.infer<typeof commentSchema>;

// Message validation
export const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  conversation_id: z.string().uuid(),
});

export type MessageInput = z.infer<typeof messageSchema>;

// Subscription checkout
export const checkoutSchema = z.object({
  priceId: z.string().startsWith('price_'),
  planName: z.string(),
  billingCycle: z.enum(['monthly', 'yearly']),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Referral processing
export const referralSchema = z.object({
  referralCode: z.string().min(6).max(20),
});

export type ReferralInput = z.infer<typeof referralSchema>;

/**
 * Validate and sanitize input data
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
      };
    }
    return { success: false, error: 'Invalid input' };
  }
}

/**
 * Safe JSON parse with validation
 */
export function safeJsonParse<T>(
  json: string,
  schema: z.ZodSchema<T>
): T | null {
  try {
    const parsed = JSON.parse(json);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}

// Form field validation schemas (for tests)
export const contentSchema = z.string()
  .transform(s => s.trim())
  .pipe(
    z.string()
      .min(10, 'Content must be at least 10 characters')
      .max(10000, 'Content must not exceed 10000 characters')
  );

export const emailSchema = z.string()
  .transform(s => s.trim().toLowerCase())
  .pipe(z.string().email('Invalid email address'));

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nicknameSchema = z.string()
  .transform(s => s.trim())
  .pipe(
    z.string()
      .min(3, 'Nickname must be at least 3 characters')
      .max(30, 'Nickname must not exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Nickname can only contain letters, numbers, and underscores')
  );

export const bioSchema = z.string()
  .transform(s => s.trim())
  .pipe(z.string().max(500, 'Bio must not exceed 500 characters'))
  .optional()
  .or(z.literal(''));

export const urlSchema = z.union([
  z.literal(''),
  z.string().url('Invalid URL format'),
]).optional();

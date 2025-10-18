import { z } from 'zod';

// Confession schemas
export const confessionCreateSchema = z.object({
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must not exceed 5000 characters')
    .trim(),
  category: z.enum(['love', 'work', 'family', 'health', 'other']),
  is_private: z.boolean().optional().default(false),
  is_draft: z.boolean().optional().default(false),
  image_url: z.string().url().optional().nullable(),
  image_blurred: z.boolean().optional().default(false),
});

export const confessionUpdateSchema = confessionCreateSchema.partial();

// Comment schemas
export const commentCreateSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must not exceed 1000 characters')
    .trim(),
  confession_id: z.string().uuid('Invalid confession ID'),
});

// Message schemas
export const messageCreateSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must not exceed 2000 characters')
    .trim(),
  conversation_id: z.string().uuid('Invalid conversation ID'),
});

// Profile schemas
export const profileUpdateSchema = z.object({
  nickname: z.string()
    .min(3, 'Nickname must be at least 3 characters')
    .max(30, 'Nickname must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nickname can only contain letters, numbers, hyphens and underscores')
    .trim()
    .optional(),
  bio: z.string()
    .max(500, 'Bio must not exceed 500 characters')
    .trim()
    .optional(),
  privacy_mode: z.enum(['public', 'private', 'followers_only']).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  nickname: z.string()
    .min(3, 'Nickname must be at least 3 characters')
    .max(30, 'Nickname must not exceed 30 characters')
    .trim()
    .optional(),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Report schemas
export const reportCreateSchema = z.object({
  confession_id: z.string().uuid('Invalid confession ID'),
  reason: z.enum(['spam', 'harassment', 'violence', 'hate_speech', 'sexual_content', 'misinformation', 'other']),
  details: z.string()
    .max(1000, 'Details must not exceed 1000 characters')
    .trim()
    .optional(),
});

// Search schemas
export const searchQuerySchema = z.object({
  query: z.string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must not exceed 100 characters')
    .trim(),
  category: z.enum(['love', 'work', 'family', 'health', 'other']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

// UUID validation helper
export const uuidSchema = z.string().uuid('Invalid ID format');

// Generic validation helper
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

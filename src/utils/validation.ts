import { z } from 'zod';

// New schemas required by tests
export const contentSchema = z.string().min(10, "Content must be at least 10 characters");
export const emailSchema = z.string().email("Invalid email format");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const nameSchema = z.string().min(2, "Name must be at least 2 characters");
export const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone format");
export const urlSchema = z.string().url("Invalid URL format");
export const dateSchema = z.string().refine(val => !isNaN(Date.parse(val)), "Invalid date");
export const numberSchema = z.number().positive("Must be positive number");
export const booleanSchema = z.boolean();
export const arraySchema = z.array(z.string()).min(1, "Array cannot be empty");
export const objectSchema = z.object({ name: z.string(), value: z.string() }).strict();

// Confession validation (keeping existing schema)
export const confessionSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  isAnonymous: z.boolean().default(true),
  category: z.string().optional(),
});

// User validation (keeping existing schema)
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
});


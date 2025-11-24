/**
 * Stripe Integration - Secure Payment Processing
 * Handles all Stripe operations with security validations
 */

import crypto from 'crypto';

/**
 * Validate Stripe webhook signature
 * Prevents replay attacks and ensures authenticity
 */
export function validateStripeSignature(body: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  try {
    // Parse signature header
    const t = signature.split(',').find(el => el.startsWith('t='))?.split('=')[1];
    const v1 = signature.split(',').find(el => el.startsWith('v1='))?.split('=')[1];

    if (!t || !v1) {
      return false;
    }

    // Check timestamp (prevent replay attacks from > 5 minutes ago)
    const timestamp = parseInt(t, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return false;
    }

    // Compute HMAC SHA-256
    const signedContent = `${t}.${body}`;
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(v1),
      Buffer.from(hmac)
    );
  } catch {
    return false;
  }
}

/**
 * Create a Stripe PaymentIntent
 * Used for one-time payments (e.g., unlocking confessions)
 */
export interface CreatePaymentIntentOptions {
  amount: number; // in cents
  currency: string;
  userId: string;
  confessionId?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(_options: CreatePaymentIntentOptions) {
  // This would be implemented in a server-side API route
  // Client-side should call an API endpoint that uses Stripe SDK
  throw new Error('Use server-side API endpoint for payment intent creation');
}

/**
 * Create a Stripe subscription
 * Used for VIP tier subscriptions
 */
export interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  billingCycle: 'month' | 'year';
  userId: string;
  metadata?: Record<string, string>;
}

export async function createSubscription(_options: CreateSubscriptionOptions) {
  // This would be implemented in a server-side API route
  throw new Error('Use server-side API endpoint for subscription creation');
}

/**
 * Update subscription
 */
export interface UpdateSubscriptionOptions {
  subscriptionId: string;
  billingCycle?: 'month' | 'year';
  metadata?: Record<string, string>;
}

export async function updateSubscription(_options: UpdateSubscriptionOptions) {
  throw new Error('Use server-side API endpoint for subscription updates');
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(_subscriptionId: string) {
  throw new Error('Use server-side API endpoint for subscription cancellation');
}

/**
 * Retrieve customer
 */
export interface GetCustomerOptions {
  customerId?: string;
  email?: string;
}

export async function getCustomer(_options: GetCustomerOptions) {
  throw new Error('Use server-side API endpoint for customer retrieval');
}

/**
 * Get subscription details
 */
export async function getSubscription(_subscriptionId: string) {
  throw new Error('Use server-side API endpoint for subscription retrieval');
}

/**
 * Check if user has active VIP subscription
 */
export async function hasActiveVipSubscription(_userId: string): Promise<boolean> {
  // This should be called from a server-side function or API route
  // that checks the database for active VIP subscription
  throw new Error('Use server-side endpoint to check VIP status');
}

/**
 * List invoices for a customer
 */
export async function listInvoices(_customerId: string) {
  throw new Error('Use server-side API endpoint for invoice listing');
}

/**
 * Webhook event handlers
 */
export type StripeWebhookEvent =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'charge.succeeded'
  | 'charge.failed';

export interface StripeWebhookHandler {
  (event: any): Promise<void>;
}

export const webhookHandlers: Record<StripeWebhookEvent, StripeWebhookHandler> = {
  'customer.subscription.created': async (_event) => {
    // Update user's subscription status in database
  },
  'customer.subscription.updated': async (_event) => {
    // Update user's subscription details
  },
  'customer.subscription.deleted': async (_event) => {
    // Update user back to free tier
  },
  'invoice.paid': async (_event) => {
    // Log payment received
  },
  'invoice.payment_failed': async (_event) => {
    // Notify user of payment failure
  },
  'charge.succeeded': async (_event) => {
    // Update payment records
  },
  'charge.failed': async (_event) => {
    // Log failed charge
  },
};

/**
 * Format amount for display
 */
export function formatAmount(amountInCents: number, currency: string = 'USD'): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Validate amount (prevent negative or excessive amounts)
 */
export function validateAmount(amountInCents: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(amountInCents)) {
    return { valid: false, error: 'Amount must be an integer' };
  }

  if (amountInCents < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  if (amountInCents < 50) {
    return { valid: false, error: 'Amount must be at least $0.50' };
  }

  if (amountInCents > 99999900) {
    // $999,999.00 limit
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  return { valid: true };
}

/**
 * Get public key for client-side Stripe.js
 * Note: Configure VITE_STRIPE_PUBLIC_KEY in environment variables
 */
export function getStripePublicKey(): string {
  // Public key should be added to env configuration
  // For now, this throws to indicate configuration needed
  throw new Error('Stripe public key not configured - add VITE_STRIPE_PUBLIC_KEY to environment');
}

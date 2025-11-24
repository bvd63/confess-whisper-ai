/**
 * Stripe Type Definitions
 * Comprehensive type safety for Stripe integration
 */

/**
 * Stripe Customer object
 */
export interface StripeCustomer {
  id: string;
  object: 'customer';
  email: string | null;
  description: string | null;
  created: number;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Stripe Subscription object
 */
export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string; // Customer ID
  status: SubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at: number | null;
  canceled_at: number | null;
  ended_at: number | null;
  billing_cycle_anchor: number;
  latest_invoice: string | null; // Invoice ID
  items: {
    object: 'list';
    data: SubscriptionItem[];
  };
  metadata: Record<string, string | number | boolean>;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

/**
 * Subscription item (price + quantity)
 */
export interface SubscriptionItem {
  id: string;
  object: 'subscription_item';
  subscription: string;
  price: StripePrice | string; // Can be ID or full object
  quantity: number;
  billing_thresholds: { usage_gte: number | null } | null;
}

/**
 * Stripe Price object (former SKU)
 */
export interface StripePrice {
  id: string;
  object: 'price';
  active: boolean;
  billing_scheme: 'per_unit' | 'tiered';
  created: number;
  currency: string;
  custom_unit_amount: { maximum: number | null; minimum: number | null; preset: number | null } | null;
  livemode: boolean;
  lookup_key: string | null;
  metadata: Record<string, string | number | boolean>;
  nickname: string | null;
  product: string; // Product ID
  recurring: {
    aggregate_usage: 'last_during_period' | 'last_ever' | 'max' | 'sum' | null;
    interval: 'day' | 'month' | 'week' | 'year';
    interval_count: number;
    trial_period_days: number | null;
    usage_type: 'licensed' | 'metered';
  } | null;
  tax_behavior: 'exclusive' | 'inclusive' | 'unspecified';
  tiers_mode: 'graduated' | 'volume' | null;
  transform_quantity: { divide_by: number; round: 'ceiling' | 'down' | 'up' } | null;
  type: 'one_time' | 'recurring';
  unit_amount: number | null; // Amount in smallest currency unit (cents for USD)
  unit_amount_decimal: string | null;
}

/**
 * Stripe PaymentIntent
 */
export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number; // Amount in smallest currency unit
  amount_capturable: number;
  amount_received: number;
  application: string | null;
  automatic_payment_methods: { enabled: boolean } | null;
  canceled_at: number | null;
  cancellation_reason: string | null;
  capture_method: 'automatic' | 'manual';
  charges: {
    object: 'list';
    data: StripeCharge[];
  };
  client_secret: string | null;
  confirmation_method: 'automatic' | 'manual';
  created: number;
  currency: string;
  customer: string | null; // Customer ID
  description: string | null;
  last_payment_error: { message: string } | null;
  livemode: boolean;
  metadata: Record<string, string | number | boolean>;
  next_action: { type: string; use_stripe_sdk: boolean } | null;
  on_behalf_of: string | null;
  payment_method: string | null;
  payment_method_options: Record<string, unknown>;
  payment_method_types: string[];
  receipt_email: string | null;
  review: string | null;
  setup_future_usage: 'off_session' | 'on_session' | null;
  shipping: unknown | null;
  statement_descriptor: string | null;
  statement_descriptor_suffix: string | null;
  status: PaymentIntentStatus;
  transfer_data: { destination: string } | null;
}

export type PaymentIntentStatus =
  | 'canceled'
  | 'processing'
  | 'requires_action'
  | 'requires_capture'
  | 'requires_confirmation'
  | 'requires_payment_method'
  | 'succeeded';

/**
 * Stripe Charge object
 */
export interface StripeCharge {
  id: string;
  object: 'charge';
  amount: number;
  amount_captured: number;
  amount_refunded: number;
  balance_transaction: string;
  billing_details: Record<string, unknown> | null;
  created: number;
  currency: string;
  customer: string | null;
  description: string | null;
  failure_code: string | null;
  failure_message: string | null;
  fraud_details: { user_report: 'fraudulent' | 'safe' } | null;
  livemode: boolean;
  metadata: Record<string, string | number | boolean>;
  outcome: { network_status: string; reason: string | null; risk_level: string; risk_score: number; type: string };
  paid: boolean;
  payment_intent: string | null;
  payment_method: string | null;
  receipt_email: string | null;
  receipt_number: string | null;
  receipt_url: string;
  refunded: boolean;
  refunds: { object: 'list'; data: StripeRefund[] };
  statement_descriptor: string | null;
  status: 'failed' | 'succeeded';
}

/**
 * Stripe Refund object
 */
export interface StripeRefund {
  id: string;
  object: 'refund';
  amount: number;
  balance_transaction: string | null;
  charge: string;
  created: number;
  currency: string;
  metadata: Record<string, string | number | boolean>;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | null;
  receipt_number: string | null;
  source_transfer_reversal: string | null;
  status: 'failed' | 'succeeded';
  transfer_reversal: string | null;
}

/**
 * Stripe Invoice
 */
export interface StripeInvoice {
  id: string;
  object: 'invoice';
  account_country: string | null;
  account_name: string | null;
  account_tax_ids: string[] | null;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  application: string | null;
  attempt_count: number;
  attempted: boolean;
  auto_advance: boolean;
  automatic_tax: { enabled: boolean; status: 'complete' | 'failed' | 'requires_location_inputs' | null };
  billing_reason: 'automatic_pending_invoice_item_invoice' | 'manual' | 'subscription' | 'subscription_cycle' | 'subscription_threshold' | null;
  charge: string | null;
  collection_method: 'charge_automatically' | 'send_invoice';
  created: number;
  currency: string;
  custom_fields: Array<{ name: string; value: string }> | null;
  customer: string; // Customer ID
  customer_address: Record<string, unknown> | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_tax_exempt: 'exempt' | 'none' | 'reverse';
  customer_tax_ids: string[] | null;
  default_payment_method: string | null;
  default_source: string | null;
  default_tax_rates: string[];
  description: string | null;
  discounts: Array<{ discount: string; coupon?: { id: string } }>;
  due_date: number | null;
  effective_at: number | null;
  email: string | null;
  ending_balance: number | null;
  error: { code: string; doc_url: string; message: string; param: string; payment_intent: string; payment_method: string; type: string } | null;
  footer: string | null;
  from_invoice: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  last_finalization_error: { code: string; doc_url: string; message: string; param: string; type: string } | null;
  lines: { object: 'list'; data: StripeInvoiceLine[] };
  livemode: boolean;
  metadata: Record<string, string | number | boolean>;
  next_payment_attempt: number | null;
  number: string | null;
  on_behalf_of: string | null;
  paid: boolean;
  paid_out_of_band: boolean;
  payment_intent: string | null;
  payment_settings: { custom_fields: unknown; default_mandate: string | null; payment_method_options: unknown; payment_method_types: string[] | null; save_default_payment_method: 'off' | 'on_subscription' | null };
  period_end: number;
  period_start: number;
  post_payment_actions: { invoices_to_void: string[] };
  quote: string | null;
  receipt_number: string | null;
  rendering_options: Record<string, unknown> | null;
  rendering: { amount_due_currency_format: string; amount_due_display: string; amount_paid_currency_format: string; amount_paid_display: string; amount_remaining_currency_format: string; amount_remaining_display: string; pdf: unknown };
  rendering_paid_out_of_band_display: string | null;
  rendering_statement_description_display: string | null;
  rendering_total_tax_amount_display: string | null;
  rendering_total_unsigned_amount_display: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  status_transitions: { finalized_at: number | null; marked_uncollectible_at: number | null; paid_at: number | null; voided_at: number | null };
  statement_descriptor: string | null;
  subscription: string | null;
  subtotal: number;
  subtotal_excluding_tax: number | null;
  tax: number | null;
  test_clock: string | null;
  threshold_reason: { amount_gte: number; item_reasons: Array<{ line_item_id: string; usage_gte: number }> } | null;
  total: number;
  total_discount_amounts: Array<{ amount: number; discount: string }>;
  total_excluding_tax: number | null;
  total_tax_amounts: Array<{ amount: number; inclusive: boolean; tax_rate: string }>;
  transfer_data: { destination: string } | null;
  transfer_payment_id: string | null;
  url: string;
  webhooks_delivered_at: number | null;
}

/**
 * Invoice line item
 */
export interface StripeInvoiceLine {
  id: string;
  object: 'line_item';
  amount: number;
  amount_excluding_tax: number | null;
  billing_thresholds: { usage_gte: number } | null;
  currency: string;
  custom_fields: Array<{ name: string; value: string }> | null;
  description: string | null;
  discount_amounts: Array<{ amount: number; discount: string }>;
  discountable: boolean;
  discounts: string[];
  invoice: string;
  livemode: boolean;
  metadata: Record<string, string | number | boolean>;
  period: { end: number; start: number };
  price: StripePrice | string;
  proration: boolean;
  proration_details: { credited_items: Array<{ invoice_line_item: string }> | null } | null;
  quantity: number | null;
  subscription: string | null;
  subscription_item: string | null;
  tax_amounts: Array<{ amount: number; inclusive: boolean; tax_rate: string | StripePrice }>;
  tax_code: string;
  type: 'invoiceitem' | 'subscription';
  unit_amount_excluding_tax: number | null;
}

/**
 * Webhook event types
 */
export type StripeWebhookEventType =
  | 'charge.captured'
  | 'charge.expired'
  | 'charge.failed'
  | 'charge.pending'
  | 'charge.refunded'
  | 'charge.succeeded'
  | 'charge.updated'
  | 'charge.dispute.closed'
  | 'charge.dispute.created'
  | 'charge.dispute.funds_reinstated'
  | 'charge.dispute.funds_withdrawn'
  | 'charge.dispute.updated'
  | 'customer.created'
  | 'customer.deleted'
  | 'customer.updated'
  | 'customer.discount.created'
  | 'customer.discount.deleted'
  | 'customer.discount.updated'
  | 'customer.source.created'
  | 'customer.source.deleted'
  | 'customer.source.expiring'
  | 'customer.source.updated'
  | 'customer.subscription.created'
  | 'customer.subscription.deleted'
  | 'customer.subscription.paused'
  | 'customer.subscription.pending_update_applied'
  | 'customer.subscription.pending_update_expired'
  | 'customer.subscription.resumed'
  | 'customer.subscription.trial_will_end'
  | 'customer.subscription.updated'
  | 'invoice.created'
  | 'invoice.deleted'
  | 'invoice.finalization_failed'
  | 'invoice.finalized'
  | 'invoice.marked_uncollectible'
  | 'invoice.paid'
  | 'invoice.payment_action_required'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded'
  | 'invoice.sent'
  | 'invoice.upcoming'
  | 'invoice.updated'
  | 'invoice.voided'
  | 'invoice.will_be_due'
  | 'invoiceitem.created'
  | 'invoiceitem.deleted'
  | 'invoiceitem.updated'
  | 'payment_intent.amount_capturable_updated'
  | 'payment_intent.canceled'
  | 'payment_intent.created'
  | 'payment_intent.payment_failed'
  | 'payment_intent.processing'
  | 'payment_intent.succeeded'
  | 'payment_method.attached'
  | 'payment_method.automatically_updated'
  | 'payment_method.detached'
  | 'payment_method.updated'
  | 'plan.created'
  | 'plan.deleted'
  | 'plan.updated'
  | 'price.created'
  | 'price.deleted'
  | 'price.updated'
  | 'product.created'
  | 'product.deleted'
  | 'product.updated'
  | 'refund.created'
  | 'refund.updated'
  | 'subscription_schedule.aborted'
  | 'subscription_schedule.canceled'
  | 'subscription_schedule.completed'
  | 'subscription_schedule.created'
  | 'subscription_schedule.expiring'
  | 'subscription_schedule.released'
  | 'subscription_schedule.updated';

/**
 * Webhook event wrapper
 */
export interface StripeWebhookEvent<T = unknown> {
  id: string;
  object: 'event';
  api_version: string | null;
  created: number;
  data: {
    object: T;
    previous_attributes?: Record<string, unknown>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeWebhookEventType;
}

/**
 * Stripe API error
 */
export interface StripeError {
  charge: string | null;
  code: string | null;
  decline_code: string | null;
  doc_url: string;
  message: string;
  param: string | null;
  payment_intent: StripePaymentIntent | null;
  payment_method: unknown | null;
  payment_method_type: string | null;
  setup_intent: unknown | null;
  type: 'api_connection_error' | 'api_error' | 'authentication_error' | 'card_error' | 'invalid_request_error' | 'oauth_error' | 'rate_limit_error';
}

/**
 * Stripe API response
 */
export interface StripeResponse<T> {
  object: T extends { object: infer O } ? O : string;
  [key: string]: unknown;
}

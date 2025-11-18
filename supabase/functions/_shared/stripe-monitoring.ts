export type StripeMonitorComponent =
  | "stripe-webhook"
  | "create-checkout"
  | "manage-subscription"
  | "fix-subscription-sync";

type Severity = "info" | "warn" | "error";

type StripeMonitorEventName =
  | "webhook_received"
  | "webhook_signature_missing"
  | "webhook_signature_stale"
  | "webhook_signature_invalid"
  | "webhook_duplicate_event"
  | "webhook_processing_error"
  | "price_allowlist"
  | "subscription_sync"
  | "checkout_session_created";

export interface StripeMonitorEventInput {
  component: StripeMonitorComponent;
  event: StripeMonitorEventName;
  severity?: Severity;
  metadata?: Record<string, unknown>;
  correlationId?: string | null;
}

export interface StripeMonitorPayload extends Required<Omit<StripeMonitorEventInput, "severity">> {
  severity: Severity;
  metadata: Record<string, unknown>;
  timestamp: string;
  source: "stripe-monitoring";
}

const defaultLoggers = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

export const buildStripeMonitorPayload = (
  input: StripeMonitorEventInput,
  now: Date = new Date(),
): StripeMonitorPayload => ({
  component: input.component,
  event: input.event,
  severity: input.severity ?? "info",
  metadata: input.metadata ?? {},
  correlationId: input.correlationId ?? null,
  timestamp: now.toISOString(),
  source: "stripe-monitoring",
});

export const emitStripeMonitorEvent = (
  input: StripeMonitorEventInput,
  loggers = defaultLoggers,
) => {
  const payload = buildStripeMonitorPayload(input);
  const writer =
    payload.severity === "error"
      ? loggers.error ?? defaultLoggers.error
      : payload.severity === "warn"
      ? loggers.warn ?? loggers.info ?? defaultLoggers.warn
      : loggers.info ?? defaultLoggers.info;
  writer(JSON.stringify(payload));
  return payload;
};

export interface SubscriptionSyncTelemetryInput {
  component: StripeMonitorComponent;
  userId: string;
  stripeStatus?: string | null;
  resolvedTier?: string | null;
  existingTier?: string | null;
  priceId?: string | null;
}

export const buildSubscriptionSyncTelemetry = (
  input: SubscriptionSyncTelemetryInput,
) => {
  const mismatch = Boolean(
    input.existingTier && input.resolvedTier && input.existingTier !== input.resolvedTier,
  );
  const severity: Severity = mismatch ? "warn" : "info";
  return buildStripeMonitorPayload({
    component: input.component,
    event: "subscription_sync",
    severity,
    metadata: {
      userId: input.userId,
      stripeStatus: input.stripeStatus ?? null,
      resolvedTier: input.resolvedTier ?? null,
      existingTier: input.existingTier ?? null,
      priceId: input.priceId ?? null,
      mismatch,
    },
  });
};

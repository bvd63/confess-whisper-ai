export interface StripeWebhookValidationSuccess<TEvent> {
  ok: true;
  event: TEvent;
}

export interface StripeWebhookValidationFailure {
  ok: false;
  status: 400;
  error: "MISSING_SIGNATURE_OR_SECRET" | "INVALID_SIGNATURE";
}

export const validateStripeWebhookEvent = async <TEvent>({
  signature,
  webhookSecret,
  rawBody,
  constructEvent,
}: {
  signature: string | null | undefined;
  webhookSecret: string | null | undefined;
  rawBody: string;
  constructEvent: (body: string, signature: string, webhookSecret: string) => Promise<TEvent> | TEvent;
}): Promise<StripeWebhookValidationSuccess<TEvent> | StripeWebhookValidationFailure> => {
  if (!signature || !webhookSecret) {
    return { ok: false, status: 400, error: "MISSING_SIGNATURE_OR_SECRET" };
  }

  try {
    const event = await constructEvent(rawBody, signature, webhookSecret);
    return { ok: true, event };
  } catch {
    return { ok: false, status: 400, error: "INVALID_SIGNATURE" };
  }
};

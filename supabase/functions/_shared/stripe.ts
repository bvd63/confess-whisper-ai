import Stripe from "https://esm.sh/stripe@18.5.0";

export const STRIPE_API_VERSION = "2025-08-27.basil";

export const createStripeClient = (secretKey: string) =>
  new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });

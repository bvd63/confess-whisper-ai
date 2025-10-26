// filepath: components/billing/SubscriptionPlansGrid.tsx
import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// Dacă în proiectul tău se folosește getSupabase(), înlocuiește linia de mai jos cu:
// import { getSupabase } from '@/lib/supabaseClient';
// const supabase = getSupabase();
import { supabase } from "@/lib/supabaseClient";

type Interval = "monthly" | "yearly";

interface Plan {
  id: "vip";
  name: string;
  description?: string;
  interval: Interval;
  priceLabel: string; // "$6.99/mo" sau "$54.99/yr"
  priceId: string; // Stripe price_xxx
}

interface SubscriptionPlansGridProps {
  /** Din profilul userului; folosește asta pentru gating UI */
  isVip: boolean;
  /** Pentru afișare/logică (nu mai folosim la decizie de portal/checkout) */
  currentPlan?: string; // 'free' | 'vip' | undefined
  currentInterval?: Interval; // 'monthly' | 'yearly' | undefined

  /** Lovable action pentru CHECKOUT (dacă există deja). Dacă nu, folosim fallback local. */
  onSelectPlan?: (planId: string, priceId: string) => void;

  /** UI state opțional */
  isLoading?: boolean;
  canChangePlan?: boolean;

  /** Toggle Monthly/Yearly în UI */
  interval: Interval;
  onIntervalChange?: (interval: Interval) => void;
}

/** Setează-ți aici price IDs reale din Stripe sau prin env (preferat) */
const VIP_MONTH_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_VIP_MONTH ?? "price_vip_month_699_placeholder";
const VIP_YEAR_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_VIP_YEAR ?? "price_vip_year_5499_placeholder";

const SubscriptionPlansGrid: React.FC<SubscriptionPlansGridProps> = ({
  isVip,
  currentPlan,
  currentInterval,
  onSelectPlan,
  isLoading = false,
  canChangePlan = true,
  interval,
  onIntervalChange,
}) => {
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Planul VIP pentru ambele intervale
  const allPlans: Plan[] = useMemo(
    () => [
      {
        id: "vip",
        name: "VIP",
        description: "Unlock all premium features.",
        interval: "monthly",
        priceLabel: "$6.99/mo",
        priceId: VIP_MONTH_PRICE_ID,
      },
      {
        id: "vip",
        name: "VIP",
        description: "Unlock all premium features.",
        interval: "yearly",
        priceLabel: "$54.99/yr",
        priceId: VIP_YEAR_PRICE_ID,
      },
    ],
    [],
  );

  // Afișăm cardul doar pentru intervalul selectat în UI
  const plans = useMemo(() => allPlans.filter((p) => p.interval === interval), [allPlans, interval]);

  const openCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { returnUrl: `${window.location.origin}/settings/billing` },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Customer Portal URL missing.");
      window.location.href = data.url; // → Stripe Customer Portal
    } catch (err) {
      console.error("[Portal] error:", err);
      alert("Could not open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  /** Fallback local pentru Lovable dacă nu ai onSelectPlan trecut din părinte.
   *  Preferat: treci onSelectPlan din părinte care cheamă direct Lovable Action "Create Checkout Session"
   */
  const fallbackCheckout = async (priceId: string) => {
    try {
      setCheckoutLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          mode: "subscription",
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Checkout URL missing.");
      window.location.href = data.url; // → Stripe Checkout
    } catch (err) {
      console.error("[Checkout] error:", err);
      alert("Could not start checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const startCheckout = (priceId: string) => {
    if (onSelectPlan) {
      // folosește acțiunea Lovable definită deja în părinte
      onSelectPlan("vip", priceId);
    } else {
      // fallback local prin edge function
      void fallbackCheckout(priceId);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Toggle interval (opțional) */}
      {onIntervalChange && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={interval === "monthly" ? "default" : "outline"}
            onClick={() => onIntervalChange("monthly")}
            disabled={checkoutLoading || portalLoading}
          >
            Monthly
          </Button>
          <Button
            variant={interval === "yearly" ? "default" : "outline"}
            onClick={() => onIntervalChange("yearly")}
            disabled={checkoutLoading || portalLoading}
          >
            Yearly
          </Button>
        </div>
      )}

      {plans.map((plan) => (
        <div key={`${plan.id}-${plan.interval}`} className="rounded-2xl border p-5 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">{plan.name}</div>
            <div className="text-muted-foreground">{plan.description}</div>
            <div className="mt-2 text-2xl font-bold">{plan.priceLabel}</div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* SUBSCRIBE: vizibil DOAR când NU e VIP → Stripe Checkout */}
            {!isVip && (
              <Button
                onClick={() => startCheckout(plan.priceId)}
                disabled={checkoutLoading || isLoading || !canChangePlan}
              >
                {checkoutLoading
                  ? "Redirecting…"
                  : plan.interval === "monthly"
                    ? "Subscribe (Monthly)"
                    : "Subscribe (Yearly)"}
              </Button>
            )}

            {/* MANAGE: vizibil DOAR când E VIP → Customer Portal */}
            {isVip && (
              <Button variant="secondary" onClick={openCustomerPortal} disabled={portalLoading}>
                {portalLoading ? "Opening Portal…" : "Manage subscription"}
              </Button>
            )}

            {/* Hint pentru claritate */}
            <div className="text-xs text-muted-foreground text-right">
              {!isVip
                ? "You will be redirected to Stripe Checkout to complete your purchase."
                : "Update card, change plan, or cancel in the Stripe billing portal."}
            </div>
          </div>
        </div>
      ))}

      <div className="text-xs text-muted-foreground text-center">
        After purchase you will return to the app. Benefits unlock instantly.
      </div>
    </div>
  );
};

export default SubscriptionPlansGrid;

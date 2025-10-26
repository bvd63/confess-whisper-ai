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
  price: string; // ex: "$6.99/mo" sau "$54.99/yr"
  priceId: string; // Stripe price_xxx
}

interface SubscriptionPlansGridProps {
  /** Plan-ul curent din profil (ex: 'free' | 'vip') */
  currentPlan: string;
  /** Intervalul curent al planului din profil (opțional) */
  currentInterval?: Interval;
  /** Callback pentru a deschide CHECKOUT (creează/achiziționează abonament) */
  onSelectPlan: (planId: string, priceId: string) => void;
  /** UI state */
  isLoading?: boolean;
  canChangePlan?: boolean;
  trialEligible?: boolean;
  /** Interval selectat în UI (comutator monthly/yearly) */
  interval: Interval;
  onIntervalChange?: (interval: Interval) => void;
  /** Flag explicit din profil (mai sigur decât currentPlan) */
  isVip?: boolean;
}

/** TODO: pune aici price IDs reale din Stripe, dacă nu vin din props/store */
const VIP_MONTH_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_VIP_MONTH ?? "price_vip_month_699_placeholder";
const VIP_YEAR_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_VIP_YEAR ?? "price_vip_year_5499_placeholder";

const SubscriptionPlansGrid: React.FC<SubscriptionPlansGridProps> = ({
  currentPlan,
  currentInterval,
  onSelectPlan,
  isLoading = false,
  canChangePlan = true,
  trialEligible = false,
  interval,
  onIntervalChange,
  isVip,
}) => {
  // Guard unic: dacă avem isVip din profil, îl folosim. Altfel deducem din currentPlan.
  const hasActiveSubscription = typeof isVip === "boolean" ? isVip : currentPlan === "vip";

  const [portalLoading, setPortalLoading] = useState(false);

  // Definim planul VIP pentru ambele intervale.
  const allPlans: Plan[] = useMemo(
    () => [
      {
        id: "vip",
        name: "VIP",
        description: "Unlock all premium features.",
        interval: "monthly",
        price: "$6.99/mo",
        priceId: VIP_MONTH_PRICE_ID,
      },
      {
        id: "vip",
        name: "VIP",
        description: "Unlock all premium features.",
        interval: "yearly",
        price: "$54.99/yr",
        priceId: VIP_YEAR_PRICE_ID,
      },
    ],
    [],
  );

  // Afișăm un singur card, în funcție de intervalul selectat în UI.
  const plans = useMemo(() => allPlans.filter((p) => p.interval === interval), [allPlans, interval]);

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { returnUrl: `${window.location.origin}/settings/billing` },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url; // → Stripe Customer Portal
      } else {
        throw new Error("Customer Portal URL missing.");
      }
    } catch (err) {
      console.error("[Portal] error:", err);
      alert("Could not open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const getButtonLabel = (p: Plan) => {
    if (hasActiveSubscription) {
      return portalLoading ? "Opening Portal…" : "Manage Subscription";
    }
    // Not VIP yet → call to action for checkout
    return p.interval === "monthly" ? "Choose VIP (Monthly)" : "Choose VIP (Yearly)";
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Interval toggle (dacă vrei switch vizibil) */}
      {onIntervalChange && (
        <div className="flex items-center justify-center gap-2">
          <Button variant={interval === "monthly" ? "default" : "outline"} onClick={() => onIntervalChange("monthly")}>
            Monthly
          </Button>
          <Button variant={interval === "yearly" ? "default" : "outline"} onClick={() => onIntervalChange("yearly")}>
            Yearly
          </Button>
        </div>
      )}

      {plans.map((plan) => (
        <div key={`${plan.id}-${plan.interval}`} className="rounded-2xl border p-5 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">{plan.name}</div>
            <div className="text-muted-foreground">{plan.description}</div>
            <div className="mt-2 text-2xl font-bold">{plan.price}</div>
            {trialEligible && !hasActiveSubscription && (
              <div className="mt-1 text-xs text-emerald-600">Trial eligible</div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => {
                if (hasActiveSubscription) {
                  // Are abonament activ → Portal (manage)
                  handleOpenPortal();
                } else {
                  // Nu are abonament → Checkout (first-time buy)
                  onSelectPlan(plan.id, plan.priceId);
                }
              }}
              disabled={portalLoading || ((isLoading || !canChangePlan) && !hasActiveSubscription)}
            >
              {getButtonLabel(plan)}
            </Button>

            {/* Hint mic pentru claritate UX */}
            <div className="text-xs text-muted-foreground text-right">
              {hasActiveSubscription
                ? "Update card, change plan or cancel in the billing portal."
                : "You will be redirected to Stripe Checkout to complete your purchase."}
            </div>
          </div>
        </div>
      ))}

      {/* Note utile pentru utilizator (opțional – poți elimina) */}
      <div className="text-xs text-muted-foreground text-center">
        After purchase you will be returned to the app. Benefits unlock instantly.
      </div>
    </div>
  );
};

export default SubscriptionPlansGrid;

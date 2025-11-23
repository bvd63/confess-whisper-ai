import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function SubscriptionTest() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const showError = (error: unknown) => {
    const description = error instanceof Error ? error.message : 'An unexpected error occurred.';
    toast({
      title: 'Error',
      description,
      variant: 'destructive',
    });
  };

  const checkSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setStatus(data);
      toast({
        title: "Subscription Status",
        description: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      
      if (data?.hasActiveSubscription) {
        toast({
          title: "Active Subscription",
          description: data.message || "You already have an active subscription.",
        });
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Subscription Testing</h1>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Test Actions</h2>
        
        <div className="space-y-2">
          <Button 
            onClick={checkSubscription}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Check Subscription Status"}
          </Button>

          <Button 
            onClick={createCheckout}
            disabled={loading}
            className="w-full"
            variant="secondary"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Create Checkout (VIP)"}
          </Button>

          <Button 
            onClick={openPortal}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Open Customer Portal"}
          </Button>
        </div>
      </Card>

      {status && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <pre className="bg-muted p-4 rounded overflow-auto text-sm">
            {JSON.stringify(status, null, 2)}
          </pre>
        </Card>
      )}

      <Card className="p-6 space-y-2">
        <h2 className="text-xl font-semibold">Test Cards</h2>
        <p className="text-sm text-muted-foreground">Use these Stripe test cards:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Success:</strong> 4242 4242 4242 4242</li>
          <li><strong>Decline:</strong> 4000 0000 0000 0002</li>
          <li><strong>Auth Required:</strong> 4000 0025 0000 3155</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          Use any future expiry date, any 3-digit CVC, any 5-digit ZIP.
        </p>
      </Card>
    </div>
  );
}

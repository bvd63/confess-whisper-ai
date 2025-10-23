import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Crown, Zap } from "lucide-react";

type TestResult = {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
};

export default function TestSubscriptions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTest = async (
    testName: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> => {
    setLoading(testName);
    try {
      const data = await testFn();
      const result = { name: testName, success: true, data };
      setResults((prev) => [...prev, result]);
      toast({ title: `✅ ${testName}`, description: "Test passed" });
      return result;
    } catch (error: any) {
      const result = {
        name: testName,
        success: false,
        error: error.message,
      };
      setResults((prev) => [...prev, result]);
      toast({
        title: `❌ ${testName}`,
        description: error.message,
        variant: "destructive",
      });
      return result;
    } finally {
      setLoading(null);
    }
  };

  // Test 1: Check Subscription Status
  const testCheckSubscription = () =>
    runTest("Check Subscription", async () => {
      const { data, error } = await supabase.functions.invoke(
        "check-subscription"
      );
      if (error) throw error;
      return data;
    });

  // Test 2: Get Subscription Status (detailed)
  const testGetSubscriptionStatus = () =>
    runTest("Get Subscription Status", async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-subscription-status"
      );
      if (error) throw error;
      return data;
    });

  // Test 3: Create Checkout Session (Premium Monthly)
  const testCreateCheckout = () =>
    runTest("Create Checkout (Premium Monthly)", async () => {
      const { data, error } = await supabase.functions.invoke("billing-buy", {
        body: { tier: "premium", cycle: "monthly" },
      });
      if (error) throw error;
      toast({
        title: "Checkout URL Ready",
        description: "Check console for URL",
      });
      console.log("Checkout URL:", data.url);
      return data;
    });

  // Test 4: Preview Upgrade (if subscribed)
  const testPreviewUpgrade = () =>
    runTest("Preview Upgrade to VIP", async () => {
      const { data, error } = await supabase.functions.invoke(
        "billing-preview",
        {
          body: { targetPriceId: "vip_monthly" },
        }
      );
      if (error) throw error;
      return data;
    });

  // Test 5: Upgrade Subscription
  const testUpgrade = () =>
    runTest("Upgrade to VIP Monthly", async () => {
      const { data, error } = await supabase.functions.invoke(
        "manage-subscription-v2",
        {
          body: { action: "upgrade", targetTier: "vip" },
        }
      );
      if (error) throw error;
      return data;
    });

  // Test 6: Downgrade Subscription
  const testDowngrade = () =>
    runTest("Downgrade to Premium Monthly", async () => {
      const { data, error } = await supabase.functions.invoke(
        "manage-subscription-v2",
        {
          body: { action: "downgrade", targetTier: "premium" },
        }
      );
      if (error) throw error;
      return data;
    });

  // Test 7: Cancel Subscription
  const testCancel = () =>
    runTest("Cancel Subscription", async () => {
      const { data, error } = await supabase.functions.invoke(
        "billing-cancel"
      );
      if (error) throw error;
      return data;
    });

  // Test 8: Reactivate Subscription
  const testReactivate = () =>
    runTest("Reactivate Subscription", async () => {
      const { data, error } = await supabase.functions.invoke(
        "billing-reactivate"
      );
      if (error) throw error;
      return data;
    });

  // Test 9: Fix Subscription Sync
  const testFixSync = () =>
    runTest("Fix Subscription Sync", async () => {
      const { data, error } = await supabase.functions.invoke(
        "fix-subscription-sync"
      );
      if (error) throw error;
      return data;
    });

  // Run all tests
  const runAllTests = async () => {
    setResults([]);
    await testCheckSubscription();
    await testGetSubscriptionStatus();
    // Note: Don't run checkout in batch as it would create actual sessions
  };

  const renderResult = (result: TestResult) => (
    <Card
      key={result.name}
      className="p-4 bg-[#13141f] border-[#1a1b2e]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <h3 className="font-semibold text-white">{result.name}</h3>
          </div>
          {result.error && (
            <p className="text-sm text-red-400 mb-2">{result.error}</p>
          )}
          {result.data && (
            <pre className="text-xs text-gray-400 bg-black/30 p-2 rounded overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
        <Badge variant={result.success ? "default" : "destructive"}>
          {result.success ? "Pass" : "Fail"}
        </Badge>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            <Crown className="w-10 h-10 text-purple-500" />
            Subscription System Tests
            <Zap className="w-10 h-10 text-yellow-500" />
          </h1>
          <p className="text-gray-400">
            Test all subscription-related edge functions
          </p>
        </div>

        {/* Test Controls */}
        <Card className="p-6 bg-[#13141f] border-[#1a1b2e]">
          <h2 className="text-xl font-bold text-white mb-4">
            Quick Tests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              onClick={testCheckSubscription}
              disabled={!!loading}
              className="gap-2"
            >
              {loading === "Check Subscription" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Check Subscription
            </Button>
            <Button
              onClick={testGetSubscriptionStatus}
              disabled={!!loading}
              className="gap-2"
            >
              {loading === "Get Subscription Status" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Get Status
            </Button>
            <Button
              onClick={testCreateCheckout}
              disabled={!!loading}
              variant="outline"
              className="gap-2"
            >
              {loading === "Create Checkout (Premium Monthly)" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Create Checkout
            </Button>
            <Button
              onClick={testPreviewUpgrade}
              disabled={!!loading}
              variant="outline"
              className="gap-2"
            >
              {loading === "Preview Upgrade to VIP" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Preview Upgrade
            </Button>
            <Button
              onClick={testUpgrade}
              disabled={!!loading}
              variant="outline"
              className="gap-2"
            >
              {loading === "Upgrade to VIP Monthly" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Upgrade to VIP
            </Button>
            <Button
              onClick={testDowngrade}
              disabled={!!loading}
              variant="outline"
              className="gap-2"
            >
              {loading === "Downgrade to Premium Monthly" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Downgrade
            </Button>
            <Button
              onClick={testCancel}
              disabled={!!loading}
              variant="destructive"
              className="gap-2"
            >
              {loading === "Cancel Subscription" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Cancel
            </Button>
            <Button
              onClick={testReactivate}
              disabled={!!loading}
              className="gap-2"
            >
              {loading === "Reactivate Subscription" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Reactivate
            </Button>
            <Button
              onClick={testFixSync}
              disabled={!!loading}
              variant="secondary"
              className="gap-2"
            >
              {loading === "Fix Subscription Sync" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Fix Sync
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1a1b2e]">
            <Button
              onClick={runAllTests}
              disabled={!!loading}
              size="lg"
              className="w-full gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Run All Safe Tests
            </Button>
          </div>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Test Results</h2>
              <Button
                onClick={() => setResults([])}
                variant="outline"
                size="sm"
              >
                Clear Results
              </Button>
            </div>
            <div className="space-y-3">
              {results.map((result, i) => (
                <div key={i}>{renderResult(result)}</div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-[#13141f] border-[#1a1b2e]">
          <h3 className="text-lg font-semibold text-white mb-3">
            📋 Testing Instructions
          </h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <strong className="text-white">1. Check Subscription:</strong>{" "}
              View your current subscription status
            </p>
            <p>
              <strong className="text-white">2. Get Status:</strong> Get
              detailed subscription information
            </p>
            <p>
              <strong className="text-white">3. Create Checkout:</strong>{" "}
              Test creating a Stripe checkout session (opens in console)
            </p>
            <p>
              <strong className="text-white">4. Preview Upgrade:</strong>{" "}
              See what an upgrade would cost (requires active subscription)
            </p>
            <p>
              <strong className="text-white">5. Upgrade/Downgrade:</strong>{" "}
              Change subscription tier (requires active subscription)
            </p>
            <p>
              <strong className="text-white">6. Cancel/Reactivate:</strong>{" "}
              Manage subscription lifecycle
            </p>
            <p>
              <strong className="text-white">7. Fix Sync:</strong> Manually
              sync subscription status with Stripe
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

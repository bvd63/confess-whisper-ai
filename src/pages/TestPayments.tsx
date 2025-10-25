import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Coins, CreditCard, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useCoins } from '@/hooks/useCoins';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

type TestResult = {
  success: boolean;
  data?: any;
  error?: string;
};

export default function TestPayments() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [userId, setUserId] = useState<string | undefined>();
  const { balance, loading: coinsLoading } = useCoins(userId);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(testName);
    try {
      const result = await testFn();
      setResults((prev) => ({ ...prev, [testName]: { success: true, data: result } }));
      toast.success(`✅ ${testName} passed`);
      return result;
    } catch (error: any) {
      setResults((prev) => ({ ...prev, [testName]: { success: false, error: error.message } }));
      toast.error(`❌ ${testName} failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(null);
    }
  };

  // COIN TESTS
  const testCoinBalance = async () => {
    return runTest('Coin Balance', async () => {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance, lifetime_earned')
        .single();
      
      if (error) throw error;
      return data;
    });
  };

  const testCoinTransactions = async () => {
    return runTest('Coin Transactions', async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('id, amount, type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    });
  };

  const testCoinPackages = async () => {
    return runTest('Coin Packages', async () => {
      const { data, error } = await supabase
        .from('coin_packages')
        .select('id, name, coins, price_usd, discount_percentage')
        .order('price_usd', { ascending: true });
      
      if (error) throw error;
      return data;
    });
  };

  const testCreateCoinCheckout = async () => {
    return runTest('Create Coin Checkout', async () => {
      const { data: packages, error: pkgError } = await supabase
        .from('coin_packages')
        .select('id, name, coins, price_usd')
        .order('price_usd', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (pkgError) throw pkgError;
      if (!packages) throw new Error('No coin packages found');
      
      const { data, error } = await supabase.functions.invoke('create-coin-checkout', {
        body: { packageId: packages.id }
      });
      
      if (error) throw error;
      return { url: data.url, package: packages };
    });
  };

  const testStripeWebhook = async () => {
    return runTest('Stripe Webhook Configuration', async () => {
      return {
        endpoint: `${SUPABASE_URL}/functions/v1/stripe-webhook-coins`,
        note: 'Verify this URL is configured in Stripe Dashboard'
      };
    });
  };

  // SUBSCRIPTION TESTS
  const testSubscriptionStatus = async () => {
    return runTest('Subscription Status', async () => {
      const { data, error } = await supabase.functions.invoke('billing-status');
      
      if (error) throw error;
      return data;
    });
  };

  const testSubscriptionPlans = async () => {
    return runTest('Subscription Plans', async () => {
      // Plans are defined in code, not in database
      const plans = SUBSCRIPTION_PLANS.filter(p => p.id !== 'free');
      return plans.map(p => ({
        id: p.id,
        name: p.name,
        price_monthly: p.priceMonthly,
        price_yearly: p.priceYearly || null,
        stripe_monthly: p.stripePriceIdMonthly,
        stripe_yearly: p.stripePriceIdYearly || null
      }));
    });
  };

  const testCreateSubscriptionCheckout = async () => {
    return runTest('Create Subscription Checkout', async () => {
      // First check current status to avoid 500 when a subscription already exists
      const { data: statusData, error: statusError } = await supabase.functions.invoke('billing-status');
      if (statusError) throw statusError;

      if (statusData?.subscription_status === 'active') {
        // If already subscribed, return a helpful message and portal link instead of failing
        const { data: portalData } = await supabase.functions.invoke('customer-portal');
        return {
          note: 'Already has an active subscription. Use the Customer Portal to manage the plan.',
          current_tier: statusData.subscription_tier,
          cancel_at_period_end: statusData.cancel_at_period_end ?? false,
          manage_url: portalData?.url || null,
        };
      }

      const { data, error } = await supabase.functions.invoke('billing-buy', {
        body: { 
          tier: 'premium',
          cycle: 'monthly'
        }
      });
      
      if (error) throw error;
      return { url: data.url };
    });
  };

  const testUpgradeSubscription = async () => {
    return runTest('Upgrade Subscription', async () => {
      const { data: statusData } = await supabase.functions.invoke('billing-status');
      const currentTier = statusData?.subscription_tier || 'free';

      // Determine target tier for upgrade
      let targetPriceId: string;
      if (currentTier === 'free' || currentTier === 'premium') {
        targetPriceId = SUBSCRIPTION_PLANS.find(p => p.id === 'vip')?.stripePriceIdMonthly || '';
      } else {
        return { note: 'Already on highest tier (VIP)' };
      }

      const { data, error } = await supabase.functions.invoke('subscription-upgrade', {
        body: { targetPriceId }
      });
      
      if (error) throw error;
      return { message: 'Upgrade successful', newTier: 'vip', ...data };
    });
  };

  const testDowngradeSubscription = async () => {
    return runTest('Downgrade Subscription', async () => {
      const { data: statusData } = await supabase.functions.invoke('billing-status');
      const currentTier = statusData?.subscription_tier || 'free';

      // VIP is the only paid tier now, cannot downgrade further
      let targetPriceId = '';
      if (currentTier === 'vip') {
        // Can only downgrade to free by canceling
        return { note: 'Use cancel subscription to downgrade to free', currentTier };
      } else {
        return { note: 'Cannot downgrade from free tier', currentTier };
      }

      const { data, error } = await supabase.functions.invoke('subscription-downgrade', {
        body: { targetPriceId }
      });
      
      if (error) throw error;
      return { message: 'Downgrade scheduled at period end', targetTier: 'premium', ...data };
    });
  };

  const testCancelSubscription = async () => {
    return runTest('Cancel Subscription', async () => {
      const { data, error } = await supabase.functions.invoke('billing-cancel');
      
      if (error) throw error;
      return { message: 'Subscription will be canceled at period end', ...data };
    });
  };

  const testCustomerPortal = async () => {
    return runTest('Customer Portal', async () => {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      return data;
    });
  };

  const runAllCoinTests = async () => {
    await testCoinBalance();
    await testCoinTransactions();
    await testCoinPackages();
    await testCreateCoinCheckout();
    await testStripeWebhook();
  };

  const runAllSubscriptionTests = async () => {
    await testSubscriptionStatus();
    await testSubscriptionPlans();
    await testCreateSubscriptionCheckout();
    await testUpgradeSubscription();
    await testDowngradeSubscription();
    await testCancelSubscription();
    await testCustomerPortal();
  };

  const renderTestResult = (testName: string) => {
    const result = results[testName];
    if (!result) return null;

    return (
      <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm">
        {result.success ? (
          <>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Success</span>
            </div>
            <pre className="overflow-x-auto text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">Failed</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Payment System Tests</h1>
        <p className="text-muted-foreground">
          Test coin purchases, subscriptions, and Stripe integration
        </p>
      </div>

      <Card className="mb-6 border-2 border-yellow-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">
            {coinsLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              `${balance} coins`
            )}
          </div>
          <Button
            onClick={testCoinBalance}
            disabled={loading !== null}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Balance
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Coin System Tests
            </CardTitle>
            <CardDescription>
              Test coin purchases and transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={runAllCoinTests}
              disabled={loading !== null}
              className="w-full"
              variant="default"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run All Coin Tests
            </Button>

            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={testCoinBalance}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Coin Balance' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                1. Test Coin Balance
              </Button>
              {renderTestResult('Coin Balance')}

              <Button
                onClick={testCoinTransactions}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Coin Transactions' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                2. Test Coin Transactions
              </Button>
              {renderTestResult('Coin Transactions')}

              <Button
                onClick={testCoinPackages}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Coin Packages' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                3. Test Coin Packages
              </Button>
              {renderTestResult('Coin Packages')}

              <Button
                onClick={testCreateCoinCheckout}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Create Coin Checkout' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                4. Test Create Checkout
              </Button>
              {renderTestResult('Create Coin Checkout')}

              <Button
                onClick={testStripeWebhook}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Stripe Webhook Configuration' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                5. Test Webhook Config
              </Button>
              {renderTestResult('Stripe Webhook Configuration')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription Tests
            </CardTitle>
            <CardDescription>
              Test subscription management and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={runAllSubscriptionTests}
              disabled={loading !== null}
              className="w-full"
              variant="default"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run All Subscription Tests
            </Button>

            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={testSubscriptionStatus}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Subscription Status' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                1. Test Subscription Status
              </Button>
              {renderTestResult('Subscription Status')}

              <Button
                onClick={testSubscriptionPlans}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Subscription Plans' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                2. Test Subscription Plans
              </Button>
              {renderTestResult('Subscription Plans')}

              <Button
                onClick={testCreateSubscriptionCheckout}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Create Subscription Checkout' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                3. Test Create Subscription
              </Button>
              {renderTestResult('Create Subscription Checkout')}

              <Button
                onClick={testUpgradeSubscription}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start text-green-600"
                size="sm"
              >
                {loading === 'Upgrade Subscription' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                4. Test Upgrade (Premium → VIP)
              </Button>
              {renderTestResult('Upgrade Subscription')}

              <Button
                onClick={testDowngradeSubscription}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start text-orange-600"
                size="sm"
              >
                {loading === 'Downgrade Subscription' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                5. Test Downgrade (VIP → Premium)
              </Button>
              {renderTestResult('Downgrade Subscription')}

              <Button
                onClick={testCancelSubscription}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start text-red-600"
                size="sm"
              >
                {loading === 'Cancel Subscription' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                6. Test Cancel Subscription
              </Button>
              {renderTestResult('Cancel Subscription')}

              <Button
                onClick={testCustomerPortal}
                disabled={loading !== null}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                {loading === 'Customer Portal' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                7. Test Customer Portal
              </Button>
              {renderTestResult('Customer Portal')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">🪙 Coin Purchase Flow:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Run "Test Create Checkout" to generate a Stripe checkout URL</li>
              <li>Open the URL in test mode (use card: 4242 4242 4242 4242)</li>
              <li>Complete the payment</li>
              <li>Verify coins appear on success page immediately (fallback)</li>
              <li>Check webhook logs in Stripe Dashboard</li>
              <li>Refresh balance to verify final count</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">💳 Subscription Flow:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Run "Test Create Subscription" to start subscription</li>
              <li>Complete payment with test card</li>
              <li>Run "Test Subscription Status" to verify active subscription</li>
              <li>Run "Test Customer Portal" to manage subscription</li>
              <li>Try canceling/reactivating in portal</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">🔗 Webhook Setup:</h3>
            <p className="text-sm text-muted-foreground">
              Webhook URL: <code className="bg-muted px-2 py-1 rounded">
                {SUPABASE_URL}/functions/v1/stripe-webhook-coins
              </code>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Events to listen: <Badge variant="secondary">checkout.session.completed</Badge>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

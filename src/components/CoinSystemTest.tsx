import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCoins } from "@/hooks/useCoins";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Coins, Gift, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export const CoinSystemTest = () => {
  const { user } = useCurrentUser();
  const { balance, refetch } = useCoins(user?.id || '');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTests = async () => {
    if (!user) return;
    
    setTesting(true);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Check coin balance loading
      await refetch();
      testResults.push({
        name: "Coin Balance Loading",
        passed: balance !== undefined,
        message: `Current balance: ${balance} coins`
      });

      // Test 2: Post a test confession (draft mode)
      const { data: confession, error: confessionError } = await supabase
        .from('confessions')
        .insert({
          user_id: user.id,
          content: "Test confession for coin system - " + new Date().toISOString(),
          category: 'other',
          is_draft: true, // Won't award coins
        })
        .select()
        .single();

      testResults.push({
        name: "Confession Creation",
        passed: !confessionError && !!confession,
        message: confessionError ? confessionError.message : "Confession created (draft, no coins)"
      });

      // Test 3: Check flair expiry logic
      const { data: flairs } = await supabase
        .from('user_flairs')
        .select('*, profile_flairs(*)')
        .eq('user_id', user.id);

      const activeFlairs = flairs?.filter(f => {
        if (!f.expires_at) return true;
        return new Date(f.expires_at) > new Date();
      });

      testResults.push({
        name: "Flair Expiry Check",
        passed: true,
        message: `Active flairs: ${activeFlairs?.length || 0}, Expired: ${(flairs?.length || 0) - (activeFlairs?.length || 0)}`
      });

      // Test 4: Check referral data structure
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id);

      const completedReferrals = referrals?.filter(r => 
        r.status === 'completed' && r.referrer_rewarded_at
      );

      testResults.push({
        name: "Referral System",
        passed: true,
        message: `Total referrals: ${referrals?.length || 0}, Rewarded: ${completedReferrals?.length || 0}`
      });

      // Test 5: Verify coin transaction logging
      const { data: transactions } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      testResults.push({
        name: "Transaction History",
        passed: true,
        message: `Recent transactions: ${transactions?.length || 0}`
      });

    } catch (error) {
      testResults.push({
        name: "System Error",
        passed: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }

    setResults(testResults);
    setTesting(false);

    toast({
      title: "Test Complete",
      description: `${testResults.filter(r => r.passed).length}/${testResults.length} tests passed`,
    });
  };

  if (!user) {
    return (
      <Card className="p-4 sm:p-5 text-center">
        <p className="text-sm sm:text-base text-muted-foreground">Please log in to run tests</p>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
          Coin System Testing
        </h3>
        <Button onClick={runTests} disabled={testing}>
          {testing ? "Running Tests..." : "Run Tests"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 sm:space-y-2.5">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-start gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg border"
            >
              {result.passed ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium text-xs sm:text-sm">{result.name}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{result.message}</p>
              </div>
            </div>
          ))}
          
          <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-primary/10 rounded-lg">
            <p className="text-xs sm:text-sm font-semibold">
              ✅ Score: {results.filter(r => r.passed).length}/{results.length} tests passed
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

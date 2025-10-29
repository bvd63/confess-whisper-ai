import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useCoins } from "@/hooks/useCoins";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";

export const CoinFeaturesTest = () => {
  const { user } = useCurrentUser();
  const { balance, loading } = useCoins(user?.id);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    if (!user) return;
    
    setTesting(true);
    const results: Record<string, boolean> = {};

    try {
      // Test 1: Check if coins balance loads
      results.coinsLoad = balance >= 0 && !loading;

      // Test 2: Check if polish-confession function exists
      const { error: polishError } = await supabase.functions.invoke('polish-confession', {
        body: { confessionText: 'test', language: 'en' }
      });
      results.polishFunction = polishError?.message !== 'Function not found';

      // Test 3: Check if purchase-flair function exists
      const { error: flairError } = await supabase.functions.invoke('purchase-flair', {
        body: { flairId: 'test-id' }
      });
      results.flairFunction = flairError?.message !== 'Function not found';

      // Test 5: Check if realtime is working
      const channel = supabase
        .channel('test-channel')
        .subscribe((status) => {
          results.realtime = status === 'SUBSCRIBED';
          supabase.removeChannel(channel);
        });

      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTesting(false);
    }
  };

  if (!user) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Please log in to test coin features</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Coin Features Test</h3>
        <Button onClick={runTests} disabled={testing} size="sm">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Tests'}
        </Button>
      </div>

      <div className="space-y-2">
        {Object.entries(testResults).map(([test, passed]) => (
          <div key={test} className="flex items-center gap-2 text-sm">
            {passed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="capitalize">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
          </div>
        ))}
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm font-semibold">
            Score: {Object.values(testResults).filter(Boolean).length} / {Object.keys(testResults).length}
          </p>
        </div>
      )}
    </Card>
  );
};

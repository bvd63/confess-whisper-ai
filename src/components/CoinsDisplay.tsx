import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/translated-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface CoinsData {
  balance: number;
  lifetime_earned: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface CoinsDisplayProps {
  userId: string;
  variant?: "compact" | "full";
}

const CoinsDisplay = ({ userId, variant = "compact" }: CoinsDisplayProps) => {
  const [coins, setCoins] = useState<CoinsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    loadCoins();
  }, [userId]);

  const loadCoins = async () => {
    try {
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('balance, lifetime_earned')
        .eq('user_id', userId)
        .maybeSingle();

      if (coinsData) {
        setCoins(coinsData);
      } else {
        // Initialize coins for user
        const { data: newCoins } = await supabase
          .from('user_coins')
          .insert({ user_id: userId, balance: 0, lifetime_earned: 0 })
          .select('balance, lifetime_earned')
          .single();
        
        if (newCoins) {
          setCoins(newCoins);
        }
      }
    } catch (error) {
      console.error('Error loading coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleShowHistory = () => {
    loadTransactions();
    setShowHistory(true);
  };

  if (loading || !coins) return null;

  if (variant === "compact") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShowHistory}
        className="gap-2"
      >
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className="font-semibold">{coins.balance}</span>
      </Button>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold">{t.coins_title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <Coins className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {coins.balance}
            </p>
            <p className="text-sm text-muted-foreground">{t.coins_current_balance}</p>
          </div>

          <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{coins.lifetime_earned}</p>
            <p className="text-sm text-muted-foreground">{t.coins_total_earned}</p>
          </div>
        </div>

        <Button
          onClick={handleShowHistory}
          variant="outline"
          className="w-full mt-4"
        >
          {t.coins_history}
        </Button>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground font-semibold mb-2">
            {t.coins_how_to_earn}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>{t.coins_per_confession_detail}</li>
            <li>{t.coins_per_comment_detail}</li>
            <li>{t.coins_per_like_detail}</li>
          </ul>
        </div>
      </Card>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              {t.coins_history}
            </DialogTitle>
            <DialogDescription>
              {t.coins_all_transactions}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t.coins_no_transactions}
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {transaction.description || transaction.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        transaction.amount > 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoinsDisplay;

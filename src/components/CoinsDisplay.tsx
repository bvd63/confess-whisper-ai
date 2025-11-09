import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoins } from "@/hooks/useCoins";
import { logError } from "@/lib/logger";
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
const CoinsDisplay = ({
  userId,
  variant = "compact"
}: CoinsDisplayProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const {
    t
  } = useLanguage();
  const {
    balance,
    lifetimeEarned,
    loading
  } = useCoins(userId);
  const loadTransactions = async () => {
    try {
      const {
        data
      } = await supabase.from('coin_transactions').select('*').eq('user_id', userId).order('created_at', {
        ascending: false
      }).limit(50);
      setTransactions(data || []);
    } catch (error) {
      logError('Error loading transactions', error instanceof Error ? error : undefined);
    }
  };
  const handleShowHistory = () => {
    loadTransactions();
    setShowHistory(true);
  };
  if (loading) return null;
  if (variant === "compact") {
    return <Button variant="outline" size="sm" onClick={handleShowHistory} className="gap-1 sm:gap-1.5 h-8 min-w-[44px] px-2 sm:px-2.5 touch-manipulation">
        <Coins className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
        <span className="font-semibold text-xs">{balance}</span>
      </Button>;
  }
  return <>
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 mb-2.5 sm:mb-3">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          <h3 className="text-sm sm:text-base font-semibold">{t.coins_title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="text-center p-2.5 sm:p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {balance}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t.coins_current_balance}</p>
          </div>

          <div className="text-center p-2.5 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-primary">{lifetimeEarned}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t.coins_total_earned}</p>
          </div>
        </div>

        <Button onClick={handleShowHistory} variant="outline" className="w-full mt-2.5 sm:mt-3 h-8 sm:h-9 text-xs touch-manipulation">
          {t.coins_history}
        </Button>

        <div className="mt-2.5 sm:mt-3 p-2 sm:p-2.5 rounded-lg border border-secondary/20 bg-slate-950">
          <p className="text-[10px] font-semibold mb-1 sm:mb-1.5 text-slate-100 sm:text-xs">
            {t.coins_how_to_earn}
          </p>
          <ul className="text-[9px] sm:text-[10px] text-muted-foreground space-y-0.5">
            <li>{t.coins_per_confession_detail}</li>
            <li>🔥 Streak bonuses: +10/+20/+50 coins at 3/5/7 days</li>
            <li>🎁 Referral rewards: +20 coins per completed referral</li>
          </ul>
        </div>

        <div className="mt-2.5 sm:mt-3 p-2 sm:p-2.5 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-[10px] sm:text-xs text-primary font-semibold mb-1 sm:mb-1.5">
            {t.coins_how_to_spend}
          </p>
          <ul className="text-[9px] sm:text-[10px] text-muted-foreground space-y-0.5">
            <li>🚀 Boost Confession (15 coins) - Highlight for 1 hour</li>
            <li>✨ Profile Flairs - Customize your profile appearance</li>
          </ul>
        </div>
      </Card>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              {t.coins_history}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t.coins_all_transactions}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] sm:h-[400px] pr-3 sm:pr-4">
            {transactions.length === 0 ? <p className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                {t.coins_no_transactions}
              </p> : <div className="space-y-1.5 sm:space-y-2">
                {transactions.map(transaction => {
              // Map transaction types/descriptions to translation keys
              const getTransactionDescription = () => {
                const type = transaction.type?.toLowerCase() || '';
                const desc = transaction.description?.toLowerCase() || '';

                // Map by transaction type
                if (type === 'confession_created') {
                  return t.coins_confession_created;
                }
                if (type === 'referral_reward') {
                  return t.referral_reward_referrer;
                }
                if (type === 'referral_bonus') {
                  return t.first_confession_bonus;
                }
                if (type === 'flair_purchase' || type === 'badge_purchase') {
                  return transaction.description || t.coins_flairs_detail;
                }
                if (type === 'polish_confession') {
                  return transaction.description || t.coins_polish_detail;
                }

                // Fallback to description or type
                return transaction.description || transaction.type || t.coins_history;
              };
              return <div key={transaction.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {getTransactionDescription()}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.created_at), {
                      addSuffix: true
                    })}
                        </p>
                      </div>
                      <span className={`text-base sm:text-lg font-bold flex-shrink-0 ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount}
                      </span>
                    </div>;
            })}
              </div>}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>;
};
export default CoinsDisplay;
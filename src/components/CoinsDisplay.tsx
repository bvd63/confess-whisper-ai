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
    return <Button 
        variant="outline" 
        size="sm" 
        onClick={handleShowHistory} 
        className="gap-1.5 h-9 min-w-[44px] px-3 touch-manipulation border-border/60 hover:border-border hover:bg-accent/50"
      >
        <Coins className="w-4 h-4 text-vip-gold flex-shrink-0" />
        <span className="font-semibold text-sm">{balance}</span>
      </Button>;
  }
  return <>
      <Card className="p-4 sm:p-5 border-border/60 rounded-[18px]">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-vip-gold" />
          <h3 className="text-base sm:text-lg font-semibold">{t.coins_title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-vip-gold/10 dark:bg-vip-gold/15 rounded-[16px] border border-vip-gold/20">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-vip-gold mx-auto mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-vip-gold">
              {balance}
            </p>
            <p className="text-xs sm:text-sm text-foreground-muted mt-1">{t.coins_current_balance}</p>
          </div>

          <div className="text-center p-3 sm:p-4 bg-primary/10 dark:bg-primary/15 rounded-[16px] border border-primary/20">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl sm:text-3xl font-bold text-primary">{lifetimeEarned}</p>
            <p className="text-xs sm:text-sm text-foreground-muted mt-1">{t.coins_total_earned}</p>
          </div>
        </div>

        <Button 
          onClick={handleShowHistory} 
          variant="outline" 
          className="w-full mt-4 h-10 text-sm touch-manipulation border-border/60 hover:border-border hover:bg-accent/50"
        >
          {t.coins_history}
        </Button>

        <div className="mt-4 p-3 sm:p-4 rounded-[16px] border border-border/60 bg-card-secondary">
          <p className="text-xs font-semibold mb-2 text-foreground sm:text-sm">
            {t.coins_how_to_earn}
          </p>
          <ul className="text-xs text-foreground-secondary space-y-1">
            <li>{t.coins_per_confession_detail}</li>
            <li>🔥 Streak bonuses: +10/+20/+50 coins at 3/5/7 days</li>
            <li>🎁 Referral rewards: +20 coins per completed referral</li>
          </ul>
        </div>

        <div className="mt-3 p-3 sm:p-4 bg-primary/10 dark:bg-primary/15 rounded-[16px] border border-primary/20">
          <p className="text-xs sm:text-sm text-primary font-semibold mb-2">
            {t.coins_how_to_spend}
          </p>
          <ul className="text-xs text-foreground-secondary space-y-1">
            <li>🏆 Give Awards (50-300 coins) - Show appreciation</li>
            <li>✨ AI Makeover (100 coins) - Improve your confession</li>
            <li>💬 Highlight Comment (50 coins) - Stand out for 24h</li>
            <li>🚀 Boost Confession (15 coins) - Highlight for 1 hour</li>
            <li>🎁 Gift Coins (5% fee) - Send to other users</li>
            <li>✨ Profile Flairs - Customize your profile</li>
          </ul>
        </div>
      </Card>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] rounded-[20px] border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-vip-gold" />
              {t.coins_history}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t.coins_all_transactions}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
            {transactions.length === 0 ? <p className="text-center text-foreground-muted py-8 text-sm">
                {t.coins_no_transactions}
              </p> : <div className="space-y-2">
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
              return <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 bg-card-secondary rounded-[14px] border border-border/40">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-medium truncate">
                          {getTransactionDescription()}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {formatDistanceToNow(new Date(transaction.created_at), {
                      addSuffix: true
                    })}
                        </p>
                      </div>
                      <span className={`text-lg font-bold flex-shrink-0 ${transaction.amount > 0 ? 'text-success' : 'text-destructive'}`}>
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
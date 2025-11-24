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
      className="gap-2 h-10 min-w-[44px] px-4 touch-manipulation rounded-full border-border/50 hover:bg-accent/30 shadow-ios"
    >
      <Coins className="w-4 h-4 text-yellow-500 flex-shrink-0" />
      <span className="font-semibold text-sm">{balance}</span>
    </Button>;
  }
  return <>
      <Card className="p-6 rounded-3xl shadow-card border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 rounded-xl">
            <Coins className="w-6 h-6 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold">{t.coins_title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="text-center p-5 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-ios">
            <Coins className="w-7 h-7 text-yellow-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
              {balance}
            </p>
            <p className="text-sm text-muted-foreground font-medium">{t.coins_current_balance}</p>
          </div>

          <div className="text-center p-5 bg-primary/10 rounded-2xl border border-primary/20 shadow-ios">
            <TrendingUp className="w-7 h-7 text-primary mx-auto mb-3" />
            <p className="text-3xl font-bold text-primary mb-1">{lifetimeEarned}</p>
            <p className="text-sm text-muted-foreground font-medium">{t.coins_total_earned}</p>
          </div>
        </div>

        <Button 
          onClick={handleShowHistory} 
          variant="outline" 
          className="w-full h-12 rounded-xl text-base font-semibold shadow-ios hover:shadow-elevated touch-manipulation"
        >
          {t.coins_history}
        </Button>

        <div className="mt-5 p-4 rounded-2xl border border-border/50 bg-muted/30">
          <p className="text-sm font-bold mb-3 text-foreground">
            {t.coins_how_to_earn}
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-lg">💰</span>
              <span>{t.coins_per_confession_detail}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg">🔥</span>
              <span>Streak bonuses: +10/+20/+50 coins at 3/5/7 days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg">🎁</span>
              <span>Referral rewards: +20 coins per completed referral</span>
            </li>
          </ul>
        </div>

        <div className="mt-5 p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <p className="text-sm font-bold mb-3 text-primary">
            {t.coins_how_to_spend}
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-lg">📈</span>
              <span>Boost Confession (15 coins) - Highlight for 1 hour</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg">✨</span>
              <span>Profile Flairs - Customize your profile appearance</span>
            </li>
          </ul>
        </div>
      </Card>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-yellow-500/10 rounded-xl">
                <Coins className="w-6 h-6 text-yellow-500" />
              </div>
              {t.coins_history}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {t.coins_all_transactions}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[450px] pr-4">
            {transactions.length === 0 ? <p className="text-center text-muted-foreground py-12 text-base">
                {t.coins_no_transactions}
              </p> : <div className="space-y-3">
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
              return <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border/50 shadow-ios">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-semibold truncate mb-1">
                          {getTransactionDescription()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.created_at), {
                      addSuffix: true
                    })}
                        </p>
                      </div>
                      <span className={`text-xl font-bold flex-shrink-0 ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
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
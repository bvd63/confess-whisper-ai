import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Gift, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { logError } from '@/lib/logger';

interface GiftCoinsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName?: string;
}

export const GiftCoinsDialog = ({ 
  open, 
  onOpenChange, 
  recipientId,
  recipientName 
}: GiftCoinsDialogProps) => {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get user's current balance
  const { data: balance } = useQuery({
    queryKey: ['coinBalance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.balance || 0;
    },
  });

  const handleGift = async () => {
    if (!recipientId) {
      toast.error('No recipient selected');
      return;
    }

    const giftAmount = parseInt(amount);
    if (isNaN(giftAmount) || giftAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Calculate total cost (5% fee + optional 50 anonymous fee)
    const fee = Math.ceil(giftAmount * 0.05);
    const anonymousFee = isAnonymous ? 50 : 0;
    const totalCost = giftAmount + fee + anonymousFee;

    if (totalCost > (balance || 0)) {
      toast.error(`Insufficient coins. You need ${totalCost} coins (includes ${fee + anonymousFee} fee)`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('gift_coins', {
        receiver_id: recipientId,
        amount: giftAmount,
        is_anonymous: isAnonymous,
        message: message || null,
      });

      if (error) throw error;

      toast.success(`Successfully gifted ${giftAmount} coins!`);
      setAmount('');
      setMessage('');
      setIsAnonymous(false);
      onOpenChange(false);
    } catch (error) {
      logError('Error gifting coins', error as Error);
      toast.error('Failed to gift coins. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const giftAmount = parseInt(amount) || 0;
  const fee = Math.ceil(giftAmount * 0.05);
  const anonymousFee = isAnonymous ? 50 : 0;
  const totalCost = giftAmount + fee + anonymousFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Gift className="w-6 h-6 text-primary" />
            Gift Coins
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {recipientName && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sending to:</p>
              <p className="font-bold text-lg">{recipientName}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="Enter coin amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your balance: {balance || 0} coins
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50">
            <div>
              <Label htmlFor="anonymous" className="font-bold text-base">
                Send Anonymously
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                +50 coins fee
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          {giftAmount > 0 && (
            <div className="p-4 bg-secondary/30 rounded-2xl space-y-2 border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gift amount:</span>
                <span className="font-bold">{giftAmount} coins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (5%):</span>
                <span className="font-semibold">{fee} coins</span>
              </div>
              {isAnonymous && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Anonymous fee:</span>
                  <span className="font-semibold">{anonymousFee} coins</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border/50 pt-2 mt-2">
                <span>Total cost:</span>
                <span className="text-primary">{totalCost} coins</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleGift}
            disabled={loading || !giftAmount || totalCost > (balance || 0)}
            className="w-full h-11 rounded-xl font-semibold text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5 mr-2" />
                Send Gift
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

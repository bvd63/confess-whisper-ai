import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { logError } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

interface GiftCoinsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName?: string;
}

const GIFT_COINS_FN = 'gift_coins' as unknown as keyof Database['public']['Functions'];

export const GiftCoinsDialog = ({ 
  open, 
  onOpenChange, 
  recipientId,
  recipientName 
}: GiftCoinsDialogProps) => {
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
      const { error } = await supabase.rpc(GIFT_COINS_FN, {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Gift Coins
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recipientName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Sending to:</p>
              <p className="font-semibold">{recipientName}</p>
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

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="anonymous" className="font-semibold">
                Send Anonymously
              </Label>
              <p className="text-xs text-muted-foreground">
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
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Gift amount:</span>
                <span className="font-semibold">{giftAmount} coins</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Platform fee (5%):</span>
                <span>{fee} coins</span>
              </div>
              {isAnonymous && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Anonymous fee:</span>
                  <span>{anonymousFee} coins</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1">
                <span>Total cost:</span>
                <span className="text-primary">{totalCost} coins</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleGift}
            disabled={loading || !giftAmount || totalCost > (balance || 0)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Send Gift
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

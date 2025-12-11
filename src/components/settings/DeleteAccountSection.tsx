import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { notify } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { logError } from '@/lib/logger';

interface DeleteAccountSectionProps {
  userId: string;
  userEmail: string;
}

export const DeleteAccountSection = ({ userId, userEmail }: DeleteAccountSectionProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      notify.error('notifications.operationFailed', language);
      return;
    }

    const confirmed = await confirm({
      titleKey: 'confirm.deleteAccount.title',
      messageKey: 'confirm.deleteAccount.message',
      variant: 'danger',
    });
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      // Delete user profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Sign out
      await supabase.auth.signOut();

      notify.success('notifications.accountDeleted', language);
      
      navigate('/auth');
    } catch (error) {
      logError('Error deleting account', error as Error);
      notify.error('notifications.operationFailed', language);
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="w-full px-4 py-3.5 flex items-center justify-between rounded-xl transition-all duration-200 bg-gradient-to-r from-red-600/25 to-red-700/20 hover:from-red-600/35 hover:to-red-700/30 border border-red-600/30"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">{t.delete_account || 'Delete Account'}</span>
          </div>
          <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center">
            <Trash2 className="h-3 w-3 text-red-500" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-foreground">Are you absolutely sure?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t.delete_account_description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 my-4">
          <Label htmlFor="confirm-delete" className="text-foreground">
            Type DELETE to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="glass border-border/50"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setConfirmText('');
            setIsDialogOpen(false);
          }}>
            {t.cancel || 'Cancel'}
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={isDeleting || confirmText !== 'DELETE'}
            variant="destructive"
          >
            {isDeleting ? t.deleting || 'Deleting...' : t.delete_account || 'Delete Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
      console.error('Error deleting account:', error);
      notify.error('notifications.operationFailed', language);
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
      <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4" />
        {t.delete_account || 'Delete Account'}
      </h4>
      <p className="text-sm text-muted-foreground mb-4">
        {t.delete_warning}
      </p>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            {t.delete_account || 'Delete Account'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              {t.delete_account_description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 my-4">
            <Label htmlFor="confirm-delete">
              Type DELETE to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
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
    </div>
  );
};

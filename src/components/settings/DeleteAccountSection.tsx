import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeleteAccountSectionProps {
  userId: string;
  userEmail: string;
}

export const DeleteAccountSection = ({ userId, userEmail }: DeleteAccountSectionProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast({
        title: t.common_error,
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

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

      toast({
        title: 'Account deleted successfully',
      });
      
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t.common_error,
        description: t.error_generic,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
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
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            {t.delete_account || 'Delete Account'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {t.delete_account_description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
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

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              {t.cancel || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmText !== 'DELETE'}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? t.deleting || 'Deleting...' : t.delete_account || 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

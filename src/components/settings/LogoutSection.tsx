import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { notify } from '@/lib/notifications';
import { logError } from '@/lib/logger';

export const LogoutSection = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const confirm = useConfirm();

  const handleLogout = async () => {
    const confirmed = await confirm({
      titleKey: 'confirm.logout.title',
      messageKey: 'confirm.logout.message',
      variant: 'warning',
    });
    
    if (!confirmed) return;

    try {
      await supabase.auth.signOut();
      notify.success('notifications.logoutSuccess', language);
      navigate('/auth');
    } catch (error) {
      logError('Error logging out', error as Error);
      notify.error('notifications.operationFailed', language);
    }
  };

  return (
    <div className="p-4 sm:p-5 bg-card rounded-lg border">
      <Button
        onClick={handleLogout}
        variant="destructive"
        className="w-full"
      >
        <LogOut className="w-4 h-4 mr-2" />
        {t.logout || 'Logout'}
      </Button>
    </div>
  );
};

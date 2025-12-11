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
    <button
      onClick={handleLogout}
      className="w-full px-4 py-3.5 flex items-center justify-between rounded-xl transition-all duration-200 bg-gradient-to-r from-red-500/20 to-red-600/15 hover:from-red-500/30 hover:to-red-600/25 border border-red-500/25"
    >
      <div className="flex items-center gap-3">
        <LogOut className="h-4 w-4 text-red-400" />
        <span className="text-sm font-medium text-red-400">{t.logout || 'Logout'}</span>
      </div>
    </button>
  );
};

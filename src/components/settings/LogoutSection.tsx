import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export const LogoutSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: t.success_logout,
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: t.common_error,
        description: t.error_generic,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 bg-card rounded-lg border">
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

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Download, Trash2, LogOut, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all user data
      const { data: confessions } = await supabase
        .from('confessions')
        .select('*')
        .eq('user_id', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const exportData = {
        user: {
          email: user.email,
          created_at: user.created_at,
        },
        profile,
        confessions,
        exported_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `confess-ai-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Date exportate",
        description: "Datele tale au fost exportate cu succes.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut exporta datele.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete user data (confessions will be deleted via cascade)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: t.success_deleted,
        description: t.delete_account_description,
      });

      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              {t.settings}
            </DialogTitle>
            <DialogDescription>
              {t.delete_account_description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Export Data */}
            <div className="p-4 border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {t.export_data}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.export_data}
                  </p>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    variant="outline"
                    size="sm"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.submitting}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        {t.export_data}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="p-4 border border-border/50 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {t.privacy_policy}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.privacy_policy}
                  </p>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/privacy');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    {t.privacy_policy}
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete Account */}
            <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-destructive/20">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {t.delete_account}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.delete_account_description}
                  </p>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t.delete_account}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete_confirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.delete_warning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.skip}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.deleting}
                </>
              ) : (
                t.delete_confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsDialog;

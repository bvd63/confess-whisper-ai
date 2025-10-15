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
        title: "Cont șters",
        description: "Contul tău a fost șters permanent.",
      });

      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut șterge contul. Te rugăm să ne contactezi.",
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
              Setări Cont
            </DialogTitle>
            <DialogDescription>
              Gestionează datele și contul tău
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
                    Exportă datele tale
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Descarcă toate datele tale într-un fișier JSON (GDPR)
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
                        Exportare...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Exportă date
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
                    Confidențialitate
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Vezi cum îți protejăm datele
                  </p>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/privacy');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Politica de confidențialitate
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
                    Șterge contul
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Șterge permanent contul și toate datele asociate
                  </p>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Șterge cont
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
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Acest lucru va șterge permanent
              contul tău și va elimina datele de pe serverele noastre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ștergere...
                </>
              ) : (
                'Șterge definitiv'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsDialog;

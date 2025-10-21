import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGDPR } from "@/hooks/useGDPR";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
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

/**
 * GDPR compliance component for data export and account deletion
 */
export const GDPRCompliance = () => {
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const { exportUserData, deleteAccount, isProcessing } = useGDPR();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleExportData = async () => {
    if (!user) return;

    try {
      await exportUserData(user.id);
      toast.success(t.export_data_success_toast);
    } catch (error) {
      toast.error(t.error_generic);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      await deleteAccount(user.id);
      toast.success(t.account_deleted_toast);
      // Redirect handled by deleteAccount hook
    } catch (error) {
      toast.error(t.error_generic);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Data */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Download className="w-5 h-5 text-primary mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold mb-2">{t.export_data}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.export_data_description_text}
            </p>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {t.export_data}
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Account */}
      <Card className="p-6 border-destructive/50">
        <div className="flex items-start gap-4">
          <Trash2 className="w-5 h-5 text-destructive mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold mb-2 text-destructive">
              {t.delete_account}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.delete_account_description}
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.delete_account}
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t.delete_account_confirm_dialog}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t.delete_account_warning_full}</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-foreground">
                <li>
                  {language === 'en' && "All your confessions and comments"}
                  {language === 'es' && "Todas tus confesiones y comentarios"}
                  {language === 'de' && "Alle deine Beichten und Kommentare"}
                </li>
                <li>
                  {language === 'en' && "Your messages and conversations"}
                  {language === 'es' && "Tus mensajes y conversaciones"}
                  {language === 'de' && "Deine Nachrichten und Konversationen"}
                </li>
                <li>
                  {language === 'en' && "Your profile and preferences"}
                  {language === 'es' && "Tu perfil y preferencias"}
                  {language === 'de' && "Dein Profil und Einstellungen"}
                </li>
                <li>
                  {language === 'en' && "All achievements and streaks"}
                  {language === 'es' && "Todos los logros y rachas"}
                  {language === 'de' && "Alle Erfolge und Streaks"}
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.common_cancel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t.delete_confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

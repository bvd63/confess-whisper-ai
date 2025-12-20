import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LogoutConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: LogoutConfirmationDialogProps) {
  const { t } = useLanguage();

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t.confirm?.logout?.title || "Confirm Logout"}
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="text-muted-foreground text-sm pl-[52px] pb-4">
          {t.confirm?.logout?.message || "You will be signed out from this device."}
        </DialogDescription>
        
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-medium text-white bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-300"
          >
            {isLoading ? (
              <span className="animate-pulse">{t.common_loading || "Loading..."}</span>
            ) : (
              t.common_confirm || "Confirm"
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-medium text-muted-foreground bg-white/5 hover:bg-white/10 border border-white/10"
          >
            {t.common_cancel || "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

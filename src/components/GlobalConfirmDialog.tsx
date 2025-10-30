import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ConfirmVariant } from '@/contexts/ConfirmContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  titleKey: string;
  messageKey: string;
  variant?: ConfirmVariant;
  confirmTextKey?: string;
  cancelTextKey?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  titleKey,
  messageKey,
  variant = 'default',
  confirmTextKey,
  cancelTextKey,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    onConfirm();
    // Reset processing state after a short delay
    setTimeout(() => setIsProcessing(false), 100);
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  // Helper to safely get nested translation keys
  const getNestedTranslation = (key: string): string => {
    const keys = key.split('.');
    let value: any = t;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const title = getNestedTranslation(titleKey);
  const message = getNestedTranslation(messageKey);
  const confirmText = confirmTextKey ? getNestedTranslation(confirmTextKey) : t.common_confirm;
  const cancelText = cancelTextKey ? getNestedTranslation(cancelTextKey) : t.cancel;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isProcessing}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isProcessing}
            className={getButtonVariant() === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isProcessing ? t.common_loading : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

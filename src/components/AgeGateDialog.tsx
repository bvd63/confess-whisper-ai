import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

const AGE_VERIFIED_KEY = 'age-verified';

export const AgeGateDialog = () => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const verified = localStorage.getItem(AGE_VERIFIED_KEY);
    if (!verified) {
      setOpen(true);
    }
  }, []);

  const handleConfirm = () => {
    if (checked) {
      localStorage.setItem(AGE_VERIFIED_KEY, 'true');
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.age_gate_title}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.age_gate_requirement}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center space-x-2 my-4">
          <Checkbox 
            id="age-confirm" 
            checked={checked}
            onCheckedChange={(checked) => setChecked(checked as boolean)}
          />
          <Label htmlFor="age-confirm" className="text-sm cursor-pointer">
            {t.age_gate_confirm}
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm} disabled={!checked}>
            {t.common_continue}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

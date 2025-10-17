import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmailDisplayProps {
  email: string;
}

export const EmailDisplay = ({ email }: EmailDisplayProps) => {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t.profile_email_label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>{t.profile_email_label}</Label>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-mono">{email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

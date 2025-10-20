import { Check, CheckCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageReadReceiptProps {
  sentAt: string | null;
  deliveredAt: string | null;
  seenAt: string | null;
  isSentByMe: boolean;
}

export const MessageReadReceipt = ({
  sentAt,
  deliveredAt,
  seenAt,
  isSentByMe,
}: MessageReadReceiptProps) => {
  const { t } = useLanguage();

  if (!isSentByMe) return null;

  let icon: React.ReactNode;
  let tooltipText: string;
  let iconColor: string;

  if (seenAt) {
    icon = <CheckCheck className="w-4 h-4" />;
    tooltipText = t.messages_seen;
    iconColor = "text-blue-500";
  } else if (deliveredAt) {
    icon = <CheckCheck className="w-4 h-4" />;
    tooltipText = t.messages_delivered;
    iconColor = "text-muted-foreground";
  } else if (sentAt) {
    icon = <Check className="w-4 h-4" />;
    tooltipText = t.messages_sent;
    iconColor = "text-muted-foreground";
  } else {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex ${iconColor}`}>
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
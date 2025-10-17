import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptProps {
  isRead: boolean;
  isSent: boolean;
}

export const ReadReceipt = ({ isRead, isSent }: ReadReceiptProps) => {
  if (!isSent) return null;

  return (
    <span className="inline-flex items-center ml-1">
      {isRead ? (
        <CheckCheck className="h-3 w-3 text-blue-500" />
      ) : (
        <Check className="h-3 w-3 text-muted-foreground" />
      )}
    </span>
  );
};
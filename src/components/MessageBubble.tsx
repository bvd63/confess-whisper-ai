import { formatDistanceToNow } from 'date-fns';
import { MessageReadReceipt } from '@/components/MessageReadReceipt';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    read_at: string | null;
    edited_at: string | null;
    sent_at?: string | null;
    delivered_at?: string | null;
    seen_at?: string | null;
  };
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] sm:max-w-[60%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          }`}
        >
          <p className="text-sm break-words">{message.content}</p>
          {message.edited_at && (
            <span className="text-xs opacity-70 italic"> (edited)</span>
          )}
        </div>
        
        <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
          <MessageReadReceipt
            sentAt={message.sent_at || message.created_at}
            deliveredAt={message.delivered_at}
            seenAt={message.seen_at}
            isSentByMe={isOwn}
          />
        </div>
      </div>
    </div>
  );
};
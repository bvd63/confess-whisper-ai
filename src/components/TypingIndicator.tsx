import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
}

export const TypingIndicator = ({ conversationId, currentUserId }: TypingIndicatorProps) => {
  const { typingUsers } = useTypingIndicator(conversationId, currentUserId);

  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce-gentle" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce-gentle" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce-gentle" />
        </div>
        <span>
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.join(', ')} are typing...`}
        </span>
      </div>
    </div>
  );
};
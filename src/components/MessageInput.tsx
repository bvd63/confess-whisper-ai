import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageInputProps {
  conversationId: string;
  userId: string;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export const MessageInput = ({ conversationId, userId, onSend, disabled }: MessageInputProps) => {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { startTyping, stopTyping } = useTypingIndicator(conversationId, userId);
  const { t } = useLanguage();

  useEffect(() => {
    if (content.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [content, startTyping, stopTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSending || disabled) return;

    setIsSending(true);
    stopTyping();

    try {
      await onSend(content.trim());
      setContent('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4 border-t">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.type_message_placeholder}
        disabled={disabled || isSending}
        className="min-h-[44px] max-h-32 resize-none"
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || isSending || disabled}
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};
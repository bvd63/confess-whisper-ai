import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, MoreVertical, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  optimistic?: boolean;
  failed?: boolean;
}

interface EnhancedMessageThreadProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserNickname: string | null;
  onBack: () => void;
}

/**
 * Enhanced Instagram-style message thread with read receipts, optimistic UI, and retry
 */
export const EnhancedMessageThread = ({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserNickname,
  onBack,
}: EnhancedMessageThreadProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { t } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { purgeMessage, purgeConversation } = useCachePurgeOnDelete();

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Remove optimistic version if exists
          setMessages((prev) => [
            ...prev.filter(m => !m.optimistic),
            newMsg,
          ]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? (payload.new as Message) : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
    markAsRead();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      content: newMessage.trim(),
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      is_read: false,
      optimistic: true,
    };

    // Add optimistic message
    setMessages((prev) => [...prev, optimisticMessage]);
    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: messageContent,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, failed: true, optimistic: false } : m
        )
      );
      
      toast.error(t.error_generic);
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (message: Message) => {
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: message.content,
      });

      if (error) throw error;

      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (error) {
      console.error('Error retrying message:', error);
      toast.error(t.error_generic);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      purgeMessage(messageId, conversationId);
      toast.success(t.success_deleted);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(t.error_delete);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur-lg">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h3 className="font-medium">@{otherUserNickname || t.confession_anonymous}</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;
          return (
            <div
              key={message.id}
              className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
            >
              <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 relative",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm",
                    message.failed && "opacity-50 border border-destructive"
                  )}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  
                  {isOwn && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {message.failed && (
                          <DropdownMenuItem onClick={() => retryMessage(message)}>
                            {t.messages_retry || "Retry"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMessage(message.id)}
                        >
                          {t.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1 px-2">
                  <span
                    className={cn(
                      "text-xs",
                      isOwn ? "text-muted-foreground" : "text-muted-foreground"
                    )}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  
                  {isOwn && !message.optimistic && (
                    <>
                      {message.is_read ? (
                        <CheckCheck className="w-3 h-3 text-primary" />
                      ) : (
                        <Check className="w-3 h-3 text-muted-foreground" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-border bg-background/95 backdrop-blur-lg"
      >
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t.messages_type_message}
            disabled={sending}
            className="flex-1 rounded-full"
            maxLength={1000}
          />
          <Button
            type="submit"
            disabled={sending || !newMessage.trim()}
            size="icon"
            className="rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

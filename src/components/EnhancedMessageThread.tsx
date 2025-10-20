import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, MoreVertical, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserDisplayName } from "./UserDisplayName";
import { BadgeDisplay } from "./BadgeDisplay";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { getNicknameCached } from "@/lib/nicknameCache";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  sent_at: string | null;
  delivered_at: string | null;
  seen_at: string | null;
  reactions?: Array<{ userId: string; emoji: string; createdAt: string }>;
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
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();
  const { subscriptionTier } = usePremiumStatus(otherUserId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { purgeMessage, purgeConversation } = useCachePurgeOnDelete();

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time messages & typing
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
          const updatedMessage = payload.new as Message;
          // Ensure reactions is always an array
          updatedMessage.reactions = Array.isArray(updatedMessage.reactions) 
            ? updatedMessage.reactions 
            : [];
          
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id ? updatedMessage : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_typing_status',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const typingData = payload.new as any;
          if (typingData.user_id !== currentUserId) {
            setIsTyping(typingData.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

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

      // Filter out soft-deleted messages for current user
      const visibleMessages = (data || []).filter((m: any) => {
        if (m.sender_id === currentUserId) {
          return !m.deleted_for_sender;
        } else {
          return !m.deleted_for_recipient;
        }
      }).map((m: any) => ({
        ...m,
        reactions: Array.isArray(m.reactions) ? m.reactions : []
      }));

      setMessages(visibleMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Mark undelivered messages as delivered when conversation loads
  useEffect(() => {
    const undeliveredMessages = messages.filter(
      m => m.sender_id === otherUserId && !m.delivered_at && !m.optimistic
    );

    if (undeliveredMessages.length > 0) {
      undeliveredMessages.forEach(async (msg) => {
        try {
          await supabase.functions.invoke('mark-message-delivered', {
            body: { messageId: msg.id }
          });
        } catch (error) {
          console.error('Error marking message as delivered:', error);
        }
      });
    }
  }, [messages, otherUserId]);

  // Mark messages as seen when in viewport
  const markAsRead = async () => {
    try {
      // Get all unseen messages from the other user
      const unseenMessages = messages
        .filter(m => m.sender_id === otherUserId && !m.seen_at && !m.optimistic)
        .map(m => m.id);

      if (unseenMessages.length === 0) return;

      // Mark the last unseen message as seen
      const lastUnseenId = unseenMessages[unseenMessages.length - 1];
      await supabase.functions.invoke('mark-message-seen', {
        body: { messageId: lastUnseenId }
      });
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const clientMessageId = `${currentUserId}_${Date.now()}_${Math.random()}`;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      content: newMessage.trim(),
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      is_read: false,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      seen_at: null,
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
        client_message_id: clientMessageId,
        sent_at: new Date().toISOString(),
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
      const clientMessageId = `${currentUserId}_${Date.now()}_${Math.random()}`;
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: message.content,
        client_message_id: clientMessageId,
        sent_at: new Date().toISOString(),
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

  const handleTyping = async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await supabase
      .from('message_typing_status')
      .upsert({
        conversation_id: conversationId,
        user_id: currentUserId,
        is_typing: true,
      });

    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('message_typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: currentUserId,
          is_typing: false,
        });
    }, 3000);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-reactions', {
        body: { messageId, emoji, action: 'add' },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error(t.error_generic);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-reactions', {
        body: { messageId, emoji, action: 'remove' },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error removing reaction:', error);
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
          <div className="flex items-center gap-2">
            <h3 className="font-medium">
              <UserDisplayName userId={otherUserId} maxLength={20} />
            </h3>
            <BadgeDisplay 
              userId={otherUserId}
              subscriptionTier={subscriptionTier as "free" | "premium" | "vip"}
              showSubscription={subscriptionTier !== 'free'}
              variant="compact"
              maxBadges={2}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;
          const reactions = message.reactions || [];
          const hasReacted = reactions.some(r => r.userId === currentUserId);
          
          return (
            <div
              key={message.id}
              className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
            >
              <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 relative group",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm",
                    message.failed && "opacity-50 border border-destructive"
                  )}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  
                  {/* Quick reaction picker on hover */}
                  {!message.optimistic && (
                    <div className={cn(
                      "absolute -top-10 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity bg-background border border-border rounded-full px-2 py-1 flex gap-1 shadow-xl z-50",
                      isOwn ? "right-0" : "left-0"
                    )}>
                      {['❤️', '👍', '😂', '😮', '😢'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            const userReaction = reactions.find(r => r.userId === currentUserId && r.emoji === emoji);
                            if (userReaction) {
                              removeReaction(message.id, emoji);
                            } else {
                              addReaction(message.id, emoji);
                            }
                          }}
                          className="hover:scale-125 active:scale-110 transition-transform text-lg p-1 touch-manipulation"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  
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

                {/* Reactions display */}
                {reactions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(
                      reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([emoji, count]) => {
                      const userReacted = reactions.some(r => r.emoji === emoji && r.userId === currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (userReacted) {
                              removeReaction(message.id, emoji);
                            } else {
                              addReaction(message.id, emoji);
                            }
                          }}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border transition-colors",
                            userReacted
                              ? "bg-primary/20 border-primary"
                              : "bg-background border-border hover:border-primary"
                          )}
                        >
                          {emoji} {count > 1 ? count : ''}
                        </button>
                      );
                    })}
                  </div>
                )}

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
                    <div className="flex items-center">
                      {message.seen_at ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : message.delivered_at ? (
                        <CheckCheck className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <Check className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        
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
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
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

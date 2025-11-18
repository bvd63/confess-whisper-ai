import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, User, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNicknameCached } from "@/lib/nicknameCache";
import { toast } from "sonner";
import { UserDisplayName } from "@/components/UserDisplayName";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { logError } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_user_id: string;
  other_user_nickname: string | null;
  last_message: string | null;
  unread_count: number;
}

interface ConversationListProps {
  currentUserId: string;
  onConversationSelect: (conversationId: string, otherUserId: string) => void;
  markAsRead?: (conversationId: string) => void;
}

export const ConversationList = ({ currentUserId, onConversationSelect, markAsRead }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [otherUserTiers, setOtherUserTiers] = useState<Record<string, string>>({});
  const { t } = useLanguage();
  const navigate = useNavigate();

  const loadConversations = useCallback(async () => {
    try {
      
      
      // Get all conversations first
      const { data: allConversations, error: convError } = await supabase
        .from('conversations')
        .select('id, deleted_for');
      
      if (convError) throw convError;
      
      // Filter out conversations where current user is in deleted_for
      const visibleConversationIds = allConversations
        ?.filter((conv: any) => {
          const deletedFor = conv.deleted_for || [];
          return !deletedFor.includes(currentUserId);
        })
        .map((conv: any) => conv.id) || [];
      
      if (visibleConversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }
      
      // Get conversations where user is a participant and not soft-deleted
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)
        .in('conversation_id', visibleConversationIds);

      if (participantError) {
        logError("Error loading participants", participantError);
        throw participantError;
      }
      

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get other user IDs via RPC to avoid RLS issues
      const partnerResults = await Promise.all(
        conversationIds.map(async (id) => {
          const { data: partnerId } = await supabase.rpc('get_conversation_partner', {
            conv_id: id,
            current_user_id: currentUserId,
          });
          return { convId: id, otherUserId: partnerId as string | null };
        })
      );

      // Get profiles for other users (deduplicate user IDs first)
      const uniqueOtherUserIds = [...new Set(
        partnerResults.map(r => r.otherUserId).filter(Boolean) as string[]
      )];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname, subscription_tier')
        .in('user_id', uniqueOtherUserIds);

      if (profilesError) {
        logError('Error loading profiles', profilesError);
        // Continue without profiles rather than throwing
      }

      // Build tier mapping
      const tierMap: Record<string, string> = {};
      profiles?.forEach(p => {
        tierMap[p.user_id] = p.subscription_tier || 'free';
      });
      setOtherUserTiers(tierMap);

      // Get last messages (exclude soft-deleted)
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id, deleted_for_sender, deleted_for_recipient')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Filter messages based on soft delete
      const visibleMessages = messages?.filter(m => {
        if (m.sender_id === currentUserId) {
          return !m.deleted_for_sender;
        } else {
          return !m.deleted_for_recipient;
        }
      });

      // Build conversations list (include empty threads too)
      const baseList: Conversation[] = conversationIds
        .map(convId => {
          const partnerId = partnerResults.find(r => r.convId === convId)?.otherUserId;
          if (!partnerId) return null;

          const profile = profiles?.find(p => p.user_id === partnerId);
          const lastMsg = visibleMessages?.find(m => m.conversation_id === convId);

          return {
            id: convId,
            created_at: lastMsg?.created_at || '',
            updated_at: lastMsg?.created_at || '',
            other_user_id: partnerId,
            other_user_nickname: profile?.nickname || null,
            last_message: lastMsg?.content || null,
            unread_count: 0
          };
        })
        .filter((c): c is Conversation => c !== null);

      // Fill missing nicknames via RPC (handles any RLS edge cases)
      const conversationsList: Conversation[] = await Promise.all(
        baseList.map(async (c) => {
          if (!c.other_user_nickname && c.other_user_id) {
            const nickname = await getNicknameCached(c.other_user_id);
            return { ...c, other_user_nickname: nickname ?? c.other_user_nickname };
          }
          return c;
        })
      );

      // Sort by most recent
      conversationsList.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setConversations(conversationsList);
    } catch (error) {
      logError('Error loading conversations', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadConversations();
    
    // Subscribe to real-time updates for messages, participants, and conversations
    const messagesChannel = supabase
      .channel('conversations-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('conversations-participants-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUserId}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('conversations-table-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [currentUserId, loadConversations]);

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Call the edge function for soft delete
      const { error } = await supabase.functions.invoke('soft-delete-conversation', {
        body: { conversationId },
      });

      if (error) throw error;

      // Immediately remove from local state for instant UI feedback
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      toast.success(t.messages_deleted);
      
      // Reload to ensure sync with backend
      await loadConversations();
    } catch (error) {
      logError('Error deleting conversation', error instanceof Error ? error : undefined);
      toast.error(t.error_generic);
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">{t.messages_no_conversations}</p>
        <Button onClick={() => navigate('/search-users')} variant="outline">
          {t.messages_start_conversation}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="flex-1 justify-start text-left p-4 h-auto"
              onClick={() => {
                if (markAsRead) {
                  markAsRead(conversation.id);
                }
                onConversationSelect(conversation.id, conversation.other_user_id);
              }}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <UserDisplayName 
                        userId={conversation.other_user_id}
                        maxLength={20}
                        clickable={false}
                        showBadges={true}
                      />
                      {conversation.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message}
                    </p>
                  )}
                </div>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setConversationToDelete(conversation.id);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.messages_delete_conversation}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.messages_delete_conversation_confirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common_back}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

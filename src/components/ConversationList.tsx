import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, User, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
}

export const ConversationList = ({ currentUserId, onConversationSelect }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('conversations-changes')
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadConversations = async () => {
    try {
      console.log("Loading conversations for user:", currentUserId);
      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (participantError) {
        console.error("Error loading participants:", participantError);
        throw participantError;
      }
      console.log("Participant data:", participantData);

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get all participants for these conversations
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (allParticipantsError) throw allParticipantsError;

      // Get other user IDs
      const otherUserIds = allParticipants
        ?.filter(p => p.user_id !== currentUserId)
        .map(p => p.user_id) || [];

      // Get profiles for other users (deduplicate user IDs first)
      const uniqueOtherUserIds = [...new Set(otherUserIds)];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname')
        .in('user_id', uniqueOtherUserIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // Continue without profiles rather than throwing
      }

      // Get last messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Build conversations list
      const baseList: Conversation[] = conversationIds.map(convId => {
        const otherParticipant = allParticipants?.find(
          p => p.conversation_id === convId && p.user_id !== currentUserId
        );
        const profile = profiles?.find(p => p.user_id === otherParticipant?.user_id);
        const lastMsg = messages?.find(m => m.conversation_id === convId);

        return {
          id: convId,
          created_at: lastMsg?.created_at || '',
          updated_at: lastMsg?.created_at || '',
          other_user_id: otherParticipant?.user_id || '',
          other_user_nickname: profile?.nickname || null,
          last_message: lastMsg?.content || null,
          unread_count: 0
        };
      });

      // Fill missing nicknames via RPC (handles any RLS edge cases)
      const conversationsList: Conversation[] = await Promise.all(
        baseList.map(async (c) => {
          if (!c.other_user_nickname && c.other_user_id) {
            const { data: nickname } = await supabase.rpc('get_user_nickname', {
              _target_user_id: c.other_user_id,
            });
            return { ...c, other_user_nickname: (nickname as string) || c.other_user_nickname };
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
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Call the database function to delete the conversation
      const { data, error } = await supabase
        .rpc('delete_conversation', {
          _conversation_id: conversationId,
          _user_id: currentUserId
        });

      if (error) throw error;

      if (!data) {
        toast.error(t.error_generic);
        return;
      }

      toast.success(t.messages_deleted);
      await loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
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
              onClick={() => onConversationSelect(conversation.id, conversation.other_user_id)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">
                      @{conversation.other_user_nickname || t.confession_anonymous}
                    </span>
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

      // Get profiles for other users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname')
        .in('user_id', otherUserIds);

      if (profilesError) throw profilesError;

      // Get last messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Build conversations list
      const conversationsList: Conversation[] = conversationIds.map(convId => {
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
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Button
          key={conversation.id}
          variant="ghost"
          className="w-full justify-start text-left p-4 h-auto"
          onClick={() => onConversationSelect(conversation.id, conversation.other_user_id)}
        >
          <div className="flex items-start gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">
                  @{conversation.other_user_nickname || 'Anonymous'}
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
      ))}
    </div>
  );
};

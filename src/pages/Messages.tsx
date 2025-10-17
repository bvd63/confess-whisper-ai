import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AppLayout from "@/components/AppLayout";
import { ConversationList } from "@/components/ConversationList";
import { MessageThread } from "@/components/MessageThread";
import { Card } from "@/components/ui/card";

const Messages = () => {
  const { user, isLoading } = useCurrentUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserNickname, setOtherUserNickname] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if we need to start a conversation with a specific user
    const userId = searchParams.get('user');
    if (userId) {
      startConversation(userId);
    }
  }, [user, isLoading, searchParams, navigate]);

  const startConversation = async (targetUserId: string) => {
    try {
      // Check if conversation already exists
      const { data: existingParticipants, error: checkError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);

      if (checkError) throw checkError;

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participant.conversation_id)
            .eq('user_id', targetUserId)
            .maybeSingle();

          if (otherParticipant) {
            // Conversation exists
            await loadOtherUserInfo(targetUserId);
            setSelectedConversation(participant.conversation_id);
            setOtherUserId(targetUserId);
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (conversationError) throw conversationError;

      // Add both participants (sequentially to avoid RLS issues)
      // First add current user
      const { error: currentUserError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConversation.id, user_id: user!.id });

      if (currentUserError) throw currentUserError;

      // Then add target user (now that current user is a participant)
      const { error: targetUserError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConversation.id, user_id: targetUserId });

      if (targetUserError) throw targetUserError;

      await loadOtherUserInfo(targetUserId);
      setSelectedConversation(newConversation.id);
      setOtherUserId(targetUserId);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const loadOtherUserInfo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setOtherUserNickname(data?.nickname || null);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleConversationSelect = async (conversationId: string, userId: string) => {
    await loadOtherUserInfo(userId);
    setSelectedConversation(conversationId);
    setOtherUserId(userId);
  };

  if (isLoading) {
    return null;
  }
  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Card className="overflow-hidden">
          {!selectedConversation ? (
            <div>
              <div className="p-6 border-b border-border">
                <h1 className="text-2xl font-bold">{t.messages_title}</h1>
              </div>
              <ConversationList
                currentUserId={user.id}
                onConversationSelect={handleConversationSelect}
              />
            </div>
          ) : (
            <div className="h-[600px]">
              <MessageThread
                conversationId={selectedConversation}
                currentUserId={user.id}
                otherUserId={otherUserId!}
                otherUserNickname={otherUserNickname}
                onBack={() => {
                  setSelectedConversation(null);
                  setOtherUserId(null);
                  setOtherUserNickname(null);
                }}
              />
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default Messages;

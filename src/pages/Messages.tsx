import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AppLayout from "@/components/AppLayout";
import { ConversationList } from "@/components/ConversationList";
import { EnhancedMessageThread } from "@/components/EnhancedMessageThread";
import { Card } from "@/components/ui/card";

const Messages = () => {
  const { user, isLoading } = useCurrentUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserNickname, setOtherUserNickname] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    // Start conversation with URL user param only once (guard StrictMode double-invoke)
    const userId = searchParams.get('user');
    if (userId && !startedRef.current) {
      startedRef.current = true;
      startConversation(userId);
    }
  }, [user, isLoading, searchParams, navigate]);

  const startConversation = async (targetUserId: string) => {
    try {
      const { data: convId, error } = await supabase.rpc('get_or_create_conversation', {
        _user1: user!.id,
        _user2: targetUserId,
      });

      if (error) throw error;

      await loadOtherUserInfo(targetUserId);
      setSelectedConversation((convId as string) || null);
      setOtherUserId(targetUserId);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const loadOtherUserInfo = async (userId: string) => {
    try {
      // Prefer secure RPC to avoid any RLS edge cases
      const { data: nickname, error: rpcError } = await supabase.rpc('get_user_nickname', {
        _target_user_id: userId,
      });

      if (!rpcError && nickname) {
        setOtherUserNickname(nickname as string);
        return;
      }

      // Fallback to direct select (should also work with policies)
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setOtherUserNickname(data?.nickname || null);
    } catch (error) {
      console.error('Error loading user info:', error);
      setOtherUserNickname(null);
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
              <EnhancedMessageThread
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

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getNicknameCached } from "@/lib/nicknameCache";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useInbox } from "@/hooks/useInbox";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { ConversationList } from "@/components/ConversationList";
import { EnhancedMessageThread } from "@/components/EnhancedMessageThread";
import { AnimatedCard } from "@/components/AnimatedCard";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { sessionManager } from "@/lib/sessionManager";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";
import { useTabNavigation } from "@/contexts/TabNavigationContext";


const Messages = () => {
  const { user, isLoading } = useCurrentUser();
  const { markConversationAsRead } = useInbox(user?.id || null);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTab, resetTabStack, pushToTabStack, popFromTabStack } = useTabNavigation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserNickname, setOtherUserNickname] = useState<string | null>(null);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const startedRef = useRef(false);
  
  // Restore scroll position when returning to conversation list
  useScrollRestoration(!selectedConversation);

  console.log('[Messages] Render state:', {
    activeTab,
    selectedConversation,
    otherUserId,
    pathname: location.pathname,
    search: location.search
  });

  // Only clear state when navigating away from /messages
  useEffect(() => {
    const onMessagesRoute = location.pathname.startsWith('/messages');
    console.log('[Messages] Route check:', {
      onMessagesRoute,
      selectedConversation,
      pathname: location.pathname,
      search: location.search
    });

    if (!onMessagesRoute) {
      setSelectedConversation(null);
      setOtherUserId(null);
      setOtherUserNickname(null);
    }
  }, [location.pathname]);

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
      const nickname = await getNicknameCached(userId);

      if (nickname) {
        setOtherUserNickname(nickname);
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
    // Validate userId before proceeding
    if (!userId || userId.trim() === '') {
      console.error('Invalid userId provided to handleConversationSelect');
      toast.error(t.error_generic);
      return;
    }
    
    await loadOtherUserInfo(userId);
    setSelectedConversation(conversationId);
    setOtherUserId(userId);
    
    // Update URL to reflect conversation state
    setSearchParams({ user: userId });
    
    // Track in messages tab stack for in-tab back navigation
    pushToTabStack('messages', `/messages?user=${userId}`);
    
    // Save session state
    await sessionManager.saveSessionState('/messages', userId);
  };

  const handleBackFromConversation = () => {
    setSelectedConversation(null);
    setOtherUserId(null);
    setOtherUserNickname(null);
    
    // Clear URL params to return to messages list
    setSearchParams({});
    // Ensure URL is reset to messages root
    navigate('/messages', { replace: true });
    
    // Pop back to list within tab stack
    popFromTabStack('messages');
  };
  if (isLoading) {
    return null;
  }
  if (!user) {
    return null;
  }

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <NetworkStatusIndicator />
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        <AnimatedCard className="overflow-hidden" hover="none">
          {!selectedConversation ? (
            <div>
              <div className="p-4 sm:p-6 border-b border-border glass"
              >
                <h1 className="text-xl sm:text-2xl font-bold">{t.messages_title}</h1>
              </div>
              <ConversationList
                currentUserId={user.id}
                onConversationSelect={handleConversationSelect}
                markAsRead={markConversationAsRead}
              />
            </div>
          ) : (
            <div className="h-[calc(100vh-200px)] sm:h-[600px]">
              <EnhancedMessageThread
                conversationId={selectedConversation}
                currentUserId={user.id}
                otherUserId={otherUserId!}
                otherUserNickname={otherUserNickname}
                onBack={handleBackFromConversation}
              />
            </div>
          )}
        </AnimatedCard>
      </div>
      
      
    </AppLayout>
    <ManageSubscriptionDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default Messages;

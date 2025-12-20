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
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";
import { logDebug, logError } from "@/lib/logger";


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
  
  // Pull to refresh (only for conversation list)
  const { containerRef, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 80,
    disabled: !!selectedConversation, // Disable when viewing a conversation
  });
  
  // Restore scroll position when returning to conversation list
  useScrollRestoration(!selectedConversation);

  logDebug('[Messages] Render state', {
    activeTab,
    selectedConversation,
    otherUserId,
    pathname: location.pathname,
    search: location.search
  });

  // Only clear state when navigating away from /messages
  useEffect(() => {
    const onMessagesRoute = location.pathname.startsWith('/messages');
    logDebug('[Messages] Route check', {
      onMessagesRoute,
      selectedConversation,
      pathname: location.pathname,
      search: location.search
    });

    if (!onMessagesRoute) {
      setSelectedConversation(null);
      setOtherUserId(null);
      setOtherUserNickname(null);
      // Clear any persisted conversation so it won't auto-redirect back
      sessionManager.saveSessionState('/messages', null);
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
      // Ensure messages tab stack reflects deep-linked conversation
      pushToTabStack('messages', `/messages`);
    } catch (error) {
      logError('Error starting conversation', error as Error);
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
        .from('public_profiles')
        .select('nickname')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setOtherUserNickname(data?.nickname || null);
    } catch (error) {
      logError('Error loading user info', error as Error);
      setOtherUserNickname(null);
    }
  };

  const handleConversationSelect = async (conversationId: string, userId: string) => {
    // Validate userId before proceeding
    if (!userId || userId.trim() === '') {
      logError('Invalid userId provided to handleConversationSelect');
      toast.error(t.error_generic);
      return;
    }
    
    await loadOtherUserInfo(userId);
    setSelectedConversation(conversationId);
    setOtherUserId(userId);
    
    // Track in messages tab stack for in-tab back navigation
    pushToTabStack('messages', `/messages`);
    
    // Save session state (never persist a specific conversation)
    await sessionManager.saveSessionState('/messages', null);
  };

  const handleBackFromConversation = () => {
    setSelectedConversation(null);
    setOtherUserId(null);
    setOtherUserNickname(null);
    
    // Ensure URL is reset to messages root
    navigate('/messages', { replace: true });
    
    // Pop back to list within tab stack
    popFromTabStack('messages');

    // Clear any persisted conversation redirect
    sessionManager.saveSessionState('/messages', null);
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
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && !selectedConversation && (
        <div 
          className="fixed top-16 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 80, 0)}px)`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <div className="bg-primary/10 backdrop-blur-sm rounded-full p-2">
            <Loader2 className={`h-5 w-5 text-primary ${isRefreshing || isTriggered ? 'animate-spin' : ''}`} />
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="container max-w-4xl mx-auto px-4 py-6 pb-24"
      >
        <AnimatedCard className="overflow-hidden rounded-2xl border border-border/50" hover="none">
          {!selectedConversation ? (
            <div>
              <div className="p-6 border-b border-border/50 bg-card/50 backdrop-blur-sm">
                <h1 className="text-2xl font-bold">{t.messages_title}</h1>
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
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default Messages;

import { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { UserDisplayName } from "@/components/UserDisplayName";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import FollowButton from "./FollowButton";
import { logDebug, logError } from "@/lib/logger";

interface UserProfile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface FollowersListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUserId: string | null;
  initialTab?: "followers" | "following";
}

export const FollowersListDialog = ({
  open,
  onOpenChange,
  userId,
  currentUserId,
  initialTab = "followers",
}: FollowersListDialogProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Track pending optimistic operations to avoid duplicate real-time updates
  const pendingOps = useRef<Set<string>>(new Set());

  // Fetch initial data
  useEffect(() => {
    if (open && userId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [open, userId]);

  // Real-time subscription
  useEffect(() => {
    if (!open || !userId) return;

    logDebug("[FOLLOWERS-LIST] Setting up realtime subscription for userId:", userId);

    const channel = supabase
      .channel(`follow-list-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_follows",
        },
        async (payload) => {
          logDebug("[FOLLOWERS-LIST] INSERT event received:", payload);
          
          const opKey = `${payload.new.follower_id}:${payload.new.following_id}`;
          
          // Skip if this is a pending optimistic operation (already applied)
          if (pendingOps.current.has(opKey)) {
            logDebug("[FOLLOWERS-LIST] → Skipping duplicate (pending op):", opKey);
            pendingOps.current.delete(opKey);
            return;
          }
          
          // If someone followed this user → add to followers list
          if (payload.new.following_id === userId) {
            logDebug("[FOLLOWERS-LIST] → New follower detected, fetching user:", payload.new.follower_id);
            const newFollower = await fetchUserProfile(payload.new.follower_id);
            if (newFollower) {
              setFollowers(prev => {
                // Avoid duplicates
                if (prev.some(u => u.user_id === newFollower.user_id)) return prev;
                return [newFollower, ...prev];
              });
            }
          }
          
          // If this user followed someone → add to following list
          if (payload.new.follower_id === userId) {
            logDebug("[FOLLOWERS-LIST] → New following detected, fetching user:", payload.new.following_id);
            const newFollowing = await fetchUserProfile(payload.new.following_id);
            if (newFollowing) {
              setFollowing(prev => {
                // Avoid duplicates
                if (prev.some(u => u.user_id === newFollowing.user_id)) return prev;
                return [newFollowing, ...prev];
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "user_follows",
        },
        (payload) => {
          logDebug("[FOLLOWERS-LIST] DELETE event received:", payload);
          
          const opKey = `${payload.old.follower_id}:${payload.old.following_id}`;
          
          // Skip if this is a pending optimistic operation (already applied)
          if (pendingOps.current.has(opKey)) {
            logDebug("[FOLLOWERS-LIST] → Skipping duplicate (pending op):", opKey);
            pendingOps.current.delete(opKey);
            return;
          }
          
          // If someone unfollowed this user → remove from followers list
          if (payload.old.following_id === userId) {
            logDebug("[FOLLOWERS-LIST] → Follower removed:", payload.old.follower_id);
            setFollowers(prev => prev.filter(u => u.user_id !== payload.old.follower_id));
          }
          
          // If this user unfollowed someone → remove from following list
          if (payload.old.follower_id === userId) {
            logDebug("[FOLLOWERS-LIST] → Following removed:", payload.old.following_id);
            setFollowing(prev => prev.filter(u => u.user_id !== payload.old.following_id));
          }
        }
      )
      .subscribe();

    return () => {
      logDebug("[FOLLOWERS-LIST] Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [open, userId]);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logError("Error fetching user profile:", error instanceof Error ? error : undefined);
      return null;
    }
  };

  // Optimistic follow: add user to followers list immediately
  const optimisticFollow = useCallback(async (followerId: string, followingId: string) => {
    const opKey = `${followerId}:${followingId}`;
    pendingOps.current.add(opKey);
    
    logDebug("[FOLLOWERS-LIST] Optimistic follow:", opKey);
    
    // If someone is following the profile we're viewing
    if (followingId === userId) {
      const followerProfile = await fetchUserProfile(followerId);
      if (followerProfile) {
        setFollowers(prev => {
          if (prev.some(u => u.user_id === followerId)) return prev;
          return [followerProfile, ...prev];
        });
      }
    }
    
    // If the profile we're viewing is following someone
    if (followerId === userId) {
      const followingProfile = await fetchUserProfile(followingId);
      if (followingProfile) {
        setFollowing(prev => {
          if (prev.some(u => u.user_id === followingId)) return prev;
          return [followingProfile, ...prev];
        });
      }
    }
    
    // Clear pending after a short delay (real-time should reconcile)
    setTimeout(() => pendingOps.current.delete(opKey), 3000);
  }, [userId]);

  // Optimistic unfollow: remove user from lists immediately
  const optimisticUnfollow = useCallback((followerId: string, followingId: string) => {
    const opKey = `${followerId}:${followingId}`;
    pendingOps.current.add(opKey);
    
    logDebug("[FOLLOWERS-LIST] Optimistic unfollow:", opKey);
    
    // If someone unfollowed the profile we're viewing
    if (followingId === userId) {
      setFollowers(prev => prev.filter(u => u.user_id !== followerId));
    }
    
    // If the profile we're viewing unfollowed someone
    if (followerId === userId) {
      setFollowing(prev => prev.filter(u => u.user_id !== followingId));
    }
    
    // Clear pending after a short delay
    setTimeout(() => pendingOps.current.delete(opKey), 3000);
  }, [userId]);

  // Expose methods to parent components via window event
  useEffect(() => {
    const handleOptimisticFollow = (event: CustomEvent) => {
      const { followerId, followingId } = event.detail;
      optimisticFollow(followerId, followingId);
    };
    
    const handleOptimisticUnfollow = (event: CustomEvent) => {
      const { followerId, followingId } = event.detail;
      optimisticUnfollow(followerId, followingId);
    };
    
    window.addEventListener('optimistic-follow' as any, handleOptimisticFollow);
    window.addEventListener('optimistic-unfollow' as any, handleOptimisticUnfollow);
    
    return () => {
      window.removeEventListener('optimistic-follow' as any, handleOptimisticFollow);
      window.removeEventListener('optimistic-unfollow' as any, handleOptimisticUnfollow);
    };
  }, [optimisticFollow, optimisticUnfollow]);

  const fetchFollowers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select(`
          follower_id,
          profiles!user_follows_follower_id_fkey (
            user_id,
            nickname,
            avatar_url
          )
        `)
        .eq("following_id", userId);

      if (error) throw error;

      const users = data
        ?.map((item: any) => item.profiles)
        .filter(Boolean) as UserProfile[];
      
      setFollowers(users || []);
    } catch (error) {
      logError("Error fetching followers:", error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select(`
          following_id,
          profiles!user_follows_following_id_fkey (
            user_id,
            nickname,
            avatar_url
          )
        `)
        .eq("follower_id", userId);

      if (error) throw error;

      const users = data
        ?.map((item: any) => item.profiles)
        .filter(Boolean) as UserProfile[];
      
      setFollowing(users || []);
    } catch (error) {
      logError("Error fetching following:", error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };

  const renderUserList = (users: UserProfile[]) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => {
                onOpenChange(false);
                navigate(`/profile/${user.user_id}`);
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>{user.nickname?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <UserDisplayName
                  userId={user.user_id}
                  maxLength={24}
                  showBadges
                  className="text-sm font-medium"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {currentUserId && user.user_id !== currentUserId && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => navigate(`/messages?user=${user.user_id}`)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <FollowButton targetUserId={user.user_id} currentUserId={currentUserId} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.profile_followers || "Followers"} & {t.profile_following || "Following"}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              {t.profile_followers || "Followers"} ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              {t.profile_following || "Following"} ({following.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4 max-h-[400px] overflow-y-auto">
            {renderUserList(followers)}
          </TabsContent>
          
          <TabsContent value="following" className="mt-4 max-h-[400px] overflow-y-auto">
            {renderUserList(following)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

import { useEffect, useState } from "react";
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
import { logDebug } from "@/lib/logger";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { followersListKey, followingListKey, type MinimalUserProfile } from "@/lib/followQuery";

type UserProfile = MinimalUserProfile;

type FollowRow = {
  profiles: UserProfile | null;
};

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
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState(initialTab);

  // React Query keys used for list caches:
  // - Followers list: ["followers-list", profileUserId]
  // - Following list: ["following-list", profileUserId]
  const followersQuery = useQuery({
    queryKey: followersListKey(userId),
    queryFn: async () => {

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

      const rows = (data ?? []) as unknown as FollowRow[];
      return rows.map((row) => row.profiles).filter((p): p is UserProfile => Boolean(p));
    },
    enabled: open && !!userId,
  });

  const followingQuery = useQuery({
    queryKey: followingListKey(userId),
    queryFn: async () => {
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

      const rows = (data ?? []) as unknown as FollowRow[];
      return rows.map((row) => row.profiles).filter((p): p is UserProfile => Boolean(p));
    },
    enabled: open && !!userId,
  });

  // Real-time subscription (updates React Query caches)
  useEffect(() => {
    if (!open || !userId) return;

    logDebug("[FOLLOWERS-LIST] Setting up realtime subscription", { userId });

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
          logDebug("[FOLLOWERS-LIST] INSERT event received", { payload });
          const newRecord = payload.new as { follower_id: string; following_id: string };

          // Someone followed this profile -> prepend follower to followers list cache
          if (newRecord.following_id === userId) {
            queryClient.setQueryData<UserProfile[]>(followersListKey(userId), (prev) => {
              if (!prev) return prev;
              const next = prev.filter((u) => u.user_id !== newRecord.follower_id);
              next.unshift({ user_id: newRecord.follower_id, nickname: null, avatar_url: null });
              return next;
            });
          }

          // This profile followed someone -> prepend to following list cache
          if (newRecord.follower_id === userId) {
            queryClient.setQueryData<UserProfile[]>(followingListKey(userId), (prev) => {
              if (!prev) return prev;
              const next = prev.filter((u) => u.user_id !== newRecord.following_id);
              next.unshift({ user_id: newRecord.following_id, nickname: null, avatar_url: null });
              return next;
            });
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
          logDebug("[FOLLOWERS-LIST] DELETE event received", { payload });
          const oldRecord = payload.old as { follower_id: string; following_id: string };

          // Someone unfollowed this profile -> remove follower from followers list cache
          if (oldRecord.following_id === userId) {
            queryClient.setQueryData<UserProfile[]>(followersListKey(userId), (prev) => {
              if (!prev) return prev;
              return prev.filter((u) => u.user_id !== oldRecord.follower_id);
            });
          }

          // This profile unfollowed someone -> remove from following list cache
          if (oldRecord.follower_id === userId) {
            queryClient.setQueryData<UserProfile[]>(followingListKey(userId), (prev) => {
              if (!prev) return prev;
              return prev.filter((u) => u.user_id !== oldRecord.following_id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      logDebug("[FOLLOWERS-LIST] Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [open, userId, queryClient]);

  const renderUserList = (users: UserProfile[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (!users || users.length === 0) {
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
              {t.profile_followers || "Followers"} ({followersQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="following">
              {t.profile_following || "Following"} ({followingQuery.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4 max-h-[400px] overflow-y-auto">
            {renderUserList(followersQuery.data, followersQuery.isLoading)}
          </TabsContent>
          
          <TabsContent value="following" className="mt-4 max-h-[400px] overflow-y-auto">
            {renderUserList(followingQuery.data, followingQuery.isLoading)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

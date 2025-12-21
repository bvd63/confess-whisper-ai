import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { UserDisplayName } from "@/components/UserDisplayName";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export type ExploreUserResult = {
  user_id: string;
  nickname: string | null;
  subscription_tier?: string;
};

interface ExploreUserResultsProps {
  users: ExploreUserResult[];
  currentUserId: string | null;
}

export const ExploreUserResults = ({ users, currentUserId }: ExploreUserResultsProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  if (!currentUserId) return null;

  const userIds = useMemo(() => users.map((u) => u.user_id).filter(Boolean), [users]);

  const refreshFollowing = useCallback(
    async (ids: string[]) => {
      if (!currentUserId || ids.length === 0) return null;

      const { data, error } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .in("following_id", ids);

      if (error) return null;

      const nextMap: Record<string, boolean> = {};
      ids.forEach((id) => {
        nextMap[id] = Boolean(data?.find((row) => row.following_id === id));
      });

      setFollowingMap((prev) => ({ ...prev, ...nextMap }));
      return nextMap;
    },
    [currentUserId]
  );

  useEffect(() => {
    if (!currentUserId || userIds.length === 0) {
      setFollowingMap({});
      return;
    }
    refreshFollowing(userIds);
  }, [currentUserId, userIds, refreshFollowing]);

  useEffect(() => {
    if (!pendingUserId) return;

    const timer = setTimeout(async () => {
      const previous = followingMap[pendingUserId] ?? false;
      const updated = await refreshFollowing([pendingUserId]);
      const next = updated ? updated[pendingUserId] ?? previous : previous;

      if (!previous && next) {
        toast({ title: t.common_success, description: t.explore_following_updated_toast });
      }

      setPendingUserId(null);
    }, 900);

    return () => clearTimeout(timer);
  }, [pendingUserId, refreshFollowing, followingMap, toast, t]);

  if (users.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">{t.search_users}</p>
      </div>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <UserDisplayName userId={user.user_id} maxLength={24} showBadges className="text-sm font-medium" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/80 hover:text-white"
                onClick={() => navigate(`/messages?user=${user.user_id}`)}
                title={t.messages_title}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <div onClick={() => setPendingUserId(user.user_id)}>
                <FollowButton targetUserId={user.user_id} currentUserId={currentUserId} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

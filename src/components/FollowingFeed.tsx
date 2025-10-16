import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import ConfessionCard from "./ConfessionCard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

interface FollowingFeedProps {
  userId: string;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

const FollowingFeed = ({ userId, isPremium, onUpgradeClick }: FollowingFeedProps) => {
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFollowingConfessions();
  }, [userId]);

  const loadFollowingConfessions = async () => {
    try {
      // Get list of users the current user is following
      const { data: following, error: followError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      if (!following || following.length === 0) {
        setConfessions([]);
        setLoading(false);
        return;
      }

      const followingIds = following.map(f => f.following_id);

      // Get confessions from followed users
      const { data: confessionsData, error: confError } = await supabase
        .from('confessions')
        .select('*')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (confError) throw confError;

      setConfessions(confessionsData || []);
    } catch (err) {
      console.error('Error loading following feed:', err);
      setError('Nu am putut încărca confesiunile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Se încarcă feed-ul..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onRetry={loadFollowingConfessions}
      />
    );
  }

  if (confessions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nu urmărești pe nimeni încă</h3>
        <p className="text-sm text-muted-foreground">
          Începe să urmărești utilizatori pentru a le vedea confesiunile aici
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Feed-ul tău personalizat</h2>
        <span className="text-sm text-muted-foreground">
          ({confessions.length} confesiuni)
        </span>
      </div>

      {confessions.map((confession) => (
        <ConfessionCard
          key={confession.id}
          confession={confession}
          isPremium={isPremium}
          onUpgradeClick={onUpgradeClick}
          onInsightGenerated={loadFollowingConfessions}
          onLikeChange={loadFollowingConfessions}
          onCommentChange={loadFollowingConfessions}
          onBookmarkChange={loadFollowingConfessions}
        />
      ))}
    </div>
  );
};

export default FollowingFeed;
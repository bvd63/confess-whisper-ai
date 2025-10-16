import { Card } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { useFollowing } from "@/hooks/useFollowing";
import { useLanguage } from "@/contexts/LanguageContext";

interface FollowStatsProps {
  userId: string;
}

const FollowStats = ({ userId }: FollowStatsProps) => {
  const { followingCount, followersCount, loading } = useFollowing({ userId });
  const { t } = useLanguage();

  if (loading) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t.follow_connections}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-accent/50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{followingCount}</p>
          <p className="text-sm text-muted-foreground">{t.follow_following}</p>
        </div>

        <div className="text-center p-4 bg-accent/50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{followersCount}</p>
          <p className="text-sm text-muted-foreground">{t.follow_followers}</p>
        </div>
      </div>
    </Card>
  );
};

export default FollowStats;
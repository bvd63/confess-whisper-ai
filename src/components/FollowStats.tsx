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
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold">{t.follow_connections}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="text-center p-3 sm:p-4 bg-accent/50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-primary">{followingCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.follow_following}</p>
        </div>

        <div className="text-center p-3 sm:p-4 bg-accent/50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-primary">{followersCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.follow_followers}</p>
        </div>
      </div>
    </Card>
  );
};

export default FollowStats;
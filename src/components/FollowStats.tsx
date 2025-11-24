import { Card } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { useFollowing } from "@/hooks/useFollowing";
import { useLanguage } from "@/contexts/LanguageContext";
interface FollowStatsProps {
  userId: string;
}
const FollowStats = ({
  userId
}: FollowStatsProps) => {
  const {
    followingCount,
    followersCount,
    loading
  } = useFollowing({
    userId
  });
  const {
    t
  } = useLanguage();
  if (loading) return null;
  return <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1">
          <div className="p-2 sm:p-2.5 rounded-full bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold">{followersCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t.profile_followers}</p>
          </div>
        </div>
        
        <div className="h-10 w-px bg-border" />
        
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1">
          <div className="p-2 sm:p-2.5 rounded-full bg-primary/10">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold">{followingCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t.profile_following}</p>
          </div>
        </div>
      </div>
    </Card>;
};
export default FollowStats;
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
  return <Card className="p-5 rounded-3xl shadow-card border-border/50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-ios">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{followersCount}</p>
            <p className="text-sm font-semibold text-muted-foreground">{t.profile_followers}</p>
          </div>
        </div>
        
        <div className="h-14 w-px bg-border/50" />
        
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-ios">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{followingCount}</p>
            <p className="text-sm font-semibold text-muted-foreground">{t.profile_following}</p>
          </div>
        </div>
      </div>
    </Card>;
};
export default FollowStats;
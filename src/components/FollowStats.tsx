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
  return <Card className="p-6 py-[3px]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{followersCount}</p>
            <p className="text-sm text-muted-foreground">{t.profile_followers}</p>
          </div>
        </div>
        
        <div className="h-12 w-px bg-border" />
        
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 rounded-full bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{followingCount}</p>
            <p className="text-sm text-muted-foreground">{t.profile_following}</p>
          </div>
        </div>
      </div>
    </Card>;
};
export default FollowStats;
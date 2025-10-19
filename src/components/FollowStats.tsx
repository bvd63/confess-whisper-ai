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
  return;
};
export default FollowStats;
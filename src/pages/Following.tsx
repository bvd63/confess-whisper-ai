import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import FollowingFeed from "@/components/FollowingFeed";
import FollowStats from "@/components/FollowStats";
import AppLayout from "@/components/AppLayout";

const Following = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium } = usePremiumStatus(user?.id);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">{t.following_your_feed}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FollowingFeed
              userId={user.id}
              isPremium={isPremium}
              onUpgradeClick={() => navigate('/')}
            />
          </div>

          <div className="space-y-6">
            <FollowStats userId={user.id} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Following;
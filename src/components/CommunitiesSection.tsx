import { useLanguage } from "@/contexts/LanguageContext";
import { useCommunities } from "@/hooks/useCommunities";
import { CommunityCard } from "@/components/CommunityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export const CommunitiesSection = () => {
  const { t } = useLanguage();
  const { communities, isLoading } = useCommunities();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t.home_communities_title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            {t.loading}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t.home_communities_title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {communities?.slice(0, 6).map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
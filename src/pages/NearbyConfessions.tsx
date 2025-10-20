import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { GradientText } from "@/components/GradientText";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, List, Map as MapIcon } from "lucide-react";
import { useNearbyConfessions } from "@/hooks/useNearbyConfessions";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfessionCard from "@/components/ConfessionCard";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";

const NearbyConfessions = () => {
  const [radius, setRadius] = useState<number>(50);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const { user } = useCurrentUser();
  const { data: confessions, isLoading, error } = useNearbyConfessions({ radiusKm: radius });
  const { isPremium } = usePremiumStatus(user?.id);
  const { t } = useLanguage();
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24">
        {/* Header */}
        <div className="mb-8 text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold mb-2">
            <GradientText variant="hero">{t.nearby_title}</GradientText>
          </h1>
          <p className="text-muted-foreground">
            {t.nearby_discover}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t.nearby_radius} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">{t.nearby_within_km.replace('{km}', '10')}</SelectItem>
              <SelectItem value="25">{t.nearby_within_km.replace('{km}', '25')}</SelectItem>
              <SelectItem value="50">{t.nearby_within_km.replace('{km}', '50')}</SelectItem>
              <SelectItem value="100">{t.nearby_within_km.replace('{km}', '100')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4 mr-2" />
              {t.nearby_list_view}
            </Button>
            <Button
              variant={view === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('map')}
              disabled
              title={t.nearby_map_coming_soon}
            >
              <MapIcon className="w-4 h-4 mr-2" />
              {t.nearby_map_view}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <AnimatedCard glass className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-muted-foreground mb-2">{t.nearby_no_location}</p>
            <p className="text-sm text-muted-foreground">
              {t.nearby_enable_location}
            </p>
          </AnimatedCard>
        ) : confessions && confessions.length > 0 ? (
          <div className="space-y-4">
            {confessions.map((confession, index) => (
              <div 
                key={confession.id} 
                className="relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ConfessionCard 
                  confession={confession}
                  isPremium={isPremium}
                  onUpgradeClick={() => setShowPremiumDialog(true)}
                  onInsightGenerated={() => {}}
                />
                {confession.distance !== undefined && (
                  <div className="absolute top-4 right-4">
                    <AnimatedCard glass className="px-3 py-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{t.nearby_distance_km.replace('{distance}', confession.distance.toFixed(1))}</span>
                      </div>
                    </AnimatedCard>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <AnimatedCard glass className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">{t.nearby_none_found}</p>
            <p className="text-sm text-muted-foreground">
              {t.nearby_increase_radius}
            </p>
          </AnimatedCard>
        )}
      </div>
    </AppLayout>
    <ManageSubscriptionDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default NearbyConfessions;

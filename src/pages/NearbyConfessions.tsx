import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, List, Map as MapIcon } from "lucide-react";
import { useNearbyConfessions } from "@/hooks/useNearbyConfessions";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfessionCard from "@/components/ConfessionCard";
import { AnimatedCard } from "@/components/AnimatedCard";

const NearbyConfessions = () => {
  const [radius, setRadius] = useState<number>(50);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const { user } = useCurrentUser();
  const { data: confessions, isLoading, error } = useNearbyConfessions({ radiusKm: radius });
  const { isPremium } = usePremiumStatus(user?.id);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <FloatingElement delay={0}>
            <MapPin className="w-16 h-16 mx-auto mb-4 text-primary" />
          </FloatingElement>
          <h1 className="text-4xl font-bold mb-2">
            <GradientText variant="hero">Nearby Confessions</GradientText>
          </h1>
          <p className="text-muted-foreground">
            Discover confessions from people around you
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Within 10 km</SelectItem>
              <SelectItem value="25">Within 25 km</SelectItem>
              <SelectItem value="50">Within 50 km</SelectItem>
              <SelectItem value="100">Within 100 km</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={view === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('map')}
              disabled
              title="Map view coming soon"
            >
              <MapIcon className="w-4 h-4 mr-2" />
              Map
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <AnimatedCard glass className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-muted-foreground mb-2">Could not get your location</p>
            <p className="text-sm text-muted-foreground">
              Please enable location permissions to see nearby confessions
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
                        <span>{confession.distance.toFixed(1)} km</span>
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
            <p className="text-muted-foreground mb-2">No nearby confessions found</p>
            <p className="text-sm text-muted-foreground">
              Try increasing the search radius or check back later
            </p>
          </AnimatedCard>
        )}
      </div>
    </AppLayout>
  );
};

export default NearbyConfessions;

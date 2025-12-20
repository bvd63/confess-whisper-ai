import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Geolocation } from "@capacitor/geolocation";
import { attachActiveBoosts } from "@/lib/boosts";

interface NearbyConfessionsOptions {
  radiusKm?: number;
  limit?: number;
}

export const useNearbyConfessions = (options: NearbyConfessionsOptions = {}) => {
  const { radiusKm = 50, limit = 50 } = options;

  return useQuery({
    queryKey: ['nearby-confessions', radiusKm, limit],
    queryFn: async () => {
      // Get current location
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;

      // Calculate bounding box for initial filter
      // 1 degree latitude ≈ 111 km
      // 1 degree longitude ≈ 111 km * cos(latitude)
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .eq('location_enabled', true)
        .eq('moderation_status', 'approved')
        .eq('is_hidden', false)
        .eq('is_draft', false)
        .gte('location_lat', latitude - latDelta)
        .lte('location_lat', latitude + latDelta)
        .gte('location_lng', longitude - lngDelta)
        .lte('location_lng', longitude + lngDelta)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more than needed for distance filtering

      if (error) throw error;

      // Calculate actual distances and filter
      const confessionsWithDistance = (data || [])
        .map(confession => {
          if (!confession.location_lat || !confession.location_lng) return null;

          const distance = calculateDistance(
            latitude,
            longitude,
            confession.location_lat,
            confession.location_lng
          );

          return {
            ...confession,
            distance,
          };
        })
        .filter(c => c && c.distance <= radiusKm)
        .sort((a, b) => a!.distance - b!.distance)
        .slice(0, limit);

      return attachActiveBoosts(confessionsWithDistance as any[]);
    },
    retry: false,
  });
};

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

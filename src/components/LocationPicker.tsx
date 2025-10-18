import { useState, useEffect } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface LocationPickerProps {
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  } | null) => void;
  initialLocation?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  } | null;
}

export const LocationPicker = ({ onLocationSelect, initialLocation }: LocationPickerProps) => {
  const [location, setLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding to get city and country
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTBqY3prOG8wMm82MnJzOGt6YXhzcDY5In0.dummy'}`
      );
      const data = await response.json();

      let city, country;
      if (data.features && data.features.length > 0) {
        const place = data.features.find((f: any) => f.place_type.includes('place'));
        const countryFeature = data.features.find((f: any) => f.place_type.includes('country'));
        city = place?.text;
        country = countryFeature?.text;
      }

      const newLocation = {
        lat: latitude,
        lng: longitude,
        city,
        country,
      };

      setLocation(newLocation);
      onLocationSelect(newLocation);

      toast({
        title: "Location detected",
        description: `${city || 'Location'}, ${country || 'Unknown'}`,
      });
    } catch (error: any) {
      console.error('Error getting location:', error);
      toast({
        title: "Location error",
        description: error.message || "Could not get your location. Please enable location permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    onLocationSelect(null);
  };

  return (
    <div className="space-y-2">
      {location ? (
        <Card className="p-3 flex items-center justify-between glass">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <div className="text-sm">
              <p className="font-medium">{location.city || 'Location'}</p>
              <p className="text-muted-foreground text-xs">{location.country}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLocation}
          >
            <X className="w-4 h-4" />
          </Button>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={loading}
          className="w-full"
        >
          <MapPin className="w-4 h-4 mr-2" />
          {loading ? "Detecting location..." : "Add location (optional)"}
        </Button>
      )}
    </div>
  );
};

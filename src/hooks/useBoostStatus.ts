import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BoostStatus {
  isActive: boolean;
  secondsRemaining: number;
  endsAt: string | null;
}

export const useBoostStatus = (confessionId: string) => {
  const [boostStatus, setBoostStatus] = useState<BoostStatus>({
    isActive: false,
    secondsRemaining: 0,
    endsAt: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchBoostStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("confession_boosts")
        .select("status, ends_at")
        .eq("confession_id", confessionId)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const endsAt = new Date(data.ends_at);
        const now = new Date();
        const secondsRemaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));

        setBoostStatus({
          isActive: secondsRemaining > 0,
          secondsRemaining,
          endsAt: data.ends_at,
        });
      } else {
        setBoostStatus({
          isActive: false,
          secondsRemaining: 0,
          endsAt: null,
        });
      }
    } catch (error) {
      console.error("Error fetching boost status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoostStatus();
    
    // Refresh every minute
    const interval = setInterval(fetchBoostStatus, 60000);
    return () => clearInterval(interval);
  }, [confessionId]);

  return { boostStatus, loading, refetch: fetchBoostStatus };
};

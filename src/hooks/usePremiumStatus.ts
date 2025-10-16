import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePremiumStatus = (userId: string | null | undefined) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      checkPremiumStatus();
    } else {
      setIsPremium(false);
      setIsLoading(false);
    }
  }, [userId]);

  const checkPremiumStatus = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsPremium(data?.is_premium || false);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isPremium, isLoading, refetch: checkPremiumStatus };
};

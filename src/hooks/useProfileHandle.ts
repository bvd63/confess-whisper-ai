import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useProfileHandle = (userId: string | null) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateHandle = useCallback(async (nickname: string): Promise<string | null> => {
    if (!userId || !nickname) return null;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase
        .rpc('generate_unique_handle', { base_nickname: nickname });

      if (error) throw error;
      
      // Just return the generated handle, don't update the profile
      // Let the caller handle the update
      return data;
    } catch (error) {
      console.error('Error generating handle:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [userId]);

  return {
    generateHandle,
    isGenerating,
  };
};
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
      
      // Update profile with generated handle
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ handle: data })
        .eq('user_id', userId);

      if (updateError) throw updateError;

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
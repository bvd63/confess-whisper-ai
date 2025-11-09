import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCachePurgeOnDelete } from './useCachePurgeOnDelete';
import { logError } from '@/lib/logger';

/**
 * GDPR compliance hook for data export and account deletion
 */
export const useGDPR = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { purgeAll } = useCachePurgeOnDelete();

  const exportUserData = useCallback(async (userId: string) => {
    setIsProcessing(true);
    try {
      // Fetch all user data
      const [
        { data: profile },
        { data: confessions },
        { data: comments },
        { data: messages },
        { data: notifications },
        { data: preferences },
        { data: streaks },
        { data: badges },
        { data: coins },
        { data: follows },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('confessions').select('*').eq('user_id', userId),
        supabase.from('comments').select('*').eq('user_id', userId),
        supabase.from('messages').select('*').eq('sender_id', userId),
        supabase.from('notifications').select('*').eq('user_id', userId),
        supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
        supabase.from('user_streaks').select('*').eq('user_id', userId).single(),
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', userId),
        supabase.from('user_coins').select('*').eq('user_id', userId).single(),
        supabase.from('user_follows').select('*').or(`follower_id.eq.${userId},following_id.eq.${userId}`),
      ]);

      const userData = {
        exportDate: new Date().toISOString(),
        profile,
        confessions: confessions || [],
        comments: comments || [],
        messages: messages || [],
        notifications: notifications || [],
        preferences,
        streaks,
        badges: badges || [],
        coins,
        follows: follows || [],
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `confess-plus-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      logError('Error exporting user data', error as Error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const deleteAccount = useCallback(async (userId: string) => {
    setIsProcessing(true);
    try {
      // Delete all user data
      await Promise.all([
        supabase.from('user_badges').delete().eq('user_id', userId),
        supabase.from('user_coins').delete().eq('user_id', userId),
        supabase.from('user_streaks').delete().eq('user_id', userId),
        supabase.from('user_preferences').delete().eq('user_id', userId),
        supabase.from('user_follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`),
        supabase.from('user_blocks').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
        supabase.from('bookmarks').delete().eq('user_id', userId),
        supabase.from('user_likes').delete().eq('user_id', userId),
        supabase.from('notifications').delete().eq('user_id', userId),
        supabase.from('messages').delete().eq('sender_id', userId),
        supabase.from('comments').delete().eq('user_id', userId),
        supabase.from('confessions').delete().eq('user_id', userId),
        supabase.from('profiles').delete().eq('user_id', userId),
      ]);

      // Delete auth user (cascades to remaining data)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Purge all cache
      purgeAll();

      // Sign out
      await supabase.auth.signOut();

      return true;
    } catch (error) {
      logError('Error deleting account', error as Error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [purgeAll]);

  const logConsent = useCallback(async (userId: string, consentType: string, version: string) => {
    try {
      // Log consent in database (you'd need to create this table)
      await supabase.from('user_consents').insert({
        user_id: userId,
        consent_type: consentType,
        version,
        consented_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logError('Error logging consent', error as Error);
      return false;
    }
  }, []);

  return {
    exportUserData,
    deleteAccount,
    logConsent,
    isProcessing,
  };
};

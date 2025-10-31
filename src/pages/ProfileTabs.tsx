import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ConfessionCard from '@/components/ConfessionCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Bookmark } from 'lucide-react';
import VirtualizedConfessions from '@/components/VirtualizedConfessions';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isPremium: boolean;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
}

export const ProfileTabs = ({ userId, isOwnProfile, isPremium, onUpgradeClick, onInsightGenerated }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState('posts');
  const queryClient = useQueryClient();

  // Fetch user's posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });


  // Fetch user's bookmarks (only if own profile)
  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery({
    queryKey: ['user-bookmarks', userId],
    queryFn: async () => {
      if (!isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          confession_id,
          confessions (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(item => item.confessions).filter(Boolean) || [];
    },
    enabled: isOwnProfile,
  });

  // Realtime updates for bookmarks
  useEffect(() => {
    if (!isOwnProfile || !userId) return;

    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate and refetch bookmarks when any change occurs
          queryClient.invalidateQueries({ queryKey: ['user-bookmarks', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOwnProfile, queryClient]);

  const renderConfessions = (confessions: any[] | undefined, loading: boolean, emptyMessage: string) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      );
    }

    if (!confessions || confessions.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </Card>
      );
    }

    if (confessions.length > 15) {
      return (
        <VirtualizedConfessions
          confessions={confessions}
          isPremium={isPremium}
          onUpgradeClick={onUpgradeClick}
          onInsightGenerated={onInsightGenerated}
        />
      );
    }

    return (
      <div className="space-y-4">
        {confessions.map((confession: any) => (
          <ConfessionCard 
            key={confession.id} 
            confession={confession}
            isPremium={isPremium}
            onUpgradeClick={onUpgradeClick}
            onInsightGenerated={onInsightGenerated}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="posts" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Posts</span>
        </TabsTrigger>
        {isOwnProfile && (
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Saved</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="posts" className="mt-6">
        {renderConfessions(posts, postsLoading, 'No posts yet')}
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="saved" className="mt-6">
          {renderConfessions(bookmarks as any[], bookmarksLoading, 'No saved posts yet')}
        </TabsContent>
      )}
    </Tabs>
  );
};
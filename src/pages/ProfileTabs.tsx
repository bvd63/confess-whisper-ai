import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ConfessionCard from '@/components/ConfessionCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Heart, Bookmark } from 'lucide-react';
import VirtualizedConfessions from '@/components/VirtualizedConfessions';
import { attachActiveBoosts } from '@/lib/boosts';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isVip: boolean;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
}

export const ProfileTabs = ({ userId, isOwnProfile, isVip, onUpgradeClick, onInsightGenerated }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState('posts');

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
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return attachActiveBoosts(data || []);
    },
  });

  // Fetch user's liked confessions (only if own profile)
  const { data: liked, isLoading: likedLoading } = useQuery({
    queryKey: ['user-liked', userId],
    queryFn: async () => {
      if (!isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('user_likes')
        .select(`
          confession_id,
          confessions (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const confessions = data?.map(item => item.confessions).filter(confession => confession && confession.moderation_status === 'approved' && confession.is_hidden !== true) || [];
      return attachActiveBoosts(confessions);
    },
    enabled: isOwnProfile,
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
      const confessions = data?.map(item => item.confessions).filter(confession => confession && confession.moderation_status === 'approved' && confession.is_hidden !== true) || [];
      return attachActiveBoosts(confessions);
    },
    enabled: isOwnProfile,
  });

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
        <Card className="p-12 text-center border-border/60 rounded-[18px]">
          <p className="text-foreground-muted">{emptyMessage}</p>
        </Card>
      );
    }

    if (confessions.length > 15) {
      return (
        <VirtualizedConfessions
          confessions={confessions}
          isVip={isVip}
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
            isVip={isVip}
            onUpgradeClick={onUpgradeClick}
            onInsightGenerated={onInsightGenerated}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-11 bg-card-secondary border border-border/60 rounded-[14px] p-1">
        <TabsTrigger 
          value="posts" 
          className="flex items-center gap-2 rounded-[10px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Posts</span>
        </TabsTrigger>
        {isOwnProfile && (
          <>
            <TabsTrigger 
              value="liked" 
              className="flex items-center gap-2 rounded-[10px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Liked</span>
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="flex items-center gap-2 rounded-[10px] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="posts" className="mt-6">
        {renderConfessions(posts, postsLoading, 'No posts yet')}
      </TabsContent>

      {isOwnProfile && (
        <>
          <TabsContent value="liked" className="mt-6">
            {renderConfessions(liked as any[], likedLoading, 'No liked posts yet')}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {renderConfessions(bookmarks as any[], bookmarksLoading, 'No saved posts yet')}
          </TabsContent>
        </>
      )}
    </Tabs>
  );
};
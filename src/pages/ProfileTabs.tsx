import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ConfessionCard from '@/components/ConfessionCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Heart, Bookmark } from 'lucide-react';
import VirtualizedConfessions from '@/components/VirtualizedConfessions';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isPremium: boolean;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
}

export const ProfileTabs = ({ userId, isOwnProfile, isPremium, onUpgradeClick, onInsightGenerated }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState('posts');
  const { t } = useLanguage();

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
      return data?.map(item => item.confessions).filter(Boolean) || [];
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
      return data?.map(item => item.confessions).filter(Boolean) || [];
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
        <Card className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
      <TabsList className="flex w-full gap-2 overflow-x-auto rounded-2xl bg-muted p-1.5">
        <TabsTrigger 
          value="posts" 
          className="flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <FileText className="h-4 w-4" />
          <span>{t.profile_posts}</span>
        </TabsTrigger>
        {isOwnProfile && (
          <>
            <TabsTrigger 
              value="liked" 
              className="flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Heart className="h-4 w-4" />
              <span>{t.reaction_heart}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Bookmark className="h-4 w-4" />
              <span>{t.bookmarks_title}</span>
            </TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="posts" className="mt-6">
        {renderConfessions(posts, postsLoading, t.profile_no_confessions)}
      </TabsContent>

      {isOwnProfile && (
        <>
          <TabsContent value="liked" className="mt-6">
            {renderConfessions(liked as any[], likedLoading, t.bookmarks_empty_state)}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {renderConfessions(bookmarks as any[], bookmarksLoading, t.bookmarks_empty_description)}
          </TabsContent>
        </>
      )}
    </Tabs>
  );
};
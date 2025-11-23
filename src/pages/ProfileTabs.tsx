import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ConfessionCard, { type ConfessionCardProps } from '@/components/ConfessionCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Heart, Bookmark } from 'lucide-react';
import VirtualizedConfessions from '@/components/VirtualizedConfessions';
import type { Database } from '@/integrations/supabase/types';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isPremium: boolean;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
}

export const ProfileTabs = ({ userId, isOwnProfile, isPremium, onUpgradeClick, onInsightGenerated }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState('posts');

  type ConfessionRow = Database['public']['Tables']['confessions']['Row'];
  type RelationshipRow = { confession_id: string; confessions: ConfessionRow | null };
  type RenderableConfession = ConfessionCardProps['confession'];

  const confessionSelect = [
    'id',
    'content',
    'category',
    'user_id',
    'ai_response',
    'ai_deep_insight',
    'likes_count',
    'comments_count',
    'created_at',
    'image_url',
    'image_blurred',
    'author_nickname_snapshot',
    'author_visibility_snapshot',
    'emotional_tone',
    'is_anonymous',
    'author_display_name_snapshot',
  ].join(', ');

  const normalizeConfession = (confession: Partial<ConfessionRow>): RenderableConfession => ({
    id: confession.id ?? '',
    content: confession.content ?? '',
    category: confession.category ?? 'general',
    user_id: confession.user_id ?? null,
    ai_response: confession.ai_response ?? null,
    ai_deep_insight: confession.ai_deep_insight ?? null,
    likes_count: confession.likes_count ?? 0,
    comments_count: confession.comments_count ?? 0,
    created_at: confession.created_at ?? new Date().toISOString(),
    image_url: confession.image_url ?? null,
    image_blurred: confession.image_blurred ?? false,
    author_nickname_snapshot: confession.author_nickname_snapshot ?? null,
    author_visibility_snapshot: confession.author_visibility_snapshot ?? null,
    emotional_tone: confession.emotional_tone ?? null,
    is_anonymous: confession.is_anonymous ?? true,
    author_display_name_snapshot: confession.author_display_name_snapshot ?? null,
  });

  // Fetch user's posts
  const { data: posts, isLoading: postsLoading } = useQuery<RenderableConfession[]>({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select(confessionSelect)
        .eq('user_id', userId)
        .eq('is_draft', false)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(normalizeConfession);
    },
  });

  // Fetch user's liked confessions (only if own profile)
  const { data: liked, isLoading: likedLoading } = useQuery<RenderableConfession[]>({
    queryKey: ['user-liked', userId],
    queryFn: async () => {
      if (!isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('user_likes')
        .select(`
          confession_id,
          confessions (${confessionSelect})
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .returns<RelationshipRow[]>();

      if (error) throw error;
      return (
        data?.map(item => item.confessions)
          .filter((confession): confession is ConfessionRow => Boolean(confession))
          .map(normalizeConfession) || []
      );
    },
    enabled: isOwnProfile,
  });

  // Fetch user's bookmarks (only if own profile)
  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery<RenderableConfession[]>({
    queryKey: ['user-bookmarks', userId],
    queryFn: async () => {
      if (!isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          confession_id,
          confessions (${confessionSelect})
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .returns<RelationshipRow[]>();

      if (error) throw error;
      return (
        data?.map(item => item.confessions)
          .filter((confession): confession is ConfessionRow => Boolean(confession))
          .map(normalizeConfession) || []
      );
    },
    enabled: isOwnProfile,
  });

  const renderConfessions = (
    confessions: RenderableConfession[] | undefined,
    loading: boolean,
    emptyMessage: string
  ) => {
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
        {confessions.map((confession) => (
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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="posts" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Posts</span>
        </TabsTrigger>
        {isOwnProfile && (
          <>
            <TabsTrigger value="liked" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Liked</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
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
            {renderConfessions(liked, likedLoading, 'No liked posts yet')}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {renderConfessions(bookmarks, bookmarksLoading, 'No saved posts yet')}
          </TabsContent>
        </>
      )}
    </Tabs>
  );
};
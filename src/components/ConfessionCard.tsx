import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MessageCircle, AlertCircle, Sparkles, Heart, Share2, Tag, Bookmark, Trash2 } from "lucide-react";
import DeepInsightDialog from "./DeepInsightDialog";
import ShareDialog from "./ShareDialog";
import CommentsSection from "./CommentsSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfessionCardProps {
  confession: {
    id: string;
    content: string;
    category: string;
    user_id?: string | null;
    ai_response?: string | null;
    ai_deep_insight?: string | null;
    likes_count?: number;
    comments_count?: number;
    created_at: string;
  };
  isPremium: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onReport?: (id: string) => void;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
  onLikeChange?: () => void;
  onCommentChange?: () => void;
  onBookmarkChange?: () => void;
}

const ConfessionCard = ({ confession, isPremium, isLiked: initialIsLiked, isBookmarked: initialIsBookmarked, onReport, onUpgradeClick, onInsightGenerated, onLikeChange, onCommentChange, onBookmarkChange }: ConfessionCardProps) => {
  const [isDeepInsightOpen, setIsDeepInsightOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(initialIsLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked || false);
  const [likesCount, setLikesCount] = useState(confession.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Check current user on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    checkUser();
  }, []);
  
  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      relationships: t.category_relationships,
      work: t.category_work,
      family: t.category_family,
      health: t.category_health,
      money: t.category_money,
      other: t.category_other,
    };
    return categoryMap[category] || t.category_other;
  };
  
  const timeAgo = (date: string) => {
    const now = new Date();
    const confessionDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - confessionDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}z`;
  };

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: t.error_auth,
          description: t.error_auth,
          variant: "destructive",
        });
        return;
      }

      const newLiked = !isLiked;
      
      if (newLiked) {
        // Add like
        const { error } = await supabase
          .from('user_likes')
          .insert({
            user_id: user.id,
            confession_id: confession.id,
          });
        
        if (error) throw error;
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      } else {
        // Remove like
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('confession_id', confession.id);
        
        if (error) throw error;
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      }
      
      onLikeChange?.();
    } catch (error) {
      console.error('Error updating like:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    setIsShareOpen(true);
  };

  const handleBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: t.error_auth,
          description: t.error_auth,
          variant: "destructive",
        });
        return;
      }

      const newBookmarked = !isBookmarked;
      
      if (newBookmarked) {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            confession_id: confession.id,
          });
        
        if (error) throw error;
        setIsBookmarked(true);
        toast({
          title: t.bookmarks_saved,
          description: t.bookmarks_add,
        });
      } else {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('confession_id', confession.id);
        
        if (error) throw error;
        setIsBookmarked(false);
        toast({
          title: t.success_deleted,
          description: t.bookmarks_remove,
        });
      }
      
      onBookmarkChange?.();
    } catch (error) {
      console.error('Error updating bookmark:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfession = async () => {
    if (!currentUserId || confession.user_id !== currentUserId) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id);

      if (error) throw error;

      toast({
        title: t.success_deleted,
        description: "Confesiunea a fost ștearsă",
      });

      // Refresh the page or notify parent component
      onLikeChange?.();
    } catch (error) {
      console.error('Error deleting confession:', error);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-5 mb-4 bg-gradient-to-br from-card to-muted/30 border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
          <MessageCircle className="w-4 h-4" />
          <span>Anonim • {timeAgo(confession.created_at)}</span>
          <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
            <Tag className="w-3 h-3" />
            {getCategoryLabel(confession.category)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {currentUserId === confession.user_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteConfession}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {onReport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReport(confession.id)}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <AlertCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-foreground leading-relaxed mb-4">
        {confession.content}
      </p>

      {/* Interaction Buttons */}
      <div className="flex items-center gap-3 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`h-8 px-3 gap-2 ${isLiked ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-sm">{likesCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="h-8 px-3 gap-2 text-muted-foreground hover:text-primary"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">{t.share}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className={`h-8 px-3 gap-2 ${isBookmarked ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {confession.ai_response && (
        <>
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-2 text-primary text-sm font-medium">
              <MessageCircle className="w-4 h-4" />
              <span>{t.ai_reply_title}</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed italic">
              {confession.ai_response}
            </p>
          </div>

          {/* Deep Insight Button */}
          <Button
            onClick={() => setIsDeepInsightOpen(true)}
            variant="outline"
            className="w-full mt-3 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-primary"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {confession.ai_deep_insight ? t.deep_insight_title : t.generate_insight}
          </Button>
        </>
      )}

      {/* Comments Section */}
      <CommentsSection
        confessionId={confession.id}
        confessionOwnerId={confession.user_id || ''}
        commentsCount={commentsCount}
        onCommentChange={() => {
          setCommentsCount(prev => prev + 1);
          onCommentChange?.();
        }}
      />

      <DeepInsightDialog
        open={isDeepInsightOpen}
        onOpenChange={setIsDeepInsightOpen}
        confession={confession}
        isPremium={isPremium}
        onUpgradeClick={onUpgradeClick}
        onInsightGenerated={onInsightGenerated}
      />

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        confessionId={confession.id}
      />
    </Card>
  );
};

export default ConfessionCard;

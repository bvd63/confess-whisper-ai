import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SearchUser {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export const SearchUsersCard = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      
      // Call edge function with GET and query parameter in URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-users?nickname=${encodeURIComponent(debouncedSearch)}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      return data?.users || [];
    },
    enabled: debouncedSearch.length >= 2,
  });

  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', (await supabase.auth.getUser()).data.user?.id!)
          .eq('following_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert([{ follower_id: (await supabase.auth.getUser()).data.user?.id!, following_id: userId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-search'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMessage = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        _user1: (await supabase.auth.getUser()).data.user?.id,
        _user2: userId,
      });

      if (error) throw error;
      navigate(`/messages?conversation=${data}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          {t.explore_search_card_title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          type="text"
          placeholder={t.explore_search_card_placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            {t.loading}
          </div>
        )}

        {!isLoading && debouncedSearch.length >= 2 && users.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            {t.explore_search_card_no_results}
          </div>
        )}

        <div className="space-y-3">
          {users.map((user: SearchUser) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar>
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {user.nickname?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">@{user.nickname}</div>
                  {user.bio && (
                    <div className="text-sm text-muted-foreground truncate">
                      {user.bio}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={user.isFollowing ? "outline" : "default"}
                  onClick={() => followMutation.mutate({ userId: user.id, isFollowing: user.isFollowing })}
                  disabled={followMutation.isPending}
                >
                  {user.isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-1" />
                      {t.explore_search_card_unfollow}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      {t.explore_search_card_follow}
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMessage(user.id)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {t.explore_search_card_message}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, User, MessageCircle } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";

interface UserSearchResult {
  user_id: string;
  nickname: string | null;
}

interface UserSearchProps {
  currentUserId: string;
}

export const UserSearch = ({ currentUserId }: UserSearchProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchUsers(debouncedSearch);
    } else {
      setResults([]);
    }
  }, [debouncedSearch]);

  const searchUsers = async (query: string) => {
    setLoading(true);
    try {
      console.log("Searching for users with query:", query);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nickname")
        .not("nickname", "is", null)
        .ilike("nickname", `%${query}%`)
        .neq("user_id", currentUserId)
        .limit(20);

      if (error) {
        console.error("Search error:", error);
        throw error;
      }

      console.log("Search results:", data);
      setResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.search_users_placeholder}
          className="pl-10"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t.ui_loading}
        </p>
      )}

      {!loading && searchQuery.length >= 2 && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t.no_users_found}
        </p>
      )}

      <div className="space-y-2">
        {results.map((user) => (
          <Card key={user.user_id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">@{user.nickname}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/messages?user=${user.user_id}`)}
                  title={t.messages_title}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <FollowButton
                  targetUserId={user.user_id}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCommunities, useCommunityMembers } from "@/hooks/useCommunities";
import { CommunityCard } from "@/components/CommunityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, TrendingUp, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
export const CommunitiesSectionExpanded = () => {
  const {
    t
  } = useLanguage();
  const navigate = useNavigate();
  const {
    user
  } = useCurrentUser();
  const {
    communities,
    isLoading,
    createCommunity,
    isCreating
  } = useCommunities("all");
  const {
    toast
  } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    category: "general",
    is_private: false
  });
  const handleCreateCommunity = async () => {
    if (!user) {
      navigate('/auth');
      toast({
        title: t.error_auth,
        description: t.error_auth,
        variant: "destructive"
      });
      return;
    }
    if (!newCommunity.name.trim()) {
      toast({
        title: t.error_generic,
        description: t.validation_required_field,
        variant: "destructive"
      });
      return;
    }
    try {
      await createCommunity(newCommunity);
      setIsCreateOpen(false);
      setNewCommunity({
        name: "",
        description: "",
        category: "general",
        is_private: false
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  const filteredCommunities = communities?.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Get trending communities (sorted by member count)
  const trendingCommunities = communities?.sort((a, b) => b.member_count - a.member_count).slice(0, 3);
  if (isLoading) {
    return <Card className="mb-3">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Users className="w-3.5 h-3.5" />
            {t.home_communities_title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="text-center py-2 text-muted-foreground text-xs">
            {t.loading}
          </div>
        </CardContent>
      </Card>;
  }

  // Show empty state when no communities exist
  if (!isLoading && (!communities || communities.length === 0)) {
    return <Card className="mb-3">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Users className="w-3.5 h-3.5" />
            {t.home_communities_title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-0 pt-0 px-3 pb-3">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <h3 className="text-sm font-semibold mb-1.5">{t.communities_empty_title || "No Communities Yet"}</h3>
          <p className="text-muted-foreground text-xs mb-2 max-w-md mx-auto">
            {t.communities_empty_description}
          </p>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Button onClick={() => {
            if (!user) {
              navigate('/auth');
              return;
            }
            setIsCreateOpen(true);
          }}>
              <Plus className="w-4 h-4 mr-2" />
              {t.communities_create}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.communities_create}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t.communities_name} *</Label>
                  <Input value={newCommunity.name} onChange={e => setNewCommunity({
                  ...newCommunity,
                  name: e.target.value
                })} placeholder={t.communities_name} />
                </div>
                <div>
                  <Label>{t.communities_description}</Label>
                  <Textarea value={newCommunity.description} onChange={e => setNewCommunity({
                  ...newCommunity,
                  description: e.target.value
                })} placeholder={t.communities_description} />
                </div>
                <div>
                  <Label>{t.communities_category}</Label>
                  <Select value={newCommunity.category} onValueChange={v => setNewCommunity({
                  ...newCommunity,
                  category: v
                })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t.communities_filter_general}</SelectItem>
                      <SelectItem value="mental-health">{t.communities_filter_mental_health}</SelectItem>
                      <SelectItem value="relationships">{t.communities_filter_relationships}</SelectItem>
                      <SelectItem value="work">{t.communities_filter_work}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.communities_visibility}</Label>
                  <Select value={newCommunity.is_private ? "private" : "public"} onValueChange={v => setNewCommunity({
                  ...newCommunity,
                  is_private: v === "private"
                })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t.communities_public}</SelectItem>
                      <SelectItem value="private">{t.communities_private}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateCommunity} disabled={isCreating} className="w-full">
                  {isCreating ? t.communities_creating : t.communities_create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>;
  }
  return <Card className="mb-3">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Users className="w-3.5 h-3.5" />
            {t.home_communities_title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/communities')} className="h-7 text-xs px-2">
            {t.common_view_all}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0 px-3 pb-3">
        {/* Search and Create */}
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input placeholder={t.search_placeholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 h-8 text-xs" />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Button size="sm" className="h-8 text-xs px-2" onClick={() => {
            if (!user) {
              navigate('/auth');
              return;
            }
            setIsCreateOpen(true);
          }}>
              <Plus className="w-3 h-3 mr-1" />
              {t.communities_create}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.communities_create}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t.communities_name} *</Label>
                  <Input value={newCommunity.name} onChange={e => setNewCommunity({
                  ...newCommunity,
                  name: e.target.value
                })} placeholder={t.communities_name} />
                </div>
                <div>
                  <Label>{t.communities_description}</Label>
                  <Textarea value={newCommunity.description} onChange={e => setNewCommunity({
                  ...newCommunity,
                  description: e.target.value
                })} placeholder={t.communities_description} />
                </div>
                <div>
                  <Label>{t.communities_category}</Label>
                  <Select value={newCommunity.category} onValueChange={v => setNewCommunity({
                  ...newCommunity,
                  category: v
                })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t.communities_filter_general}</SelectItem>
                      <SelectItem value="mental-health">{t.communities_filter_mental_health}</SelectItem>
                      <SelectItem value="relationships">{t.communities_filter_relationships}</SelectItem>
                      <SelectItem value="work">{t.communities_filter_work}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.communities_visibility}</Label>
                  <Select value={newCommunity.is_private ? "private" : "public"} onValueChange={v => setNewCommunity({
                  ...newCommunity,
                  is_private: v === "private"
                })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t.communities_public}</SelectItem>
                      <SelectItem value="private">{t.communities_private}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateCommunity} disabled={isCreating} className="w-full">
                  {isCreating ? t.communities_creating : t.communities_create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trending Section */}
        {trendingCommunities && trendingCommunities.length > 0 && <div>
            <h3 className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {t.communities_trending}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {trendingCommunities.map(community => <CommunityCard key={community.id} community={community} />)}
            </div>
          </div>}

        {/* Filtered Communities Grid */}
        {searchQuery && <div>
            <h3 className="text-[10px] font-semibold mb-1.5">
              {t.search_results}
            </h3>
            {filteredCommunities && filteredCommunities.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {filteredCommunities.slice(0, 8).map(community => <CommunityCard key={community.id} community={community} />)}
              </div> : <p className="text-center text-muted-foreground text-xs py-2">
                {t.communities_not_found}
              </p>}
          </div>}

        {/* All Communities (when no search) */}
        {!searchQuery && communities && communities.length > 3 && <div>
            <h3 className="text-[10px] font-semibold mb-1.5">
              {t.communities_all}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {communities.slice(0, 8).map(community => <CommunityCard key={community.id} community={community} />)}
            </div>
          </div>}
      </CardContent>
    </Card>;
};
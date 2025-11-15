import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { GradientText } from "@/components/GradientText";

import { CommunityCard } from "@/components/CommunityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Search } from "lucide-react";
import { useCommunities } from "@/hooks/useCommunities";
import { LoadingQuotes } from "@/components/LoadingQuotes";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";

const Communities = () => {
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { communities, isLoading, createCommunity, isCreating } = useCommunities(category);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    category: "general",
    slug: "",
    is_private: false,
    language: "en",
  });

  const handleCreateCommunity = async () => {
    if (!newCommunity.name || !newCommunity.slug) {
      toast({
        title: t.error_generic,
        description: t.validation_required_field,
        variant: "destructive",
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
        slug: "",
        is_private: false,
        language: "en",
      });
    } catch (error) {
      // Error is already handled by the mutation's onError
    }
  };

  const filteredCommunities = communities?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <Users className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5 sm:mb-2">
            <GradientText variant="hero">{t.communities_title}</GradientText>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t.communities_discover}
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.search_placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t.communities_category} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.communities_filter_all}</SelectItem>
              <SelectItem value="general">{t.communities_filter_general}</SelectItem>
              <SelectItem value="mental-health">{t.communities_filter_mental_health}</SelectItem>
              <SelectItem value="relationships">{t.communities_filter_relationships}</SelectItem>
              <SelectItem value="work">{t.communities_filter_work}</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t.communities_create}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.communities_create}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t.communities_name} *</Label>
                  <Input
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    placeholder={t.communities_name}
                  />
                </div>
                <div>
                  <Label>{t.communities_slug_label}</Label>
                  <Input
                    value={newCommunity.slug}
                    onChange={(e) => setNewCommunity({ ...newCommunity, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder={t.communities_slug_placeholder}
                  />
                </div>
                <div>
                  <Label>{t.communities_description}</Label>
                  <Textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    placeholder={t.communities_description}
                  />
                </div>
                <div>
                  <Label>{t.communities_category}</Label>
                  <Select value={newCommunity.category} onValueChange={(v) => setNewCommunity({ ...newCommunity, category: v })}>
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
                  <Label>{t.communities_language}</Label>
                  <Select value={newCommunity.language} onValueChange={(v) => setNewCommunity({ ...newCommunity, language: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.communities_visibility}</Label>
                  <Select value={newCommunity.is_private ? "private" : "public"} onValueChange={(v) => setNewCommunity({ ...newCommunity, is_private: v === "private" })}>
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

        {/* Communities Grid */}
        {isLoading ? (
          <LoadingQuotes />
        ) : filteredCommunities && filteredCommunities.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map((community, index) => (
              <div key={community.id} style={{ animationDelay: `${index * 50}ms` }}>
                <CommunityCard community={community} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t.communities_not_found}</p>
          </div>
        )}
      </div>
    </AppLayout>
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default Communities;

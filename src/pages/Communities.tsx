import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { CommunityCard } from "@/components/CommunityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Search } from "lucide-react";
import { useCommunities } from "@/hooks/useCommunities";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

const Communities = () => {
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { communities, isLoading, createCommunity, isCreating } = useCommunities(category);
  const { toast } = useToast();

  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    category: "general",
    slug: "",
    is_private: false,
  });

  const handleCreateCommunity = () => {
    if (!newCommunity.name || !newCommunity.slug) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createCommunity(newCommunity);
    setIsCreateOpen(false);
    setNewCommunity({
      name: "",
      description: "",
      category: "general",
      slug: "",
      is_private: false,
    });
  };

  const filteredCommunities = communities?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <FloatingElement delay={0}>
            <Users className="w-16 h-16 mx-auto mb-4 text-primary" />
          </FloatingElement>
          <h1 className="text-4xl font-bold mb-2">
            <GradientText variant="hero">Communities</GradientText>
          </h1>
          <p className="text-muted-foreground">
            Join communities and connect with like-minded people
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="mental-health">Mental Health</SelectItem>
              <SelectItem value="relationships">Relationships</SelectItem>
              <SelectItem value="work">Work & Career</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    placeholder="Community name"
                  />
                </div>
                <div>
                  <Label>Slug * (URL identifier)</Label>
                  <Input
                    value={newCommunity.slug}
                    onChange={(e) => setNewCommunity({ ...newCommunity, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="community-slug"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    placeholder="Describe your community..."
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newCommunity.category} onValueChange={(v) => setNewCommunity({ ...newCommunity, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="mental-health">Mental Health</SelectItem>
                      <SelectItem value="relationships">Relationships</SelectItem>
                      <SelectItem value="work">Work & Career</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateCommunity} disabled={isCreating} className="w-full">
                  {isCreating ? "Creating..." : "Create Community"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Communities Grid */}
        {isLoading ? (
          <LoadingSpinner />
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
            <p className="text-muted-foreground">No communities found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Communities;

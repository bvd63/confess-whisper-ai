import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, PlusCircle, LogOut, Sparkles, Crown } from "lucide-react";
import ConfessionCard from "@/components/ConfessionCard";
import NewConfessionDialog from "@/components/NewConfessionDialog";
import PremiumDialog from "@/components/PremiumDialog";
import AuthDialog from "@/components/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Confession {
  id: string;
  content: string;
  ai_response?: string | null;
  ai_deep_insight?: string | null;
  created_at: string;
}

const Index = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    loadConfessions();
  }, []);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const checkPremiumStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsPremium(data?.is_premium || false);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const loadConfessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setConfessions(data || []);
    } catch (error) {
      console.error('Error loading confessions:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca confesiunile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConfession = () => {
    if (!user) {
      setIsAuthOpen(true);
      toast({
        title: "Autentificare necesară",
        description: "Creează un cont pentru a posta confesiuni.",
      });
      return;
    }
    setIsNewConfessionOpen(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "La revedere! 👋",
      description: "Te-ai deconectat cu succes.",
    });
  };

  const handleReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('confessions')
        .update({ is_reported: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Raportare trimisă",
        description: "Vom verifica această confesiune. Mulțumim!",
      });
    } catch (error) {
      console.error('Error reporting confession:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut raporta confesiunea.",
        variant: "destructive",
      });
    }
  };

  const handleUpgradeToPremium = async () => {
    // In a real app, this would integrate with Stripe
    toast({
      title: "Upgrade în curs... 💳",
      description: "Redirecționare către sistem de plată (Demo)",
    });
    
    // Demo: simulate upgrade
    setTimeout(async () => {
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('user_id', user.id);

        if (!error) {
          setIsPremium(true);
          setIsPremiumDialogOpen(false);
          toast({
            title: "Bun venit la Premium! 🎉",
            description: "Acum ai acces la toate feature-urile premium.",
          });
        }
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-soft)]">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" fill="currentColor" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Confess.AI
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isPremium && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Premium</span>
                  </div>
                )}
                <Button
                  onClick={handleNewConfession}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[var(--shadow-soft)]"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Confessionează
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsAuthOpen(true)}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
              >
                Autentificare
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Spațiu sigur și anonim</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Împărtășește-ți gândurile
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Un loc sigur unde poți fi tu însuți. Scrie anonim ce simți și primește răspunsuri empatice de la AI.
          </p>
        </div>

        {/* Confessions Feed */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="mt-4 text-muted-foreground">Se încarcă confesiunile...</p>
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <Heart className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-muted-foreground mb-4">Nicio confesiune încă. Fii primul!</p>
            <Button
              onClick={handleNewConfession}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Scrie prima confesiune
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                isPremium={isPremium}
                onReport={handleReport}
                onUpgradeClick={() => setIsPremiumDialogOpen(true)}
                onInsightGenerated={loadConfessions}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <NewConfessionDialog
        open={isNewConfessionOpen}
        onOpenChange={setIsNewConfessionOpen}
        onConfessionCreated={loadConfessions}
      />
      
      <AuthDialog
        open={isAuthOpen}
        onOpenChange={setIsAuthOpen}
      />

      <PremiumDialog
        open={isPremiumDialogOpen}
        onOpenChange={setIsPremiumDialogOpen}
        onUpgrade={handleUpgradeToPremium}
      />
    </div>
  );
};

export default Index;

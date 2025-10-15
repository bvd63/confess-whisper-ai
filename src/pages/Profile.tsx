import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, MessageCircle, Sparkles, Crown, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PremiumDialog from "@/components/PremiumDialog";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalConfessions: 0,
    deepInsightsUsed: 0,
    joinedDate: '',
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/');
      return;
    }

    setUser(user);
    await loadProfile(user.id);
    await loadStats(user.id);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium, created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsPremium(data.is_premium || false);
        setStats(prev => ({
          ...prev,
          joinedDate: new Date(data.created_at).toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadStats = async (userId: string) => {
    try {
      // Get total confessions
      const { count: totalConfessions } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get confessions with deep insights
      const { count: deepInsightsUsed } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('ai_deep_insight', 'is', null);

      setStats(prev => ({
        ...prev,
        totalConfessions: totalConfessions || 0,
        deepInsightsUsed: deepInsightsUsed || 0,
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpgradeToPremium = async () => {
    toast({
      title: "Upgrade în curs... 💳",
      description: "Redirecționare către sistem de plată (Demo)",
    });
    
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
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi
          </Button>
          
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" fill="currentColor" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Profil
            </h1>
          </div>
          
          <div className="w-20" /> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Header Card */}
        <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-primary/20 shadow-[var(--shadow-soft)] animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Contul tău</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {isPremium ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
                <Crown className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Premium</span>
              </div>
            ) : (
              <Button
                onClick={() => setIsPremiumDialogOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Membru din {stats.joinedDate || 'N/A'}</span>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-6 bg-gradient-to-br from-card to-primary/5 border-primary/10 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{stats.totalConfessions}</div>
                <p className="text-sm text-muted-foreground">Confesiuni postate</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-primary/5 border-primary/10 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{stats.deepInsightsUsed}</div>
                <p className="text-sm text-muted-foreground">Deep Insights folosite</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Premium Benefits (if not premium) */}
        {!isPremium && (
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-card border-primary/20 shadow-[var(--shadow-soft)] animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Descoperă Confess+ Premium</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Obține acces nelimitat la Deep Insights AI, răspunsuri extinse și o experiență fără reclame.
                </p>
                <Button
                  onClick={() => setIsPremiumDialogOpen(true)}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  Vezi beneficiile Premium
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Premium Features (if premium) */}
        {isPremium && (
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-card border-primary/30 shadow-[var(--shadow-glow)] animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-semibold">Ești membru Premium!</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Te bucuri de toate beneficiile Confess+. Mulțumim pentru susținere! 💜
              </p>
            </div>
          </Card>
        )}
      </main>

      <PremiumDialog
        open={isPremiumDialogOpen}
        onOpenChange={setIsPremiumDialogOpen}
        onUpgrade={handleUpgradeToPremium}
      />
    </div>
  );
};

export default Profile;

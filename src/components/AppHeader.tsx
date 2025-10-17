import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, PlusCircle, LogOut, Crown, User, LogIn, BookMarked, Users, Home, Sparkles } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import CoinsDisplay from "@/components/CoinsDisplay";
import StreakCounter from "@/components/StreakCounter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

interface AppHeaderProps {
  onNewConfession?: () => void;
  onUpgradeClick?: () => void;
}

const AppHeader = ({ onNewConfession, onUpgradeClick }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium } = usePremiumStatus(user?.id);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isHeaderVisible = useHideOnScroll({ threshold: 10, disabled: !isMobile });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast({
      title: t.success_logout,
      description: t.success_logout,
    });
  };

  const handleNewConfession = () => {
    if (!user) {
      navigate('/auth');
      toast({
        title: t.error_auth,
        description: t.error_auth,
      });
      return;
    }
    
    if (onNewConfession) {
      onNewConfession();
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-soft)]">
      {/* Desktop/Tablet Layout */}
      <div className="hidden md:block w-full mx-auto px-4 py-3 max-w-7xl">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Left - Logo */}
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-primary flex-shrink-0" fill="currentColor" />
            <h1 
              className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent cursor-pointer whitespace-nowrap"
              onClick={() => navigate('/')}
            >
              {t.app_name}
            </h1>
          </div>
          
          {/* Center - Navigation */}
          <div className="flex items-center justify-center">
            {user && (
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 text-muted-foreground hover:text-foreground transition-colors",
                    isActive('/') && "bg-accent text-foreground"
                  )}
                  title={t.home_title}
                >
                  <Link to="/">
                    <Home className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 text-muted-foreground hover:text-foreground transition-colors",
                    isActive('/bookmarks') && "bg-accent text-foreground"
                  )}
                  title={t.bookmarks_title}
                >
                  <Link to="/bookmarks">
                    <BookMarked className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!user) {
                      toast({ title: t.error_auth, description: t.error_auth });
                      navigate('/auth');
                      return;
                    }
                    navigate('/following');
                  }}
                  className={cn(
                    "h-9 w-9 text-muted-foreground hover:text-foreground transition-colors",
                    isActive('/following') && "bg-accent text-foreground"
                  )}
                  title={t.ui_following_feed}
                >
                  <Users className="w-4 h-4" />
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 text-muted-foreground hover:text-foreground transition-colors",
                    isActive('/profile') && "bg-accent text-foreground"
                  )}
                  title={t.profile_title}
                >
                  <Link to="/profile">
                    <User className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          
          {/* Right - Actions */}
          <div className="flex items-center gap-1 lg:gap-2 justify-end">
            <LanguageSelector />
            <ThemeToggle />
            
            {user ? (
              <>
                {isPremium ? (
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">{t.premium_member}</span>
                  </div>
                ) : (
                  <Button
                    onClick={onUpgradeClick}
                    variant="outline"
                    size="sm"
                    className="hidden lg:flex items-center gap-1.5 border-primary/30 hover:bg-primary/10 h-9"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium">{t.subscription_upgrade_premium}</span>
                  </Button>
                )}
                
                <Button
                  onClick={handleNewConfession}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground h-9"
                >
                  <PlusCircle className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t.new_confession}</span>
                </Button>
                
                <div className="hidden lg:flex items-center gap-1">
                  <StreakCounter userId={user.id} variant="compact" />
                  <CoinsDisplay userId={user.id} variant="compact" />
                </div>
                
                <NotificationsDropdown />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  title={t.success_logout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                size="sm"
                className="border-primary/30 hover:bg-primary/10"
              >
                <LogIn className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t.login}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className={`md:hidden w-full sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-soft)] transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Top row - Logo and essentials */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" />
            <h1 
              className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate('/')}
            >
              {t.app_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
            {user ? (
              <>
                {!isPremium && (
                  <Button
                    onClick={onUpgradeClick}
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10 h-8 px-2"
                  >
                    <Crown className="w-3 h-3 text-primary" />
                  </Button>
                )}
                <NotificationsDropdown />
                <Button
                  onClick={handleNewConfession}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground h-8 px-2"
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                size="sm"
                className="border-primary/30 hover:bg-primary/10 h-8 px-3"
              >
                <LogIn className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Bottom row - Navigation */}
        {user && (
          <div className="flex items-center justify-around px-2 py-2 bg-muted/20">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 h-9 text-muted-foreground hover:text-foreground transition-colors",
                isActive('/') && "bg-accent text-foreground"
              )}
            >
              <Link to="/">
                <Home className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 h-9 text-muted-foreground hover:text-foreground transition-colors",
                isActive('/bookmarks') && "bg-accent text-foreground"
              )}
            >
              <Link to="/bookmarks">
                <BookMarked className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!user) {
                  toast({ title: t.error_auth, description: t.error_auth });
                  navigate('/auth');
                  return;
                }
                navigate('/following');
              }}
              className={cn(
                "flex-1 h-9 text-muted-foreground hover:text-foreground transition-colors",
                isActive('/following') && "bg-accent text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 h-9 text-muted-foreground hover:text-foreground transition-colors",
                isActive('/profile') && "bg-accent text-foreground"
              )}
            >
              <Link to="/profile">
                <User className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;

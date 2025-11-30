import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ProfileSimplified = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user } = useCurrentUser();
  const { subscriptionTier } = useVipStatus(user?.id);
  const { toast } = useToast();
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.nickname) {
        setNickname(data.nickname);
      }
    };
    loadProfile();
  }, [user?.id]);

  if (!user) return null;

  const isVIP = subscriptionTier === 'vip';
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'de', label: 'DE' },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-32">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-8 glass-strong border-b border-border">
          <div className="px-4 py-5">
            <h1 className="text-2xl font-bold text-center text-foreground">
              Profile & Settings
            </h1>
          </div>
        </div>

        {/* Username with VIP Badge */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <h2 className="text-2xl font-bold text-foreground">
            @{nickname || 'User'}
          </h2>
          {isVIP && (
            <>
              <span className="text-2xl">👑</span>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                VIP
              </span>
            </>
          )}
        </div>

        {/* Settings Section */}
        <div className="space-y-4">
          {/* Language Selector */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Settings</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground-secondary">Language</span>
              <div className="flex gap-2">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={language === lang.code ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLanguage(lang.code as 'en' | 'es' | 'de')}
                    className={cn(
                      "h-9 px-4 rounded-xl font-semibold",
                      language === lang.code 
                        ? "bg-primary text-white"
                        : "bg-transparent border-border text-foreground-secondary hover:bg-muted"
                    )}
                  >
                    {lang.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Support Chat */}
          <div 
            className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => {
              // Navigate to AI chat
              toast({
                title: "AI Support",
                description: "Opening AI chat support..."
              });
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">AI Support Chat</span>
            </div>
          </div>

          {/* Contact Email */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Mail className="w-6 h-6 text-foreground-muted" />
              </div>
              <div>
                <span className="text-lg font-semibold text-foreground block">AI Support Chat</span>
                <span className="text-sm text-foreground-secondary">confess.supp@gmail.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfileSimplified;

import { ArrowLeft, Zap, Star, Crown, Bell, Coins as CoinsIcon, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStreakManager } from '@/hooks/useStreakManager';
import { useCoins } from '@/hooks/useCoins';
import { FlairsShop } from '@/components/FlairsShop';
import { useSubscription } from '@/state/SubscriptionProvider';
import { useState, useEffect } from 'react';
import { logError } from '@/lib/logger';
import CoinsDisplay from '@/components/CoinsDisplay';

interface Flair {
  id: string;
  name_key: string;
  icon: string;
  cost: number;
}

interface UserFlair {
  flair_id: string;
  is_equipped: boolean;
  expires_at: string | null;
}

const Rewards = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const { streakData } = useStreakManager();
  const { balance: coinsBalance } = useCoins(user?.id);
  const { subscriptionTier } = useSubscription();
  const [flairsShopOpen, setFlairsShopOpen] = useState(false);
  const [featuredFlairs, setFeaturedFlairs] = useState<Flair[]>([]);
  const [userFlairs, setUserFlairs] = useState<UserFlair[]>([]);
  const [showCoinsHistory, setShowCoinsHistory] = useState(false);

  // Navigate to auth if no user
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  // Load featured flairs (first 6) and user's owned flairs
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        // Load featured flairs and user flairs in parallel
        const [flairsRes, userFlairsRes] = await Promise.all([
          supabase
            .from('profile_flairs')
            .select('id, name_key, icon, cost')
            .eq('is_active', true)
            .order('cost', { ascending: true })
            .limit(6),
          supabase
            .from('user_flairs')
            .select('flair_id, is_equipped, expires_at')
            .eq('user_id', user.id)
        ]);
        
        if (flairsRes.error) throw flairsRes.error;
        if (userFlairsRes.error) throw userFlairsRes.error;
        
        setFeaturedFlairs(flairsRes.data || []);
        setUserFlairs(userFlairsRes.data || []);
      } catch (error) {
        logError('Error loading flairs data', error as Error);
      }
    };
    loadData();
  }, [user]);

  // Helper to check flair ownership status
  const getFlairStatus = (flairId: string): 'owned' | 'equipped' | 'expired' | 'available' => {
    const userFlair = userFlairs.find(uf => uf.flair_id === flairId);
    if (!userFlair) return 'available';
    
    const now = new Date();
    const expiryDate = userFlair.expires_at ? new Date(userFlair.expires_at) : null;
    
    // Check if expired
    if (expiryDate && expiryDate < now) return 'expired';
    
    // Check if equipped
    if (userFlair.is_equipped) return 'equipped';
    
    return 'owned';
  };

  if (isLoading || !user) {
    return null;
  }

  const isVIP = subscriptionTier === 'vip';
  const currentStreak = streakData?.currentStreak || 0;
  
  // Calculate streak progress (progress to next milestone)
  const getNextMilestone = (current: number): number => {
    const milestones = [3, 7, 14, 30];
    return milestones.find(m => m > current) || 30;
  };
  
  const getStreakProgress = () => {
    const next = getNextMilestone(currentStreak);
    const prev = [0, 3, 7, 14].reverse().find(m => m <= currentStreak) || 0;
    return ((currentStreak - prev) / (next - prev)) * 100;
  };

  // Boost cost (from app config)
  const BOOST_COST = 25;
  const HIGHLIGHT_COST = 15;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#0d0d18] to-[#0a0a12]">
        {/* Premium Header */}
        <div className="sticky top-0 z-20 glass-strong border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-4">
            {/* Left - Logo */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">Confess</span>
              <span className="text-xl font-bold text-purple-400">AI</span>
            </div>
            
            {/* Right - Crown (VIP) + Coins + Bell */}
            <div className="flex items-center gap-3">
              {/* Crown - Opens Manage Subscription */}
              <button 
                onClick={() => navigate('/manage-subscription')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">VIP</span>
              </button>
              
              {/* Coins - Opens Coin Shop */}
              <CoinsDisplay userId={user.id} variant="compact" />
              
              {/* Bell - Opens Notifications */}
              <button 
                onClick={() => navigate('/notifications')}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10"
              >
                <Bell className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-4 pb-24">
          
          {/* Coins Overview Card */}
          <div 
            onClick={() => setShowCoinsHistory(true)}
            className="glass-card p-6 rounded-2xl border border-white/10 cursor-pointer hover:border-white/20 transition-all"
          >
            <h3 className="text-center text-white/80 font-medium mb-4">Coins Overview</h3>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="text-4xl">🪙</div>
              <span className="text-4xl font-bold text-white">{coinsBalance.toLocaleString()}</span>
            </div>
            <p className="text-center text-white/50 text-sm">Tap to see history</p>
          </div>

          {/* Daily Streak Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-600/80 to-blue-600/80 border border-purple-400/30 shadow-lg shadow-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">Daily Streak</span>
              <span className="text-2xl">🔥</span>
            </div>
            <p className="text-3xl font-bold text-white mb-4">{currentStreak} days</p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${getStreakProgress()}%` }}
              />
            </div>
          </div>

          {/* How to Earn Coins */}
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <h3 className="text-white font-semibold mb-3">How to earn coins</h3>
            <div className="space-y-2 text-white/70 text-sm">
              <p>+2 coins per confession</p>
              <p>+10 streak bonus</p>
              <p>Referral rewards</p>
            </div>
          </div>

          {/* Boost & Highlight Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Boost Confession */}
            <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">Boost Confession</p>
                <div className="flex items-center gap-1 text-white/60 text-xs">
                  <span>Cost:</span>
                  <span className="text-amber-400">🪙</span>
                  <span>{BOOST_COST}</span>
                </div>
              </div>
            </div>

            {/* Highlight Comment */}
            <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">Highlight Comment</p>
                <div className="flex items-center gap-1 text-white/60 text-xs">
                  <span>Cost:</span>
                  <span className="text-amber-400">🪙</span>
                  <span>{HIGHLIGHT_COST}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Flairs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Featured Flairs</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {featuredFlairs.slice(0, 6).map((flair) => {
                const status = getFlairStatus(flair.id);
                const isOwned = status === 'owned' || status === 'equipped';
                
                return (
                  <div 
                    key={flair.id}
                    className={`glass-card p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      isOwned 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-white/10 hover:border-purple-500/30'
                    }`}
                    onClick={() => setFlairsShopOpen(true)}
                  >
                    <div className="text-4xl">{flair.icon}</div>
                    {isOwned ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                        <span>✓</span>
                        <span>{status === 'equipped' ? 'Equipped' : 'Owned'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                        <span>🪙</span>
                        <span>{flair.cost}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* View all flairs button */}
            <button 
              onClick={() => setFlairsShopOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span className="text-sm font-medium">View all flairs</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flairs Shop Dialog */}
        {flairsShopOpen && (
          <FlairsShop 
            userId={user.id} 
            open={flairsShopOpen} 
            onOpenChange={setFlairsShopOpen} 
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Rewards;

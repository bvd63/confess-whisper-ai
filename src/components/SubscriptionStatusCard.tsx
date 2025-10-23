import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/state/SubscriptionProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { Crown, Zap, Calendar, ArrowUpCircle, Settings } from "lucide-react";
import { useState } from "react";
import { ManageSubscriptionDialog } from "./ManageSubscriptionDialog";

export const SubscriptionStatusCard = () => {
  const { subscriptionTier, subscriptionEnd, isLoading } = useSubscription();
  const { t } = useLanguage();
  const [manageOpen, setManageOpen] = useState(false);

  const getTierInfo = () => {
    switch (subscriptionTier) {
      case 'vip':
        return {
          icon: Crown,
          name: 'VIP',
          color: 'text-yellow-500',
          bgGradient: 'from-yellow-500/20 to-yellow-600/10',
          description: 'Unlimited everything + Priority support'
        };
      default:
        return {
          icon: Zap,
          name: 'Free',
          color: 'text-gray-500',
          bgGradient: 'from-gray-500/20 to-gray-600/10',
          description: 'Basic features with limitations'
        };
    }
  };

  const tierInfo = getTierInfo();
  const Icon = tierInfo.icon;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Card className={`p-6 bg-gradient-to-br ${tierInfo.bgGradient} border-[#1a1b2e] relative overflow-hidden`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl" />
        
        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-black/30 ${tierInfo.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {tierInfo.name}
                  {subscriptionTier !== 'free' && (
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-400">{tierInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Subscription details */}
          {subscriptionTier !== 'free' && subscriptionEnd && (
            <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-white/10">
              <Calendar className="w-4 h-4" />
              <span>Renews on {formatDate(subscriptionEnd)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {subscriptionTier === 'free' ? (
              <Button 
                onClick={() => setManageOpen(true)}
                className="flex-1 gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400"
              >
                <Crown className="w-4 h-4" />
                Upgrade to VIP
              </Button>
            ) : (
              <Button 
                onClick={() => setManageOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ManageSubscriptionDialog 
        open={manageOpen}
        onOpenChange={setManageOpen}
        onSubscriptionUpdated={() => {
          // Refresh handled by SubscriptionProvider
        }}
      />
    </>
  );
};

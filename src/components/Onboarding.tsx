import { useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { logInfo } from "@/lib/logger";

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

/**
 * Simple onboarding completion for users who skipped VIP trial
 * Just marks onboarding as complete in the database
 */
export const Onboarding = ({ userId, onComplete }: OnboardingProps) => {
  useEffect(() => {
    const completeOnboarding = async () => {
      const supabase = getSupabase();
      
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", userId);
      
      logInfo("Onboarding completed", { userId });
      onComplete();
    };
    
    // Auto-complete after a short delay
    const timer = setTimeout(completeOnboarding, 500);
    return () => clearTimeout(timer);
  }, [userId, onComplete]);
  
  return null; // No UI, just marks onboarding complete
};

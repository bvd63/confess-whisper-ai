import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Clock } from 'lucide-react';
import { useProfileHandle } from '@/hooks/useProfileHandle';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileEditorProps {
  userId: string;
  currentProfile: {
    nickname: string | null;
    bio: string | null;
    handle: string | null;
    privacy_mode: string | null;
    nickname_updated_at: string | null;
  };
  onUpdate: () => void;
}
export const ProfileEditor = ({
  userId,
  currentProfile,
  onUpdate
}: ProfileEditorProps) => {
  const [nickname, setNickname] = useState(currentProfile.nickname || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [privacyMode, setPrivacyMode] = useState(currentProfile.privacy_mode || 'public');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const {
    generateHandle,
    isGenerating
  } = useProfileHandle(userId);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3600 * 1000);
    return () => clearInterval(id);
  }, []);
  const COOLDOWN_DAYS = 21;
  const daysRemaining = useMemo(() => {
    if (!currentProfile.nickname_updated_at) return 0;
    const lastUpdate = new Date(currentProfile.nickname_updated_at);
    const diffDays = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(COOLDOWN_DAYS - diffDays, 0);
  }, [currentProfile.nickname_updated_at, now]);
  const handleNicknameUpdate = async () => {
    if (!nickname.trim()) {
      toast({
        title: t.common_error,
        description: t.profile_nickname_empty_error,
        variant: 'destructive'
      });
      return;
    }

    // Check if nickname changed and cooldown applies
    if (nickname !== currentProfile.nickname && currentProfile.nickname_updated_at) {
      const lastUpdate = new Date(currentProfile.nickname_updated_at);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate < 21) {
        const daysRemaining = 21 - daysSinceUpdate;
        const plural = daysRemaining !== 1 ? 's' : '';
        toast({
          title: t.profile_nickname_change_restricted,
          description: t.profile_nickname_cooldown_message
            .replace('{days}', daysRemaining.toString())
            .replace('{plural}', plural),
          variant: 'destructive'
        });
        return;
      }
    }

    setIsUpdating(true);
    try {
      // Generate handle if nickname changed
      let handleToUse = currentProfile.handle;
      if (!handleToUse || nickname !== currentProfile.nickname) {
        const newHandle = await generateHandle(nickname);
        if (newHandle) {
          handleToUse = newHandle;
        }
      }

      const updateData: any = {
        handle: handleToUse
      };

      // Only update nickname and timestamp if nickname changed
      if (nickname !== currentProfile.nickname) {
        updateData.nickname = nickname.trim();
        updateData.nickname_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      toast({
        title: t.profile_nickname_updated,
        description: t.profile_nickname_update_success
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t.common_error,
        description: t.profile_update_error,
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBioPrivacyUpdate = async () => {
    setIsUpdating(true);
    try {
      const updateData: any = {
        bio: bio.trim() || null,
        privacy_mode: privacyMode
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      toast({
        title: t.profile_settings_updated,
        description: t.profile_settings_update_success
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t.common_error,
        description: t.profile_update_error,
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <div className="space-y-4">
      {/* Nickname Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Nickname</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {nickname.length}/50
            </p>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1" aria-live="polite">
              <Clock className="h-3 w-3" />
              {daysRemaining > 0 ? (
                <span>
                  {(daysRemaining === 1
                    ? t.profile_nickname_days_remaining_singular
                    : t.profile_nickname_days_remaining_plural
                  ).replace("{days}", daysRemaining.toString())}
                </span>
              ) : (
                <span>{t.profile_nickname_change_available}</span>
              )}
            </div>
          </div>

          <Button 
            onClick={handleNicknameUpdate} 
            disabled={isUpdating || isGenerating} 
            className="w-full"
          >
            {isUpdating || isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Nickname'
            )}
          </Button>
        </div>
      </Card>

      {/* Bio & Privacy Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Bio & Privacy</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              placeholder="Tell us about yourself..." 
              maxLength={200} 
              rows={3} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bio.length}/200
            </p>
          </div>

          <div>
            <Label htmlFor="privacy">Privacy Mode</Label>
            <Select value={privacyMode} onValueChange={setPrivacyMode}>
              <SelectTrigger id="privacy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Everyone can see</SelectItem>
                <SelectItem value="limited">Limited - Only followers</SelectItem>
                <SelectItem value="private">Private - Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleBioPrivacyUpdate} 
            disabled={isUpdating} 
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
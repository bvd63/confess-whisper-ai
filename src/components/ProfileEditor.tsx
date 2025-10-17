import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User } from 'lucide-react';
import { useProfileHandle } from '@/hooks/useProfileHandle';
interface ProfileEditorProps {
  userId: string;
  currentProfile: {
    nickname: string | null;
    bio: string | null;
    handle: string | null;
    privacy_mode: string | null;
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
  const {
    toast
  } = useToast();
  const {
    generateHandle,
    isGenerating
  } = useProfileHandle(userId);
  const handleUpdate = async () => {
    if (!nickname.trim()) {
      toast({
        title: 'Error',
        description: 'Nickname cannot be empty',
        variant: 'destructive'
      });
      return;
    }
    setIsUpdating(true);
    try {
      // Generate handle if nickname changed and no handle exists
      let handleToUse = currentProfile.handle;
      if (!handleToUse || nickname !== currentProfile.nickname) {
        const newHandle = await generateHandle(nickname);
        if (newHandle) {
          handleToUse = newHandle;
        }
      }
      const {
        error
      } = await supabase.from('profiles').update({
        nickname: nickname.trim(),
        bio: bio.trim() || null,
        privacy_mode: privacyMode,
        handle: handleToUse
      }).eq('user_id', userId);
      if (error) throw error;
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved'
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  return <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Edit Profile</h3>
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
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." maxLength={200} rows={3} />
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

        <Button onClick={handleUpdate} disabled={isUpdating || isGenerating} className="w-full">
          {isUpdating || isGenerating ? <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </> : 'Save Changes'}
        </Button>
      </div>
    </Card>;
};
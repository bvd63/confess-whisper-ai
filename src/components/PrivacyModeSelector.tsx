import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Lock, Users, Globe } from 'lucide-react';

interface PrivacyModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const PrivacyModeSelector = ({ value, onChange }: PrivacyModeSelectorProps) => {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <Label>Privacy Mode</Label>
        </div>
        
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-xs text-muted-foreground">Everyone can see your profile</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="limited">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <div>
                  <div className="font-medium">Limited</div>
                  <div className="text-xs text-muted-foreground">Only followers can see</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="private">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-xs text-muted-foreground">Hidden from everyone</div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          Control who can see your confessions and profile information
        </p>
      </div>
    </Card>
  );
};
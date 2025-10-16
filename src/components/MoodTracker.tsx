import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smile, Frown, Meh, Angry, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoodTrackerProps {
  onMoodSelect: (mood: string, intensity: number) => void;
  selectedMood?: string;
}

const moods = [
  { value: 'happy', icon: Smile, label: 'Fericit', color: 'text-green-500' },
  { value: 'sad', icon: Frown, label: 'Trist', color: 'text-blue-500' },
  { value: 'anxious', icon: Meh, label: 'Anxios', color: 'text-yellow-500' },
  { value: 'angry', icon: Angry, label: 'Supărat', color: 'text-red-500' },
  { value: 'neutral', icon: Meh, label: 'Neutru', color: 'text-gray-500' },
  { value: 'hopeful', icon: Sparkles, label: 'Plin de speranță', color: 'text-purple-500' },
];

const MoodTracker = ({ onMoodSelect, selectedMood }: MoodTrackerProps) => {
  const [mood, setMood] = useState<string | null>(selectedMood || null);
  const [intensity, setIntensity] = useState(3);

  const handleMoodSelect = (moodValue: string) => {
    setMood(moodValue);
    onMoodSelect(moodValue, intensity);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Cum te simți acum?</label>
        <div className="grid grid-cols-3 gap-2">
          {moods.map(({ value, icon: Icon, label, color }) => (
            <Button
              key={value}
              variant={mood === value ? "default" : "outline"}
              className={cn(
                "flex flex-col gap-1 h-auto py-3",
                mood === value && color
              )}
              onClick={() => handleMoodSelect(value)}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {mood && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Intensitate (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <Button
                key={level}
                variant={intensity === level ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setIntensity(level);
                  onMoodSelect(mood, level);
                }}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodTracker;
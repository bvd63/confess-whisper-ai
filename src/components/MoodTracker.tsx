import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smile, Frown, Meh, Angry, Heart, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface MoodTrackerProps {
  onMoodSelect: (mood: string, intensity: number) => void;
  selectedMood?: string;
}

const MoodTracker = ({ onMoodSelect, selectedMood }: MoodTrackerProps) => {
  const { t } = useLanguage();
  const [mood, setMood] = useState<string | null>(selectedMood || null);
  const [intensity, setIntensity] = useState(3);
  
  const moods = [
    { value: 'happy', icon: Smile, label: t.mood_happy, color: 'text-green-500' },
    { value: 'sad', icon: Frown, label: t.mood_sad, color: 'text-blue-500' },
    { value: 'anxious', icon: Meh, label: t.mood_anxious, color: 'text-yellow-500' },
    { value: 'angry', icon: Angry, label: t.mood_angry, color: 'text-red-500' },
    { value: 'neutral', icon: Meh, label: t.mood_neutral, color: 'text-gray-500' },
    { value: 'hopeful', icon: Sparkles, label: t.mood_hopeful, color: 'text-purple-500' },
  ];

  const handleMoodSelect = (moodValue: string) => {
    setMood(moodValue);
    onMoodSelect(moodValue, intensity);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold">{t.mood_how_feeling}</label>
        <div className="grid grid-cols-3 gap-3">
          {moods.map(({ value, icon: Icon, label, color }) => (
            <Button
              key={value}
              variant={mood === value ? "default" : "outline"}
              className={cn(
                "flex flex-col gap-2 h-auto py-4 px-4 rounded-2xl shadow-ios hover:shadow-elevated transition-all",
                mood === value && color
              )}
              onClick={() => handleMoodSelect(value)}
            >
              <Icon className="w-7 h-7" />
              <span className="text-xs font-medium leading-tight">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {mood && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold">{t.mood_intensity} (1-5)</label>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((level) => (
              <Button
                key={level}
                variant={intensity === level ? "default" : "outline"}
                size="sm"
                className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-ios hover:shadow-elevated"
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
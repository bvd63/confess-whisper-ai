import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Smile, Frown, Meh, Angry, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface MoodStatsProps {
  userId: string;
}

interface MoodData {
  mood: string;
  count: number;
  avg_intensity: number;
}

const moodColors: Record<string, string> = {
  happy: '#10b981',
  sad: '#3b82f6',
  anxious: '#f59e0b',
  angry: '#ef4444',
  neutral: '#6b7280',
  hopeful: '#a855f7',
};

const moodIcons: Record<string, any> = {
  happy: Smile,
  sad: Frown,
  anxious: Meh,
  angry: Angry,
  hopeful: Sparkles,
  neutral: Meh,
};

const MoodStats = ({ userId }: MoodStatsProps) => {
  const { t, language } = useLanguage();
  const [moodData, setMoodData] = useState<MoodData[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoodStats();
  }, [userId]);

  const loadMoodStats = async () => {
    // Load mood distribution
    const { data: moods } = await supabase
      .from('mood_entries')
      .select('mood, intensity')
      .eq('user_id', userId);

    if (moods) {
      // Aggregate by mood
      const moodMap = new Map<string, { count: number; totalIntensity: number }>();
      
      moods.forEach(m => {
        const current = moodMap.get(m.mood) || { count: 0, totalIntensity: 0 };
        current.count += 1;
        current.totalIntensity += m.intensity;
        moodMap.set(m.mood, current);
      });

      const aggregated = Array.from(moodMap.entries()).map(([mood, stats]) => ({
        mood,
        count: stats.count,
        avg_intensity: Math.round((stats.totalIntensity / stats.count) * 10) / 10,
      }));

      setMoodData(aggregated);
    }

    // Load timeline data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: timeline } = await supabase
      .from('mood_entries')
      .select('created_at, intensity, mood')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (timeline) {
      const locale = language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';
      const dailyMood = timeline.map(entry => ({
        date: new Date(entry.created_at).toLocaleDateString(locale, { 
          month: 'short', 
          day: 'numeric' 
        }),
        intensity: entry.intensity,
      }));

      setTimelineData(dailyMood);
    }

    setLoading(false);
  };

  if (loading) return null;
  if (moodData.length === 0) return null;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <Card className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold mb-2.5 sm:mb-3">{t.mood_distribution}</h3>
        
        <div className="h-40 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={moodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ mood, count }) => `${mood} (${count})`}
                outerRadius={window.innerWidth < 640 ? 50 : 65}
                fill="#8884d8"
                dataKey="count"
              >
                {moodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={moodColors[entry.mood] || '#888'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          {moodData.map((mood) => {
            const Icon = moodIcons[mood.mood] || Meh;
            return (
              <div 
                key={mood.mood}
                className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-lg bg-accent/50"
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: moodColors[mood.mood] }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium capitalize truncate">{mood.mood}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                    {mood.count}x • {mood.avg_intensity}/5
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {timelineData.length > 0 && (
        <Card className="p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-semibold mb-2.5 sm:mb-3">{t.mood_intensity_evolution}</h3>
          
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: window.innerWidth < 640 ? 9 : 11 }}
                />
                <YAxis 
                  domain={[1, 5]} 
                  tick={{ fontSize: window.innerWidth < 640 ? 9 : 11 }}
                />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="intensity" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MoodStats;
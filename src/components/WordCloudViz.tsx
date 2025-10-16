import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface WordCloudVizProps {
  userId: string;
}

interface WordFrequency {
  text: string;
  value: number;
}

const WordCloudViz = ({ userId }: WordCloudVizProps) => {
  const [words, setWords] = useState<WordFrequency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWordFrequencies();
  }, [userId]);

  const loadWordFrequencies = async () => {
    // Load all user confessions
    const { data: confessions } = await supabase
      .from('confessions')
      .select('content')
      .eq('user_id', userId);

    if (confessions) {
      // Romanian stop words to filter out
      const stopWords = new Set([
        'și', 'în', 'de', 'la', 'cu', 'pe', 'din', 'că', 'este', 'sunt', 
        'un', 'o', 'am', 'ai', 'au', 'mă', 'te', 'se', 'ne', 've',
        'dacă', 'dar', 'sau', 'pentru', 'mai', 'cum', 'când', 'care',
        'ce', 'nu', 'mi', 'ti', 'si', 'imi', 'iti', 'îmi', 'îți',
      ]);

      // Combine all text
      const allText = confessions.map(c => c.content).join(' ').toLowerCase();
      
      // Extract words (only letters, min 3 chars)
      const wordMatches = allText.match(/[a-zăâîșțĂÂÎȘȚ]{3,}/g) || [];
      
      // Count frequencies
      const freqMap = new Map<string, number>();
      wordMatches.forEach(word => {
        if (!stopWords.has(word)) {
          freqMap.set(word, (freqMap.get(word) || 0) + 1);
        }
      });

      // Convert to array and sort
      const wordArray = Array.from(freqMap.entries())
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 30); // Top 30 words

      setWords(wordArray);
    }
    setLoading(false);
  };

  if (loading) return null;
  if (words.length === 0) return null;

  const maxFreq = Math.max(...words.map(w => w.value));
  const minFreq = Math.min(...words.map(w => w.value));

  const getFontSize = (frequency: number) => {
    const ratio = (frequency - minFreq) / (maxFreq - minFreq);
    return 12 + ratio * 32; // 12px to 44px
  };

  const getColor = (frequency: number) => {
    const ratio = (frequency - minFreq) / (maxFreq - minFreq);
    const hue = 280 - ratio * 100; // Purple to blue gradient
    return `hsl(${hue}, 70%, 60%)`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Cuvintele tale frecvente</h3>
      
      <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px]">
        {words.map((word, index) => (
          <span
            key={index}
            className="cursor-default transition-transform hover:scale-110"
            style={{
              fontSize: `${getFontSize(word.value)}px`,
              color: getColor(word.value),
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            title={`Folosit de ${word.value} ori`}
          >
            {word.text}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Bazat pe {words.reduce((sum, w) => sum + w.value, 0)} cuvinte din confesiunile tale
      </p>
    </Card>
  );
};

export default WordCloudViz;
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface WordCloudVizProps {
  userId: string;
}

interface WordFrequency {
  text: string;
  value: number;
}

const WordCloudViz = ({ userId }: WordCloudVizProps) => {
  const { t, language } = useLanguage();
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
      // Multilingual stop words
      const stopWordsByLanguage = {
        en: new Set([
          'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'in', 'with',
          'to', 'for', 'of', 'as', 'by', 'an', 'be', 'this', 'that', 'it',
          'not', 'are', 'from', 'was', 'will', 'would', 'there', 'their',
          'what', 'can', 'out', 'if', 'about', 'who', 'get', 'which', 'me',
          'when', 'make', 'can', 'like', 'just', 'know', 'take', 'into',
        ]),
        es: new Set([
          'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no',
          'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener',
          'le', 'lo', 'todo', 'pero', 'más', 'hacer', 'o', 'poder', 'decir',
          'este', 'ir', 'otro', 'ese', 'la', 'si', 'me', 'ya', 'ver', 'porque',
          'dar', 'cuando', 'él', 'muy', 'sin', 'vez', 'mucho', 'saber', 'qué',
        ]),
        de: new Set([
          'der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich',
          'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine',
          'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass',
          'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch',
          'wie', 'einem', 'über', 'einen', 'so', 'zum', 'war', 'haben', 'nur',
        ]),
      };
      
      const stopWords = stopWordsByLanguage[language] || stopWordsByLanguage.en;

      // Combine all text
      const allText = confessions.map(c => c.content).join(' ').toLowerCase();
      
      // Extract words (universal letters, min 3 chars)
      const wordMatches = allText.match(/[\p{L}]{3,}/gu) || [];
      
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
      <h3 className="text-lg font-semibold mb-4">{t.wordcloud_title}</h3>
      
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
            title={t.wordcloud_used_times.replace('{count}', word.value.toString())}
          >
            {word.text}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        {t.wordcloud_based_on.replace('{count}', words.reduce((sum, w) => sum + w.value, 0).toString())}
      </p>
    </Card>
  );
};

export default WordCloudViz;
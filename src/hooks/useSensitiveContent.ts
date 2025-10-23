import { useMemo } from 'react';

const SENSITIVE_KEYWORDS = [
  // Self-harm & suicide
  'suicide', 'suicidal', 'kill myself', 'end my life', 'self harm', 'cut myself',
  'want to die', 'better off dead', 'no reason to live', 'razor', 'overdose',
  
  // Violence
  'murder', 'kill someone', 'hurt someone', 'weapon', 'assault', 'abuse',
  
  // Sexual content
  'rape', 'sexual assault', 'molest', 'pedophile',
  
  // Other sensitive
  'eating disorder', 'anorexia', 'bulimia', 'addiction',
];

export function useSensitiveContent(content: string) {
  const { isSensitive, detectedKeywords } = useMemo(() => {
    const lowerContent = content.toLowerCase();
    const detected: string[] = [];
    
    for (const keyword of SENSITIVE_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        detected.push(keyword);
      }
    }
    
    return {
      isSensitive: detected.length > 0,
      detectedKeywords: detected,
    };
  }, [content]);

  return { isSensitive, detectedKeywords };
}

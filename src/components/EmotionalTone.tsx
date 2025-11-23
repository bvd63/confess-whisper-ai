import { Heart, Frown, Smile, Cloud, Sun, Moon, Zap, Gift, HelpCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type ToneType = 'calm' | 'anxious' | 'happy' | 'sad' | 'angry' | 'hopeful' | 'grateful' | 'regretful' | 'confused' | 'overwhelmed';

interface ToneConfig {
  icon: typeof Cloud;
  color: string;
  bg: string;
}

type TranslationMap = ReturnType<typeof useLanguage>['t'];
type ToneTranslationKey = `tone_${ToneType}`;

const toneConfig: Record<ToneType, ToneConfig> = {
  calm: { icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  anxious: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  happy: { icon: Smile, color: 'text-green-500', bg: 'bg-green-500/10' },
  sad: { icon: Frown, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  angry: { icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10' },
  hopeful: { icon: Sun, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  grateful: { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  regretful: { icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  confused: { icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  overwhelmed: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-600/10' }
};

const hasToneTranslation = (translationsMap: TranslationMap, key: string): key is keyof TranslationMap =>
  key in translationsMap;

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const isToneType = (value: string): value is ToneType => value in toneConfig;

interface EmotionalToneProps {
  tone: string;
  size?: 'sm' | 'lg';
}

export const EmotionalTone = ({ tone, size = 'sm' }: EmotionalToneProps) => {
  const { t } = useLanguage();
  const resolvedTone: ToneType = isToneType(tone) ? tone : 'confused';
  const config = toneConfig[resolvedTone];
  const Icon = config.icon;
  
  const sizeClasses: Record<'sm' | 'lg', string> = {
    sm: 'px-2 py-1 text-xs gap-1',
    lg: 'px-4 py-2 text-sm gap-2'
  };

  const iconSizes: Record<'sm' | 'lg', string> = {
    sm: 'w-3 h-3',
    lg: 'w-5 h-5'
  };

  const toneKey = `tone_${resolvedTone}` as ToneTranslationKey;
  const toneLabel = hasToneTranslation(t, toneKey) ? t[toneKey] : toTitleCase(resolvedTone);

  return (
    <div className={`inline-flex items-center rounded-full ${config.bg} ${sizeClasses[size]}`}>
      <Icon className={`${iconSizes[size]} ${config.color}`} />
      <span className={config.color}>{toneLabel}</span>
    </div>
  );
};

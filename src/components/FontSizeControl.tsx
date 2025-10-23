import { useFontSize, type FontSize } from '@/hooks/useFontSize';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Type } from 'lucide-react';

export const FontSizeControl = () => {
  const { fontSize, setFontSize } = useFontSize();
  const { t } = useLanguage();

  const sizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: t.font_size_small },
    { value: 'normal', label: t.font_size_normal },
    { value: 'large', label: t.font_size_large },
    { value: 'xl', label: t.font_size_xl }
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Type className="h-4 w-4" />
        <span>Text Size</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {sizes.map((size) => (
          <Button
            key={size.value}
            variant={fontSize === size.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFontSize(size.value)}
            className="text-xs"
          >
            {size.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

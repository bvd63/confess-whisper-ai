import { useState, useEffect } from 'react';

export type FontSize = 'small' | 'normal' | 'large' | 'xl';

const FONT_SIZE_KEY = 'app-font-size';

const FONT_SIZES = {
  small: '14px',
  normal: '16px',
  large: '18px',
  xl: '20px'
};

export function useFontSize() {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return (saved as FontSize) || 'normal';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', FONT_SIZES[fontSize]);
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  return { fontSize, setFontSize, FONT_SIZES };
}

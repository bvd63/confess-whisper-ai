import { useEffect } from 'react';

/**
 * Preload images for better performance
 */
export const useImagePreloader = (imageUrls: string[]) => {
  useEffect(() => {
    imageUrls.forEach(url => {
      if (!url) return;
      
      const img = new Image();
      img.src = url;
    });
  }, [imageUrls]);
};

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

type AspectRatio = 'square' | 'video' | 'portrait' | 'auto';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  blur?: boolean;
  aspectRatio?: AspectRatio;
  onError?: () => void;
}

/**
 * Optimized image component with lazy loading, blur placeholder, error handling, and WebP support
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  blur = true,
  aspectRatio = 'auto',
  onError,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Generate Supabase transform URL for WebP
  const getOptimizedUrl = (url: string, w?: number) => {
    if (!url.includes('supabase')) return url;
    
    const params = new URLSearchParams();
    if (w) params.append('width', w.toString());
    params.append('format', 'webp');
    params.append('quality', '80');
    
    return `${url}?${params.toString()}`;
  };

  // Generate srcSet for responsive images
  const srcSet = width
    ? `${getOptimizedUrl(src, width)} 1x, ${getOptimizedUrl(src, width * 2)} 2x`
    : undefined;

  // Handle image load error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  // Aspect ratio classes
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  return (
    <div className={cn('relative overflow-hidden', aspectClasses[aspectRatio], className)}>
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Blur placeholder */}
      {blur && !isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={getOptimizedUrl(src, width)}
          srcSet={srcSet}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

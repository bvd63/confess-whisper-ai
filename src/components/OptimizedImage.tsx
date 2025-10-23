import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  blur?: boolean;
}

/**
 * Optimized image component with lazy loading, blur placeholder, and WebP support
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  blur = true,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
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

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Blur placeholder */}
      {blur && !isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      {isInView && (
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
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}
    </div>
  );
};

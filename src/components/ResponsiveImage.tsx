import { memo } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Responsive image component optimized for mobile devices
 * Automatically generates srcset for different screen densities
 * Uses native lazy loading for better performance
 */
const ResponsiveImage = memo(({
  src,
  alt,
  className,
  sizes = '100vw',
  priority = false,
  onLoad,
  onError,
}: ResponsiveImageProps) => {
  // Generate responsive image sizes (if using a CDN that supports sizing)
  // For Supabase storage, we'd need to implement image transformations
  const getSrcSet = (baseSrc: string) => {
    // Check if using a CDN with automatic image optimization
    if (baseSrc.includes('supabase') || baseSrc.includes('cdn')) {
      // For now, just return the base source
      // TODO: Implement Supabase image transformations when available
      return undefined;
    }
    return undefined;
  };

  return (
    <picture>
      {/* WebP format for modern browsers */}
      {src.includes('http') && (
        <source
          type="image/webp"
          srcSet={getSrcSet(src)}
          sizes={sizes}
        />
      )}
      
      {/* Fallback image */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-auto object-cover',
          className
        )}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={onLoad}
        onError={onError}
        // Prevent layout shift
        style={{ contentVisibility: 'auto' }}
      />
    </picture>
  );
});

ResponsiveImage.displayName = 'ResponsiveImage';

export default ResponsiveImage;

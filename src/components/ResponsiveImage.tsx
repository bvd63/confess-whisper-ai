import React, { memo } from "react";

interface ResponsiveImageSource {
  srcset: string;
  media: string;
}

interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  alt: string;
  sources?: ResponsiveImageSource[];
}

/**
 * Universal responsive image component with lazy loading
 * Supports multiple source tags for different viewport sizes
 */
export const ResponsiveImage = memo<ResponsiveImageProps>(({ 
  alt, 
  sources = [], 
  loading = "lazy",
  decoding = "async",
  ...props 
}) => (
  <picture>
    {sources.map((s, i) => (
      <source key={i} srcSet={s.srcset} media={s.media} />
    ))}
    <img
      loading={loading}
      decoding={decoding}
      alt={alt}
      {...props}
    />
  </picture>
));

ResponsiveImage.displayName = 'ResponsiveImage';

export default ResponsiveImage;

import { useEffect } from 'react';

interface NoScreenshotModeProps {
  enabled: boolean;
  children: React.ReactNode;
}

export const NoScreenshotMode = ({ enabled, children }: NoScreenshotModeProps) => {
  useEffect(() => {
    if (!enabled) return;

    // Blur content when page is hidden (screenshot prevention)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(10px)';
      } else {
        document.body.style.filter = 'none';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.filter = 'none';
    };
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className="select-none"
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
};

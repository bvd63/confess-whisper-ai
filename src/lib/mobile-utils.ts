/**
 * Mobile Utilities
 * Helper functions for mobile device detection, optimization, and UX improvements
 */

/**
 * Device Detection Utilities
 */

// Check if the device is mobile (phone or tablet)
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Check if device is specifically a phone (not tablet)
export const isPhoneDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) && window.innerWidth < 768;
};

// Check if device is a tablet
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
};

// Check if device is iOS
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Check if device is Android
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
};

// Check if running in standalone mode (installed PWA)
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

// Check if device supports touch
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

/**
 * Viewport and Screen Utilities
 */

// Get viewport dimensions
export const getViewportDimensions = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

// Get safe area insets (for devices with notches)
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0'),
    right: parseInt(style.getPropertyValue('--sar') || '0'),
    bottom: parseInt(style.getPropertyValue('--sab') || '0'),
    left: parseInt(style.getPropertyValue('--sal') || '0'),
  };
};

/**
 * Image Optimization Utilities
 */

// Get optimal image size based on viewport and pixel density
export const getOptimalImageSize = (maxWidth?: number): number => {
  if (typeof window === 'undefined') return 800;
  
  const viewportWidth = window.innerWidth;
  const pixelRatio = window.devicePixelRatio || 1;
  const width = maxWidth || viewportWidth;
  
  // Calculate optimal size considering pixel density
  const optimalWidth = Math.min(width * pixelRatio, 2400); // Cap at 2400px
  
  // Round to nearest standard size for better caching
  const standardSizes = [320, 640, 768, 1024, 1280, 1920, 2400];
  return standardSizes.find(size => size >= optimalWidth) || 2400;
};

// Generate srcset string for responsive images
export const generateSrcSet = (baseUrl: string, sizes: number[]): string => {
  return sizes
    .map(size => {
      // Assuming CDN supports width parameter
      const url = `${baseUrl}?w=${size}`;
      return `${url} ${size}w`;
    })
    .join(', ');
};

/**
 * Performance Utilities
 */

// Debounce function for scroll/resize handlers
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for frequent events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Haptic Feedback (for mobile devices)
 */

// Trigger haptic feedback if available
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (typeof window === 'undefined') return;
  
  // iOS Haptic Engine
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
    };
    navigator.vibrate(patterns[type]);
  }
};

/**
 * Orientation Utilities
 */

// Get current screen orientation
export const getOrientation = (): 'portrait' | 'landscape' => {
  if (typeof window === 'undefined') return 'portrait';
  
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

// Lock orientation (for PWAs)
export const lockOrientation = async (
  orientation: 'portrait' | 'landscape'
): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    if ('screen' in window && 'orientation' in window.screen) {
      const screenOrientation = window.screen.orientation as any;
      if (screenOrientation && typeof screenOrientation.lock === 'function') {
        await screenOrientation.lock(
          orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary'
        );
      }
    }
  } catch (error) {
    console.warn('Orientation lock not supported:', error);
  }
};

/**
 * Network Utilities
 */

// Check connection type and quality
export const getConnectionType = (): {
  type: string;
  effectiveType: string;
  downlink: number;
  saveData: boolean;
} | null => {
  if (typeof window === 'undefined') return null;
  
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  
  if (!connection) return null;
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    saveData: connection.saveData || false,
  };
};

// Check if on slow connection
export const isSlowConnection = (): boolean => {
  const connection = getConnectionType();
  if (!connection) return false;
  
  return (
    connection.saveData ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  );
};

/**
 * Storage Utilities
 */

// Check available storage (for PWA caching)
export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> => {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return null;
  }
  
  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    
    return { usage, quota, percentage };
  } catch (error) {
    console.warn('Storage estimate not available:', error);
    return null;
  }
};

/**
 * Battery Utilities
 */

// Get battery status
export const getBatteryStatus = async (): Promise<{
  level: number;
  charging: boolean;
} | null> => {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return null;
  }
  
  try {
    const battery = await (navigator as any).getBattery();
    return {
      level: battery.level * 100,
      charging: battery.charging,
    };
  } catch (error) {
    console.warn('Battery API not available:', error);
    return null;
  }
};

/**
 * Accessibility Utilities
 */

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Check if user prefers dark mode
export const prefersDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Clipboard Utilities
 */

// Copy text to clipboard with fallback
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof navigator === 'undefined') return false;
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Share API Utilities
 */

// Check if Web Share API is available
export const canShare = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return 'share' in navigator;
};

// Share content using native share dialog
export const shareContent = async (data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  if (!canShare()) return false;
  
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    console.warn('Share failed:', error);
    return false;
  }
};

import { useState, useEffect } from 'react';

interface DeviceCapabilities {
  networkSpeed: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  deviceMemory: number; // GB
  effectiveConnectionType: string;
  saveData: boolean;
  batteryLevel: number | null;
  isLowPowerMode: boolean;
}

interface AdaptiveConfig {
  imageQuality: 'low' | 'medium' | 'high';
  enableAnimations: boolean;
  prefetchStrategy: 'aggressive' | 'conservative' | 'none';
  enableVideoAutoplay: boolean;
}

/**
 * Hook that adapts loading strategy based on device capabilities
 */
export const useAdaptiveLoading = (): AdaptiveConfig => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    networkSpeed: 'unknown',
    deviceMemory: 4,
    effectiveConnectionType: 'unknown',
    saveData: false,
    batteryLevel: null,
    isLowPowerMode: false,
  });

  useEffect(() => {
    const updateCapabilities = async () => {
      // Network information
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      let networkSpeed: DeviceCapabilities['networkSpeed'] = 'unknown';
      let effectiveConnectionType = 'unknown';
      let saveData = false;

      if (connection) {
        effectiveConnectionType = connection.effectiveType || 'unknown';
        saveData = connection.saveData || false;
        
        // Map effective type to speed
        switch (connection.effectiveType) {
          case 'slow-2g':
            networkSpeed = 'slow-2g';
            break;
          case '2g':
            networkSpeed = '2g';
            break;
          case '3g':
            networkSpeed = '3g';
            break;
          case '4g':
            networkSpeed = '4g';
            break;
        }
      }

      // Device memory
      const deviceMemory = (navigator as any).deviceMemory || 4;

      // Battery status
      let batteryLevel: number | null = null;
      let isLowPowerMode = false;

      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = battery.level;
          isLowPowerMode = battery.level < 0.2 || battery.charging === false;
        } catch (error) {
          console.warn('Battery API not available');
        }
      }

      setCapabilities({
        networkSpeed,
        deviceMemory,
        effectiveConnectionType,
        saveData,
        batteryLevel,
        isLowPowerMode,
      });
    };

    updateCapabilities();

    // Update on network change
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateCapabilities);
      return () => connection.removeEventListener('change', updateCapabilities);
    }
  }, []);

  // Determine adaptive configuration
  const config: AdaptiveConfig = {
    imageQuality: 'high',
    enableAnimations: true,
    prefetchStrategy: 'aggressive',
    enableVideoAutoplay: true,
  };

  // Low memory device
  if (capabilities.deviceMemory < 2) {
    config.imageQuality = 'low';
    config.enableAnimations = false;
    config.prefetchStrategy = 'none';
  }

  // Slow network
  if (capabilities.networkSpeed === 'slow-2g' || capabilities.networkSpeed === '2g') {
    config.imageQuality = 'low';
    config.prefetchStrategy = 'none';
    config.enableVideoAutoplay = false;
  } else if (capabilities.networkSpeed === '3g') {
    config.imageQuality = 'medium';
    config.prefetchStrategy = 'conservative';
  }

  // Data saver mode
  if (capabilities.saveData) {
    config.imageQuality = 'low';
    config.prefetchStrategy = 'none';
    config.enableVideoAutoplay = false;
  }

  // Low battery
  if (capabilities.isLowPowerMode) {
    config.enableAnimations = false;
    config.prefetchStrategy = 'conservative';
    config.enableVideoAutoplay = false;
  }

  return config;
};

/**
 * Get optimal image quality based on device capabilities
 */
export const useImageQuality = () => {
  const { imageQuality } = useAdaptiveLoading();
  
  const qualityMap = {
    low: 60,
    medium: 75,
    high: 90,
  };

  return qualityMap[imageQuality];
};

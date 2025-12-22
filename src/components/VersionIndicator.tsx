import { useState, useEffect } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/logger';

/**
 * Displays current app version and allows manual update check
 */
export const VersionIndicator = () => {
  const [version, setVersion] = useState<string>('');
  const [buildDate, setBuildDate] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    loadVersion();
    
    // Check for updates every 30 seconds
    const interval = setInterval(() => {
      checkForUpdate();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadVersion = async () => {
    try {
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-cache',
      });
      
      if (response.ok) {
        const data = await response.json();
        setVersion(data.version);
        setBuildDate(data.buildDate);
        
        // Check if different from stored version
        const storedVersion = localStorage.getItem('app-version');
        if (storedVersion && storedVersion !== data.version) {
          setUpdateAvailable(true);
        }
      }
    } catch (error) {
      logError('Failed to load version', error as Error);
    }
  };

  const checkForUpdate = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const storedVersion = localStorage.getItem('app-version');
        
        if (storedVersion && storedVersion !== data.version) {
          setUpdateAvailable(true);
          localStorage.setItem('app-version', data.version);
          
          // Force reload after 3 seconds
          setTimeout(() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => registration.unregister());
              }).then(() => {
                caches.keys().then(keys => {
                  Promise.all(keys.map(key => caches.delete(key))).then(() => {
                    window.location.reload();
                  });
                });
              });
            } else {
              window.location.reload();
            }
          }, 3000);
        } else {
          setUpdateAvailable(false);
          localStorage.setItem('app-version', data.version);
        }
      }
    } catch (error) {
      logError('Update check failed', error as Error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Info className="h-3 w-3" />
        <span>v{version}</span>
        
      </div>
      
      {updateAvailable && (
        <span className="text-primary font-medium">
          Update disponibil!
        </span>
      )}
      
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-6 w-6",
          isChecking && "animate-spin"
        )}
        onClick={checkForUpdate}
        disabled={isChecking}
        title="Verifică update-uri"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      console.error('Failed to load version:', error);
    }
  };

  const checkForUpdate = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const storedVersion = localStorage.getItem('app-version');
        
        if (storedVersion !== data.version) {
          setUpdateAvailable(true);
          window.location.reload();
        } else {
          setUpdateAvailable(false);
        }
      }
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Info className="h-3 w-3" />
        <span>v{version}</span>
        {buildDate && <span className="opacity-60">({buildDate})</span>}
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

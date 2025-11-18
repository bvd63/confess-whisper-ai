import { Component, ErrorInfo, ReactNode, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { logError } from "@/lib/logger";
import { env } from "@/lib/env";

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryKey: number;
  isOffline: boolean;
  offlineContent: string | null;
  isLoadingOffline: boolean;
}

class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  state: ChunkErrorBoundaryState = {
    hasError: false,
    error: null,
    retryKey: 0,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    offlineContent: null,
    isLoadingOffline: false,
  };

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    return {
      hasError: true,
      error,
      retryKey: 0,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      offlineContent: null,
      isLoadingOffline: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError("Lazy-loaded chunk failed", error, { metadata: { errorInfo } });
  }

  componentDidMount(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkChange);
      window.addEventListener('offline', this.handleNetworkChange);
    }
  }

  componentWillUnmount(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkChange);
      window.removeEventListener('offline', this.handleNetworkChange);
    }
  }

  componentDidUpdate(_: ChunkErrorBoundaryProps, prevState: ChunkErrorBoundaryState): void {
    const shouldLoadOfflineContent =
      this.state.hasError &&
      this.state.isOffline &&
      !this.state.offlineContent &&
      !this.state.isLoadingOffline &&
      (!prevState.hasError || !prevState.isOffline || prevState.offlineContent !== this.state.offlineContent);

    if (shouldLoadOfflineContent) {
      this.loadOfflineFallback();
    }
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
      offlineContent: null,
    }));
  };

  private handleNetworkChange = () => {
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    this.setState({ isOffline });

    if (!isOffline && this.state.hasError) {
      // When connection returns, try loading the chunk again automatically
      this.handleRetry();
    }
  };

  private loadOfflineFallback = async () => {
    if (typeof window === 'undefined') return;

    this.setState({ isLoadingOffline: true });

    try {
      let html: string | null = null;

      if ('caches' in window) {
        const cached = await caches.match('/offline.html');
        if (cached) {
          html = await cached.text();
        }
      }

      if (!html) {
        const response = await fetch('/offline.html', { cache: 'force-cache' });
        if (response.ok) {
          html = await response.text();
        }
      }

      this.setState({ offlineContent: html });
    } catch (error) {
      logError('Failed to load offline fallback', error as Error);
    } finally {
      this.setState({ isLoadingOffline: false });
    }
  };

  private renderOfflineFallback() {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-semibold">You're offline</h2>
          <p className="text-muted-foreground text-sm">
            We couldn't load this screen because the device is offline. Cached content is available below.
          </p>
        </div>

        {this.state.offlineContent ? (
          <div
            className="w-full max-w-2xl rounded-xl border bg-background text-left overflow-hidden"
            dangerouslySetInnerHTML={{ __html: this.state.offlineContent }}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {this.state.isLoadingOffline
                ? 'Loading offline view...'
                : 'Offline view not cached yet. Retry once you are online.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.loadOfflineFallback} disabled={this.state.isLoadingOffline}>
                {this.state.isLoadingOffline ? 'Loading…' : 'Load cached page'}
              </Button>
              <Button variant="secondary" onClick={this.handleRetry}>
                Retry when online
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isOffline) {
        return this.renderOfflineFallback();
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-semibold">
              {this.props.title ?? "We couldn't load that screen"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {this.props.description ?? "Please check your connection and try again."}
            </p>
            {this.state.error && env.isDev && (
              <pre className="bg-muted text-left text-xs rounded-md p-3 overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}

export default ChunkErrorBoundary;

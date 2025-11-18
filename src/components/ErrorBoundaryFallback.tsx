import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureLanguage, getCachedTranslations, loadTranslations } from '@/i18n/translations';
import { logError } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logError('ErrorBoundary caught error', error, { errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const storedLanguage = localStorage.getItem('language');
      const language = ensureLanguage(storedLanguage);
      const t = getCachedTranslations(language);
      void loadTranslations(language).catch(() => undefined);

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t.error_something_wrong}
              </h1>
              <p className="text-muted-foreground">
                {t.error_unexpected}
              </p>
            </div>

            {this.state.error && process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-muted rounded-lg text-left">
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <Button 
              onClick={this.handleReset}
              className="w-full bg-gradient-to-r from-primary to-primary/80"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.error_reload_page}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

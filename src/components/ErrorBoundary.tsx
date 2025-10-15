import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-destructive/5 to-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
              <p className="text-muted-foreground">
                Sorry for the inconvenience. Try reloading the page or return to the homepage.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-4 bg-destructive/10 rounded-lg text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleReload}
                className="flex-1 gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex-1 gap-2"
                variant="outline"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
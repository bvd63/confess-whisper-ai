import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

const ErrorMessage = ({ 
  title, 
  message, 
  onRetry, 
  onGoHome,
  className 
}: ErrorMessageProps) => {
  const { t } = useLanguage();
  const resolvedTitle = title ?? t.error_something_wrong;
  
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center gap-4 p-8 sm:p-12",
      "animate-fade-in",
      className
    )}>
      <div className="rounded-full bg-destructive/10 p-4 animate-pulse-glow">
        <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
      </div>
      
      <div className="text-center space-y-2 max-w-md">
        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
          {resolvedTitle}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          {message}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="default"
            size="lg"
            className="hover-lift"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t.error_retry}
          </Button>
        )}
        
        {onGoHome && (
          <Button 
            onClick={onGoHome}
            variant="outline"
            size="lg"
            className="hover-scale"
          >
            <Home className="w-4 h-4 mr-2" />
            {t.go_home}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ErrorMessage;

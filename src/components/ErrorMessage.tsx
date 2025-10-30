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
      "flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-8 md:p-12",
      "animate-fade-in",
      className
    )}>
      <div className="rounded-full bg-destructive/10 p-3 sm:p-4 animate-pulse-glow">
        <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-destructive" />
      </div>
      
      <div className="text-center space-y-1.5 sm:space-y-2 max-w-md">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground">
          {resolvedTitle}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          {message}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-1.5 sm:mt-2">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="default"
            size="lg"
            className="hover-lift h-9 sm:h-10 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            {t.error_retry}
          </Button>
        )}
        
        {onGoHome && (
          <Button 
            onClick={onGoHome}
            variant="outline"
            size="lg"
            className="hover-scale h-9 sm:h-10 text-sm"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            {t.go_home}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ErrorMessage;

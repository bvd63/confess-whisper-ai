import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

const ErrorMessage = ({ 
  title = "Oops! Ceva nu a mers bine", 
  message,
  onRetry 
}: ErrorMessageProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      
      <div className="text-center space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="outline"
          className="mt-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Încearcă din nou
        </Button>
      )}
    </div>
  );
};

export default ErrorMessage;

import { useState } from 'react';
import { Plus, FileText, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onNewConfession?: () => void;
  onOpenDrafts?: () => void;
  className?: string;
}

export const QuickActions = ({ onNewConfession, onOpenDrafts, className }: QuickActionsProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const actions = [
    {
      icon: Plus,
      label: t.confession_new || 'New Confession',
      action: onNewConfession,
      visible: !!onNewConfession,
      color: 'bg-gradient-to-r from-primary to-primary/80',
    },
    {
      icon: FileText,
      label: t.drafts || 'Drafts',
      action: onOpenDrafts,
      visible: !!onOpenDrafts,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
    },
    {
      icon: ArrowUp,
      label: t.scroll_top || 'Scroll to Top',
      action: scrollToTop,
      visible: true,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
    },
  ].filter(a => a.visible);

  return (
    <TooltipProvider>
      <div className={cn("fixed bottom-20 right-4 z-40 flex flex-col-reverse gap-3", className)}>
        {isExpanded && actions.slice(1).map((action, index) => {
          const ActionIcon = action.icon;
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg animate-in slide-in-from-bottom-5",
                    action.color
                  )}
                  onClick={() => {
                    action.action?.();
                    setIsExpanded(false);
                  }}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ActionIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full shadow-xl transition-transform",
                actions[0].color,
                isExpanded && "rotate-45"
              )}
              onClick={() => {
                if (actions.length === 1) {
                  actions[0].action?.();
                } else {
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              {(() => {
                const MainIcon = actions[0].icon;
                return <MainIcon className="h-6 w-6" />;
              })()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{actions[0].label}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

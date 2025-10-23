import { Plus, FileText, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface QuickActionsProps {
  onNewConfession: () => void;
  onOpenDrafts: () => void;
  onScrollToTop: () => void;
  className?: string;
}

export const QuickActions = ({
  onNewConfession,
  onOpenDrafts,
  onScrollToTop,
  className,
}: QuickActionsProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    { icon: Plus, action: onNewConfession, label: t.confession_new },
    { icon: FileText, action: onOpenDrafts, label: t.drafts },
    { icon: ArrowUp, action: onScrollToTop, label: t.scroll_top },
  ];

  return (
    <div className={cn("fixed bottom-20 right-4 flex flex-col-reverse gap-2 z-50", className)}>
      {isExpanded && actions.slice(0, -1).map((action, index) => (
        <Button
          key={index}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => {
            action.action();
            setIsExpanded(false);
          }}
          aria-label={action.label}
        >
          <action.icon className="h-5 w-5" />
        </Button>
      ))}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={t.scroll_top}
      >
        <ArrowUp className="h-6 w-6" />
      </Button>
    </div>
  );
};

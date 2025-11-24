import React from "react";

type I18n = { title: string; body: string; cta: string; dismiss: string };
type Props = {
  permission: NotificationPermission | "unsupported";
  onEnable: () => void;
  onDismiss?: () => void;
  i18n: I18n;
  className?: string;
};

export const OneSignalBanner: React.FC<Props> = ({ permission, onEnable, onDismiss, i18n, className = "" }) => {
  if (typeof window === "undefined") return null;
  const shouldShow = permission === "denied" || permission === "default" || permission === "unsupported";
  if (!shouldShow) return null;

  return (
    <div role="region" aria-label="Notifications banner" className={`w-full rounded-xl border border-border px-4 py-3 shadow-lg bg-card/95 backdrop-blur ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-foreground">{i18n.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{i18n.body}</p>
          <div className="mt-3 flex gap-2">
            <button 
              onClick={onEnable} 
              className="rounded-lg px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all shadow-md"
              aria-label={i18n.cta}
            >
              {i18n.cta}
            </button>
            {onDismiss && (
              <button 
                onClick={onDismiss} 
                className="rounded-lg px-3 py-1.5 text-sm border border-border text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all"
                aria-label={i18n.dismiss}
              >
                {i18n.dismiss}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

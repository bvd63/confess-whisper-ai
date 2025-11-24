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
    <div role="region" aria-label="Notifications banner" className={`w-full rounded-xl border px-4 py-3 shadow-sm bg-gray-900/70 text-white backdrop-blur ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{i18n.title}</h4>
          <p className="text-xs opacity-90 mt-1">{i18n.body}</p>
          <div className="mt-3 flex gap-2">
            <button 
              onClick={onEnable} 
              className="rounded-lg px-3 py-1.5 text-sm font-medium bg-white text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-opacity"
              aria-label={i18n.cta}
            >
              {i18n.cta}
            </button>
            {onDismiss && (
              <button 
                onClick={onDismiss} 
                className="rounded-lg px-3 py-1.5 text-sm border border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
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

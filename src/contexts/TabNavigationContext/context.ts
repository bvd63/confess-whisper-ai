import { createContext } from "react";

type TabId = "home" | "explore" | "messages" | "profile";

interface TabStack {
  path: string;
  state?: unknown;
}

export interface TabNavigationContextValue {
  activeTab: TabId;
  switchTab: (tabId: TabId) => void;
  getTabPath: (tabId: TabId) => string;
  pushToTabStack: (tabId: TabId, path: string, state?: unknown) => void;
  popFromTabStack: (tabId: TabId) => void;
  resetTabStack: (tabId: TabId) => void;
  isInConversation: boolean;
}

export const TabNavigationContext = createContext<TabNavigationContextValue | undefined>(undefined);

export type { TabId, TabStack };

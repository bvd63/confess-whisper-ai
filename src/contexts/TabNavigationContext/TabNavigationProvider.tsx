import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sessionManager } from "@/lib/sessionManager";
import { logDebug, logError, logWarn } from "@/lib/logger";
import { TabNavigationContext, type TabId, type TabStack, type TabNavigationContextValue } from "./context";

const TAB_ROUTES: Record<TabId, string> = {
  home: "/",
  explore: "/explore",
  messages: "/messages",
  profile: "/profile",
};

const LAST_TAB_KEY = "lastActiveTab";
const TAB_STACKS_KEY = "tabNavigationStacks";

const DEFAULT_STACKS: Record<TabId, TabStack[]> = {
  home: [{ path: "/" }],
  explore: [{ path: "/explore" }],
  messages: [{ path: "/messages" }],
  profile: [{ path: "/profile" }],
};

export const TabNavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const lastTab = sessionStorage.getItem(LAST_TAB_KEY);
    return (lastTab as TabId) || "home";
  });

  const [tabStacks, setTabStacks] = useState<Record<TabId, TabStack[]>>(() => {
    try {
      const stored = sessionStorage.getItem(TAB_STACKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<TabId, TabStack[]>>;
        return (["home", "explore", "messages", "profile"] as TabId[]).reduce((acc, tab) => {
          const stack = Array.isArray(parsed[tab]) && parsed[tab]!.length > 0 ? parsed[tab]! : DEFAULT_STACKS[tab];
          const last = stack[stack.length - 1];
          if ((tab !== "messages" && last?.path?.startsWith("/messages")) || last?.path?.startsWith("/compose")) {
            acc[tab] = DEFAULT_STACKS[tab];
          } else {
            acc[tab] = stack;
          }
          return acc;
        }, {} as Record<TabId, TabStack[]>);
      }
    } catch (error) {
      logError("Failed to parse tab stacks", error instanceof Error ? error : undefined);
    }

    return DEFAULT_STACKS;
  });

  const isInConversation = location.pathname === "/messages" && location.search.includes("user=");

  useEffect(() => {
    sessionStorage.setItem(TAB_STACKS_KEY, JSON.stringify(tabStacks));
  }, [tabStacks]);

  useEffect(() => {
    sessionStorage.setItem(LAST_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const path = location.pathname;
    let newTab: TabId | null = null;

    if (path === "/" || path.startsWith("/community/") || path.startsWith("/nearby")) {
      newTab = "home";
    } else if (path.startsWith("/explore") || path.startsWith("/search-users")) {
      newTab = "explore";
    } else if (path.startsWith("/messages")) {
      newTab = "messages";
    } else if (
      path.startsWith("/profile") ||
      path.startsWith("/bookmarks") ||
      path.startsWith("/following") ||
      path.startsWith("/u/") ||
      path.startsWith("/user/")
    ) {
      newTab = "profile";
    }

    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [activeTab, location.pathname]);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const lastTab = sessionStorage.getItem(LAST_TAB_KEY) as TabId | null;
      const hasStacks = sessionStorage.getItem(TAB_STACKS_KEY);
      if (lastTab && hasStacks && location.pathname === TAB_ROUTES.home) {
        const targetStack = tabStacks[lastTab];
        const lastEntry = targetStack[targetStack.length - 1];
        if (lastEntry && lastEntry.path !== location.pathname + location.search) {
          if (lastEntry.path.startsWith("/messages")) {
            setActiveTab("messages");
            return;
          }
          navigate(lastEntry.path, { replace: true, state: lastEntry.state });
          setActiveTab(lastTab);
        }
      }
    } catch (error) {
      logWarn("Tab restore skipped", { error });
    }
  }, [location.pathname, location.search, navigate, tabStacks]);

  const switchTab = useCallback(
    (tabId: TabId) => {
      logDebug("[TabNav] switchTab called", {
        from: activeTab,
        to: tabId,
        isInConversation,
        currentPath: location.pathname,
        currentSearch: location.search,
      });

      if (tabId === "messages" && isInConversation) {
        setTabStacks((prev) => ({ ...prev, messages: [{ path: "/messages" }] }));
        sessionManager.saveSessionState("/messages", null);
        navigate("/messages", { replace: true });
        setActiveTab("messages");
        return;
      }

      if (activeTab === "messages" && tabId !== "messages" && isInConversation) {
        setTabStacks((prev) => ({ ...prev, messages: [{ path: "/messages" }] }));
        sessionManager.saveSessionState("/messages", null);
      }

      const targetStack = tabStacks[tabId];
      const targetPath = targetStack[targetStack.length - 1];

      if (tabId !== "messages" && targetPath?.path?.startsWith("/messages")) {
        setTabStacks((prev) => ({ ...prev, [tabId]: [{ path: TAB_ROUTES[tabId] }] }));
        navigate(TAB_ROUTES[tabId], { replace: true });
        setActiveTab(tabId);
        return;
      }

      navigate(targetPath.path, { replace: true, state: targetPath.state });
      setActiveTab(tabId);
    },
    [activeTab, isInConversation, tabStacks, navigate, location],
  );

  const getTabPath = useCallback(
    (tabId: TabId): string => {
      const stack = tabStacks[tabId];
      return stack[stack.length - 1]?.path || TAB_ROUTES[tabId];
    },
    [tabStacks],
  );

  const pushToTabStack = useCallback((tabId: TabId, path: string, state?: unknown) => {
    setTabStacks((prev) => ({
      ...prev,
      [tabId]: [...prev[tabId], { path, state }],
    }));
  }, []);

  const popFromTabStack = useCallback((tabId: TabId) => {
    setTabStacks((prev) => {
      const currentStack = prev[tabId];
      if (currentStack.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [tabId]: currentStack.slice(0, -1),
      };
    });
  }, []);

  const resetTabStack = useCallback((tabId: TabId) => {
    setTabStacks((prev) => ({
      ...prev,
      [tabId]: [{ path: TAB_ROUTES[tabId] }],
    }));
  }, []);

  const value: TabNavigationContextValue = {
    activeTab,
    switchTab,
    getTabPath,
    pushToTabStack,
    popFromTabStack,
    resetTabStack,
    isInConversation,
  };

  return <TabNavigationContext.Provider value={value}>{children}</TabNavigationContext.Provider>;
};

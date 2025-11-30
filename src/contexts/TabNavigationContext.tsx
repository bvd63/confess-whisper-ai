import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sessionManager } from '@/lib/sessionManager';
import { logDebug, logError, logWarn } from '@/lib/logger';

type TabId = 'home' | 'explore' | 'messages' | 'profile';

interface TabStack {
  path: string;
  state?: any;
}

interface TabNavigationContextType {
  activeTab: TabId;
  switchTab: (tabId: TabId) => void;
  getTabPath: (tabId: TabId) => string;
  pushToTabStack: (tabId: TabId, path: string, state?: any) => void;
  popFromTabStack: (tabId: TabId) => void;
  resetTabStack: (tabId: TabId) => void;
  isInConversation: boolean;
}

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

// Map tab IDs to their root paths
const TAB_ROUTES: Record<TabId, string> = {
  home: '/',
  explore: '/explore',
  messages: '/messages',
  profile: '/profile',
};

// Store last active tab in sessionStorage for app resume
const LAST_TAB_KEY = 'lastActiveTab';
const TAB_STACKS_KEY = 'tabNavigationStacks';

export const TabNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize from sessionStorage or default to home
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const lastTab = sessionStorage.getItem(LAST_TAB_KEY);
    return (lastTab as TabId) || 'home';
  });

  // Track navigation stacks per tab
  const [tabStacks, setTabStacks] = useState<Record<TabId, TabStack[]>>(() => {
    const defaults: Record<TabId, TabStack[]> = {
      home: [{ path: '/' }],
      explore: [{ path: '/explore' }],
      messages: [{ path: '/messages' }],
      profile: [{ path: '/profile' }],
    };

    try {
      const stored = sessionStorage.getItem(TAB_STACKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<TabId, TabStack[]>>;
        // Sanitize: ensure each tab has its own stack and never points to /messages unless it's the messages tab
        const sanitized = (['home','explore','messages','profile'] as TabId[]).reduce((acc, tab) => {
          const stack = Array.isArray(parsed[tab]) && parsed[tab]!.length > 0 ? parsed[tab]! : defaults[tab];
          const last = stack[stack.length - 1];
          if (
            (tab !== 'messages' && last?.path?.startsWith('/messages')) ||
            last?.path?.startsWith('/compose')
          ) {
            acc[tab] = defaults[tab];
          } else {
            acc[tab] = stack;
          }
          return acc;
        }, {} as Record<TabId, TabStack[]>);
        return sanitized;
      }
    } catch (e) {
      logError('Failed to parse tab stacks', e as Error);
    }

    return defaults;
  });

  // Check if currently in a conversation
  const isInConversation = location.pathname === '/messages' && location.search.includes('user=');

  // Persist tab stacks to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(TAB_STACKS_KEY, JSON.stringify(tabStacks));
  }, [tabStacks]);

  // Persist active tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(LAST_TAB_KEY, activeTab);
  }, [activeTab]);

  // Determine active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    let newTab: TabId | null = null;

    if (path === '/' || path.startsWith('/nearby')) {
      newTab = 'home';
    } else if (path.startsWith('/explore') || path.startsWith('/search-users')) {
      newTab = 'explore';
    } else if (path.startsWith('/messages')) {
      newTab = 'messages';
    } else if (path.startsWith('/profile') || path.startsWith('/bookmarks') || path.startsWith('/following') || path.startsWith('/u/') || path.startsWith('/user/')) {
      newTab = 'profile';
    }

    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname]);

  // Restore last active tab and its last path on resume (sessionStorage present)
  const restoredRef = React.useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const lastTab = sessionStorage.getItem(LAST_TAB_KEY) as TabId | null;
      const hasStacks = sessionStorage.getItem(TAB_STACKS_KEY);
      // If resuming (sessionStorage present) and currently at home root, navigate to last tab path
      if (lastTab && hasStacks && location.pathname === TAB_ROUTES.home) {
        const targetStack = tabStacks[lastTab];
        const lastEntry = targetStack[targetStack.length - 1];
        if (lastEntry && (lastEntry.path !== location.pathname + location.search)) {
          // Do NOT auto-redirect into Messages; just set active tab to keep user control
          if (lastEntry.path.startsWith('/messages')) {
            setActiveTab('messages');
            return;
          }
          navigate(lastEntry.path, { replace: true, state: lastEntry.state });
          setActiveTab(lastTab);
        }
      }
    } catch (e) {
      logWarn('Tab restore skipped', { error: e });
    }
  }, []);

  const switchTab = useCallback((tabId: TabId) => {
    logDebug('[TabNav] switchTab called', { 
      from: activeTab, 
      to: tabId, 
      isInConversation,
      currentPath: location.pathname,
      currentSearch: location.search
    });

    // If tapping Messages while inside a conversation, reset to list
    if (tabId === 'messages' && isInConversation) {
      setTabStacks(prev => ({ ...prev, messages: [{ path: '/messages' }] }));
      sessionManager.saveSessionState('/messages', null);
      navigate('/messages', { replace: true });
      setActiveTab('messages');
      return;
    }

    // If leaving Messages while in a conversation, reset Messages stack and clear persisted convo
    if (activeTab === 'messages' && tabId !== 'messages' && isInConversation) {
      setTabStacks(prev => ({ ...prev, messages: [{ path: '/messages' }] }));
      sessionManager.saveSessionState('/messages', null);
    }

    // Get target path and navigate
    const targetStack = tabStacks[tabId];
    const targetPath = targetStack[targetStack.length - 1];

    // Guard: if a non-messages tab accidentally points to /messages, reset it to its root
    if (tabId !== 'messages' && targetPath?.path?.startsWith('/messages')) {
      setTabStacks(prev => ({ ...prev, [tabId]: [{ path: TAB_ROUTES[tabId] }] }));
      navigate(TAB_ROUTES[tabId], { replace: true });
      setActiveTab(tabId);
      return;
    }
    
    // Use replace instead of push to avoid history issues between tabs
    navigate(targetPath.path, { replace: true, state: targetPath.state });
    setActiveTab(tabId);
  }, [activeTab, isInConversation, tabStacks, navigate, location]);

  const getTabPath = useCallback((tabId: TabId): string => {
    const stack = tabStacks[tabId];
    return stack[stack.length - 1]?.path || TAB_ROUTES[tabId];
  }, [tabStacks]);

  const pushToTabStack = useCallback((tabId: TabId, path: string, state?: any) => {
    setTabStacks(prev => ({
      ...prev,
      [tabId]: [...prev[tabId], { path, state }],
    }));
  }, []);

  const popFromTabStack = useCallback((tabId: TabId) => {
    setTabStacks(prev => {
      const currentStack = prev[tabId];
      if (currentStack.length <= 1) {
        // Already at root, don't pop
        return prev;
      }
      return {
        ...prev,
        [tabId]: currentStack.slice(0, -1),
      };
    });
  }, []);

  const resetTabStack = useCallback((tabId: TabId) => {
    setTabStacks(prev => ({
      ...prev,
      [tabId]: [{ path: TAB_ROUTES[tabId] }],
    }));
  }, []);

  const value: TabNavigationContextType = {
    activeTab,
    switchTab,
    getTabPath,
    pushToTabStack,
    popFromTabStack,
    resetTabStack,
    isInConversation,
  };

  return (
    <TabNavigationContext.Provider value={value}>
      {children}
    </TabNavigationContext.Provider>
  );
};

export const useTabNavigation = () => {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error('useTabNavigation must be used within TabNavigationProvider');
  }
  return context;
};

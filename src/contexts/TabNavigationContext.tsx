import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
    try {
      const stored = sessionStorage.getItem(TAB_STACKS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse tab stacks:', e);
    }
    
    // Default: each tab has its root path
    return {
      home: [{ path: '/' }],
      explore: [{ path: '/explore' }],
      messages: [{ path: '/messages' }],
      profile: [{ path: '/profile' }],
    };
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

    if (path === '/' || path.startsWith('/compose') || path.startsWith('/community/') || path.startsWith('/nearby')) {
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

  const switchTab = useCallback((tabId: TabId) => {
    // If switching away from messages while in a conversation, reset messages stack
    if (activeTab === 'messages' && tabId !== 'messages' && isInConversation) {
      setTabStacks(prev => ({
        ...prev,
        messages: [{ path: '/messages' }],
      }));
    }

    // Navigate to the last path in the target tab's stack
    const targetStack = tabStacks[tabId];
    const targetPath = targetStack[targetStack.length - 1];
    
    navigate(targetPath.path, { state: targetPath.state });
    setActiveTab(tabId);
  }, [activeTab, isInConversation, tabStacks, navigate]);

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

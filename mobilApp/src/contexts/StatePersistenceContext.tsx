import React, { createContext, useContext, useEffect } from 'react';
import { useStatePersistence, usePageVisibility, useBeforeUnload } from '../hooks/useStatePersistence';

interface AppStatePersistence {
  activeTab: string;
  searchQuery: string;
  cartItems: any[];
  selectedProduct: any;
  selectedBlogPost: any;
  isSidebarOpen: boolean;
}

interface StatePersistenceContextType {
  state: AppStatePersistence;
  restoreState: (key: keyof AppStatePersistence, defaultValue: any) => any;
  saveState: (key: keyof AppStatePersistence, value: any) => void;
  clearAllState: () => void;
  isPageVisible: boolean;
}

const StatePersistenceContext = createContext<StatePersistenceContextType | undefined>(undefined);

export const useStatePersistenceContext = () => {
  const context = useContext(StatePersistenceContext);
  if (!context) {
    throw new Error('useStatePersistenceContext must be used within a StatePersistenceProvider');
  }
  return context;
};

interface StatePersistenceProviderProps {
  children: React.ReactNode;
}

export const StatePersistenceProvider: React.FC<StatePersistenceProviderProps> = ({ children }) => {
  const [state, setState, clearState] = useStatePersistence<AppStatePersistence>({
    key: 'app-state',
    defaultValue: {
      activeTab: 'home',
      searchQuery: '',
      cartItems: [],
      selectedProduct: null,
      selectedBlogPost: null,
      isSidebarOpen: false
    }
  });

  const isPageVisible = usePageVisibility();
  useBeforeUnload();

  // Restore scroll positions when page becomes visible again
  useEffect(() => {
    if (isPageVisible && state.scrollPosition) {
      Object.entries(state.scrollPosition).forEach(([key, position]) => {
        const element = document.getElementById(key) || window;
        if (element === window) {
          window.scrollTo(0, position);
        } else {
          element.scrollTop = position;
        }
      });
    }
  }, [isPageVisible, state.scrollPosition]);

  // Save scroll position when page becomes hidden
  useEffect(() => {
    if (!isPageVisible) {
      // Save current state when page becomes hidden
      // Scroll position is handled by browser automatically
    }
  }, [isPageVisible]);

  const restoreState = (key: keyof AppStatePersistence, defaultValue: any) => {
    return state[key] !== undefined ? state[key] : defaultValue;
  };

  const saveState = (key: keyof AppStatePersistence, value: any) => {
    setState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllState = () => {
    clearState();
  };

  return (
    <StatePersistenceContext.Provider
      value={{
        state,
        restoreState,
        saveState,
        clearAllState,
        isPageVisible
      }}
    >
      {children}
    </StatePersistenceContext.Provider>
  );
};
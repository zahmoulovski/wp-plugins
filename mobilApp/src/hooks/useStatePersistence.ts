import { useState, useEffect, useCallback } from 'react';

interface StatePersistenceOptions<T> {
  key: string;
  defaultValue: T;
  debounceMs?: number;
}

export function useStatePersistence<T>({
  key,
  defaultValue,
  debounceMs = 1000
}: StatePersistenceOptions<T>) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Error reading state from sessionStorage: ${key}`, error);
    }
    return defaultValue;
  });

  const persistState = useCallback(
    (newState: T) => {
      try {
        sessionStorage.setItem(key, JSON.stringify(newState));
      } catch (error) {
        console.warn(`Error writing state to sessionStorage: ${key}`, error);
      }
    },
    [key]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      persistState(state);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [state, persistState, debounceMs]);

  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      setState(defaultValue);
    } catch (error) {
      console.warn(`Error clearing state from sessionStorage: ${key}`, error);
    }
  }, [key, defaultValue]);

  return [state, setState, clearState] as const;
}

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

export function useBeforeUnload() {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only prevent unload if there's unsaved data that needs confirmation
      // For now, let the browser handle navigation normally
      // This prevents the annoying refresh alert
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
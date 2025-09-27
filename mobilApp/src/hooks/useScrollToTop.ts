import { useEffect } from 'react';

/**
 * Custom hook that automatically scrolls to top when the component mounts or dependencies change
 * @param dependencies - Optional array of dependencies to trigger scroll on change
 * @param behavior - Scroll behavior ('auto' | 'smooth')
 */
export const useScrollToTop = (dependencies: any[] = [], behavior: 'auto' | 'smooth' = 'auto') => {
  useEffect(() => {
    window.scrollTo({ 
      top: 0, 
      behavior: behavior 
    });
  }, dependencies);
};

export default useScrollToTop;
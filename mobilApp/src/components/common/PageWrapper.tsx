import React from 'react';
import { PullToRefresh } from './PullToRefresh';
import { useApp } from '../../contexts/AppContext';

interface PageWrapperProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  onRefresh,
  className = '' 
}) => {
  const { dispatch } = useApp();

  const handleRefresh = async () => {
    try {
      // Reload current page data
      if (onRefresh) {
        await onRefresh();
      } else {
        // Default refresh - reload window
        window.location.reload();
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      className={className}
      threshold={80}
      maxPull={120}
    >
      {children}
    </PullToRefresh>
  );
};

export default PageWrapper;
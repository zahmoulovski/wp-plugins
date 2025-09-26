import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>; // Kept for compatibility but not used
  className?: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  onRefresh,
  className = '' 
}) => {
  // Simple wrapper component - pull-to-refresh functionality removed
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default PageWrapper;
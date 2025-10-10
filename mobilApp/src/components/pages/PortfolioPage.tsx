import React, { useState, useEffect } from 'react';
import Portfolio from '../common/Portfolio';
import PortfolioSkeleton from '../common/PortfolioSkeleton';
import { useScrollToTop } from '../../hooks/useScrollToTop';

const PortfolioPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Scroll to top when page loads
  useScrollToTop();

  // Fallback timeout to ensure skeleton doesn't stay forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 8000); // 8 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handlePortfolioLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 mb-20">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Portfolio
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Découvrez notre expertise à travers nos projets récents. 
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading && <PortfolioSkeleton />}
        <div style={{ display: isLoading ? 'none' : 'block' }}>
          <Portfolio onLoad={handlePortfolioLoad} />
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
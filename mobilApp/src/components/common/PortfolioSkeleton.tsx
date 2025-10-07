import React from 'react';

const PortfolioSkeleton: React.FC = () => {
  return (
    <div className="portfolio-skeleton">
      {/* Category Filter Skeleton */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
          />
        ))}
      </div>
      
      {/* Portfolio Grid Skeleton */}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div 
            key={i} 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden break-inside-avoid mb-6 animate-pulse"
          >
            {/* Image Skeleton */}
            <div className="h-48 bg-gray-200 dark:bg-gray-700" />
            
            {/* Content Skeleton */}
            <div className="p-6">
              {/* Title */}
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4" />
              
              {/* Description */}
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
              </div>
              
              {/* Meta Info */}
              <div className="flex items-center gap-4 mb-4">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              
              {/* Button */}
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioSkeleton;
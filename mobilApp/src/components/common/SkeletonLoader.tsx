import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  width?: string;
  height?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function SkeletonLoader({ 
  className = '', 
  width, 
  height, 
  variant = 'rectangular',
  animation = 'pulse'
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-bounce',
    none: ''
  };
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  };

  const style = {
    width: width || '100%',
    height: height || 'auto'
  };

  return (
    <div 
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Image skeleton */}
      <div className="relative">
        <SkeletonLoader height="200px" />
        <div className="absolute top-2 left-2">
          <SkeletonLoader width="40px" height="20px" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-4">
        {/* Title skeleton */}
        <SkeletonLoader height="20px" className="mb-2" />
        
        {/* SKU skeleton */}
        <SkeletonLoader width="80px" height="16px" className="mb-4" />
        
        {/* Price and button skeleton */}
        <div className="flex items-center justify-between">
          <SkeletonLoader width="60px" height="20px" />
          <SkeletonLoader width="32px" height="32px" variant="circular" />
        </div>
      </div>
    </div>
  );
}

// Horizontal Product Card Skeleton
export function HorizontalProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="flex h-full">
        {/* Image skeleton - left side */}
        <div className="relative w-32 flex-shrink-0 aspect-square overflow-hidden rounded-l-2xl">
          <SkeletonLoader height="100%" />
        </div>
        
        {/* Content skeleton - right side */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex-1">
            {/* Title skeleton */}
            <SkeletonLoader height="20px" className="mb-2" />
            
            {/* SKU skeleton */}
            <SkeletonLoader width="80px" height="16px" className="mb-2" />
            
            {/* Price skeleton */}
            <SkeletonLoader width="60px" height="18px" />
          </div>
          
          {/* Button skeleton */}
          <div className="flex items-center justify-end">
            <SkeletonLoader width="32px" height="32px" variant="circular" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Blog Post Card Skeleton
export function BlogPostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Image skeleton */}
      <SkeletonLoader height="180px" />
      
      {/* Content skeleton */}
      <div className="p-4">
        {/* Title skeleton */}
        <SkeletonLoader height="24px" className="mb-2" />
        
        {/* Date skeleton */}
        <SkeletonLoader width="100px" height="16px" className="mb-3" />
        
        {/* Excerpt skeleton */}
        <SkeletonLoader height="16px" className="mb-1" />
        <SkeletonLoader height="16px" className="mb-1" />
        <SkeletonLoader width="60%" height="16px" />
      </div>
    </div>
  );
}

// Category Card Skeleton
export function CategoryCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Image skeleton */}
        <SkeletonLoader width="48px" height="48px" variant="circular" />
        
        {/* Content skeleton */}
        <div className="flex-1">
          <SkeletonLoader height="20px" className="mb-1" />
          <SkeletonLoader width="80px" height="16px" />
        </div>
        
        {/* Arrow skeleton */}
        <SkeletonLoader width="20px" height="20px" />
      </div>
    </div>
  );
}

// Image Skeleton
export function ImageSkeleton({ width = '100%', height = '200px' }: { width?: string; height?: string }) {
  return (
    <SkeletonLoader 
      width={width} 
      height={height} 
      variant="rectangular" 
    />
  );
}

// Text Skeleton
export function TextSkeleton({ 
  lines = 1, 
  width = '100%', 
  height = '16px',
  spacing = '4px'
}: { 
  lines?: number; 
  width?: string | string[]; 
  height?: string;
  spacing?: string;
}) {
  return (
    <div>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLoader 
          key={i}
          width={Array.isArray(width) ? width[i] || width[width.length - 1] : width}
          height={height}
          className={i < lines - 1 ? `mb-[${spacing}]` : ''}
        />
      ))}
    </div>
  );
}

// Avatar Skeleton
export function AvatarSkeleton({ size = '40px' }: { size?: string }) {
  return (
    <SkeletonLoader 
      width={size} 
      height={size} 
      variant="circular" 
    />
  );
}

// Button Skeleton
export function ButtonSkeleton({ width = '80px', height = '36px' }: { width?: string; height?: string }) {
  return (
    <SkeletonLoader 
      width={width} 
      height={height} 
      variant="rectangular" 
    />
  );
}

// Loading Grid for Products
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Loading Grid for Horizontal Products
export function HorizontalProductGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <HorizontalProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Loading List for Categories
export function CategoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Loading Grid for Blog Posts
export function BlogPostGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <BlogPostCardSkeleton key={i} />
      ))}
    </div>
  );
}
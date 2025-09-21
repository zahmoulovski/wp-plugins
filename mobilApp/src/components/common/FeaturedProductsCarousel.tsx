import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { HorizontalProductCard } from '../common/HorizontalProductCard';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';

interface FeaturedProductsCarouselProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function FeaturedProductsCarousel({ products, onProductClick }: FeaturedProductsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(2);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  // Auto-play functionality with loop and hover pause
  useEffect(() => {
    const startAutoPlay = () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
      
      if (products.length > itemsPerView && !isHovered) {
        autoPlayInterval.current = setInterval(() => {
          setCurrentIndex(prev => {
            const maxIndex = Math.max(0, products.length - itemsPerView);
            return prev >= maxIndex ? 0 : prev + 1;
          });
        }, 3000); // 3 seconds for better user experience
      }
    };

    startAutoPlay();

    return () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
    };
  }, [products.length, itemsPerView, isHovered]);

  const resetAutoPlay = () => {
    if (autoPlayInterval.current) {
      clearInterval(autoPlayInterval.current);
    }
    
    if (products.length > itemsPerView && !isHovered) {
      autoPlayInterval.current = setInterval(() => {
        setCurrentIndex(prev => {
          const maxIndex = Math.max(0, products.length - itemsPerView);
          return prev >= maxIndex ? 0 : prev + 1;
        });
      }, 3000);
    }
  };

  const maxIndex = Math.max(0, products.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex(prev => {
      const maxIndex = Math.max(0, products.length - itemsPerView);
      return prev >= maxIndex ? 0 : prev + 1;
    });
    resetAutoPlay();
  };

  const prevSlide = () => {
    setCurrentIndex(prev => {
      const maxIndex = Math.max(0, products.length - itemsPerView);
      return prev <= 0 ? maxIndex : prev - 1;
    });
    resetAutoPlay();
  };

  const getVisibleProducts = () => {
    return products.slice(currentIndex, currentIndex + itemsPerView);
  };

  if (products.length === 0) return null;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Buttons */}
      {products.length > itemsPerView && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </>
      )}

      {/* Products Container */}
      <div 
        ref={containerRef}
        className="overflow-hidden mx-20 px-0"
      >
        <div 
          className="flex transition-transform duration-300 ease-in-out gap-0"
          style={{ 
            transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0"
              style={{ width: `${100 / itemsPerView}%` }}
            >
              <div className="h-full px-2">
                <HorizontalProductCard 
                  product={product} 
                  onProductClick={onProductClick}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {products.length > itemsPerView && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: products.length }, (_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                resetAutoPlay();
              }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                currentIndex === index
                  ? 'bg-primary-600 dark:bg-primary-400'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
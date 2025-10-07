import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import verrerieBanner from '../assets/banners/verrerie-banner.webp';
import anatomieBanner from '../assets/banners/anatomie-banner.webp';
import agitateursBanner from '../assets/banners/agitateurs-banner.webp';
import electricityBanner from '../assets/banners/electricity-banner.webp';

interface Banner {
  id: number;
  image: string;
  title: string;
  categoryId: number;
}

const banners: Banner[] = [
  {
    id: 1,
    image: verrerieBanner,
    title: 'Verrerie de laboratoire',
    categoryId: 474
  },
  {
    id: 2,
    image: anatomieBanner,
    title: 'Modèles anatomiques',
    categoryId: 468
  },
  {
    id: 3,
    image: agitateursBanner,
    title: 'Agitateurs',
    categoryId: 537
  },
  {
    id: 4,
    image: electricityBanner,
    title: 'Électricité & Électronique',
    categoryId: 1151
  }
];

export function BannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const mouseStartX = useRef<number>(0);
  const mouseEndX = useRef<number>(0);

  // Auto-play functionality
  useEffect(() => {
    const startAutoplay = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
      
      autoplayRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % banners.length);
      }, 5000); // 5 seconds for banner rotation
    };

    startAutoplay();

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, []);

  const resetAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
    
    autoplayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
  };

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
    resetAutoplay();
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
    resetAutoplay();
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingRef.current) {
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    setIsDragging(false);
    const swipeThreshold = 50;
    const swipeDistance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  // Mouse drag event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      mouseEndX.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    setIsDragging(false);
    const swipeThreshold = 50;
    const swipeDistance = mouseStartX.current - mouseEndX.current;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  // Calculate transform for smooth animation
  const getTransform = () => {
    if (isDragging) {
      return `translateX(${dragOffset}px)`;
    }
    return 'translateX(0)';
  };

  return (
    <div className="relative w-full mb-8 select-none">
      {/* Main slider container */}
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        <div 
          className="flex transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {banners.map((banner) => (
            <div key={banner.id} className="w-full flex-shrink-0">
              <Link to={`/categories/${banner.categoryId}`} className="block">
                <div className="relative overflow-hidden">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiPkJhbm5lciBub24gZGlzcG9uaWJsZTwvdGV4dD4KPC9zdmc+Cg==';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
                    <div className="px-6 md:px-8">
                      <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
                        {banner.title}
                      </h3>
                      <Link 
                        to={`/categories/${banner.categoryId}`}
                        className="text-white text-sm font-medium hover:text-gray-200 transition-colors duration-200 underline"
                      >
                        Voir plus
                      </Link>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>


      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              resetAutoplay();
            }}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-primary-600 dark:bg-primary-400' 
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
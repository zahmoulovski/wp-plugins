import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  refreshTimeout?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  refreshTimeout = 3000,
  className = ''
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const animationFrameRef = useRef<number>();

  const resetPull = useCallback(() => {
    setIsPulling(false);
    setPullDistance(0);
    setIsDragging(false);
    setVelocity(0);
    setStartY(0);
    lastYRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing || isPulling) return;
    
    const touch = e.touches[0];
    // Check multiple scroll positions for better compatibility
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Only start pull if we're at the top of the page
    if (scrollTop <= 5) { // Allow small tolerance
      setStartY(touch.clientY);
      lastYRef.current = touch.clientY;
      lastTimeRef.current = Date.now();
      setIsDragging(true);
      setVelocity(0);
      console.log('Pull-to-refresh started at position:', touch.clientY);
    }
  }, [isRefreshing, isPulling]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || isRefreshing) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentTime = Date.now();
    const deltaY = currentY - startY;
    const deltaTime = currentTime - lastTimeRef.current;
    
    // Calculate velocity for gesture cancellation
    if (deltaTime > 0) {
      const currentVelocity = (currentY - lastYRef.current) / deltaTime;
      setVelocity(currentVelocity);
    }
    
    // Only pull down, not up
    if (deltaY > 5) { // Add minimum threshold
      e.preventDefault();
      
      // Apply resistance - the further you pull, the more resistance
      const resistance = 1 - (deltaY / maxPull) * 0.5;
      const adjustedDistance = Math.min(deltaY * resistance, maxPull);
      
      setPullDistance(adjustedDistance);
      setIsPulling(true);
      
      // Add smooth animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transform = `translateY(${adjustedDistance}px)`;
          console.log('Applied transform:', `translateY(${adjustedDistance}px)`);
        }
      });
    } else if (deltaY < -10) {
      // User is pulling up - cancel the gesture
      console.log('Pull up detected, canceling gesture');
      resetPull();
    }
    
    lastYRef.current = currentY;
    lastTimeRef.current = currentTime;
  }, [isDragging, startY, maxPull, isRefreshing, resetPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging || isRefreshing) return;
    
    setIsDragging(false);
    console.log('Touch end detected, pullDistance:', pullDistance, 'threshold:', threshold, 'velocity:', velocity);
    
    // Check if pull distance exceeds threshold and velocity is positive (pulling down)
    if (pullDistance >= threshold && velocity >= -0.5) {
      console.log('Refresh conditions met, starting refresh...');
      setIsRefreshing(true);
      
      // Animate to refresh position
      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(${threshold}px)`;
        containerRef.current.style.transition = 'transform 0.2s ease-out';
      }
      
      try {
        // Call the refresh function with timeout
        const refreshPromise = onRefresh();
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Refresh timeout')), refreshTimeout);
        });
        
        await Promise.race([refreshPromise, timeoutPromise]);
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        // Reset after refresh
        setTimeout(() => {
          setIsRefreshing(false);
          resetPull();
          if (containerRef.current) {
            containerRef.current.style.transition = 'transform 0.3s ease-out';
            containerRef.current.style.transform = 'translateY(0px)';
            
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.style.transition = '';
              }
            }, 300);
          }
        }, 500);
      }
    } else {
      // Animate back to original position
      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 0.3s ease-out';
        containerRef.current.style.transform = 'translateY(0px)';
        
        setTimeout(() => {
          resetPull();
          if (containerRef.current) {
            containerRef.current.style.transition = '';
          }
        }, 300);
      }
    }
  }, [isDragging, pullDistance, threshold, velocity, onRefresh, refreshTimeout, isRefreshing, resetPull]);

  useEffect(() => {
    // Use document-level event listeners for better reliability
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getRefreshIconRotation = () => {
    if (!isPulling) return 0;
    return Math.min((pullDistance / threshold) * 360, 360);
  };

  const getRefreshIconScale = () => {
    return Math.min(pullDistance / threshold, 1);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
        style={{
          transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
          opacity: isPulling ? Math.min(pullDistance / threshold, 1) : 0,
          transition: 'opacity 0.2s ease-out'
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg border border-gray-200 dark:border-gray-700">
          {isRefreshing ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          ) : (
            <svg 
              className="w-6 h-6 text-primary-600 transition-transform duration-200"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{
                transform: `rotate(${getRefreshIconRotation()}deg) scale(${getRefreshIconScale()})`
              }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content container */}
      <div 
        ref={containerRef}
        className="min-h-screen"
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
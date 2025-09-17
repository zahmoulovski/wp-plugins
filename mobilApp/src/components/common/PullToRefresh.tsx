import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, X, RotateCcw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullDistance?: number;
  triggerDistance?: number;
  maxPullDistance?: number;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'canceling';

export function PullToRefresh({ 
  onRefresh, 
  children, 
  pullDistance = 120,
  triggerDistance = 80,
  maxPullDistance = 120
}: PullToRefreshProps) {
  const [state, setState] = useState<RefreshState>('idle');
  const [currentPull, setCurrentPull] = useState(0);
  const [startY, setStartY] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const getIconComponent = () => {
    const iconProps = {
      className: "transition-all duration-300",
      size: Math.min(24 + (currentPull / triggerDistance) * 8, 32),
      style: {
        transform: state === 'pulling' ? `rotate(${currentPull * 1.5}deg)` : 
                  state === 'ready' ? 'rotate(180deg)' :
                  state === 'refreshing' ? 'rotate(720deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s ease-out'
      }
    };

    switch (state) {
      case 'pulling':
        return <ChevronDown {...iconProps} />;
      case 'ready':
        return <RotateCcw {...iconProps} />;
      case 'refreshing':
        return <RefreshCw {...iconProps} className={`${iconProps.className} animate-spin`} />;
      case 'canceling':
        return <X {...iconProps} />;
      default:
        return <RefreshCw {...iconProps} />;
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'pulling':
        return 'Tirez pour rafraîchir';
      case 'ready':
        return 'Relâchez pour rafraîchir';
      case 'refreshing':
        return 'Chargement...';
      case 'canceling':
        return 'Annulation...';
      default:
        return '';
    }
  };

  const animateToPosition = useCallback((targetPosition: number, duration: number = 300) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startPosition = currentPull;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const newPosition = startPosition + (targetPosition - startPosition) * easeOut;
      setCurrentPull(newPosition);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [currentPull]);

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY <= 5 && !isDragging) {
      setStartY(e.touches[0].clientY);
      setLastY(e.touches[0].clientY);
      setIsDragging(true);
      setState('pulling');
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || startY === 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    const movingUp = currentY < lastY;

    // Allow canceling by pulling back up
    if (movingUp && currentPull > 0) {
      const newPull = Math.max(0, currentPull - (lastY - currentY));
      setCurrentPull(newPull);
      
      if (newPull < triggerDistance / 2) {
        setState('canceling');
      }
    } else if (deltaY > 0 && window.scrollY <= 5) {
      // Pulling down
      e.preventDefault();
      const resistance = 1 - (currentPull / maxPullDistance) * 0.7;
      const newPull = Math.min(deltaY * resistance, maxPullDistance);
      setCurrentPull(newPull);

      if (newPull >= triggerDistance) {
        setState('ready');
      } else {
        setState('pulling');
      }
    }

    setLastY(currentY);
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;

    setIsDragging(false);

    if (state === 'ready' && currentPull >= triggerDistance) {
      setState('refreshing');
      animateToPosition(triggerDistance, 200);
      
      try {
        await onRefresh();
      } finally {
        setState('idle');
        animateToPosition(0, 400);
      }
    } else {
      // Cancel or not enough pull
      setState('canceling');
      animateToPosition(0, 300);
      setTimeout(() => setState('idle'), 300);
    }

    setStartY(0);
    setLastY(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, startY, currentPull, state]);

  const getRefreshContainerStyle = () => {
    const opacity = Math.min(currentPull / triggerDistance, 1);
    const scale = 0.8 + (currentPull / triggerDistance) * 0.2;
    
    return {
      height: `${Math.max(currentPull, state === 'refreshing' ? triggerDistance : 0)}px`,
      transform: `translateY(${Math.max(0, triggerDistance - currentPull)}px)`,
      top: `-${triggerDistance}px`,
      opacity: opacity,
      '--pull-progress': `${(currentPull / triggerDistance) * 100}%`
    } as React.CSSProperties;
  };

  const getContentStyle = () => ({
    transform: `translateY(${currentPull}px)`,
    transition: !isDragging && state === 'idle' ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    touchAction: isDragging ? 'none' : 'auto'
  });

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull to Refresh Indicator */}
      {(currentPull > 0 || state !== 'idle') && (
        <div 
          className="fixed top-0 left-0 right-0 flex flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-transparent dark:from-primary-900/30 dark:to-transparent border-b border-primary-200 dark:border-primary-800 transition-all duration-300 ease-out z-[60] pointer-events-none"
          style={getRefreshContainerStyle()}
        >
          <div 
            className="flex flex-col items-center justify-center space-y-2 p-4 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg"
            style={{
              transform: `scale(${0.8 + (currentPull / triggerDistance) * 0.4})`,
              transition: 'transform 0.2s ease-out'
            }}
          >
            <div className="relative">
              {getIconComponent()}
              {state === 'pulling' && (
                <div 
                  className="absolute inset-0 rounded-full border-2 border-primary-500 dark:border-primary-400"
                  style={{
                    clipPath: `inset(0 ${100 - (currentPull / triggerDistance) * 100}% 0 0)`
                  }}
                />
              )}
            </div>
            <span className="text-xs font-medium text-primary-700 dark:text-primary-300 transition-opacity duration-200">
              {getStateText()}
            </span>
          </div>
        </div>
      )}
      
      {/* Content Container */}
      <div style={getContentStyle()}>
        {children}
      </div>
    </div>
  );
}
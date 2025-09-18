import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading, onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setFadeOut(true);
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1000); // 500ms for fade animation
    }
  }, [isLoading, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(-45deg, #145c7d, #4db3d9, #145c7d, #4db3d9)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}
    >
      <style>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      
      {/* Lottie Animation - Centered */}
      <div className="relative w-80 h-80">
        <iframe
          src="https://lottie.host/embed/783527fa-901f-46f1-a847-fd72dc9ad593/XxhRJsGk2P.lottie"
          className="w-full h-full border-0 bg-transparent"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Loading Animation"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
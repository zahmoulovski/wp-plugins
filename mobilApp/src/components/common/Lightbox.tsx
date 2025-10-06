import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'react-bootstrap-icons';

interface LightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  title?: string;
  description?: string;
}

const Lightbox: React.FC<LightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  title,
  description
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentImageIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigatePrevious();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentImageIndex]);

  const navigatePrevious = () => {
    const newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    if (onNavigate) onNavigate(newIndex);
  };

  const navigateNext = () => {
    const newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    if (onNavigate) onNavigate(newIndex);
  };

  const toggleZoom = () => {
    setZoom(zoom === 1 ? 2 : 1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(1, Math.min(4, zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      toggleZoom();
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = images[currentImageIndex];
    link.download = `image-${currentImageIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm">
      {/* Close on backdrop click */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold truncate max-w-md">
            {title || `Image ${currentImageIndex + 1} sur ${images.length}`}
          </h3>
          {description && (
            <p className="text-gray-300 text-sm hidden md:block">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadImage}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            title="Télécharger"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={toggleZoom}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            title="Zoom"
          >
            {zoom > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            title="Fermer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={navigatePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:scale-110"
            title="Image précédente (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={navigateNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:scale-110"
            title="Image suivante (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
          {currentImageIndex + 1} / {images.length}
        </div>
      )}

      {/* Main Image Container */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleImageClick}
      >
        <img
          src={images[currentImageIndex]}
          alt={title || `Image ${currentImageIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-all duration-300 select-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentImageIndex(index);
                setZoom(1);
                setPosition({ x: 0, y: 0 });
                if (onNavigate) onNavigate(index);
              }}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-all duration-200 ${
                index === currentImageIndex
                  ? 'border-white scale-110'
                  : 'border-transparent hover:border-white/50 hover:scale-105'
              }`}
            >
              <img
                src={image}
                alt={`Miniature ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Lightbox;
import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'react-bootstrap-icons';

interface ImageLightboxProps {
  images: Array<{ id: number; src: string; alt: string }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, currentIndex, isOpen, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageIndex, setImageIndex] = useState(currentIndex);

  useEffect(() => {
    setImageIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset zoom and position when opening
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      document.body.style.overflow = 'unset';
      // Reset state when closing
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
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
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      handlePrevious(e as any);
    } else if (e.key === 'ArrowRight') {
      handleNext(e as any);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop (black area), not any child elements
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Stop all propagation to prevent closing parent modals
    e.stopPropagation();
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, imageIndex]);

  if (!isOpen || !images[imageIndex]) return null;

  const currentImage = images[imageIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center"
      onClick={handleBackdropClick}
      onContextMenu={handleContainerClick}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-[110] p-3 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-all duration-200"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious(e);
            }}
            className="absolute left-4 z-[110] p-3 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-all duration-200"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext(e);
            }}
            className="absolute right-4 z-[110] p-3 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-all duration-200"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Zoom controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[110] flex space-x-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          className="p-3 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-all duration-200"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <div className="px-4 py-3 bg-black bg-opacity-50 rounded-full text-white text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          className="p-3 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-all duration-200"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[110] px-4 py-2 bg-black bg-opacity-50 rounded-full text-white text-sm font-medium" onClick={(e) => e.stopPropagation()}>
          {imageIndex + 1} / {images.length}
        </div>
      )}

      {/* Main image container */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking image area
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          draggable={false}
        />
      </div>

      {/* Image thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-[110] flex space-x-2 overflow-x-auto max-w-[80%]" onClick={(e) => e.stopPropagation()}>
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex(index);
                setZoom(1);
                setPosition({ x: 0, y: 0 });
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                imageIndex === index
                  ? 'border-primary-500 ring-2 ring-primary-500'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
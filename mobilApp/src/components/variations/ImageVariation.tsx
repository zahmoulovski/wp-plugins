import React, { useState } from 'react';
import { imageMap } from '../../data/imageMap';

interface ImageVariationProps {
  attribute: any;
  selected: string;
  onSelect: (value: string) => void;
}

export function ImageVariation({ attribute, selected, onSelect }: ImageVariationProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (option: string) => {
    setImageErrors(prev => ({ ...prev, [option]: true }));
  };

  const getImageUrl = (option: string): string => {
    // Try exact match first (case-sensitive)
    if (imageMap[option]) {
      return imageMap[option];
    }
    
    // Try lowercase version
    if (imageMap[option.toLowerCase()]) {
      return imageMap[option.toLowerCase()];
    }
    
    // Try case variations
    const variations = [
      option.toUpperCase(),
      option.charAt(0).toUpperCase() + option.slice(1).toLowerCase(),
      option.replace(/\s+/g, ''), // Remove spaces
      option.replace(/\s+/g, '-'), // Replace spaces with dashes
      option.replace(/\s+/g, '_'), // Replace spaces with underscores
      option.toLowerCase().replace(/\s+/g, ''), // Lowercase + remove spaces
      option.toLowerCase().replace(/\s+/g, '-'), // Lowercase + replace spaces with dashes
      option.toLowerCase().replace(/\s+/g, '_'), // Lowercase + replace spaces with underscores
    ];
    
    for (const variation of variations) {
      if (imageMap[variation]) {
        return imageMap[variation];
      }
    }
    
    return ''; // Return empty string to indicate no image found
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {attribute.name}
      </label>
      <div className="flex flex-wrap gap-2">
        {attribute.options.map((option: string) => {
          const imageUrl = getImageUrl(option);
          const hasError = imageErrors[option];
          const isSelected = selected === option;
          
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`
                relative p-2 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-primary-500 shadow-lg scale-105' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }
                ${!imageUrl ? 'bg-gray-100 dark:bg-gray-800 flex items-center justify-center' : ''}
              `}
              title={option}
            >
              {imageUrl && !hasError ? (
                <img
                  src={imageUrl}
                  alt={option}
                  className="w-16 h-16 object-cover rounded-md"
                  onError={() => handleImageError(option)}
                />
              ) : (
                <div className="text-xs text-gray-700 dark:text-gray-300 text-center px-1 leading-tight">
                  {option}
                </div>
              )}
              <span className="block text-xs text-center mt-1 text-gray-700 dark:text-gray-300">
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
import React from 'react';

interface ColorVariationProps {
  attribute: { name: string; options: string[] };
  selected: string;
  onSelect: (value: string) => void;
  hexMap: Record<string, string>;
}

export function ColorVariation({ attribute, selected, onSelect, hexMap }: ColorVariationProps) {

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-sm mb-2">{attribute.name}:</h4>
      <div className="flex flex-wrap gap-2">
        {attribute.options.map((option) => {
          const hex = hexMap[option.toLowerCase()] || hexMap[option] || hexMap[option.charAt(0).toUpperCase() + option.slice(1).toLowerCase()];
          
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                selected === option 
                  ? 'border-primary-600 ring-2 ring-primary-200' 
                  : 'border-gray-300 hover:border-gray-400'
              } transition-all duration-200 hover:scale-105`}
              style={hex ? { backgroundColor: hex } : {}}
              title={option}
            >
              {hex ? (
                // Show colored square with the hex color as background
                <div 
                  className="w-8 h-8 rounded-md border border-gray-200 shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              ) : (
                // Fallback to text with first letter if no hex color found
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {option.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
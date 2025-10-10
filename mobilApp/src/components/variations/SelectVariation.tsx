import React from 'react';

interface SelectVariationProps {
  attribute: { name: string; options: string[] };
  selected: string;
  onSelect: (value: string) => void;
}

export function SelectVariation({ attribute, selected, onSelect }: SelectVariationProps) {
  return (
    <div className="mb-4">
      <h4 className="font-semibold dark:text-white text-sm mb-2">{attribute.name}:</h4>
      <div className="flex flex-wrap gap-2">
        {attribute.options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`px-3 py-1 rounded-md border-2 text-sm ${
              selected === option 
                ? 'border-primary-600 bg-primary-100 text-primary-600' 
                : 'border-gray-300 bg-white text-gray-700'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
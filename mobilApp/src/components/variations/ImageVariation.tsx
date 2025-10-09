import React from 'react';

interface ImageVariationProps {
  attribute: { name: string; options: string[] };
  selected: string;
  onSelect: (value: string) => void;
  imageMap: Record<string, string>;
}

export function ImageVariation({ attribute, selected, onSelect, imageMap }: ImageVariationProps) {
  // Map of common image variations to placeholder images
  const placeholderImages: Record<string, string> = {
    'wood': 'https://via.placeholder.com/100x100/8B4513/FFFFFF?text=Wood',
    'bois': 'https://via.placeholder.com/100x100/8B4513/FFFFFF?text=Bois',
    'metal': 'https://via.placeholder.com/100x100/C0C0C0/000000?text=Metal',
    'acier': 'https://via.placeholder.com/100x100/A0A0A0/000000?text=Acier',
    'steel': 'https://via.placeholder.com/100x100/A0A0A0/000000?text=Steel',
    'fabric': 'https://via.placeholder.com/100x100/F5F5DC/000000?text=Fabric',
    'tissu': 'https://via.placeholder.com/100x100/F5F5DC/000000?text=Tissu',
    'leather': 'https://via.placeholder.com/100x100/8B4513/FFFFFF?text=Leather',
    'cuir': 'https://via.placeholder.com/100x100/8B4513/FFFFFF?text=Cuir',
    'plastic': 'https://via.placeholder.com/100x100/F0F0F0/000000?text=Plastic',
    'plastique': 'https://via.placeholder.com/100x100/F0F0F0/000000?text=Plastique',
    'glass': 'https://via.placeholder.com/100x100/E6F3FF/000000?text=Glass',
    'verre': 'https://via.placeholder.com/100x100/E6F3FF/000000?text=Verre',
    'marble': 'https://via.placeholder.com/100x100/F8F8FF/000000?text=Marble',
    'marbre': 'https://via.placeholder.com/100x100/F8F8FF/000000?text=Marbre',
    'concrete': 'https://via.placeholder.com/100x100/808080/FFFFFF?text=Concrete',
    'béton': 'https://via.placeholder.com/100x100/808080/FFFFFF?text=Béton',
    'ceramic': 'https://via.placeholder.com/100x100/FAFAFA/000000?text=Ceramic',
    'céramique': 'https://via.placeholder.com/100x100/FAFAFA/000000?text=Céramique',
    'rattan': 'https://via.placeholder.com/100x100/D2691E/FFFFFF?text=Rattan',
    'wicker': 'https://via.placeholder.com/100x100/D2691E/FFFFFF?text=Wicker',
    'osier': 'https://via.placeholder.com/100x100/D2691E/FFFFFF?text=Osier'
  };

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-sm mb-2">{attribute.name}:</h4>
      <div className="flex flex-wrap gap-2">
        {attribute.options.map((option) => {
          const imgUrl = imageMap[option.toLowerCase()] || '';
          const placeholderUrl = placeholderImages[option.toLowerCase()];
          const finalUrl = imgUrl || placeholderUrl;
          
          console.log('Image option:', option, 'URL found:', imgUrl, 'placeholder:', placeholderUrl);
          
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`w-10 h-10 rounded-lg border-2 overflow-hidden flex items-center justify-center ${
                selected === option 
                  ? 'border-primary-600 ring-2 ring-primary-200' 
                  : 'border-gray-300 hover:border-gray-400'
              } transition-all duration-200 hover:scale-105`}
              title={option}
            >
              {finalUrl ? (
                <img 
                  src={finalUrl} 
                  alt={option} 
                  className="w-8 h-8 object-cover rounded-md shadow-sm"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<span class="text-xs font-medium text-gray-700 dark:text-gray-300">${option.charAt(0).toUpperCase()}</span>`;
                  }}
                />
              ) : (
                // Fallback to text with first letter if no image found
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
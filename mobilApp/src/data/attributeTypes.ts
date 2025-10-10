export const attributeTypeMap: Record<string, 'text' | 'color' | 'image'> = {
  // Text attributes
  'Capacité': 'text',
  'Select Field': 'text',
  'Dimensions': 'text',
  'Dimensions Ø': 'text',
  'Modéle': 'text',
  'Variations': 'text',
  
  // Color attributes
  'Couleur': 'color',
  'Couleur piétement': 'color',
  'Couleur plateaux': 'color',
  
  // Image attributes
  'Hauteur': 'image',
  'Largeur': 'image',
  'Marques': 'image',
};

export function getAttributeType(attributeName: string): 'text' | 'color' | 'image' {
  // Direct mapping first
  if (attributeTypeMap[attributeName]) {
    return attributeTypeMap[attributeName];
  }
  
  // Fallback detection based on name patterns
  const lowerName = attributeName.toLowerCase();
  
  // Color detection
  if (lowerName.includes('couleur') || lowerName.includes('color')) {
    return 'color';
  }
  
  // Image detection
  if (lowerName.includes('hauteur') || lowerName.includes('largeur') || 
      lowerName.includes('marque') || lowerName.includes('brand') ||
      lowerName.includes('height') || lowerName.includes('width')) {
    return 'image';
  }
  
  // Text detection for select fields
  if (lowerName.includes('select') || lowerName.includes('field') ||
      lowerName.includes('capacité') || lowerName.includes('capacity') ||
      lowerName.includes('dimensions') || lowerName.includes('modéle') ||
      lowerName.includes('model') || lowerName.includes('variations')) {
    return 'text';
  }
  
  // Default to text
  return 'text';
}
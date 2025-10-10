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
  // Check for brand attributes first - these should not be treated as selectable variations
  const lowerName = attributeName.toLowerCase();
  if (lowerName === 'marques' || lowerName === 'brand') {
    return 'image'; // Return text but these will be filtered out anyway
  }
  
  // Direct mapping first
  if (attributeTypeMap[attributeName]) {
    return attributeTypeMap[attributeName];
  }
  
  // Fallback detection based on name patterns
  // Color detection
  if (lowerName.includes('couleur') || lowerName.includes('color')) {
    return 'color';
  }
  
  // Image detection (excluding brand attributes)
  if ((lowerName.includes('hauteur') || lowerName.includes('largeur') || 
       lowerName.includes('height') || lowerName.includes('width')) &&
      !lowerName.includes('marque') && !lowerName.includes('brand')) {
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
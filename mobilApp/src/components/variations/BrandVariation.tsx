import React from 'react';
import { Link } from 'react-router-dom';

interface BrandVariationProps {
  brand: string;
}

export function BrandVariation({ brand }: BrandVariationProps) {
  return (
    <Link 
      to={`/brands/${encodeURIComponent(brand.toLowerCase())}`}
      className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
    >
      {brand}
    </Link>
  );
}
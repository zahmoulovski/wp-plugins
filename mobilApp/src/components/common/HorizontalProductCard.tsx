import React, { useRef, useEffect, useState } from 'react';
import { Cart } from 'react-bootstrap-icons';
import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { HorizontalProductCardSkeleton } from './SkeletonLoader';

interface HorizontalProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  loading?: boolean;
}

export function HorizontalProductCard({ product, onProductClick, loading }: HorizontalProductCardProps) {
  const { dispatch } = useApp();
  const [imageError, setImageError] = useState(false);

  // Show skeleton loader if loading
  if (loading) {
    return <HorizontalProductCardSkeleton />;
  }

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ 
      type: 'ADD_TO_CART', 
      payload: { 
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0]?.src || '',
        sku: product.sku,
        attributes: {},
        product: product
      }
    });
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) {
      return 'Prix : Sur Demande';
    }
    return `${numPrice.toFixed(3)} TND`;
  };

  const mainImage = product.images?.[0]?.src || '/api/placeholder/300/300';
  
  // Force square aspect ratio for carousel images
  const getImageUrl = (url: string) => {
    if (url.includes('placeholder')) return url;
    // Try to get a square version of the image
    return url.replace(/-\d+x\d+/, '-300x300');
  };

  return (
    <div 
      onClick={() => onProductClick(product)}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-200 h-full flex flex-col relative w-full mx-auto max-w-full"
    >
      <div className="flex h-full">
        {/* Image on the left - Square container */}
        <div className="relative w-32 flex-shrink-0 aspect-square overflow-hidden rounded-l-2xl">
          <img 
            src={imageError ? '/api/placeholder/300/300' : getImageUrl(mainImage)}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
          
          {product.on_sale && (
            <div className="absolute top-2 left-2 bg-secondary-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
              Promo
            </div>
          )}
        </div>

        {/* Content on the right */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex-1">
            {/* Title - Allow 2 lines for carousel with proper text wrapping */}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 leading-tight text-truncate-2">
              {product.name}
            </h3>
            
            {/* SKU */}
            {product.sku && (
              <div className="mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Réf: {product.sku}
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center space-x-2 mb-3">
              {product.on_sale && product.regular_price ? (
                <>
                  <span className="text-sm text-red-500 line-through">
                    {formatPrice(product.regular_price)}
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(product.sale_price || product.price)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart Button - Icon Only */}
          <div className="flex justify-start mt-auto">
            <button
              onClick={addToCart}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors duration-200 shadow-lg hover:shadow-xl"
              title="Ajouter au panier"
            >
              <Cart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useRef, useEffect, useState } from 'react';
import { Cart } from 'react-bootstrap-icons';
import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { ProductCardSkeleton } from './SkeletonLoader';
import { logViewItem, logAddToCart } from '../../utils/analytics';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  loading?: boolean;
}

export function ProductCard({ product, onProductClick, loading }: ProductCardProps) {
  const { dispatch } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Show skeleton loader if loading
  if (loading) {
    return <ProductCardSkeleton />;
  }

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (container && text) {
      setIsOverflowing(text.scrollWidth > container.clientWidth);
    }
  }, [product.name]);

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
    
    // Track add to cart event
    logAddToCart(product.id.toString(), product.name, parseFloat(product.price));
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) {
      return 'Prix : Sur Demande';
    }
    return `${numPrice.toFixed(3)} TND`;
  };

  const mainImage = product.images?.[0]?.src || '/api/placeholder/600/600';

  const handleProductClick = () => {
    // Track product view
    logViewItem(product.id.toString(), product.name, parseFloat(product.price));
    onProductClick(product);
  };

  return (
    <div 
      onClick={handleProductClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-200"
    >
      <div className="relative">
        <img 
          src={mainImage} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        
        {product.on_sale && (
          <div className="absolute top-2 left-2 bg-secondary-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            Promo
          </div>
        )}
        
        {product.stock_status === 'outofstock' && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            Rupture de stock
          </div>
        )}
        
        {product.stock_status === 'instock' && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            En stock
          </div>
        )}
        
        {product.stock_status === 'onbackorder' && (
          <div className="absolute top-2 right-2 bg-secondary-500 text-white px-2 py-1 rounded-full text-xs font-bold text-center">
            Disponible<br/>sur commande
          </div>
        )}
      </div>
      
      <div className="p-4">
        {/* Title container */}
        <div
          ref={containerRef}
          className="w-full overflow-hidden whitespace-nowrap mb-2"
        >
          <div
            ref={textRef}
            className={`inline-block font-semibold text-gray-900 dark:text-white`}
            style={{
              animation: isOverflowing ? 'scroll 10s linear infinite' : 'none',
            }}
          >
            {product.name}
          </div>
        </div>
        
        {product.sku && (
          <div className="mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Réf: {product.sku}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {product.on_sale && product.regular_price ? (
              <div className="flex flex-col">
                <span className="text-xs text-red-500 line-through">
                  {formatPrice(product.regular_price)}
                </span>
                <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(product.sale_price || product.price)}
                </span>
              </div>
            ) : (
              <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          
          <button
            onClick={addToCart}
            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
          >
            <Cart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

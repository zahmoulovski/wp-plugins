import React, { useState, useRef, useEffect } from 'react';
import { X, ShoppingCart, Heart, Plus, Minus } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';


interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onCategoryClick?: (categoryId: number) => void;
}

export function ProductModal({ product, isOpen, onClose, onCategoryClick }: ProductModalProps) {
  const { dispatch } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (container && text) {
        setIsOverflowing(text.scrollWidth > container.clientWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);
  

  if (!isOpen) return null;

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Prix : Sur Demande';
    return `${numPrice.toFixed(2)} TND`;
  };

  const addToCart = () => {
    dispatch({ type: 'ADD_TO_CART', payload: { product, quantity } });
    onClose();
  };

  const getThumbnail = (url: string) => {
    if (!url) return '/api/placeholder/300/300';
    const dotIndex = url.lastIndexOf('.');
    if (dotIndex === -1) return url;
    return `${url.slice(0, dotIndex)}-300x300${url.slice(dotIndex)}`;
  };
  
  const images =
    product.images && product.images.length > 0
      ? product.images.map((img) => ({
          ...img,
          src: getThumbnail(img.src),
        }))
      : [{ id: 0, src: '/api/placeholder/300/300', alt: product.name }];


  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div ref={containerRef} className="overflow-hidden flex-1 mr-4">
            <div
              ref={textRef}
              className="font-bold text-xl text-gray-900 dark:text-white inline-block"
              style={{
                whiteSpace: 'nowrap',
                animation: isOverflowing ? 'scroll 10s linear infinite' : 'none',
              }}
            >
              {product.name}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-800 dark:text-gray-100" />
          </button>
        </div>

        <div className="p-6">
          {/* Product Images */}
          <div className="mb-6">
            <img
              src={images[selectedImageIndex]?.src}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />

{images.length > 1 && (
  <div className="flex space-x-2 mt-3 overflow-x-auto">
    {images.map((image, index) => (
      <div
        key={image.id}
        className={`w-full h-full object-cover rounded-lg border-2 overflow-hidden cursor-pointer ${
          selectedImageIndex === index
            ? 'border-primary-500'
            : 'border-gray-200 dark:border-gray-700'
        }`}
        onClick={() => setSelectedImageIndex(index)}
      >
        <img
          src={image.src}
          alt={`${product.name} ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
    ))}
  </div>
)}

          </div>

          {/* Price and Sale Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              {product.on_sale && product.regular_price ? (
                <>
                  <span className="text-sm text-red-500 line-through">
                    {formatPrice(product.regular_price)}
                  </span>
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(product.sale_price || product.price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {product.on_sale && (
              <div className="bg-secondary-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Promo
              </div>
            )}
          </div>

          {/* SKU */}
          {product.sku && (
            <div className="mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Réf: {product.sku}
              </span>
            </div>
          )}

          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {product.categories.map((category) => (
                  <span
                    key={category.id}
                    onClick={() => {
                      if (onCategoryClick) {
                        onCategoryClick(category.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descriptions */}
          {product.short_description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Courte Description
              </h3>
              <div
                className="text-gray-600 dark:text-gray-400"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            </div>
          )}

          {/* Quantity Selector & Stock */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-gray-900 dark:text-white">Quantité</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-semibold text-lg w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="text-sm">
              {product.stock_status !== 'outofstock' ? (
                <span className="text-green-500 font-semibold">En Stock</span>
              ) : (
                <span className="text-red-500 font-semibold">Rupture de stock</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={addToCart}
              disabled={product.stock_status === 'outofstock'}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors duration-200"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Ajouter au panier</span>
            </button>

            <button className="p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
              <Heart className="h-5 w-5" />
            </button>
          </div>

          {/* Descriptions */}
          {product.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Description
              </h3>
              <div
                className="text-gray-600 dark:text-gray-400"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

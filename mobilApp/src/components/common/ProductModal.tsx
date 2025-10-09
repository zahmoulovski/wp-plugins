import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Cart, Heart, Plus, Dash, ChatDots } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { ImageLightbox } from './ImageLightbox';


interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  // Early return before any hooks are called to maintain consistent hook order
  if (!isOpen) return null;
  
  const { dispatch } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showWhatsAppEmail, setShowWhatsAppEmail] = useState(false);
  const [whatsappEmail, setWhatsappEmail] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (container && text) {
        setIsOverflowing(text.scrollWidth > container.clientWidth);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if the lightbox is open
      if (showLightbox) return;
      
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // If lightbox is open, don't close the modal
        if (showLightbox) return;
        onClose();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose, showLightbox]);

  // Reset lightbox state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowLightbox(false);
      setSelectedImageIndex(0);
    }
  }, [isOpen]);

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Prix : Sur Demande';
    return `${numPrice.toFixed(3)} TND`;
  };

  const addToCart = () => {
    const cartItem = {
      id: product.id,
      product: product,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.images[0]?.src || '',
      sku: product.sku,
      attributes: {},
      variationId: null
    };

    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    onClose();
  };

  const handleWhatsAppOrder = () => {
    setShowWhatsAppEmail(true);
  };

  const sendWhatsAppOrder = () => {
    if (!whatsappEmail.trim()) {
      alert('Veuillez entrer votre email.');
      return;
    }

    const whatsappNumber = '+21698134873';
    const productName = product.name;
    const productSku = product.sku || 'N/A';
    const productUrl = window.location.href;
    
    const message = `3asléma, n7éb n3adi commande fi : ${productName} (RÉF : ${productSku}) - ${productUrl} Quantité: ${quantity} Email : ${whatsappEmail}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const getThumbnail = (url: string, size: 'thumbnail' | 'full' = 'thumbnail') => {
    if (!url) return '/api/placeholder/600/600';
    const dotIndex = url.lastIndexOf('.');
    if (dotIndex === -1) return url;
    
    if (size === 'full') {
      // Return the original full resolution image for lightbox
      return url;
    }
    
    // Return thumbnail size for modal display
    return `${url.slice(0, dotIndex)}-300x300${url.slice(dotIndex)}`;
  };

  // Thumbnail images for modal display (300x300)
  const thumbnailImages = useMemo(() => {
    const images = product.images && product.images.length > 0
      ? product.images.map((img) => ({
          ...img,
          src: getThumbnail(img.src, 'thumbnail'),
        }))
      : [{ id: 0, src: '/api/placeholder/600/600', alt: product.name }];

    return images;
  }, [product.images, product.name, getThumbnail]);

  // Full resolution images for lightbox
  const fullImages = useMemo(() => {
    const images = product.images && product.images.length > 0
      ? product.images.map((img) => ({
          ...img,
          src: getThumbnail(img.src, 'full'),
        }))
      : [{ id: 0, src: '/api/placeholder/600/600', alt: product.name }];

    return images;
  }, [product.images, product.name, getThumbnail]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop and lightbox is not open
    if (e.target === e.currentTarget && !showLightbox) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div ref={modalRef} className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

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
            <div className="relative">
              <img
                src={thumbnailImages[selectedImageIndex]?.src}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowLightbox(true)}
              />
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-lg text-xs">
                Cliquez pour zoomer
              </div>
            </div>

            {thumbnailImages.length > 1 && (
              <div className="flex space-x-2 mt-3 overflow-x-auto">
                {thumbnailImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`w-20 h-20 object-cover rounded-lg border-2 overflow-hidden cursor-pointer ${
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
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-primary-600">
                    {formatPrice(product.sale_price || product.price)}
                  </span>
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(product.regular_price)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-primary-600">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {product.on_sale && (
                <div className="bg-secondary-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Promo
                </div>
              )}
            </div>
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
                  <Link
                    key={category.id}
                    to={`/categories/${category.id}`}
                    onClick={onClose}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors inline-block"
                  >
                    {decodeHTMLEntities(category.name)}
                  </Link>
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
                  <Dash className="h-4 w-4 dark:text-white" />
                </button>
                <span className="font-semibold text-lg w-8 text-center dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="text-sm">
              {product.stock_status === 'instock' ? (
                  <span className="text-green-500 font-semibold">En Stock</span>
                ) : product.stock_status === 'onbackorder' ? (
                  <span className="text-yellow-500 font-semibold text-center">Disponible<br/>sur commande</span>
                ) : (
                  <span className="text-red-500 font-semibold">Rupture de stock</span>
                )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={addToCart}
                disabled={product.stock_status === 'outofstock'}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors duration-200"
              >
                <Cart className="h-5 w-5" />
                <span>Ajouter au panier</span>
              </button>
            </div>

            {!showWhatsAppEmail ? (
              <button
                onClick={handleWhatsAppOrder}
                disabled={product.stock_status === 'outofstock'}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors duration-200"
              >
                <ChatDots className="h-5 w-5" />
                <span>Commander par WHATSAPP</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  placeholder="Entrez votre email"
                  value={whatsappEmail}
                  onChange={(e) => setWhatsappEmail(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={sendWhatsAppOrder}
                  className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg transition-colors duration-200"
                >
                  <ChatDots className="h-5 w-5" />
                </button>
              </div>
            )}
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

      {/* Image Lightbox */}
      <ImageLightbox
        images={fullImages}
        currentIndex={selectedImageIndex}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
      />

    </div>
  );
}

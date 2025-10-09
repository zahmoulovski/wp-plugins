import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Cart, Heart, Plus, Dash, ChatDots } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { Product, Variation } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { ImageLightbox } from './ImageLightbox';
import { ColorVariation } from '../variations/ColorVariation';
import { ImageVariation } from '../variations/ImageVariation';
import { SelectVariation } from '../variations/SelectVariation';
import { BrandVariation } from '../variations/BrandVariation';
import { api } from '../../services/api';
import { colorMap } from '../../data/colorMap';
import { imageMap } from '../../data/imageMap';


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
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [variations, setVariations] = useState<Variation[]>([]);
  const [matchedVariation, setMatchedVariation] = useState<Variation | null>(null);
  const [currentPrice, setCurrentPrice] = useState(product.price);
  const [currentSku, setCurrentSku] = useState(product.sku);
  const [currentDescription, setCurrentDescription] = useState(product.description);
  const [currentRegularPrice, setCurrentRegularPrice] = useState(product.regular_price);
  const [currentSalePrice, setCurrentSalePrice] = useState(product.sale_price);
  const [isOnSale, setIsOnSale] = useState(product.on_sale);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const fetchVariations = async () => {
      try {
        const vars = await api.getProductVariations(product.id);
        setVariations(vars);
      } catch (error) {
        console.error('Failed to fetch variations:', error);
      }
    };
    fetchVariations();
  }, [product.id]);

  useEffect(() => {
    if (variations.length > 0) {
      const matched = variations.find(v => {
        return Object.entries(selectedAttributes).every(([name, value]) => {
          const attr = v.attributes.find(a => a.name === name);
          return attr && attr.option === value;
        });
      });
      setMatchedVariation(matched || null);
      setCurrentPrice(matched ? matched.price : product.price);
      setCurrentSku(matched ? matched.sku : product.sku);
      setCurrentDescription(matched ? matched.description : product.description);
      setCurrentRegularPrice(matched ? matched.regular_price : product.regular_price);
      setCurrentSalePrice(matched ? matched.sale_price : product.sale_price);
      setIsOnSale(matched ? matched.on_sale : product.on_sale);
    }
  }, [selectedAttributes, variations, product.price]);

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

  const handleAttributeSelect = (attrName: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [attrName]: value }));
  };

  const addToCart = () => {
    const cartItem = {
      id: product.id,
      name: `${product.name}${Object.keys(selectedAttributes).length > 0 ? ` - ${Object.entries(selectedAttributes).map(([key, value]) => `${key}: ${value}`).join(', ')}` : ''}`,
      price: currentPrice,
      quantity: quantity,
      image: matchedVariation?.image?.src || product.images?.[0]?.src || '',
      sku: currentSku,
      attributes: selectedAttributes,
      product: product,
      variationId: matchedVariation?.id || null
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

  const brandAttr = product.attributes?.find(attr => attr.name.toLowerCase() === 'marque' || attr.name.toLowerCase() === 'pa_marques');
  const otherAttributes = product.attributes?.filter(attr => attr.name.toLowerCase() !== 'marque' && attr.name.toLowerCase() !== 'pa_marques') || [];

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
              {brandAttr && (
                <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded">
                  <BrandVariation brand={brandAttr.options[0]} />
                </div>
              )}
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
              {isOnSale && currentRegularPrice ? (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-primary-600">
                    {formatPrice(currentSalePrice || currentPrice)}
                  </span>
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(currentRegularPrice)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-primary-600">
                  {formatPrice(currentPrice)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isOnSale && (
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
                Réf: {currentSku}
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

          {/* Variations section */}
          {otherAttributes.length > 0 && (
            <div className="mb-6">
              {otherAttributes.map(attr => {
                const selected = selectedAttributes[attr.name] || attr.options[0];

                
                // More flexible color detection
                const isColorAttribute = 
                  attr.name.toLowerCase().includes('color') || 
                  attr.name.toLowerCase().includes('couleur') ||
                  attr.name.toLowerCase().includes('colour') ||
                  attr.name.toLowerCase().includes('farbe') ||
                  (attr.options && attr.options.some(opt => 
                    colorMap[opt.toLowerCase()] || 
                    ['rouge', 'bleu', 'vert', 'blanc', 'noir', 'orange', 'violet', 'rose', 'gris', 'marron', 'jaune'].includes(opt.toLowerCase())
                  ));
                
                // More flexible image/material detection
                const isImageAttribute = 
                  attr.name.toLowerCase().includes('image') ||
                  attr.name.toLowerCase().includes('material') ||
                  attr.name.toLowerCase().includes('matériau') ||
                  attr.name.toLowerCase().includes('texture') ||
                  attr.name.toLowerCase().includes('finish') ||
                  attr.name.toLowerCase().includes('finition') ||
                  attr.name.toLowerCase().includes('pattern') ||
                  attr.name.toLowerCase().includes('motif') ||
                  attr.name.toLowerCase().includes('style') ||
                  attr.name.toLowerCase().includes('wood') ||
                  attr.name.toLowerCase().includes('bois') ||
                  attr.name.toLowerCase().includes('metal') ||
                  attr.name.toLowerCase().includes('acier') ||
                  attr.name.toLowerCase().includes('fabric') ||
                  attr.name.toLowerCase().includes('tissu') ||
                  attr.name.toLowerCase().includes('leather') ||
                  attr.name.toLowerCase().includes('cuir') ||
                  attr.name.toLowerCase().includes('height') ||
                  attr.name.toLowerCase().includes('hauteur') ||
                  attr.name.toLowerCase().includes('size') ||
                  attr.name.toLowerCase().includes('taille') ||
                  attr.name.toLowerCase().includes('dimension') ||
                  attr.name.toLowerCase().includes('length') ||
                  attr.name.toLowerCase().includes('longueur') ||
                  attr.name.toLowerCase().includes('width') ||
                  attr.name.toLowerCase().includes('largeur') ||
                  (attr.options && attr.options.some(opt => 
                    imageMap[opt.toLowerCase()] || 
                    ['wood', 'bois', 'metal', 'acier', 'steel', 'fabric', 'tissu', 'leather', 'cuir', 'glass', 'verre', 'marble', 'marbre', 'plastic', 'plastique'].includes(opt.toLowerCase())
                  )) ||
                  (attr.options && attr.options.some(opt => 
                    // Check for size patterns like "TC3 = 250mm", "250mm", "TC3", etc.
                    /^[A-Z]{1,3}\d+\s*=.*\d+mm$/i.test(opt) || // Pattern like "TC3 = 250mm"
                    /^\d+mm$/i.test(opt) || // Pattern like "250mm"
                    /^[A-Z]{1,3}\d+$/i.test(opt) || // Pattern like "TC3"
                    /size|taille|dimension|height|hauteur|length|longueur|width|largeur/i.test(opt)
                  ));
                
               
                if (isColorAttribute) {
                  return (
                    <ColorVariation
                      key={attr.name}
                      attribute={attr}
                      selected={selected}
                      onSelect={(value) => handleAttributeSelect(attr.name, value)}
                      hexMap={colorMap}
                    />
                  );
                } else if (isImageAttribute) {
                  return (
                    <ImageVariation
                      key={attr.name}
                      attribute={attr}
                      selected={selected}
                      onSelect={(value) => handleAttributeSelect(attr.name, value)}
                      imageMap={imageMap}
                    />
                  );
                } else {
                  return (
                    <SelectVariation
                      key={attr.name}
                      attribute={attr}
                      selected={selected}
                      onSelect={(value) => handleAttributeSelect(attr.name, value)}
                    />
                  );
                }
              })}
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
                dangerouslySetInnerHTML={{ __html: currentDescription }}
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

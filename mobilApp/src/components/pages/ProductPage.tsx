import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Cart, Plus, Dash, ChatDots, ArrowLeft } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { Product, Variation } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { ImageLightbox } from '../common/ImageLightbox';
import { ColorVariation } from '../variations/ColorVariation';
import { ImageVariation } from '../variations/ImageVariation';
import { SelectVariation } from '../variations/SelectVariation';
import { api } from '../../services/api';
import { imageMap } from '../../data/imageMap';
import { colorMap } from '../../data/colorMap';
import { getAttributeType } from '../../data/attributeTypes';

export function ProductPage() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { dispatch } = useApp();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showWhatsAppEmail, setShowWhatsAppEmail] = useState(false);
  const [whatsappEmail, setWhatsappEmail] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [variations, setVariations] = useState<Variation[]>([]);
  const [matchedVariation, setMatchedVariation] = useState<Variation | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [currentSku, setCurrentSku] = useState<string>('');
  const [currentDescription, setCurrentDescription] = useState<string>('');
  const [currentRegularPrice, setCurrentRegularPrice] = useState<string>('');
  const [currentSalePrice, setCurrentSalePrice] = useState<string>('');
  const [isOnSale, setIsOnSale] = useState<boolean>(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productSlug) return;
      
      try {
        setLoading(true);
        const productData = await api.getProductBySlug(productSlug);
        setProduct(productData);
        setCurrentPrice(productData.price);
        setCurrentSku(productData.sku);
        setCurrentDescription(productData.description);
        setCurrentRegularPrice(productData.regular_price);
        setCurrentSalePrice(productData.sale_price);
        setIsOnSale(productData.on_sale);
      } catch (err) {
        setError('Produit non trouvé');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productSlug]);

  useEffect(() => {
    if (!product) return;

    const fetchVariations = async () => {
      try {
        const vars = await api.getProductVariations(product.id);
        setVariations(vars);
      } catch (error) {
        console.error('Error fetching variations:', error);
      }
    };
    fetchVariations();
  }, [product]);

  useEffect(() => {
    if (!product) return;

    // Only try to match variations if attributes are selected
    if (Object.keys(selectedAttributes).length > 0 && variations.length > 0) {
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
    } else {
      // If no attributes selected, use default product values
      setMatchedVariation(null);
      setCurrentPrice(product.price);
      setCurrentSku(product.sku);
      setCurrentDescription(product.description);
      setCurrentRegularPrice(product.regular_price);
      setCurrentSalePrice(product.sale_price);
      setIsOnSale(product.on_sale);
    }
    
    // Reset image index to 0 when attributes change to show the variation image first
    setSelectedImageIndex(0);
  }, [selectedAttributes, variations, product]);

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Prix : Sur Demande';
    return `${numPrice.toFixed(3)} TND`;
  };

  const handleAttributeSelect = (attrName: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [attrName]: value }));
  };

  const clearAllSelections = () => {
    setSelectedAttributes({});
  };

  const addToCart = () => {
    if (product?.stock_status === 'outofstock') {
      toast.error('Produit en rupture de stock');
      return;
    }

    if (otherAttributes.length > 0 && Object.keys(selectedAttributes).length !== otherAttributes.length) {
      toast.error('Veuillez sélectionner toutes les options');
      return;
    }

    dispatch({ 
      type: 'ADD_TO_CART', 
      payload: { 
        product, 
        quantity, 
        variation: matchedVariation || undefined,
        selectedAttributes: otherAttributes.length > 0 ? selectedAttributes : undefined
      } 
    });
    
    toast.success('Produit ajouté au panier');
  };

  const handleWhatsAppOrder = () => {
    setShowWhatsAppEmail(true);
  };

  const sendWhatsAppOrder = () => {
    if (!whatsappEmail.trim()) {
      toast.error('Veuillez entrer votre email.');
      return;
    }

    const whatsappNumber = '+21698134873';
    const productName = product?.name || 'Produit';
    const productSku = currentSku || 'N/A';

    const message = `3asléma, n7éb n3adi commande fi : ${productName} (RÉF : ${productSku}) - Quantité: ${quantity} Email : ${whatsappEmail}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    navigate('/');
  };

  const getThumbnail = (url: string, size: 'thumbnail' | 'full' = 'thumbnail') => {
    if (!url) return '/api/placeholder/600/600';
    const dotIndex = url.lastIndexOf('.');
    if (dotIndex === -1) return url;
    
    if (size === 'full') {
      return url;
    }
    
    return `${url.slice(0, dotIndex)}-300x300${url.slice(dotIndex)}`;
  };

  // Separate brand attribute from other attributes
  const brandAttribute = product?.attributes?.find(attr => 
    attr.name.toLowerCase() === 'marques' || 
    attr.name.toLowerCase() === 'brand'
  ) || null;

  const otherAttributes = product?.attributes ? product.attributes
    .filter(attr => 
      attr.name.toLowerCase() !== 'marques' && 
      attr.name.toLowerCase() !== 'brand'
    )
    .map(attr => ({
      name: attr.name,
      options: attr.options
    })) : [];

  // Thumbnail images for display (300x300)
  const thumbnailImages = useMemo(() => {
    let images = [];
    
    // If we have a matched variation with an image, use that as the primary image
    if (matchedVariation && matchedVariation.image && matchedVariation.image.src) {
      images.push(getThumbnail(matchedVariation.image.src));
    }
    
    // Add the main product images
    if (product?.images && product.images.length > 0) {
      images.push(...product.images.map(img => getThumbnail(img.src)));
    }
    
    // Remove duplicates and filter out any invalid images
    const uniqueImages = [...new Set(images)].filter(img => img && img !== '/api/placeholder/600/600');
    
    // If no images, add a placeholder
    if (uniqueImages.length === 0) {
      uniqueImages.push('/api/placeholder/600/600');
    }
    
    return uniqueImages;
  }, [product?.images, matchedVariation]);

  // Full resolution images for lightbox
  const fullImages = useMemo(() => {
    let images = [];
    
    // If we have a matched variation with an image, use that as the primary image
    if (matchedVariation && matchedVariation.image && matchedVariation.image.src) {
      images.push(getThumbnail(matchedVariation.image.src, 'full'));
    }
    
    // Add the main product images
    if (product?.images && product.images.length > 0) {
      images.push(...product.images.map(img => getThumbnail(img.src, 'full')));
    }
    
    // Remove duplicates and filter out any invalid images
    const uniqueImages = [...new Set(images)].filter(img => img && img !== '/api/placeholder/600/600');
    
    // If no images, add a placeholder
    if (uniqueImages.length === 0) {
      uniqueImages.push('/api/placeholder/600/600');
    }
    
    return uniqueImages;
  }, [product?.images, matchedVariation]);

  // Conditional rendering after all hooks are defined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-96"></div>
              <div className="space-y-4">
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-3/4"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-6 w-1/2"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-32"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-10 w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Produit non trouvé'}
          </h1>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with back button */}
      <div className="w-full bg-white dark:bg-gray-800 shadow-sm fixed top-17 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-5rem">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={thumbnailImages[selectedImageIndex]}
                alt={product?.name || 'Produit'}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setShowLightbox(true)}
              />
              {isOnSale && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Promotion
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {thumbnailImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {thumbnailImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? 'border-primary-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product?.name || 'Produit'} ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {decodeHTMLEntities(product?.name || '')}
              </h1>
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(currentPrice)}
                </div>
                {isOnSale && currentRegularPrice && parseFloat(currentRegularPrice) > parseFloat(currentPrice) && (
                  <div className="text-lg text-gray-500 line-through">
                    {formatPrice(currentRegularPrice)}
                  </div>
                )}
              </div>

              {currentSku && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Référence: {currentSku}
                </div>
              )}
            </div>

            {/* Categories and Brand */}
            <div className="space-y-4">
              {/* Categories */}
              {product?.categories && product.categories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catégories</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.categories.map((category, index) => (
                      <Link
                        key={index}
                        to={`/categories/${category.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {decodeHTMLEntities(category.name)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Brand */}
              {brandAttribute && brandAttribute.options && brandAttribute.options.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Marque</h3>
                  <div className="flex flex-wrap gap-2">
                    {brandAttribute.options.map((brand, index) => (
                      <Link
                        key={index}
                        to={`/brands/${encodeURIComponent(brand)}`}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {imageMap[brand.toLowerCase()] && (
                          <img 
                            src={imageMap[brand.toLowerCase()]} 
                            alt={brand}
                            className="h-4 w-4 object-contain"
                          />
                        )}
                        {decodeHTMLEntities(brand)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Short Description */}
            {product?.short_description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Description rapide
                </h3>
                <div
                  className="text-gray-600 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: product.short_description }}
                />
              </div>
            )}

            {/* Variations */}
            {otherAttributes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Options</h3>
                  {Object.keys(selectedAttributes).length > 0 && (
                    <button
                      onClick={clearAllSelections}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline"
                    >
                      Effacer la sélection
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {otherAttributes.map(attr => {
                    const selected = selectedAttributes[attr.name];
                    const attributeType = getAttributeType(attr.name);
                    
                    if (attributeType === 'color') {
                      return (
                        <ColorVariation
                          key={attr.name}
                          attribute={attr}
                          selected={selected}
                          onSelect={(value) => handleAttributeSelect(attr.name, value)}
                          hexMap={colorMap}
                        />
                      );
                    } else if (attributeType === 'image') {
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
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponibilité</span>
              <div className="text-sm">
                {product?.stock_status === 'instock' ? (
                  <span className="text-green-500 font-semibold">En Stock</span>
                ) : product?.stock_status === 'onbackorder' ? (
                  <span className="text-yellow-500 font-semibold">Disponible sur commande</span>
                ) : (
                  <span className="text-red-500 font-semibold">Rupture de stock</span>
                )}
              </div>
            </div>

            {/* Quantity and Action Buttons */}
            <div className="space-y-4">
              {/* Quantity Selector */}
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
                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4 dark:text-white" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={addToCart}
                  disabled={product?.stock_status === 'outofstock' || (otherAttributes.length > 0 && Object.keys(selectedAttributes).length !== otherAttributes.length)}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors duration-200"
                >
                  <Cart className="h-5 w-5" />
                  <span>Ajouter au panier</span>
                </button>

                {!showWhatsAppEmail ? (
                  <button
                    onClick={handleWhatsAppOrder}
                    disabled={product?.stock_status === 'outofstock'}
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
            </div>

            {/* Full Description */}
            {currentDescription && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Description complète
                </h3>
                <div
                  className="text-gray-600 dark:text-gray-400 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentDescription }}
                />
              </div>
            )}
          </div>
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
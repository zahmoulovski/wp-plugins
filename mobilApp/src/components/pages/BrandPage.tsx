import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Product } from '../../types';
import { api } from '../../services/api';
import { ProductCard } from '../common/ProductCard';
import { PageWrapper } from '../common/PageWrapper';
import { imageMap } from '../../data/imageMap';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { ProductGridSkeleton } from '../common/SkeletonLoader';
import { useScrollToTop } from '../../hooks/useScrollToTop';


interface BrandPageProps {
  onProductClick: (product: Product) => void;
}

export function BrandPage({ onProductClick }: BrandPageProps) {
  useScrollToTop();
  const { brandName } = useParams<{ brandName: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  // Decode brand name from URL
  const decodedBrandName = brandName ? decodeURIComponent(brandName) : '';

  useEffect(() => {
    const loadBrandProducts = async () => {
      if (!decodedBrandName) {
        setError('Nom de marque invalide');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`Loading brand products for: ${decodedBrandName}`);
        
        // Convert brand name to URL-friendly slug
        const brandSlug = decodedBrandName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();
        
        console.log(`Using brand slug: ${brandSlug}`);
        
        // Try our custom endpoint first (more reliable)
        try {
          const brandData = await api.getBrandProducts(brandSlug, { per_page: 100 });
          console.log(`Custom endpoint found ${brandData.found_products} products for brand ${decodedBrandName}`);
          console.log(`Brand info:`, brandData.brand);
          setProducts(brandData.products);
        } catch (customError) {
          console.warn('Custom endpoint failed, falling back to WooCommerce API:', customError);
          
          // Fallback to original WooCommerce API method
          const attributeTerms = await api.getAttributeTerms('pa_marques');
          console.log(`Found ${attributeTerms.length} attribute terms for pa_marques`);
          
          const matchingTerm = attributeTerms.find(term => 
            term.name.toLowerCase() === decodedBrandName.toLowerCase()
          );

          if (!matchingTerm) {
            console.warn(`No attribute term found for brand: ${decodedBrandName}`);
            setProducts([]);
            setLoading(false);
            return;
          }

          console.log(`Found matching term:`, matchingTerm);
          
          const brandProducts = await api.getProducts({ 
            attribute: 'pa_marques',
            attribute_term: matchingTerm.slug,
            per_page: 100
          });

          console.log(`Found ${brandProducts.length} products for brand ${decodedBrandName} using WooCommerce API`);
          setProducts(brandProducts);
        }

        // Get brand logo from imageMap - match exact case
        const logo = imageMap[decodedBrandName];
        setBrandLogo(logo || null);

      } catch (err) {
        console.error('Error loading brand products:', err);
        setError('Erreur lors du chargement des produits de la marque');
      } finally {
        setLoading(false);
      }
    };

    loadBrandProducts();
  }, [decodedBrandName]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto animate-pulse"></div>
          </div>
          <ProductGridSkeleton count={12} />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <p className="text-gray-600 dark:text-gray-400">
            Impossible de charger les produits de la marque {decodedBrandName}
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (products.length === 0) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="mb-6">
            {brandLogo ? (
              <img 
                src={brandLogo} 
                alt={decodedBrandName}
                className="h-24 w-auto mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400 text-2xl font-bold">
                  {decodedBrandName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {decodeHTMLEntities(decodedBrandName)}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Aucun produit trouvé pour cette marque.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8 mb-12">
        {/* Brand Header Section */}
        <div className="text-center mb-8">
          <div className="mb-6">
            {brandLogo ? (
              <img 
                src={brandLogo} 
                alt={decodedBrandName}
                className="h-32 w-auto mx-auto mb-4 object-contain rounded-[10px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            
            {/* Fallback brand letter if logo fails or doesn't exist */}
            <div className={`w-32 h-32 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center ${brandLogo ? 'hidden' : ''}`}>
              <span className="text-gray-500 dark:text-gray-400 text-4xl font-bold">
                {decodedBrandName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {decodeHTMLEntities(decodedBrandName)}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {products.length} produit{products.length > 1 ? 's' : ''} disponible{products.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Products Grid - 2 products per line */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={onProductClick}
              />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
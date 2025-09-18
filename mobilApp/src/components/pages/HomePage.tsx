import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { cacheService } from '../../services/cache';
import { ProductCard } from '../common/ProductCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PullToRefresh } from '../common/PullToRefresh';

interface HomePageProps {
  onProductClick: (product: Product) => void;
}

// 🔀 Utility: shuffle any array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function HomePage({ onProductClick }: HomePageProps) {
  const [products, setProducts] = useState<{ featured: Product[]; nonFeatured: Product[] }>({
    featured: [],
    nonFeatured: [],
  });
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CATEGORIES = [
    { id: 340, title: 'Coffres & Armoires fortes' },
    { id: 286, title: 'Meubles Métalliques' },
    { id: 1139, title: 'Équipement Laboratoire' },
  ];

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate unique cache keys for each session to allow refresh on page reload
      const sessionId = Date.now().toString().slice(-6); // 6-digit session identifier
      const featuredCacheKey = { per_page: 100, featured: true, session: sessionId };
      const nonFeaturedCacheKey = { per_page: 100, featured: false, session: sessionId };

      // Check cache first with session-specific keys
      const cachedFeatured = cacheService.getProducts(featuredCacheKey);
      const cachedNonFeatured = cacheService.getProducts(nonFeaturedCacheKey);

      let featured = cachedFeatured;
      let nonFeatured = cachedNonFeatured;

      // If not in cache, fetch from API with larger pool (WooCommerce doesn't support orderby=rand)
      if (!featured || !nonFeatured) {
        [nonFeatured, featured] = await Promise.all([
          api.getProducts({ per_page: 100, featured: false }),
          api.getProducts({ per_page: 100, featured: true })
        ]);

        // Cache with session-specific keys (shorter cache time for more frequent updates)
        cacheService.setProducts(nonFeatured, nonFeaturedCacheKey, 2 * 60 * 1000); // 2 minutes
        cacheService.setProducts(featured, featuredCacheKey, 2 * 60 * 1000); // 2 minutes
      }

      // 🔀 Shuffle and select random subset for display
      const randomFeatured = shuffleArray(featured).slice(0, 20);
      const randomNonFeatured = shuffleArray(nonFeatured).slice(0, 20);

      setProducts({
        featured: randomFeatured,
        nonFeatured: randomNonFeatured,
      });
    } catch (err) {
      console.error('Error loading products:', err);
      // If we have cached products from previous sessions, show them as fallback
      if (products.featured.length === 0 && products.nonFeatured.length === 0) {
        setError('Failed to load products');
      }
      // Otherwise, keep showing existing products
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const results: Record<string, Product[]> = {};
      const sessionId = Date.now().toString().slice(-6); // Same session ID as loadProducts
      
      for (const cat of CATEGORIES) {
        // Generate session-specific cache key for each category
        const cacheKey = { per_page: 100, category: cat.id, session: sessionId };
        let cachedProducts = cacheService.getProducts(cacheKey);
        
        if (!cachedProducts) {
          // Fetch more products (100 instead of 20) for better randomization
          cachedProducts = await api.getProducts({ per_page: 100, category: cat.id });
          // Cache with shorter expiry for more frequent updates
          cacheService.setProducts(cachedProducts, cacheKey, 2 * 60 * 1000); // 2 minutes
        }
        
        // 🔀 Shuffle and select random subset for display (20 products)
        results[cat.title] = shuffleArray(cachedProducts).slice(0, 20);
      }
      setCategoryProducts(results);
    } catch (err) {
      console.error('Error loading category products:', err);
      // Don't set error for category products - show empty state instead
      // This allows the main products to display even if categories fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const handleRefresh = async () => {
    // Clear current cache entries to force fresh fetch with new random products
    setProducts({ featured: [], nonFeatured: [] });
    setCategoryProducts({});
    await loadProducts();
    await loadCategories();
  };

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="p-4 pb-20 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => { loadProducts(); loadCategories(); }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 pb-20">
        {products.featured.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 dark:text-white">Produits vedettes</h2>
            <div className="grid grid-cols-2 gap-4">
              {products.featured.map(product => (
                <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
              ))}
            </div>
          </section>
        )}

        {products.nonFeatured.length > 0 && (
          <section>
            <br></br><h2 className="text-xl font-bold mb-4 dark:text-white">Nouveaux produits</h2>
            <div className="grid grid-cols-2 gap-4">
              {products.nonFeatured.map(product => (
                <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
              ))}
            </div>
          </section>
        )}

        {Object.entries(categoryProducts).map(([title, prods]) =>
          prods.length > 0 && (
            <section key={title}>
              <br></br><h2 className="text-xl font-bold mb-4 dark:text-white">{title}</h2>
              <div className="grid grid-cols-2 gap-4">
                {prods.map(product => (
                  <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
                ))}
              </div>
            </section>
          )
        )}
      </div>
    </PullToRefresh>
  );
}

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

      // Check cache first
      const cachedFeatured = cacheService.getProducts({ per_page: 20, featured: true });
      const cachedNonFeatured = cacheService.getProducts({ per_page: 20, featured: false });

      let featured = cachedFeatured;
      let nonFeatured = cachedNonFeatured;

      // If not in cache, fetch from API
      if (!featured || !nonFeatured) {
        [nonFeatured, featured] = await Promise.all([
          api.getProducts({ per_page: 20, featured: false }),
          api.getProducts({ per_page: 20, featured: true })
        ]);
      }

      // 🔀 Shuffle before setting state
      setProducts({
        featured: shuffleArray(featured),
        nonFeatured: shuffleArray(nonFeatured),
      });
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const results: Record<string, Product[]> = {};
      for (const cat of CATEGORIES) {
        // Check cache first for each category
        const cacheKey = `category_${cat.id}_products`;
        let cachedProducts = cacheService.get(cacheKey);
        
        if (!cachedProducts) {
          cachedProducts = await api.getProducts({ per_page: 20, category: cat.id });
          cacheService.set(cacheKey, cachedProducts, 10 * 60 * 1000); // Cache for 10 minutes
        }
        
        // 🔀 Shuffle each category list
        results[cat.title] = shuffleArray(cachedProducts);
      }
      setCategoryProducts(results);
    } catch (err) {
      console.error('Error loading category products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const handleRefresh = async () => {
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

import React, { useState, useEffect } from 'react';
import { Search, X } from 'react-bootstrap-icons';
import { Product } from '../../types';
import { api } from '../../services/api';
import { ProductCard } from '../common/ProductCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PullToRefresh } from '../common/PullToRefresh';

interface SearchPageProps {
  onProductClick: (product: Product) => void;
}

export function SearchPage({ onProductClick }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchProducts = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const results = await api.searchProducts(searchQuery);
      setProducts(results);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(query);
  };

  const clearSearch = () => {
    setQuery('');
    setProducts([]);
    setHasSearched(false);
  };

  const handleRefresh = async () => {
    if (query.trim()) {
      await searchProducts(query);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Rechercher des Produits
        </h1>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des produits..."
              className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <LoadingSpinner />
        ) : hasSearched ? (
          products.length > 0 ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {products.length} résultats pour "{query}"
              </p>
              <div className="grid grid-cols-2 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductClick={onProductClick}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucun produit trouvé pour "{query}"
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Recherchez des produits par nom ou description
            </p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
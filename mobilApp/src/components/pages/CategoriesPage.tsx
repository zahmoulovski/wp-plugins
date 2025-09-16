import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Category, Product } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ProductCard } from '../common/ProductCard';
import { PullToRefresh } from '../common/PullToRefresh';

interface CategoriesPageProps {
  onProductClick: (product: Product) => void;
}

export function CategoriesPage({ onProductClick }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      // Filter out categories with 0 count and parent categories
      setCategories(data.filter(cat => cat.count > 0 && cat.parent === 0));
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryProducts = async (categoryId: number, page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setProductsLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const [products, subcats] = await Promise.all([
        api.getProductsByCategory(categoryId, { page, per_page: 10 }),
        page === 1 ? api.getCategories().then(cats => cats.filter(cat => cat.parent === categoryId && cat.count > 0)) : Promise.resolve([])
      ]);
      
      if (page === 1) {
        setCategoryProducts(products);
        setSubcategories(subcats);
      } else {
        setCategoryProducts(prev => [...prev, ...products]);
      }
      
      setHasMoreProducts(products.length === 10);
    } catch (error) {
      console.error('Error loading category products:', error);
    } finally {
      if (page === 1) {
        setProductsLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleRefresh = async () => {
    if (selectedCategory) {
      setCurrentPage(1);
      await loadCategoryProducts(selectedCategory.id, 1);
    } else {
      await loadCategories();
    }
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    loadCategoryProducts(category.id, 1);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setCategoryProducts([]);
    setSubcategories([]);
    setCurrentPage(1);
    setHasMoreProducts(true);
  };

  const handleLoadMore = () => {
    if (selectedCategory && hasMoreProducts && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadCategoryProducts(selectedCategory.id, nextPage, true);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 pb-20">
        {!selectedCategory ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Catégories
            </h1>
            
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {category.image && (
                        <img
                          src={category.image.src}
                          alt={category.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {category.count} produits
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToCategories}
                className="text-primary-600 dark:text-primary-400 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedCategory.name}
              </h1>
            </div>

            {productsLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {/* Subcategories */}
                {subcategories.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Sous-catégories
                    </h2>
                    <div className="space-y-3">
                      {subcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          onClick={() => handleCategoryClick(subcategory)}
                          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {subcategory.image && (
                                <img
                                  src={subcategory.image.src}
                                  alt={subcategory.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {subcategory.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {subcategory.count} produits
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {categoryProducts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Produits
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {categoryProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onProductClick={onProductClick}
                        />
                      ))}
                    </div>

                    {/* Load More Button */}
                    {hasMoreProducts && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center mx-auto"
                        >
                          {loadingMore ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Plus className="h-5 w-5 mr-2" />
                          )}
                          {loadingMore ? 'Chargement...' : 'Charger Plus'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {categoryProducts.length === 0 && subcategories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucun produit ou sous-catégorie trouvé
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Category, Product } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ProductCard } from '../common/ProductCard';
import { PullToRefresh } from '../common/PullToRefresh';

interface CategoriesPageProps {
  onProductClick: (product: Product) => void;
  selectedCategoryId?: number;
}

export function CategoriesPage({ onProductClick, selectedCategoryId }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

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

  const loadCategoryById = async (categoryId: number) => {
    try {
      // Try to get the category directly from the API
      const allCategories = await api.getCategories();
      const category = allCategories.find(cat => cat.id === categoryId);
      
      if (category) {
        console.log('Found category via API:', category);
        // Set the selected category and load its products
        setSelectedCategory(category);
        setCurrentPage(1);
        await loadCategoryProducts(category.id, 1);
        setHasAutoSelected(true);
        setIsAutoSelecting(false);
        
        // Add this category to the main categories list if it's not already there
        if (!categories.find(cat => cat.id === categoryId)) {
          setCategories(prev => [...prev, category]);
        }
      } else {
        console.log('Category not found via API with ID:', categoryId);
        setIsAutoSelecting(false);
        // Silently handle - category might not exist or API might be unavailable
      }
    } catch (error) {
      console.error('Error loading category by ID:', error);
      setIsAutoSelecting(false);
      // Silently handle API errors - don't show alerts to users
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

  // Auto-select category when selectedCategoryId is provided
  useEffect(() => {
    console.log('Auto-select effect triggered:', { selectedCategoryId, hasAutoSelected, categoriesLength: categories.length, loading });
    
    // Only attempt auto-selection if we have a category ID, categories are loaded, and we haven't auto-selected yet
    if (selectedCategoryId && !hasAutoSelected && categories.length > 0 && !loading) {
      // Show loading state during auto-selection
      setIsAutoSelecting(true);
      
      // Add timeout to prevent infinite loading if API fails
      const timeout = setTimeout(() => {
        setIsAutoSelecting(false);
      }, 3000); // 3 second timeout
      
      const category = categories.find(cat => cat.id === selectedCategoryId);
      console.log('Found category for auto-selection:', category);
      
      if (category) {
        // Set the selected category and load its products
        setSelectedCategory(category);
        setCurrentPage(1);
        loadCategoryProducts(category.id, 1);
        setHasAutoSelected(true);
        setIsAutoSelecting(false);
        clearTimeout(timeout);
      } else {
        console.log('Category not found with ID:', selectedCategoryId);
        // Try to load the category directly since it might be a subcategory or not in the main list
        loadCategoryById(selectedCategoryId).then(() => {
          clearTimeout(timeout);
        });
      }
    }
  }, [selectedCategoryId, hasAutoSelected, categories, loading]);

  // Reset auto-selection flag when selectedCategoryId changes
  useEffect(() => {
    if (selectedCategoryId) {
      setHasAutoSelected(false);
    }
  }, [selectedCategoryId]);

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
    setHasAutoSelected(false);
  };

  const handleLoadMore = () => {
    if (selectedCategory && hasMoreProducts && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadCategoryProducts(selectedCategory.id, nextPage, true);
    }
  };

  if (loading || isAutoSelecting) {
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
import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus } from 'react-bootstrap-icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Category, Product } from '../../types';
import { api } from '../../services/api';
import { ProductCard } from '../common/ProductCard';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { 
  CategoryListSkeleton, 
  ProductGridSkeleton,
  TextSkeleton,
  ImageSkeleton 
} from '../common/SkeletonLoader';
import { useScrollToTop } from '../../hooks/useScrollToTop';

interface CategoriesPageProps {
  onProductClick: (product: Product) => void;
}

export function CategoriesPage({ onProductClick }: CategoriesPageProps) {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Scroll to top when page loads or category changes
  useScrollToTop([categorySlug]);

  // Helper function to find category by slug or ID
  const findCategory = (categories: Category[], identifier: string): Category | undefined => {
    // Try to find by slug first
    const bySlug = categories.find(cat => cat.slug === identifier);
    if (bySlug) return bySlug;
    
    // Fallback to ID if slug not found
    const id = parseInt(identifier);
    if (!isNaN(id)) {
      return categories.find(cat => cat.id === id);
    }
    
    return undefined;
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      const mainCategories = data.filter(cat => cat && cat.id && cat.name && cat.parent === 0);
      setCategories(mainCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryById = async (categoryIdentifier: string) => {
    try {
      const allCategories = await api.getCategories();
      const category = findCategory(allCategories, categoryIdentifier);
      if (category) {
        setSelectedCategory(category);
        await loadCategoryProducts(category.id, 1);
      }
    } catch (error) {
      console.error('Error loading category by ID:', error);
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
        page === 1 ? api.getCategories().then(cats => cats.filter(cat => cat.parent === categoryId)) : Promise.resolve([])
      ]);
      
      // Sort products: in-stock and backorder first (alphabetically), then out-of-stock
      const sortedProducts = api.filterAndSortProductsByStock(products, { sortByStock: true });
      
      if (page === 1) {
        setCategoryProducts(sortedProducts);
        setSubcategories(subcats);
      } else {
        setCategoryProducts(prev => [...prev, ...sortedProducts]);
      }
      
      setHasMoreProducts(products.length === 10);
    } catch (error) {
      console.error('Error loading category products:', error);
      if (page === 1) {
        setCategoryProducts([]);
        setSubcategories([]);
      }
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

  useEffect(() => {
    if (categorySlug) {
      loadCategoryById(categorySlug);
    } else {
      setSelectedCategory(null);
      setCategoryProducts([]);
      setSubcategories([]);
    }
  }, [categorySlug]);

  const handleCategoryClick = (category: Category) => {
    navigate(`/categories/${category.slug}`);
  };

  const handleBackToCategories = () => {
    if (selectedCategory) {
      navigate('/categories');
    }
  };

  const handleLoadMore = () => {
    if (selectedCategory && hasMoreProducts && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadCategoryProducts(selectedCategory.id, nextPage, true);
    }
  };

  if (loading) {
    return (
      <div className="p-4 pb-20">
        <TextSkeleton width="120px" height="32px" className="mb-6" />
        <CategoryListSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 mb-8">
      {!selectedCategory ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Catégories
          </h1>
          
          <div className="space-y-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all duration-200 block"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {category.image && (
                      <img
                        src={category.image.src}
                        alt={decodeHTMLEntities(category.name)}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {decodeHTMLEntities(category.name)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.count} produits
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-primary-600 dark:text-primary-400 mr-4 flex items-center"
            >
              ← Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
               {decodeHTMLEntities(selectedCategory.name)}
             </h1>
          </div>

          {productsLoading ? (
            <div>
              {/* Subcategories skeleton */}
              <div className="mb-6">
                <TextSkeleton width="150px" height="24px" className="mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <ImageSkeleton width="40px" height="40px" variant="rectangular" />
                          <div>
                            <TextSkeleton width="120px" height="20px" className="mb-1" />
                            <TextSkeleton width="80px" height="16px" />
                          </div>
                        </div>
                        <TextSkeleton width="20px" height="20px" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Products skeleton */}
              <div>
                <TextSkeleton width="100px" height="24px" className="mb-4" />
                <ProductGridSkeleton count={10} />
              </div>
            </div>
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
                      <Link
                        key={subcategory.id}
                        to={`/categories/${subcategory.id}`}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all duration-200 block"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {subcategory.image && (
                              <img
                                src={subcategory.image.src}
                                alt={decodeHTMLEntities(subcategory.name)}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {decodeHTMLEntities(subcategory.name)}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {subcategory.count} produits
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Link>
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
                    Aucun produit trouvé dans cette catégorie.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
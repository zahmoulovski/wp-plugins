import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PortfolioItem, ProjectCategory } from '../../types';
import { BoxArrowUpRight, Calendar, Person, ArrowClockwise } from 'react-bootstrap-icons';
import Lightbox from "./Lightbox";

interface PortfolioProps {
  className?: string;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

// Simple cache implementation
const portfolioCache = {
  items: null as PortfolioItem[] | null,
  categories: null as ProjectCategory[] | null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  isValid() {
    return this.items && this.categories && (Date.now() - this.timestamp) < this.CACHE_DURATION;
  },
  
  clear() {
    this.items = null;
    this.categories = null;
    this.timestamp = 0;
  }
};

const Portfolio: React.FC<PortfolioProps> = ({ 
  className = '', 
  selectedCategory: externalSelectedCategory,
  onCategoryChange 
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Use internal state if no external control
  const [internalSelectedCategory, setInternalSelectedCategory] = useState('all');
  const selectedCategory = externalSelectedCategory ?? internalSelectedCategory;
  const setSelectedCategory = (category: string) => {
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      setInternalSelectedCategory(category);
    }
  };

  const fetchPortfolioData = useCallback(async (loadMore = false) => {
    try {
      console.log('=== FETCH PORTFOLIO DATA ===');
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(false);
      }
      setError(null);

      // Check cache first
      if (!loadMore && portfolioCache.isValid()) {
        console.log('Using cached data');
        setItems(portfolioCache.items!);
        setCategories(portfolioCache.categories!);
        setTotalItems(portfolioCache.items!.length);
        setHasMore(portfolioCache.items!.length >= 12);
        setLoading(false);
        return;
      }

      // Fetch categories first
      console.log('Fetching categories...');
      let fetchedCategories: ProjectCategory[] = [];
      try {
        fetchedCategories = await api.getProjectCategories();
        console.log('Categories fetched:', fetchedCategories.length);
      } catch (catError) {
        console.warn('Could not fetch categories:', catError);
        fetchedCategories = [];
      }
      
      // Set categories with initial 0 counts
      const categoriesWithCounts = fetchedCategories.map(cat => ({ ...cat, count: 0 }));
      
      // Fetch all items to calculate category counts
      console.log('Fetching all items for category counts...');
      const allItems = await api.getPortfolioItems({ per_page: 100, status: 'publish' });
      console.log('All items fetched:', allItems.length);
      
      if (allItems.length > 0) {
        console.log('Sample item structure:', allItems[0]);
        console.log('Sample item project_categories:', allItems[0].project_categories);
        console.log('Sample item portfolio_categories:', allItems[0].portfolio_categories);
      }
      
      const categoryCounts = new Map<string, number>();
      allItems.forEach((item, index) => {
        // Use project_categories first (galerie-cat taxonomy), fallback to portfolio_categories
        const categories = item.project_categories || item.portfolio_categories || [];
        console.log(`Item ${index} categories:`, categories);
        
        categories.forEach(cat => {
          const currentCount = categoryCounts.get(cat.slug) || 0;
          categoryCounts.set(cat.slug, currentCount + 1);
          console.log(`Category ${cat.slug} count: ${currentCount + 1}`);
        });
      });
      
      console.log('Final category counts:', Object.fromEntries(categoryCounts));
      
      // Update categories with proper counts
      const updatedCategories = categoriesWithCounts.map(cat => {
        const count = categoryCounts.get(cat.slug) || 0;
        console.log(`Category ${cat.name} (${cat.slug}): ${count}`);
        return {
          ...cat,
          count: count
        };
      });
      
      console.log('Updated categories with counts:', updatedCategories);
      setCategories(updatedCategories);
      
      // Cache the data
      portfolioCache.items = allItems;
      portfolioCache.categories = updatedCategories;
      portfolioCache.timestamp = Date.now();
      
      // Filter items based on selected category
      let filteredItems = allItems;
      if (selectedCategory !== 'all') {
        filteredItems = allItems.filter(item => {
          // Use project_categories first (galerie-cat taxonomy), fallback to portfolio_categories
          const categories = item.project_categories || item.portfolio_categories || [];
          return categories.some(cat => cat.slug === selectedCategory);
        });
      }
      
      // Update state
      setItems(filteredItems);
      setPage(1);
      setHasMore(filteredItems.length >= 12);
      setTotalItems(filteredItems.length);
      console.log('=== FETCH COMPLETE ===');
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Erreur lors du chargement du portfolio');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, onCategoryChange]);

  // Clear cache function
  const clearCache = () => {
    portfolioCache.clear();
    localStorage.removeItem('portfolio_cache');
  };

  // Add cache persistence
  useEffect(() => {
    // Load from localStorage on mount
    const cachedData = localStorage.getItem('portfolio_cache');
    if (cachedData) {
      try {
        const { items, categories, timestamp } = JSON.parse(cachedData);
        if (items && categories && (Date.now() - timestamp) < portfolioCache.CACHE_DURATION) {
          portfolioCache.items = items;
          portfolioCache.categories = categories;
          portfolioCache.timestamp = timestamp;
        }
      } catch (e) {
        console.warn('Failed to load cache from localStorage:', e);
      }
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (portfolioCache.items && portfolioCache.categories) {
      try {
        localStorage.setItem('portfolio_cache', JSON.stringify({
          items: portfolioCache.items,
          categories: portfolioCache.categories,
          timestamp: portfolioCache.timestamp
        }));
      } catch (e) {
        console.warn('Failed to save cache to localStorage:', e);
      }
    }
  }, [portfolioCache.items, portfolioCache.categories, portfolioCache.timestamp]);

  useEffect(() => {
    fetchPortfolioData();
  }, [selectedCategory]);

  // Items are already filtered in the fetch function
  const filteredItems = items;

  const getFeaturedImage = (item: PortfolioItem) => {
    if (item._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      return item._embedded['wp:featuredmedia'][0].source_url;
    }
    if (item.featured_image_url?.medium) {
      return item.featured_image_url.medium;
    }
    return null;
  };

  const openLightbox = (images: string[], index: number = 0) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 animate-spin text-primary mx-auto mb-4">
            <ArrowClockwise className="w-12 h-12" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={() => fetchPortfolioData()}
            className="mt-4 px-4 py-2 bg-primary text-black rounded-lg dark:text-white hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`portfolio-container ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Notre Portfolio</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Découvrez nos projets récents et notre expertise en action
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            selectedCategory === 'all'
              ? 'bg-primary text-white shadow-lg transform scale-105'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Tous les projets
          <span className="ml-2 text-sm opacity-75">
            ({totalItems})
          </span>
        </button>
        {categories.map((category) => {
          console.log(`Rendering category: ${category.name} (${category.slug}) - count: ${category.count}`);
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                selectedCategory === category.slug
                  ? 'bg-primary text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {category.name}
              <span className="ml-2 text-sm opacity-75">
                ({category.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-8">
          <h3 className="font-bold text-yellow-800 mb-2">Debug Info:</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <div>Categories loaded: {categories.length}</div>
            <div>Items loaded: {items.length}</div>
            <div>Filtered items: {filteredItems.length}</div>
            <div>Selected category: {selectedCategory}</div>
            <div>Total items: {totalItems}</div>
            <div>Has more: {hasMore ? 'Yes' : 'No'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Loading more: {loadingMore ? 'Yes' : 'No'}</div>
            <div>Categories data:</div>
            <pre className="text-xs bg-yellow-50 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(categories.map(cat => ({ name: cat.name, slug: cat.slug, count: cat.count })), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Portfolio Grid - Pinterest Style Masonry */}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {filteredItems.map((item) => {
          const featuredImage = getFeaturedImage(item);
          const author = item._embedded?.author?.[0];

          return (
            <article
              key={item.id}
              className="portfolio-item bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 break-inside-avoid mb-6"
            >
              {/* Featured Image */}
              {featuredImage && (
                <div className="relative overflow-hidden group">
                  <img
                    src={featuredImage}
                    alt={item.title.rendered}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                    loading="lazy"
                    onClick={() => openLightbox([featuredImage], 0)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800"
                      onClick={() => openLightbox([featuredImage], 0)}
                    >
                      <BoxArrowUpRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {/* Title */}
                <h3 
                  className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: item.title.rendered }}
                />

                {/* Excerpt */}
                <div 
                  className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: item.excerpt.rendered }}
                />

                {/* Meta Information */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                    {author && (
                      <div className="flex items-center gap-1">
                        <Person className="w-4 h-4" />
                        <span>{author.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories */}
                {(item.project_categories || item.portfolio_categories) && (item.project_categories?.length > 0 || item.portfolio_categories?.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(item.project_categories || item.portfolio_categories || []).slice(0, 3).map((category) => (
                      <span
                        key={category.id}
                        className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                      >
                        {category.name}
                      </span>
                    ))}
                    {((item.project_categories?.length || 0) + (item.portfolio_categories?.length || 0)) > 3 && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                        +{((item.project_categories?.length || 0) + (item.portfolio_categories?.length || 0)) - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/galerie/${item.slug}/`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-black rounded-lg  dark:text-white hover:bg-primary/90 transition-colors font-medium"
                >
                  <BoxArrowUpRight className="w-4 h-4" />
                  Voir le projet
                </button>
                {item.custom_fields?.project_url && (
                  <a
                    href={item.custom_fields.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <BoxArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* No Results */}
      {filteredItems.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Aucun projet trouvé</p>
        </div>
      )}
      
      {/* Load More Button */}
      {hasMore && (
        <div className="col-span-full text-center mt-8">
          <button
            onClick={() => fetchPortfolioData(true)}
            disabled={loadingMore}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <ArrowClockwise className="w-4 h-4 animate-spin" />
                Chargement...
              </span>
            ) : (
              'Charger plus'
            )}
          </button>
        </div>
      )}
      
      {/* Lightbox */}
      <Lightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
      />
    </div>
  );
};

  // Render category filter
  const renderCategoryFilter = () => {
    console.log('RENDER CATEGORY FILTER - Categories:', categories);
    
    return (
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tous ({totalItems})
        </button>
        {categories.map((category) => {
          console.log(`Rendering category: ${category.name} (${category.slug}) - count: ${category.count}`);
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.slug
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          );
        })}
      </div>
    );
  };
export default Portfolio;
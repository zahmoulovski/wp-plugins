import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PortfolioItem, ProjectCategory } from '../../types';
import { BoxArrowUpRight, Calendar3, Person, ArrowClockwise } from 'react-bootstrap-icons';
import Lightbox from "./Lightbox";

interface PortfolioProps {
  className?: string;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  onLoad?: () => void;
}

const portfolioCache = {
  items: null as PortfolioItem[] | null,
  categories: null as ProjectCategory[] | null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000,
  
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
  onCategoryChange,
  onLoad
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
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(false);
      }
      setError(null);

      if (!loadMore && portfolioCache.isValid()) {
        setItems(portfolioCache.items!);
        setCategories(portfolioCache.categories!);
        setTotalItems(portfolioCache.items!.length);
        setHasMore(portfolioCache.items!.length >= 12);
        setLoading(false);
        // Call onLoad callback when cached data is used
        if (onLoad) {
          onLoad();
        }
        return;
      }

      let fetchedCategories: ProjectCategory[] = [];
      try {
        fetchedCategories = await api.getProjectCategories();
      } catch (catError) {
        fetchedCategories = [];
      }
      
      const categoriesWithCounts = fetchedCategories.map(cat => ({ ...cat, count: 0 }));
      
      const allItems = await api.getPortfolioItems({ per_page: 100, status: 'publish' });
      
      const categoryCounts = new Map<string, number>();
      allItems.forEach((item) => {
        const projectCategories = item.project_categories || [];
        const portfolioCategories = item.portfolio_categories || [];
        const allCategories = [...projectCategories, ...portfolioCategories];
        
        const processedSlugs = new Set<string>();
        allCategories.forEach(cat => {
          if (!processedSlugs.has(cat.slug)) {
            processedSlugs.add(cat.slug);
            const currentCount = categoryCounts.get(cat.slug) || 0;
            categoryCounts.set(cat.slug, currentCount + 1);
          }
        });
      });
      
      const updatedCategories = categoriesWithCounts.map(cat => {
        const count = categoryCounts.get(cat.slug) || 0;
        return {
          ...cat,
          count: count
        };
      });
      
      setCategories(updatedCategories);
      
      portfolioCache.items = allItems;
      portfolioCache.categories = updatedCategories;
      portfolioCache.timestamp = Date.now();
      
      setItems(allItems);
      setPage(1);
      setHasMore(allItems.length >= 12);
      setTotalItems(allItems.length);
      
      // Call onLoad callback when data is loaded
      if (onLoad) {
        onLoad();
      }
    } catch (err) {
      console.error('Portfolio loading error:', err);
      setError('Erreur lors du chargement du portfolio');
      // Still call onLoad on error to hide skeleton
      if (onLoad) {
        onLoad();
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, onCategoryChange]);

  const clearCache = () => {
    portfolioCache.clear();
    localStorage.removeItem('portfolio_cache');
  };

  useEffect(() => {
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
      }
    }
  }, []);

  useEffect(() => {
    if (portfolioCache.items && portfolioCache.categories) {
      try {
        localStorage.setItem('portfolio_cache', JSON.stringify({
          items: portfolioCache.items,
          categories: portfolioCache.categories,
          timestamp: portfolioCache.timestamp
        }));
      } catch (e) {
      }
    }
  }, [portfolioCache.items, portfolioCache.categories, portfolioCache.timestamp]);

  useEffect(() => {
    fetchPortfolioData();
  }, [selectedCategory]);

  const filteredItems = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return items;
    }
    
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.slug.toLowerCase(), cat);
      categoryMap.set(cat.name.toLowerCase(), cat);
    });
    
    const filtered = items.filter(item => {
      const projectCategories = item.project_categories || [];
      const portfolioCategories = item.portfolio_categories || [];
      const allCategories = [...projectCategories, ...portfolioCategories];
      
      const normalizedSelectedCategory = selectedCategory.toLowerCase().trim();
      
      const hasMatch = allCategories.some(cat => {
        const normalizedCatSlug = cat.slug.toLowerCase().trim();
        const normalizedCatName = cat.name.toLowerCase().trim();
        
        if (normalizedCatSlug === normalizedSelectedCategory) {
          return true;
        }
        
        if (normalizedCatName === normalizedSelectedCategory) {
          return true;
        }
        
        if (normalizedCatName.includes(normalizedSelectedCategory) || normalizedSelectedCategory.includes(normalizedCatName)) {
          return true;
        }
        
        return false;
      });
      
      return hasMatch;
    });
    
    if (filtered.length === 0 && items.length > 0) {
      const fallbackFiltered = items.filter(item => {
        const title = item.title.rendered.toLowerCase();
        const excerpt = (item.excerpt?.rendered || '').toLowerCase();
        const content = (item.content?.rendered || '').toLowerCase();
        const searchTerm = selectedCategory.toLowerCase();
        
        const titleMatch = title.includes(searchTerm);
        const excerptMatch = excerpt.includes(searchTerm);
        const contentMatch = content.includes(searchTerm);
        
        if (titleMatch || excerptMatch || contentMatch) {
          return true;
        }
        return false;
      });
      
      return fallbackFiltered;
    }
    
    return filtered;
  }, [items, selectedCategory, categories]);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    
    categories.forEach(cat => {
      counts[cat.slug] = 0;
    });
    
    items.forEach(item => {
      const projectCategories = item.project_categories || [];
      const portfolioCategories = item.portfolio_categories || [];
      const allCategories = [...projectCategories, ...portfolioCategories];
      
      const processedCategories = new Set<string>();
      
      allCategories.forEach(cat => {
        if (!processedCategories.has(cat.slug)) {
          processedCategories.add(cat.slug);
          counts[cat.slug] = (counts[cat.slug] || 0) + 1;
        }
      });
    });
    
    return counts;
  }, [items, categories]);

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
      <div className={`portfolio-container ${className}`}>
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          ))}
        </div>
        
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden break-inside-avoid mb-6 animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-3/4"></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          ))}
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
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-3 rounded-full font-300 transition-all duration-300 ${
            selectedCategory === 'all'
              ? 'bg-primary-500 text-white dark:text-white shadow-lg transform scale-105'
              : 'bg-gray-100 text-primary hover:bg-gray-200 hover:shadow-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Tous les projets
          <span className="ml-2 text-sm opacity-75">
            ({totalItems})
          </span>
        </button>
        {categories.map((category) => {
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-6 py-3 rounded-full font-300 transition-all duration-300 ${
                selectedCategory === category.slug
                  ? 'bg-primary-500 text-white dark:text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-primary hover:bg-gray-200 hover:shadow-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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

      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {filteredItems.map((item) => {
          const featuredImage = getFeaturedImage(item);
          
          return (
            <article
              key={item.id}
              className="portfolio-item bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 break-inside-avoid mb-6"
            >
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

              <div className="p-6">
                <h3 
                  className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: item.title.rendered }}
                />

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar3 className="w-4 h-4" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                    {(item.project_categories || item.portfolio_categories) && (item.project_categories?.length > 0 || item.portfolio_categories?.length > 0) && (
                      <div className="flex items-center gap-1">
                        <span className="text-primary font-medium">
                          {(item.project_categories?.[0]?.name || item.portfolio_categories?.[0]?.name || '')}
                        </span>
                        {((item.project_categories?.length || 0) + (item.portfolio_categories?.length || 0)) > 1 && (
                          <span className="text-xs text-gray-400">
                            +{((item.project_categories?.length || 0) + (item.portfolio_categories?.length || 0)) - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>



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

      {filteredItems.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Aucun projet trouvé</p>
        </div>
      )}
      
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
      
      <Lightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
      />
    </div>
  );
};

export default Portfolio;
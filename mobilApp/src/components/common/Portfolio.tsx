import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowClockwise, BoxArrowUpRight, Calendar, Person } from 'react-bootstrap-icons';
import { api } from '../../services/api';
import { PortfolioItem as PortfolioItemType, PortfolioCategory } from '../../types';
import Lightbox from './Lightbox';

interface PortfolioProps {
  className?: string;
}

const Portfolio: React.FC<PortfolioProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItemType[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchPortfolioData();
  }, [selectedCategory]);

  const fetchPortfolioData = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      }
      
      setError(null);

      // Fetch categories only on initial load
      if (!loadMore && categories.length === 0) {
        const projectCategories = await api.getProjectCategories(); // Use project categories
        setCategories(projectCategories);
      }

      // Fetch portfolio items with pagination
      const params: Record<string, string | number> = {
        per_page: 20, // Increased to 20 items per page for better UX
        page: loadMore ? page + 1 : 1,
        orderby: 'date',
        order: 'desc',
        status: 'publish'
      };

      // Add category filter if selected
      if (selectedCategory !== 'all') {
        // We'll filter client-side since the API might not support category filtering directly
        params.per_page = 50; // Get more items to filter from
      }

      const portfolioItems = await api.getPortfolioItems(params);
      
      // Filter by category if needed
      let filteredItems = portfolioItems;
      if (selectedCategory !== 'all') {
        filteredItems = portfolioItems.filter(item => 
          item.project_categories?.some(cat => cat.slug === selectedCategory) // Use project categories
        );
      }

      // Update state
      if (loadMore) {
        setItems(prev => [...prev, ...filteredItems]);
        setPage(prev => prev + 1);
        // Check if we got less items than requested (indicating end of results)
        setHasMore(portfolioItems.length >= 20); // Use original count before filtering
      } else {
        setItems(filteredItems);
        setPage(1);
        setHasMore(portfolioItems.length >= 20); // Use original count before filtering
      }
      
      setTotalItems(prev => loadMore ? prev + filteredItems.length : filteredItems.length);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Erreur lors du chargement du portfolio');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

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
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            selectedCategory === 'all'
              ? 'bg-primary text-white shadow-lg transform scale-105'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Tous les projets
        </button>
        {categories.map((category) => (
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
        ))}
      </div>

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
                {item.project_categories && item.project_categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.project_categories.slice(0, 3).map((category) => (
                      <span
                        key={category.id}
                        className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                      >
                        {category.name}
                      </span>
                    ))}
                    {item.project_categories.length > 3 && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                        +{item.project_categories.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/galerie/${item.slug}/`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
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

export default Portfolio;
import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { BlogPost } from '../../types';
import { api } from '../../services/api';
import { cacheService } from '../../services/cache';
import { ProductCard } from '../common/ProductCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { FeaturedProductsCarousel } from '../common/FeaturedProductsCarousel';
import { Calendar, JournalText, ArrowUp, ArrowRight } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { decodeHTMLEntities } from '../../utils/htmlUtils';



interface HomePageProps {
  onProductClick: (product: Product) => void;
  onBlogPostClick: (post: BlogPost) => void;
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

export function HomePage({ onProductClick, onBlogPostClick }: HomePageProps) {
  const [products, setProducts] = useState<{ featured: Product[]; nonFeatured: Product[] }>({
    featured: [],
    nonFeatured: [],
  });
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const CATEGORIES = [
    { id: 340, title: 'Coffres & Armoires fortes' },
    { id: 286, title: 'Meubles Métalliques' },
    { id: 1139, title: 'Équipement Laboratoire' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

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
      const randomNonFeatured = shuffleArray(nonFeatured).slice(0, 6);

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

  const loadBlogPosts = async () => {
    try {
      // Fetch more posts for better randomization
      const posts = await api.getBlogPosts({ 
        per_page: 12, // Fetch more posts to randomize from
        orderby: 'date',
        order: 'desc'
      });
      // Only show actual blog posts from WordPress
      if (posts.length > 0) {
        // Shuffle and take only 3 posts for random display on homepage
        const shuffledPosts = shuffleArray(posts).slice(0, 3);
        setBlogPosts(shuffledPosts);
      } else {
        // If no posts, show empty state
        setBlogPosts([]);
      }
    } catch (error) {
      console.error('Error loading blog posts:', error);
      // If API fails, show empty state instead of sample data
      setBlogPosts([]);
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
        
        // 🔀 Shuffle and select random subset for display (8 products)
        results[cat.title] = shuffleArray(cachedProducts).slice(0, 8);
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

  // Helper function to get category slug for navigation
  const getCategorySlug = (categoryTitle: string): string => {
    const category = CATEGORIES.find(cat => cat.title === categoryTitle);
    return category ? `/categories/${category.id}` : '/categories';
  };

  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadBlogPosts();
  }, []);

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
    <div className="p-4 pb-20">
      {products.featured.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 dark:text-white">Produits vedettes</h2>
          <FeaturedProductsCarousel 
            products={products.featured} 
            onProductClick={onProductClick}
          />
        </section>
      )}

      {blogPosts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
            <JournalText size={24} />
            Articles récents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogPosts.map(post => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden">
                {post._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                  <img 
                    src={post._embedded['wp:featuredmedia'][0].source_url} 
                    alt={post._embedded['wp:featuredmedia']?.[0]?.alt_text || post.title.rendered}
                    className="w-full h-48 object-cover"
                    onClick={() => onBlogPostClick(post)}
                  />
                )}
                {!post._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                  <div 
                    className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                    onClick={() => onBlogPostClick(post)}
                  >
                    <JournalText size={48} className="text-white opacity-50" />
                  </div>
                )}
                <div className="p-6">
                  <h3 
                    className="font-semibold text-lg mb-2 text-gray-900 dark:text-white line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                    onClick={() => onBlogPostClick(post)}
                  >
                    {decodeHTMLEntities(post.title.rendered)}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <Calendar size={14} />
                    <span>{formatDate(post.date)}</span>
                  </div>
                  <div 
                    className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
                  />
                  <button 
                    onClick={() => onBlogPostClick(post)}
                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors"
                  >
                    Lire la suite 
                    <span className="text-primary-500">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 mb-8">
            <a 
              href="/blog"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
            >
              <JournalText size={16} />
              Voir tous les articles
            </a>
          </div>
        </section>
      )}

      {products.nonFeatured.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Nouveaux produits</h2>
          <div className="grid grid-cols-2 gap-4">
            {products.nonFeatured.map(product => (
              <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
            ))}
          </div>
        </section>
      )}

      {Object.entries(categoryProducts).map(([title, prods]) =>
        prods.length > 0 && (
          <section key={title} className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">{title}</h2>
              <Link
                to={getCategorySlug(title)}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm flex items-center gap-1 transition-colors duration-200"
              >
                Voir tous les produits
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {prods.map(product => (
                <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
              ))}
            </div>
          </section>
        )
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-30 right-4 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-40"
          aria-label="Back to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
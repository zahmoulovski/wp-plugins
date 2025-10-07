import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { BlogPost } from '../../types';
import { api } from '../../services/api';
import { cacheService } from '../../services/cache';
import { ProductCard } from '../common/ProductCard';
import { FeaturedProductsCarousel } from '../common/FeaturedProductsCarousel';
import { BannerSlider } from '../common/BannerSlider';
import { Calendar, JournalText, ArrowUp, ArrowRight } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { 
  ProductGridSkeleton, 
  BlogPostGridSkeleton, 
  CategoryListSkeleton,
  ImageSkeleton,
  TextSkeleton 
} from '../common/SkeletonLoader';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { logViewItem, logAddToCart, logSearch } from '../../utils/analytics';
import coffresPoster from '../assets/poster/coffres-banner.webp';



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
  const [products, setProducts] = useState<{ featured: Product[]; bestSellers: Product[] }>({
    featured: [],
    bestSellers: [],
  });
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Scroll to top when page loads
  useScrollToTop();

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

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate unique session ID for this load
      const sessionId = Date.now().toString().slice(-6);
      const homepageCacheKey = `homepage_data_${sessionId}`;
      
      // Check if we have cached homepage data
      const cachedData = cacheService.getProducts(homepageCacheKey);
      if (cachedData) {
        // Use cached data if available
        setProducts(cachedData.products);
        setCategoryProducts(cachedData.categoryProducts);
        setBlogPosts(cachedData.blogPosts);
        setLoading(false);
        return;
      }

      // Load ALL homepage data in parallel
      const [featuredProducts, bestSellersData, allCategoryProducts, blogPostsData] = await Promise.all([
        // Featured products
        api.getProducts({ per_page: 100, featured: true }),
        // Best sellers with randomization
        api.getBestSellers({ per_page: 20 }), // Get more for better randomization
        // All categories at once
        Promise.all(CATEGORIES.map(cat => api.getProducts({ per_page: 100, category: cat.id }))),
        // Blog posts
        api.getBlogPosts({ per_page: 12, orderby: 'date', order: 'desc' })
      ]);

      // Process featured products
      const randomFeatured = shuffleArray(featuredProducts).slice(0, 20);
      const filteredFeatured = api.filterAndSortProductsByStock(randomFeatured, { hideOutOfStock: true });

      // Process best sellers with randomization
      const shuffledBestSellers = shuffleArray(bestSellersData).slice(0, 8);
      const filteredBestSellers = api.filterAndSortProductsByStock(shuffledBestSellers, { hideOutOfStock: true });

      // Process category products
      const categoryResults: Record<string, Product[]> = {};
      CATEGORIES.forEach((cat, index) => {
        const shuffledCategory = shuffleArray(allCategoryProducts[index]).slice(0, 8);
        categoryResults[cat.title] = api.filterAndSortProductsByStock(shuffledCategory, { hideOutOfStock: true });
      });

      // Process blog posts
      const shuffledBlogPosts = blogPostsData.length > 0 ? shuffleArray(blogPostsData).slice(0, 3) : [];

      // Set all data at once
      const finalData = {
        products: {
          featured: filteredFeatured,
          bestSellers: filteredBestSellers,
        },
        categoryProducts: categoryResults,
        blogPosts: shuffledBlogPosts
      };

      setProducts(finalData.products);
      setCategoryProducts(finalData.categoryProducts);
      setBlogPosts(finalData.blogPosts);

      // Cache the complete homepage data for 5 minutes
      cacheService.setProducts(finalData, homepageCacheKey, 5 * 60 * 1000);

    } catch (err) {
      setError('Failed to load homepage data');
      console.error('Homepage data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load all homepage data in one go
  useEffect(() => {
    loadHomepageData();
  }, []);

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
    loadHomepageData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 pb-20">
        {/* Featured products skeleton */}
        <section className="mb-8">
          <TextSkeleton width="120px" height="24px" className="mb-4" />
          <div className="mb-8">
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex-shrink-0 w-64">
                  <ImageSkeleton width="100%" height="200px" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coffres & Armoires fortes skeleton */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <TextSkeleton width="200px" height="24px" />
            <TextSkeleton width="100px" height="16px" />
          </div>
          <div className="relative mb-6 overflow-hidden rounded-lg">
            <ImageSkeleton width="100%" height="200px" />
            <div className="absolute bottom-4 left-4">
              <TextSkeleton width="200px" height="20px" className="mb-2" />
              <TextSkeleton width="60px" height="16px" />
            </div>
          </div>
          <ProductGridSkeleton count={6} />
        </section>

        {/* Équipement Laboratoire skeleton with banner slider */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <TextSkeleton width="180px" height="24px" />
            <TextSkeleton width="100px" height="16px" />
          </div>
          <div className="mb-6">
            <div className="h-48 md:h-64 lg:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="flex justify-center mt-4 space-x-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
              ))}
            </div>
          </div>
          <ProductGridSkeleton count={6} />
        </section>

        {/* Best Sellers skeleton */}
        <section className="mb-8">
          <TextSkeleton width="120px" height="24px" className="mb-4" />
          <ProductGridSkeleton count={8} />
        </section>

        {/* Meubles Métalliques skeleton */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <TextSkeleton width="150px" height="24px" />
            <TextSkeleton width="80px" height="16px" />
          </div>
          <ProductGridSkeleton count={6} />
        </section>

        {/* Blog posts skeleton */}
        <section className="mb-8">
          <TextSkeleton width="150px" height="24px" className="mb-4" />
          <BlogPostGridSkeleton count={2} />
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 pb-20 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={loadHomepageData}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 mb-8">
      {products.featured.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 dark:text-white">Produits vedettes</h2>
          <FeaturedProductsCarousel 
            products={products.featured} 
            onProductClick={onProductClick}
          />
        </section>
      )}

      {/* Coffres & Armoires fortes section - moved to 2nd position */}
      {categoryProducts['Coffres & Armoires fortes'] && categoryProducts['Coffres & Armoires fortes'].length > 0 && (
        <section className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-white">Coffres & Armoires fortes</h2>
            <Link
              to="/categories/340"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm flex items-center gap-1 transition-colors duration-200"
            >
              Voir tous les produits
              <ArrowRight size={14} />
            </Link>
          </div>
          <Link to="/categories/340" className="block mb-6">
            <div className="relative overflow-hidden rounded-lg hover:opacity-90 transition-opacity duration-200">
              <img
                src={coffresPoster}
                alt="Coffres & Armoires fortes"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-lg font-bold mb-2">Sécurisez vos biens avec confiance.</h3>
                <span className="inline-flex items-center text-white hover:text-gray-200 font-medium text-sm transition-colors duration-200">
                  Voir plus
                  <ArrowRight size={14} className="ml-1" />
                </span>
              </div>
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-4">
            {categoryProducts['Coffres & Armoires fortes'].slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
            ))}
          </div>
        </section>
      )}

      {/* Équipement Laboratoire section - moved to 4th position with banner slider */}
      {categoryProducts['Équipement Laboratoire'] && categoryProducts['Équipement Laboratoire'].length > 0 && (
        <section className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-white">Équipement Laboratoire</h2>
            <Link
              to="/categories/1139"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm flex items-center gap-1 transition-colors duration-200"
            >
              Voir tous les produits
              <ArrowRight size={14} />
            </Link>
          </div>
          
          {/* Banner Slider inside Équipement Laboratoire section */}
          <div className="mb-6">
            <BannerSlider />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {categoryProducts['Équipement Laboratoire'].slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
            ))}
          </div>
        </section>
      )}

      

      {products.bestSellers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Meilleures ventes</h2>
          <div className="grid grid-cols-2 gap-4">
            {products.bestSellers.map(product => (
              <ProductCard key={product.id} product={product} onProductClick={onProductClick} />
            ))}
          </div>
        </section>
      )}

      {/* Other category sections */}
      {Object.entries(categoryProducts).map(([title, prods]) =>
        title !== 'Coffres & Armoires fortes' && title !== 'Équipement Laboratoire' && prods.length > 0 && (
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

      {/* Blog Section - moved to end */}
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
import React, { useState, useEffect } from 'react';
import { BlogPost } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Calendar, Person, JournalText } from 'react-bootstrap-icons';
import { useScrollToTop } from '../../hooks/useScrollToTop';



interface BlogPageProps {
  onPostClick: (post: BlogPost) => void;
}

export function BlogPage({ onPostClick }: BlogPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Scroll to top when page loads
  useScrollToTop();

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch blog posts from WordPress API
      const blogPosts = await api.getBlogPosts({ 
        per_page: 20,
        orderby: 'date',
        order: 'desc'
      });

      if (blogPosts.length === 0 && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadPosts(), 2000); // Retry after 2 seconds
        return;
      }

      // Only set posts if we have actual data from the API
      if (blogPosts.length > 0) {
        setPosts(blogPosts);
      } else {
        // If no posts after retries, show empty state
        setPosts([]);
      }
    } catch (err) {
      setError('Impossible de charger les articles du blog. Veuillez réessayer.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFeaturedImage = (post: BlogPost) => {
    if (post._embedded?.['wp:featuredmedia']?.[0]) {
      return post._embedded['wp:featuredmedia'][0].source_url;
    }
    return '/api/placeholder/600/400';
  };

  const getAuthorName = (post: BlogPost) => {
    if (post._embedded?.author?.[0]) {
      return post._embedded.author[0].name;
    }
    return 'Auteur';
  };

  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="p-4 pb-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Erreur de connexion</p>
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        </div>
        <button
          onClick={() => {
            setRetryCount(0);
            loadPosts();
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
        >
          Réessayer
        </button>
        {retryCount > 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Tentative {retryCount} sur 2
          </p>
        )}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-4 pb-20 text-center">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
          <JournalText className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Aucun article de blog disponible
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Les articles du blog seront bientôt disponibles. Revenez plus tard !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 mb-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Blog</h1>
        <p className="text-gray-600 dark:text-gray-400">Découvrez nos derniers articles et actualités</p>
      </div>
      
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <JournalText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">Aucun article disponible</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Revenez bientôt pour découvrir nos nouveaux articles</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.id}
              onClick={() => onPostClick(post)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
            >
              {/* Featured Image */}
              <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={getFeaturedImage(post)}
                  alt={post.title.rendered}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Category Badge */}
                {post.categories && post.categories.length > 0 && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Article
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h2 
                  className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200"
                  dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                />
                
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 space-x-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                </div>

                <div 
                  className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4"
                  dangerouslySetInnerHTML={{ __html: post.excerpt.rendered.replace(/<[^>]*>/g, '') }}
                />

                <div className="flex items-center justify-between">
                  <span className="text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:underline">
                    Lire la suite
                  </span>
                  <div className="text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform duration-200">
                    →
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowClockwise, BoxArrowUpRight, Calendar3, Person, Link45deg } from 'react-bootstrap-icons';
import { api } from '../../services/api';
import { PortfolioItem } from '../../types';

interface PortfolioDetailProps {
  className?: string;
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({ className = '' }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  useEffect(() => {
    if (slug) {
      fetchPortfolioItem();
    }
  }, [slug]);

  const fetchPortfolioItem = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch portfolio items and find the one with matching slug
      const portfolioItems = await api.getPortfolioItems({
        per_page: 100, // Get more items to find by slug
        _embed: 'true'
      });
      
      const foundItem = portfolioItems.find(item => item.slug === slug);
      
      if (foundItem) {
        setItem(foundItem);
      } else {
        setError('Projet non trouvé');
      }
    } catch (err) {
      console.error('Error fetching portfolio item:', err);
      setError('Erreur lors du chargement du projet');
    } finally {
      setLoading(false);
    }
  };

  const getProjectImages = () => {
    const images = [];
    
    // Add featured image if available
    if (item?.featured_image) {
      images.push(item.featured_image);
    }
    
    // Add images from custom fields if available
    if (item?.custom_fields?.project_images) {
      if (Array.isArray(item.custom_fields.project_images)) {
        images.push(...item.custom_fields.project_images);
      } else if (typeof item.custom_fields.project_images === 'string') {
        images.push(item.custom_fields.project_images);
      }
    }
    
    // Add embedded images if available
    if (item?._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes) {
      const mediaSizes = item._embedded['wp:featuredmedia'][0].media_details.sizes;
      Object.values(mediaSizes).forEach((size: any) => {
        if (size.source_url && !images.includes(size.source_url)) {
          images.push(size.source_url);
        }
      });
    }
    
    return images;
  };

  const nextImage = () => {
    const images = getProjectImages();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = getProjectImages();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[600px] ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 animate-spin text-primary mx-auto mb-4">
            <ArrowClockwise className="w-12 h-12" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={`flex items-center justify-center min-h-[600px] ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error || 'Projet non trouvé'}</p>
          <button 
            onClick={() => navigate('/portfolio')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retour au portfolio
          </button>
        </div>
      </div>
    );
  }

  const projectImages = getProjectImages();
  const currentImage = projectImages[currentImageIndex];

  return (
    <div className={`max-w-6xl mx-auto px-4 py-8 ${className}`}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/portfolio')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour au portfolio
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          {currentImage && (
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={currentImage}
                alt={item.title.rendered}
                className="w-full h-full object-cover"
              />
              
              {projectImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <BoxArrowUpRight className="w-5 h-5 rotate-45" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {projectImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Thumbnail Gallery */}
          {projectImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {projectImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex 
                      ? 'border-primary' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${item.title.rendered} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {item.title.rendered}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <span className="flex items-center gap-1">
                <Calendar3 className="w-4 h-4" />
                {new Date(item.date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1">
                <Person className="w-4 h-4" />
                {item._embedded?.author?.[0]?.name || 'Unknown'}
              </span>
            </div>

            {item.portfolio_categories && item.portfolio_categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {item.portfolio_categories.map((category) => (
                  <span
                    key={category.id}
                    className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full dark:bg-primary/20"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: item.content.rendered || item.excerpt.rendered 
              }} 
            />
          </div>

          {/* Custom Fields */}
          {item.custom_fields && (
            <div className="space-y-4">
              {item.custom_fields.client_name && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Client</h3>
                  <p className="text-gray-700 dark:text-gray-300">{item.custom_fields.client_name}</p>
                </div>
              )}
              
              {item.custom_fields.project_date && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Date du projet</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {new Date(item.custom_fields.project_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              
              {item.custom_fields.skills && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Compétences</h3>
                  <p className="text-gray-700 dark:text-gray-300">{item.custom_fields.skills}</p>
                </div>
              )}
              
              {item.custom_fields.project_url && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lien du projet</h3>
                  <a
                    href={item.custom_fields.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Link45deg className="w-4 h-4" />
                    Visiter le site
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioDetail;
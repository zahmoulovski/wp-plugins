import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowClockwise, BoxArrowUpRight, Calendar3, Person, Link45deg, ArrowLeft } from 'react-bootstrap-icons';
import { api } from '../../services/api';
import { PortfolioItem } from '../../types';
import Lightbox from './Lightbox';

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
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

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
    const imageSet = new Set();
    
    // Add featured image if available
    if (item?.featured_image) {
      images.push(item.featured_image);
      imageSet.add(item.featured_image);
    }
    
    // Add images from custom fields if available
    if (item?.custom_fields?.project_images) {
      if (Array.isArray(item?.custom_fields?.project_images)) {
        item.custom_fields.project_images.forEach(img => {
          if (!imageSet.has(img)) {
            images.push(img);
            imageSet.add(img);
          }
        });
      } else if (typeof item.custom_fields.project_images === 'string') {
        if (!imageSet.has(item.custom_fields.project_images)) {
          images.push(item.custom_fields.project_images);
          imageSet.add(item.custom_fields.project_images);
        }
      }
    }
    
    // Add embedded images if available
    if (item?._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes) {
      const mediaSizes = item._embedded['wp:featuredmedia'][0].media_details.sizes;
      Object.values(mediaSizes).forEach((size: any) => {
        if (size.source_url && !imageSet.has(size.source_url)) {
          images.push(size.source_url);
          imageSet.add(size.source_url);
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

  const getContentImages = () => {
    if (!item?.content?.rendered) return [];
    
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    const images = [];
    let match;
    
    while ((match = imgRegex.exec(item.content.rendered)) !== null) {
      images.push(match[1]);
    }
    
    return images;
  };

  const renderContentWithGallery = () => {
    if (!item?.content?.rendered) return null;
    
    const contentImages = getContentImages();
    
    if (contentImages.length === 0) {
      return (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: item.content.rendered || item.excerpt.rendered 
          }} 
        />
      );
    }
    
    // Remove images from content to show them in gallery
    const contentWithoutImages = item.content.rendered.replace(/<img[^>]+>/g, '');
    
    return (
      <div className="space-y-8">
        {/* Pinterest-style gallery for content images */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galerie d'images</h2>
          
          {/* Pinterest-style masonry grid */}
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            {contentImages.map((image, index) => (
              <div key={index} className="break-inside-avoid">
                <div 
                  className="relative group cursor-pointer overflow-hidden rounded-lg"
                  style={{ borderRadius: '5px' }}
                  onClick={() => {
                    setCurrentImageIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={image}
                    alt={`${item.title.rendered} - Image ${index + 1}`}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ gap: '10px' }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <BoxArrowUpRight className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Content without images */}
        <div 
          dangerouslySetInnerHTML={{ 
            __html: contentWithoutImages || item.excerpt.rendered 
          }} 
        />
      </div>
    );
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
            onClick={() => navigate('/galerie')}
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
    <div className={`max-w-6xl mx-auto px-4 py-8 mb-20 ${className}`}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/galerie')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour au portfolio
      </button>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Project Details */}
         <div className="space-y-6 lg:col-span-2">
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

              {item.project_categories && item.project_categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {item.project_categories.map((category) => (
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
              {renderContentWithGallery()}
            </div>           
         </div>
       </div>

       {/* Lightbox */}
       <Lightbox
         images={getContentImages()}
         currentIndex={currentImageIndex}
         isOpen={lightboxOpen}
         onClose={() => setLightboxOpen(false)}
       />
     </div>
   );
 };

export default PortfolioDetail;
import React, { useState, useRef, useEffect } from 'react';
import { Share, Facebook, Whatsapp, ChatDots, Telephone, Envelope, Link45deg, X, Twitter, Instagram, Linkedin, Telegram } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

interface StyleShareProps {
  productName: string;
  productId: number;
  currentPrice: string;
  productUrl: string;
}

export function StyleShare({ 
  productName, 
  productId, 
  currentPrice, 
  productUrl
}: StyleShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const shareText = `Découvrez ${productName} à ${currentPrice} sur Klarrion`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedProductUrl = encodeURIComponent(productUrl);

  // Platform-specific share texts
  const getPlatformText = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return `Découvrez ${productName} à ${currentPrice} ! 🛍️ #Klarrion #Shopping`;
      case 'instagram':
        return `Découvrez ${productName} à ${currentPrice} sur @klarrion ! ✨`;
      case 'linkedin':
        return `Produit intéressant sur Klarrion : ${productName} à ${currentPrice}`;
      default:
        return shareText;
    }
  };

  // Deep link for your mobile app
  const appDeepLink = `com.klarrion.sarl://product/${productId}`;

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => handleShare('facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}&quote=${encodedShareText}`)
    },
    {
      name: 'WhatsApp',
      icon: Whatsapp,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => handleShare('whatsapp', `https://api.whatsapp.com/send?text=${encodedShareText}%20${encodedProductUrl}`)
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500 hover:bg-sky-600',
      action: () => handleShare('twitter', `https://twitter.com/intent/tweet?text=${encodeURIComponent(getPlatformText('twitter'))}&url=${encodedProductUrl}`)
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      action: () => handleShare('linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${encodedProductUrl}`)
    },
    {
      name: 'Telegram',
      icon: Telegram,
      color: 'bg-sky-600 hover:bg-sky-700',
      action: () => handleShare('telegram', `https://t.me/share/url?url=${encodedProductUrl}&text=${encodedShareText}`)
    },
    {
      name: 'Messenger',
      icon: ChatDots,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => handleMessengerShare()
    },
    {
      name: 'Email',
      icon: Envelope,
      color: 'bg-red-600 hover:bg-red-700',
      action: () => handleShare('email', `mailto:?subject=${encodeURIComponent(`Découvrez ${productName}`)}&body=${encodedShareText}%20${encodedProductUrl}`)
    }
  ];

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleShare = (platform: string, url: string) => {
    try {
      // For mobile devices, try deep linking first
      if (isMobileDevice()) {
        // Try to open the app with deep link
        const appUrl = `${appDeepLink}?fallback=${encodeURIComponent(url)}`;
        window.location.href = appUrl;
        
        // Fallback after timeout if app doesn't open
        setTimeout(() => {
          window.open(url, '_blank');
        }, 1500);
      } else {
        // For desktop, open directly in new tab
        window.open(url, '_blank');
      }
      
      toast.success(`Partagé sur ${platform}!`);
      setIsOpen(false);
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      toast.error('Erreur lors du partage');
    }
  };

  const handleMessengerShare = () => {
    // Messenger requires a different approach
    const messengerUrl = `fb-messenger://share/?link=${encodedProductUrl}&app_id=com.klarrion.sarl`;
    
    if (isMobileDevice()) {
      window.location.href = messengerUrl;
      setTimeout(() => {
        toast.success('Ouverture de Messenger...');
      }, 500);
    } else {
      // Fallback for desktop
      window.open(`https://www.facebook.com/messages/t/`, '_blank');
    }
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopiedLink(true);
      toast.success('Lien copié dans le presse-papiers!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie du lien:', err);
      toast.error('Erreur lors de la copie du lien');
    }
  };

  return (
    <div className="relative">
      {/* Share Button - YouTube Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 font-medium"
      >
        <Share className="h-4 w-4" />
        <span>Partager</span>
      </button>

      {/* Share Menu Modal - YouTube Style */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div 
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Partager ce produit
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Share Options Grid */}
            <div className="p-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Partager ce produit</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{productName}</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  {shareOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.name}
                        onClick={option.action}
                        className={`flex items-center justify-center w-[30px] h-[30px] rounded-full ${option.color} text-white transition-all duration-200 hover:scale-110 active:scale-95 shadow-md`}
                        title={option.name}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>

                {/* Copy Link Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
                  >
                    <Link45deg className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    <span className="font-medium text-gray-700 dark:text-gray-200">Copier le lien</span>
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Facebook, ChatDots, Telephone, Envelope, Link45deg } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

interface ProductShareButtonsProps {
  productName: string;
  productId: number;
  currentPrice: string;
  productUrl: string;
  className?: string;
}

export function ProductShareButtons({ 
  productName, 
  productId, 
  currentPrice, 
  productUrl,
  className = ''
}: ProductShareButtonsProps) {
  const [isSharing, setIsSharing] = useState<string | null>(null);
  
  const shareText = `Découvrez ${productName} - ${currentPrice}`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedProductUrl = encodeURIComponent(productUrl);

  // Deep link for your mobile app
  const appDeepLink = `com.klarrion.sarl://product/${productId}`;
  
  // Fallback URL for web
  const fallbackUrl = productUrl;

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}&quote=${encodedShareText}`,
    whatsapp: `https://wa.me/?text=${encodedShareText}%20${encodedProductUrl}`,
    sms: `sms:?body=${encodedShareText}%20${encodedProductUrl}`
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleShare = async (platform: keyof typeof shareUrls) => {
    try {
      setIsSharing(platform);
      
      // For mobile devices, try deep linking first
      if (isMobileDevice()) {
        // Try to open the app with deep link
        const appUrl = `${appDeepLink}?fallback=${encodeURIComponent(shareUrls[platform])}`;
        window.location.href = appUrl;
        
        // Fallback after timeout if app doesn't open
        setTimeout(() => {
          window.open(shareUrls[platform], '_blank');
          setIsSharing(null);
        }, 1500);
      } else {
        // For desktop, open directly in new tab
        window.open(shareUrls[platform], '_blank');
        setIsSharing(null);
      }
      
      // Show success toast
      toast.success(`Partagé sur ${platform === 'facebook' ? 'Facebook' : platform === 'whatsapp' ? 'WhatsApp' : 'SMS'}!`);
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      toast.error('Erreur lors du partage');
      setIsSharing(null);
    }
  };

  const handleMessengerShare = () => {
    // Messenger requires a different approach - using the share dialog
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
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fallbackUrl);
      toast.success('Lien copié dans le presse-papiers!');
    } catch (err) {
      console.error('Erreur lors de la copie du lien:', err);
      toast.error('Erreur lors de la copie du lien');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Partager ce produit
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Facebook */}
        <button
          onClick={() => handleShare('facebook')}
          disabled={isSharing === 'facebook'}
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <Facebook className="h-4 w-4" />
          <span className="text-sm font-medium">Facebook</span>
        </button>

        {/* Messenger */}
        <button
          onClick={handleMessengerShare}
          disabled={isSharing === 'messenger'}
          className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <ChatDots className="h-4 w-4" />
          <span className="text-sm font-medium">Messenger</span>
        </button>

        {/* WhatsApp */}
        <button
          onClick={() => handleShare('whatsapp')}
          disabled={isSharing === 'whatsapp'}
          className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <Telephone className="h-4 w-4" />
          <span className="text-sm font-medium">WhatsApp</span>
        </button>

        {/* SMS */}
        <button
          onClick={() => handleShare('sms')}
          disabled={isSharing === 'sms'}
          className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <Envelope className="h-4 w-4" />
          <span className="text-sm font-medium">SMS</span>
        </button>
      </div>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-2"
      >
        <Link45deg className="h-4 w-4" />
        <span>Copier le lien</span>
      </button>
    </div>
  );
}
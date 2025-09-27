import { useState, useEffect } from 'react';

interface KonnectPaymentProps {
  showKonnectIframe: boolean;
  konnectPayUrl: string | null;
  onClose: () => void;
}

export const useKonnectPayment = () => {
  const [showKonnectIframe, setShowKonnectIframe] = useState(false);
  const [konnectPayUrl, setKonnectPayUrl] = useState<string | null>(null);

  const openKonnectPayment = (paymentUrl: string) => {
    setKonnectPayUrl(paymentUrl);
    setShowKonnectIframe(true);
  };

  const closeKonnectPayment = () => {
    setShowKonnectIframe(false);
    setKonnectPayUrl(null);
  };

  return {
    showKonnectIframe,
    konnectPayUrl,
    openKonnectPayment,
    closeKonnectPayment,
  };
};

export const KonnectPaymentModal = ({ 
  showKonnectIframe, 
  konnectPayUrl, 
  onClose 
}: KonnectPaymentProps) => {
  if (!showKonnectIframe || !konnectPayUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full h-screen flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium">Paiement Konnect</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Annuler
          </button>
        </div>
        <iframe 
          src={konnectPayUrl} 
          className="flex-1 w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title="Konnect Payment"
        />
      </div>
    </div>
  );
};

export default useKonnectPayment;
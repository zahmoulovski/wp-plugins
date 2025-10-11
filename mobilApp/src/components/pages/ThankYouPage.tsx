import React, { useEffect, useState } from 'react';
import { CheckCircle, House, Bag, XCircle } from 'react-bootstrap-icons';
import { api } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import paymentLogo from '../../components/assets/payment-logo.png';
import { KonnectPaymentModal, useKonnectPayment } from '../../hooks/useKonnectPayment';
import { logPurchase } from '../../utils/analytics';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { getProductTaxInfo, calculateTotalTax } from '../../utils/taxUtils';

interface OrderProduct {
  id: string;
  name: string;
  price: string;
  quantity: number;
  image?: string;
  sku?: string;
}

interface BillingInfo {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

interface ShippingLine {
  method_title: string;
  total: string;
}

interface PaymentDetails {
  payment_method_title: string;
}

interface OrderDetails {
  id: number;
  total: string;
  status: string;
  currency: string;
  date_created: string;
  billing: any;
  shipping: any;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
  fee_lines?: Array<{
    name: string;
    total: string;
  }>;
  shipping_lines?: ShippingLine[];
  payment_method_title?: string;
}

interface ThankYouPageProps {
  orderDetails: {
    order: OrderDetails;
    subtotal: string;
  };
  onBackToHome: () => void;
  onContinueShopping: () => void;
}

export function ThankYouPage({ orderDetails, onBackToHome, onContinueShopping }: ThankYouPageProps) {
  // Scroll to top when page loads
  useScrollToTop();
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderDetails | null>(null);
  const [subtotal, setSubtotal] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [fromProfile, setFromProfile] = useState(false);
  const [isOrderOld, setIsOrderOld] = useState(false);
  const [allOrders, setAllOrders] = useState<OrderDetails[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const konnectModal = useKonnectPayment();

  /* -------  KONNECT MODAL LISTENER  ------- */
  const handleKonnectClose = async () => {
    // Handle payment cancellation/failure when close button is clicked
    if (orderData) {
      try {
        // Update order status to on-hold
        await api.updateOrder(orderData.id, { status: 'on-hold' });
        
        // Refresh order details with a small delay to ensure server update
        setTimeout(async () => {
          const updatedOrder = await api.getOrder(orderData.id);
          console.log('Order status after refresh:', updatedOrder.status);
          setOrderData(updatedOrder);
        }, 1000);
        
        // Show message
        setPaymentError('Paiement annulé. Votre commande est en attente.');
      } catch (error) {
        console.error('Error refreshing order status:', error);
        setPaymentError('Erreur lors de la mise à jour du statut de la commande.');
      }
    }
    
    // Close the modal
    konnectModal.closeKonnectPayment();
  };

  useEffect(() => {
    if (!konnectModal.showKonnectIframe || !konnectModal.konnectPayUrl || !orderData) return;

    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.includes('konnect.network')) return;
      if (event.data === 'payment_success') {
        try {
          await api.updateOrder(orderData.id, { status: 'completed' });
          
          // Refresh order details with a small delay to ensure server update
          setTimeout(async () => {
            const updatedOrder = await api.getOrder(orderData.id);
            console.log('Order status after payment success:', updatedOrder.status);
            setOrderData(updatedOrder);
          }, 1000);
          
          // Track successful purchase for Konnect payments
          logPurchase(orderData.id, parseFloat(orderData.total));
          
          konnectModal.closeKonnectPayment();
          setPaymentError(''); // Clear any previous errors
        } catch (error) {
          console.error('Error handling payment success:', error);
        }
      } else if (event.data === 'payment_failed') {
        try {
          await api.updateOrder(orderData.id, { status: 'on-hold' });
          
          // Refresh order details with a small delay to ensure server update
          setTimeout(async () => {
            const updatedOrder = await api.getOrder(orderData.id);
            console.log('Order status after payment failure:', updatedOrder.status);
            setOrderData(updatedOrder);
          }, 1000);
          
          konnectModal.closeKonnectPayment();
          setPaymentError('Le paiement a échoué. Votre commande est en attente.');
        } catch (error) {
          console.error('Error handling payment failure:', error);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [konnectModal.showKonnectIframe, konnectModal.konnectPayUrl, orderData]);

  const verifyOrderByEmail = async (email: string, orderId: string) => {
    setIsLoading(true);
    setEmailVerificationError('');

    try {
      const order = await api.getOrder(parseInt(orderId));

      if (order.billing && order.billing.email === email) {
        setOrderData(order);
        setSubtotal(order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(3));

        // Check if order is older than 24 hours
        const orderDate = new Date(order.date_created);
        const now = new Date();
        const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        setIsOrderOld(hoursDiff > 24);

        sessionStorage.setItem(`order_${orderId}`, JSON.stringify({
          order: order,
          subtotal: order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(3)
        }));

        setShowEmailForm(false);
      } else {
        setEmailVerificationError('Aucune commande trouvée avec cet email. Veuillez vérifier votre email et reessayer.');
      }
    } catch (error) {
      setEmailVerificationError('Erreur lors de la vérification de la commande. Veuillez reessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerEmail && orderId) {
      verifyOrderByEmail(customerEmail, orderId);
    }
  };

  const loadAllOrders = async () => {
    if (!state.customer) return;
    
    try {
      const orders = await api.getAllOrdersForCustomer(state.customer.id);
      setAllOrders(orders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleOrderSelect = async (orderId: number) => {
    try {
      setIsLoading(true);
      const order = await api.getOrder(orderId);
      setOrderData(order);
      setSubtotal(order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(3));
      
      // Check if order is older than 24 hours
      const orderDate = new Date(order.date_created);
      const now = new Date();
      const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      setIsOrderOld(hoursDiff > 24);
      
      // Update URL
      navigate(`/thank-you?order_id=${orderId}&from_profile=true`);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setOrderId(hash);
    
    // Check if coming from profile page
    const searchParams = new URLSearchParams(location.search);
    const fromProfileParam = searchParams.get('from_profile');
    if (fromProfileParam === 'true') {
      setFromProfile(true);
    }
    
    // Load order ID from URL parameter if available
    const orderIdParam = searchParams.get('order_id');
    if (orderIdParam) {
      setOrderId(orderIdParam);
    }

    if (location.state?.error) {
      setPaymentError(location.state.error);
      setIsLoading(false);
      return;
    }

    if (location.state?.order) {
      setOrderData(location.state.order);
      setSubtotal(location.state.order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(3));
      setIsLoading(false);
      return;
    }

    if (orderDetails?.order) {
      setOrderData(orderDetails.order);
      setSubtotal(orderDetails.subtotal);
      setIsLoading(false);
    } else if (hash) {
      const stored = sessionStorage.getItem(`order_${hash}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOrderData(parsed.order);
        setSubtotal(parsed.subtotal);
      } else {
        setShowEmailForm(true);
      }
      setIsLoading(false);
    } else if (orderIdParam && fromProfileParam === 'true') {
      // Auto-load order when coming from profile page
      handleOrderSelect(parseInt(orderIdParam));
    } else {
      setIsLoading(false);
    }
  }, [orderDetails, location.state, location.search]);

  const order = orderData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement des détails de la commande...</p>
        </div>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="p-4 pb-20">
        <div className="text-center mb-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Paiement Échoué
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            {paymentError}
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Veuillez réessayer !
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onBackToHome}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <House className="h-5 w-5" />
            Retour à l'accueil
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Bag className="h-5 w-5" />
            Voir mes commandes
          </button>
        </div>
      </div>
    );
  }

  if (!order && showEmailForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-blue-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Vérification de Commande
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Pour accéder à la commande #{orderId}, veuillez entrer l'adresse email utilisée lors de la commande.
            </p>
          </div>

          <form onSubmit={handleEmailVerification} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse Email
              </label>
              <input
                type="email"
                id="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="votre@email.com"
                required
              />
            </div>

            {emailVerificationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{emailVerificationError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                {isLoading ? 'Vérification...' : 'Vérifier'}
              </button>
              <button
                type="button"
                onClick={onBackToHome}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Retour
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ou <button
                onClick={() => {
                  // Redirect to login or show login modal
                  window.dispatchEvent(new CustomEvent('showLoginModal'));
                }}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                connectez-vous à votre compte
              </button> pour voir toutes vos commandes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Commande Non Trouvée</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Aucune commande trouvée. Veuillez vérifier le numéro de commande ou contactez le support.</p>
          <button
            onClick={onBackToHome}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <House size={20} />
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const calculateFeeTotal = () => {
    if (!order.fee_lines) return 0;
    return order.fee_lines.reduce((total, fee) => total + parseFloat(fee.total), 0);
  };

  const calculateSubtotalHT = () => {
    if (!orderData) return '0.000';
    
    const subtotalHT = orderData.line_items.reduce((total, item) => {
      const itemTotal = parseFloat(item.total || '0');
      // Since item.total is TTC (tax-inclusive), we need to extract HT
      // For simplicity, we'll assume standard 19% tax rate for order items
      // In a real implementation, you'd need to get the actual tax class from the product
      const taxRate = 19; // Default tax rate
      const htAmount = itemTotal / (1 + taxRate / 100);
      return total + htAmount;
    }, 0);
    
    return subtotalHT.toFixed(3);
  };

  const calculateTaxAmount = () => {
    if (!orderData) return '0.000';
    
    const taxAmount = orderData.line_items.reduce((total, item) => {
      const itemTotal = parseFloat(item.total || '0');
      // Extract tax from TTC price
      const taxRate = 19; // Default tax rate
      const htAmount = itemTotal / (1 + taxRate / 100);
      const tax = itemTotal - htAmount;
      return total + tax;
    }, 0);
    
    return taxAmount.toFixed(3);
  };

  const handlePayOrder = async () => {
    if (!orderData) return;

    setIsProcessingPayment(true);
    try {
      const amount = Math.round(parseFloat(orderData.total) * 1000);

      const paymentData = {
        amount,
        first_name: orderData.billing.first_name,
        last_name: orderData.billing.last_name,
        phone: orderData.billing.phone,
        email: orderData.billing.email,
        success_link: `${window.location.origin}/payment-success?order_id=${orderData.id}`,
        fail_link: `${window.location.origin}/payment-failed?order_id=${orderData.id}`,
        session_id: `order_${orderData.id}`,
      };

      const payment = await api.initKonnectPayment(paymentData);
      
      await api.updateOrderMeta(orderData.id, { konnect_payment_id: payment.paymentRef });
      
      // Store order details for potential return
      const orderDetails = { order: orderData, subtotal: orderData.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(3) };
      sessionStorage.setItem(`order_${orderData.id}`, JSON.stringify(orderDetails));
      
      // Open payment in modal instead of new tab
      konnectModal.openKonnectPayment(payment.payUrl);

    } catch (error) {
      setPaymentError('Erreur lors de l\'initialisation du paiement. Veuillez reessayer.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleOrderAgain = async () => {
    // Feature disabled - show French info message
    console.log('Order again button clicked - showing toast');
    
    // Prevent multiple rapid clicks
    if ((window as any).__orderAgainClicked) {
      return;
    }
    
    (window as any).__orderAgainClicked = true;
    
    toast('Cette fonctionnalité sera bientôt disponible !', {
      icon: 'ℹ️',
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#3b82f6',
        color: '#fff',
      },
      onDismiss: () => {
        (window as any).__orderAgainClicked = false;
      }
    });
  };

  return (
    <div className="p-4 pb-20 mb-8">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isOrderOld ? 'Détails de la Commande' : 'Commande Confirmée !'}
        </h1>
        {isOrderOld ? (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            La commande #{orderData.id} a été passée le {new Date(orderData.date_created).toLocaleDateString('fr-FR')} et est actuellement {orderData.status}.
          </p>
        ) : (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Votre commande #{orderData.id} a été placée avec succès
          </p>
        )}
        <div className="mt-4">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            orderData.status === 'completed' ? 'bg-green-100 text-green-800' :
            orderData.status === 'processing' ? 'bg-blue-100 text-blue-800' :
            orderData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            orderData.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            orderData.status === 'on-hold' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            Statut: {orderData.status}
          </span>
          <button
            onClick={async () => {
              try {
                console.log('Refreshing order status...');
                const refreshedOrder = await api.getOrder(orderData.id);
                console.log('Refreshed order status:', refreshedOrder.status);
                setOrderData(refreshedOrder);
              } catch (error) {
                console.error('Error refreshing order status:', error);
              }
            }}
            className="ml-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors duration-200"
            title="Actualiser le statut"
          >
            Actualiser
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Détails de la Commande
          </h2>
          
          <div className="space-y-4">
            {orderData.line_items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quantité: {item.quantity}
                    <br />
                    Réf : {item.sku}
                    {item.meta_data && item.meta_data.length > 0 && (
                      <>
                        <br />
                        {item.meta_data
                          .filter(meta => 
                            meta.key && 
                            meta.value && 
                            !meta.key.startsWith('_') && 
                            meta.key !== 'konnect_payment_id' && 
                            meta.key !== 'is_vat_exempt'
                          )
                          .map((meta, index) => (
                            <span key={index}>
                              {meta.key.replace('pa_', '')}: {meta.value}
                              {index < item.meta_data.filter(meta => 
                                meta.key && 
                                meta.value && 
                                !meta.key.startsWith('_') && 
                                meta.key !== 'konnect_payment_id' && 
                                meta.key !== 'is_vat_exempt'
                              ).length - 1 && <br />}
                            </span>
                          ))
                        }
                      </>
                    )}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    const itemTotal = parseFloat(item.total || '0');
                    // Extract HT from TTC price (assuming 19% tax rate)
                    const taxRate = 19; // Default tax rate
                    const htAmount = itemTotal / (1 + taxRate / 100);
                    return `${htAmount.toFixed(3)} TND HT`;
                  })()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:text-white dark:border-gray-600 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sous-total HT</span>
              <span className="font-semibold">{calculateSubtotalHT()} TND HT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Taxe</span>
              <span className="font-semibold">{calculateTaxAmount()} TND</span>
            </div>
            {orderData.shipping_lines && orderData.shipping_lines.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Livraison</span>
                <span className="font-semibold">{parseFloat(orderData.shipping_lines[0].total).toFixed(3)} TND</span>
              </div>
            )}
            {orderData.fee_lines && orderData.fee_lines.map((fee, index) => (
              <div key={index} className="flex justify-between dark:text-white">
                <span className="text-gray-600 dark:text-gray-400">{fee.name}</span>
                <span className="font-semibold">{fee.total} TND</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
              <span>Total</span>
              <span className="text-primary-600 dark:text-primary-400">
                {orderData.total} TND
              </span>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Informations de Facturation
          </h2>
          
          <div className="space-y-2 text-gray-700 dark:text-white">
            {orderData.billing && (
              <>
                <p><strong>Nom:</strong> {orderData.billing.first_name} {orderData.billing.last_name}</p>
                <p><strong>Email:</strong> {orderData.billing.email}</p>
                <p><strong>Téléphone:</strong> {orderData.billing.phone}</p>
                <p><strong>Adresse:</strong> {orderData.billing.address_1}</p>
                <p><strong>Ville:</strong> {orderData.billing.city}, {orderData.billing.state}</p>
                <p><strong>Code Postal:</strong> {orderData.billing.postcode}</p>
                <p><strong>Pays:</strong> {orderData.billing.country}</p>
              </>
            )}
            {orderData.shipping_lines && orderData.shipping_lines.length > 0 && (
              <p><strong>Méthode de livraison:</strong> {orderData.shipping_lines[0].method_title}</p>
            )}
            {orderData.payment_method_title && (
              <p><strong>Méthode de paiement:</strong> {orderData.payment_method_title}</p>
            )}

            {/* Payment Button - Show only for pending, on-hold, or processing orders */}
          {orderData.status === 'pending' || orderData.status === 'on-hold' || orderData.status === 'processing' ? (
            <button
              onClick={handlePayOrder}
              disabled={isProcessingPayment}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isProcessingPayment ? 'Traitement...' : 'Payer En ligne'}
              <img src={paymentLogo} alt="Paiement" className="h-5" />
            </button>
          ) : null}

          <button
                  onClick={handleOrderAgain}
                  className="w-full bg-gray-400 text-white py-3 px-4 rounded-xl font-semibold cursor-not-allowed opacity-60"
                >
                  Commander à nouveau !
                </button>

          </div>
        </div>

        {/* Payment Error */}
        {paymentError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{paymentError}</p>
            </div>
          </div>
        )}

        {/* Navigation and Order Selection */}
        {(fromProfile || isOrderOld) && (
          <div className="space-y-4">
            {fromProfile && (
              <button
                onClick={() => navigate('/profile')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <House className="h-5 w-5" />
                Retour au profil
              </button>
            )}
            
            {state.customer && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={loadAllOrders}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium mb-3"
                >
                  Voir mes commandes précédentes
                </button>
                
                {allOrders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sélectionner une autre commande :</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {allOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => handleOrderSelect(order.id)}
                          className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                            order.id === orderData.id 
                              ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200' 
                              : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>Commande #{order.id}</span>
                            <span className="text-xs">{new Date(order.date_created).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {(() => {
                              const orderTotal = parseFloat(order.total || '0');
                              // Extract HT from TTC price (assuming 19% tax rate)
                              const taxRate = 19; // Default tax rate
                              const htAmount = orderTotal / (1 + taxRate / 100);
                              return `${htAmount.toFixed(3)} TND HT`;
                            })()} • {order.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          

          <div className="flex gap-4">
            <button
              onClick={onBackToHome}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <House className="h-5 w-5" />
              Retour à l'accueil
            </button>
            <button
              onClick={onContinueShopping}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Bag className="h-5 w-5" />
              Continuer vos achats
            </button>
          </div>
        </div>
      </div>

      {/* KONNECT MODAL */}
      <KonnectPaymentModal
        showKonnectIframe={konnectModal.showKonnectIframe}
        konnectPayUrl={konnectModal.konnectPayUrl}
        onClose={handleKonnectClose}
      />
    </div>
  );
}
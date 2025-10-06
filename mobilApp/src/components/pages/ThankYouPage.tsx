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
        
        // Refresh order details
        const updatedOrder = await api.getOrder(orderData.id);
        setOrderData(updatedOrder);
        
        // Show message
        setPaymentError('Paiement annulé. Votre commande est en attente.');
      } catch (error) {
        console.error('Error updating order status:', error);
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
          const updatedOrder = await api.getOrder(orderData.id);
          setOrderData(updatedOrder);
          
          // Track successful purchase for Konnect payments
          logPurchase(orderData.id, parseFloat(orderData.total));
          
          konnectModal.closeKonnectPayment();
          setPaymentError(''); // Clear any previous errors
        } catch (error) {
          console.error('Error updating order status:', error);
        }
      } else if (event.data === 'payment_failed') {
        try {
          await api.updateOrder(orderData.id, { status: 'on-hold' });
          const updatedOrder = await api.getOrder(orderData.id);
          setOrderData(updatedOrder);
          konnectModal.closeKonnectPayment();
          setPaymentError('Le paiement a échoué. Votre commande est en attente.');
        } catch (error) {
          console.error('Error updating order status:', error);
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

        sessionStorage.setItem(`order_${orderId}`, JSON.stringify({
          order: order,
          subtotal: order.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(3)
        }));

        setShowEmailForm(false);
      } else {
        setEmailVerificationError('Aucune commande trouvée avec cet email. Veuillez vérifier votre email et reessayer.');
      }
    } catch (error) {
      console.error('Error verifying order by email:', error);
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

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setOrderId(hash);

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
    } else {
      setIsLoading(false);
    }
  }, [orderDetails, location.state]);

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
      console.log('Konnect modal state after opening:', {
        showKonnectIframe: konnectModal.showKonnectIframe,
        konnectPayUrl: konnectModal.konnectPayUrl
      });

    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentError('Erreur lors de l\'initialisation du paiement. Veuillez reessayer.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleOrderAgain = async () => {
    if (!orderData) return;

    try {
      // Clear current cart first
      dispatch({ type: 'CLEAR_CART' });

      // Track items that couldn't be added due to stock issues
      const unavailableItems = [];
      let addedItems = 0;

      // Add all items from the order to cart with stock validation
      for (const item of orderData.line_items) {
        try {
          // Fetch current product data to check stock status
          const product = await api.getProduct(item.product_id);
          
          if (!product) {
            unavailableItems.push({ name: item.name, reason: 'Produit introuvable' });
            continue;
          }

          // Check if product is in stock or allows backorders
          const isInStock = product.stock_status === 'instock' || product.stock_status === 'onbackorder';
          const hasStock = product.stock_quantity === null || product.stock_quantity >= item.quantity;
          
          if (!isInStock && product.stock_status !== 'onbackorder') {
            unavailableItems.push({ name: item.name, reason: 'Rupture de stock' });
            continue;
          }

          if (!hasStock && product.stock_status !== 'onbackorder') {
            const availableQty = product.stock_quantity || 0;
            unavailableItems.push({ 
              name: item.name, 
              reason: `Stock insuffisant (${availableQty} disponible${availableQty > 1 ? 's' : ''})`
            });
            continue;
          }

          // Add to cart with current product data
          const productData = {
            id: item.product_id,
            name: item.name,
            price: parseFloat(item.price),
            images: product.images || [],
            sku: item.sku,
            stock_quantity: product.stock_quantity,
            type: product.type || 'simple',
            status: product.status || 'publish',
            stock_status: product.stock_status
          };

          dispatch({
            type: 'ADD_TO_CART',
            payload: {
              product: productData,
              quantity: item.quantity,
              variationId: item.variation_id || null
            }
          });
          
          addedItems++;
          
        } catch (error) {
          console.error(`Error adding item ${item.name}:`, error);
          unavailableItems.push({ name: item.name, reason: 'Erreur lors de l\'ajout' });
        }
      }

      // Show appropriate messages
      if (addedItems === 0) {
        // No items were added
        toast.error('Aucun article n\'a pu être ajouté au panier.');
        if (unavailableItems.length > 0) {
          unavailableItems.forEach(item => {
            toast.error(`${item.name}: ${item.reason}`);
          });
        }
      } else if (unavailableItems.length > 0) {
        // Some items were added, some were not
        toast.success(`${addedItems} article${addedItems > 1 ? 's' : ''} ajouté${addedItems > 1 ? 's' : ''} au panier !`);
        unavailableItems.forEach(item => {
          toast.error(`${item.name}: ${item.reason}`);
        });
        // Still redirect to cart for the items that were added
        navigate('/cart');
      } else {
        // All items were added successfully
        toast.success('Tous les articles ont été ajoutés au panier ! Redirection vers le paiement...');
        navigate('/cart');
      }
      
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Erreur lors de l\'ajout des articles au panier.');
    }
  };

  return (
    <div className="p-4 pb-20 mb-8">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Commande Confirmée !
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Votre commande #{orderData.id} a été placée avec succès
        </p>
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
                  </p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(item.total).toFixed(3)} TND
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:text-white dark:border-gray-600 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
              <span className="font-semibold">{subtotal} TND</span>
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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200"
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
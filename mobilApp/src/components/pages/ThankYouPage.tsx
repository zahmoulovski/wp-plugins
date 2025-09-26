import React, { useEffect, useState } from 'react';
import { CheckCircle, House, Bag, XCircle } from 'react-bootstrap-icons';
import { api } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderDetails | null>(null);
  const [subtotal, setSubtotal] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();

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
          <p className="text-gray-600 dark:text-gray-300">Loading order details...</p>
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
              Pour accéder à votre commande #{orderId}, veuillez entrer l'adresse email utilisée lors de la commande.
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
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

  return (
    <div className="p-4 pb-20">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Commande Confirmée !
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Votre commande #{order.id} a été placée avec succès
        </p>
      </div>

      <div className="space-y-6">
        {/* Order Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Détails de la Commande
          </h2>
          
          <div className="space-y-4">
            {order.line_items.map((item) => (
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
            {order.shipping_lines && order.shipping_lines.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Livraison</span>
                <span className="font-semibold">{parseFloat(order.shipping_lines[0].total).toFixed(3)} TND</span>
              </div>
            )}
            {order.fee_lines && order.fee_lines.map((fee, index) => (
              <div key={index} className="flex justify-between dark:text-white">
                <span className="text-gray-600 dark:text-gray-400">{fee.name}</span>
                <span className="font-semibold">{fee.total} TND</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
              <span>Total</span>
              <span className="text-primary-600 dark:text-primary-400">
                {order.total} TND
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
            {order.billing && (
              <>
                <p><strong>Nom:</strong> {order.billing.first_name} {order.billing.last_name}</p>
                <p><strong>Email:</strong> {order.billing.email}</p>
                <p><strong>Téléphone:</strong> {order.billing.phone}</p>
                <p><strong>Adresse:</strong> {order.billing.address_1}</p>
                <p><strong>Ville:</strong> {order.billing.city}, {order.billing.state}</p>
                <p><strong>Code Postal:</strong> {order.billing.postcode}</p>
                <p><strong>Pays:</strong> {order.billing.country}</p>
              </>
            )}
            {order.shipping_lines && order.shipping_lines.length > 0 && (
              <p><strong>Méthode de livraison:</strong> {order.shipping_lines[0].method_title}</p>
            )}
            {order.payment_method_title && (
              <p><strong>Méthode de paiement:</strong> {order.payment_method_title}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
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
  );
}
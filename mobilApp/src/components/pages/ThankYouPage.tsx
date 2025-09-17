import React from 'react';
import { CheckCircle, Home, ShoppingBag } from 'lucide-react';

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
  id: string;
  total: string;
  billing: BillingInfo;
  line_items: OrderProduct[];
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
  const { order, subtotal } = orderDetails || {};

  if (!order) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Aucune commande trouvée
        </h1>
        <button
          onClick={onBackToHome}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg"
        >
          Retour à l'accueil
        </button>
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
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  {item.sku && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quantité: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {(parseFloat(item.price) * item.quantity).toFixed(2)} TND
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
              <span className="font-semibold">{subtotal} TND</span>
            </div>
            {order.fee_lines && order.fee_lines.map((fee, index) => (
              <div key={index} className="flex justify-between">
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
          
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p><strong>Nom:</strong> {order.billing.first_name} {order.billing.last_name}</p>
            <p><strong>Email:</strong> {order.billing.email}</p>
            <p><strong>Téléphone:</strong> {order.billing.phone}</p>
            <p><strong>Adresse:</strong> {order.billing.address_1}</p>
            <p><strong>Ville:</strong> {order.billing.city}, {order.billing.state}</p>
            <p><strong>Code Postal:</strong> {order.billing.postcode}</p>
            <p><strong>Pays:</strong> {order.billing.country}</p>
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
          <Home className="h-5 w-5" />
          Retour à l'accueil
        </button>
        <button
          onClick={onContinueShopping}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-5 w-5" />
          Continuer vos achats
        </button>
        </div>
      </div>
    </div>
  );
}
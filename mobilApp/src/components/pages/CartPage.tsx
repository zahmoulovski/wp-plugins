import React from 'react';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { PullToRefresh } from '../common/PullToRefresh';

interface CartPageProps {
  onCheckout: () => void;
}

export function CartPage({ onCheckout }: CartPageProps) {
  const { state, dispatch } = useApp();

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { id, quantity } });
  };

  const removeFromCart = (id: number) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) {
      return 'Prix : Sur Demande';
    }
    return `${numPrice.toFixed(2)} TND`;
  };

  const calculateTotal = () => {
    const subtotal = state.cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + (price * item.quantity);
    }, 0);
    const timbre = 1.0; // Fixed Timbre fee
    return (subtotal + timbre).toFixed(2);
  };

  const calculateSubtotal = () => {
    return state.cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + (price * item.quantity);
    }, 0).toFixed(2);
  };

  const handleRefresh = async () => {
    // Simulate refresh - could check for updated prices, etc.
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  if (state.cart.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 pb-20">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Panier
          </h1>
          
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              Votre panier est vide
            </p>
            <p className="text-gray-400 dark:text-gray-500">
              Ajoutez des produits pour commencer
            </p>
          </div>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Panier d'Achat ({state.cart.length})
        </h1>

        <div className="space-y-4 mb-6">
          {state.cart.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <img
                  src={item.product.images?.[0]?.src || '/api/placeholder/80/80'}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {item.product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="font-semibold text-lg">{item.quantity}</span>
                      
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {formatPrice((parseFloat(item.product.price) * item.quantity).toString())}
                      </span>
                      
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                Sous-total
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculateSubtotal()} TND
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                Timbre
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                1.00 TND
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {calculateTotal()} TND
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onCheckout}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-semibold transition-colors duration-200"
          >
            Procéder au Paiement
          </button>
        </div>
      </div>
    </PullToRefresh>
  );
}
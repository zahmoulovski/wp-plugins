import React, { useEffect } from 'react';
import { Plus, Dash, Trash, Bag, X } from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { getProductTaxInfo, parsePrice, formatPrice as formatTaxPrice } from '../../utils/taxUtils';

interface CartPageProps {
  onCheckout: () => void;
}

export function CartPage({ onCheckout }: CartPageProps) {
  const { state, dispatch } = useApp();

  // Scroll to top when page loads
  useScrollToTop();

  const updateQuantity = (id: number, variationId: number | null, newQuantity: number) => {
    if (newQuantity > 0) {
      dispatch({ type: 'UPDATE_CART_ITEM', payload: { id, variationId, quantity: newQuantity } });
    }
  };

  const removeFromCart = (id: number, variationId: number | null) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: { id, variationId } });
  };

  const formatPrice = (price: string, isHT = false) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) {
      return 'Prix : Sur Demande';
    }
    const suffix = isHT ? ' TND HT' : ' TND';
    return `${numPrice.toFixed(3)}${suffix}`;
  };

  const calculateTotal = () => {
    const subtotalHT = state.cart.reduce((total, item) => {
      const price = parseFloat(item.product?.price || '0');
      const taxInfo = getProductTaxInfo(item.price || item.product?.price || '0', item.tax_class, item.tax_status);
      if (taxInfo) {
        // Calculate HT price from TTC price
        const htPrice = price / (1 + taxInfo.rate / 100);
        return total + (htPrice * item.quantity);
      }
      return total + (price * item.quantity);
    }, 0);
    const tax = parseFloat(calculateTotalTax());
    const timbre = 1.0; // Fixed Timbre fee
    return (subtotalHT + tax + timbre).toFixed(3);
  };

  const calculateSubtotal = () => {
    return state.cart.reduce((total, item) => {
      const price = parseFloat(item.price || item.product?.price || '0');
      const taxInfo = getProductTaxInfo(item.price || item.product?.price || '0', item.tax_class, item.tax_status);
      if (taxInfo) {
        // Calculate HT price from TTC price
        const htPrice = price / (1 + taxInfo.rate / 100);
        return total + (htPrice * item.quantity);
      }
      return total + (price * item.quantity);
    }, 0).toFixed(3);
  };

  const calculateTotalTax = () => {
    return state.cart.reduce((totalTax, item) => {
      const taxInfo = getProductTaxInfo(item.price || item.product?.price || '0', item.tax_class, item.tax_status);
      if (taxInfo) {
        const itemTotal = parseFloat(item.price || item.product?.price || '0') * item.quantity;
        // Since prices are tax-inclusive, extract the tax amount from the total
        const htAmount = itemTotal / (1 + taxInfo.rate / 100);
        const itemTax = itemTotal - htAmount;
        return totalTax + itemTax;
      }
      return totalTax;
    }, 0).toFixed(3);
  };

  if (state.cart.length === 0) {
    return (
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Panier
        </h1>
        
        <div className="text-center py-12">
          <Bag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
            Votre panier est vide
          </p>
          <p className="text-gray-400 dark:text-gray-500">
            Ajoutez des produits pour commencer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 mb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Panier d'Achat ({state.cart.length})
      </h1>

      <div className="space-y-4 mb-6">
        {state.cart.map((item) => (
          <div key={`${item.id}-${item.variationId ?? 'simple'}`} className="flex items-start space-x-4 py-4 border-b dark:border-gray-700 last:border-b-0">
            <img 
              src={item.image || item.product?.images?.[0]?.src || '/api/placeholder/150/150'} 
              alt={item.name || item.product?.name || 'Produit'} 
              className="w-24 h-24 object-cover rounded-xl"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{item.name || item.product?.name}</h3>
              
              {item.sku && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Réf: {item.sku}</p>
              )}
              
              {Object.entries(item.attributes || {}).map(([key, value]) => (
                <p key={key} className="text-sm text-gray-600 dark:text-gray-300">
                  {key}: {value}
                </p>
              ))}
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => updateQuantity(item.id, item.variationId ?? null, Math.max(1, item.quantity - 1))}
                    className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Dash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <span className="w-8 text-center dark:text-white font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.variationId ?? null, item.quantity + 1)}
                    className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const price = parseFloat(item.price);
                      const taxInfo = getProductTaxInfo(item.price, item.tax_class, item.tax_status);
                      if (taxInfo) {
                        const htPrice = price / (1 + taxInfo.rate / 100);
                        return formatPrice((htPrice * item.quantity).toString(), true);
                      }
                      return formatPrice((price * item.quantity).toString(), true);
                    })()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      const price = parseFloat(item.price);
                      const taxInfo = getProductTaxInfo(item.price, item.tax_class, item.tax_status);
                      if (taxInfo) {
                        const htPrice = price / (1 + taxInfo.rate / 100);
                        return `${formatPrice(htPrice.toString(), true)} x ${item.quantity}`;
                      }
                      return `${formatPrice(item.price, true)} x ${item.quantity}`;
                    })()}
                  </p>
                  {(item.tax_status !== 'none' && item.tax_class !== 'zero-rate') && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {(() => {
                        const taxInfo = getProductTaxInfo(item.price, item.tax_class, item.tax_status);
                        return taxInfo ? taxInfo.label : '';
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => removeFromCart(item.id, item.variationId ?? null)}
              className="p-1 hover:text-red-500 transition-colors"
            >
              <Trash className="h-5 w-5 text-red-500 dark:text-red-400" />
            </button>
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
              {calculateSubtotal()} <sup>TND HT</sup>
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
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              Taxe
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {calculateTotalTax()} TND
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total
              </span>
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {calculateTotal()} <sup>TND TTC</sup>
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
  );
}
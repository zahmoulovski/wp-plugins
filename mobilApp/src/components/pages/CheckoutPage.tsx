import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Truck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';

interface CheckoutPageProps {
  onBack: () => void;
}

export function CheckoutPage({ onBack }: CheckoutPageProps) {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'TN',
    paymentMethod: '',
  });

  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        const [shipping, payment] = await Promise.all([
          api.getShippingMethods(),
          api.getPaymentMethods()
        ]);
        setShippingMethods(shipping);
        setPaymentMethods(payment.filter(method => method.enabled));
        if (payment.length > 0) {
          setFormData(prev => ({ ...prev, paymentMethod: payment[0].id }));
        }
      } catch (error) {
        console.error('Error loading checkout data:', error);
      }
    };
    loadCheckoutData();
  }, []);

  const calculateTotal = () => {
    const subtotal = state.cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + price * item.quantity;
    }, 0);
    const timbre = 1.0;
    return (subtotal + timbre).toFixed(2);
  };

  const calculateSubtotal = () => {
    return state.cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + price * item.quantity;
    }, 0).toFixed(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- Create WooCommerce order first ---
      const orderData = {
        payment_method: formData.paymentMethod,
        payment_method_title:
          formData.paymentMethod === 'konnect' ? 'Konnect' : formData.paymentMethod,
        set_paid: false,
        billing: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address_1: formData.address,
          city: formData.city,
          state: formData.state,
          postcode: formData.zipCode,
          country: formData.country,
          email: formData.email,
          phone: formData.phone,
        },
        shipping: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address_1: formData.address,
          city: formData.city,
          state: formData.state,
          postcode: formData.zipCode,
          country: formData.country,
        },
        line_items: state.cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        fee_lines: [{ name: 'Timbre', total: '1.00', tax_status: 'none' }],
      };

      const order = await api.createOrder(orderData);

      // --- If Konnect chosen: launch online payment ---
      if (formData.paymentMethod === 'konnect') {
        const totalTnd = parseFloat(calculateTotal());
        const { payUrl } = await api.initKonnectPayment(order.id, totalTnd, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        });

        const popup = window.open(payUrl, '_blank', 'width=650,height=800');
        if (!popup) alert('Please allow pop-ups to continue to payment.');
        return; // wait for Konnect webhook to confirm payment
      }

      // --- Offline methods flow (cash on delivery, etc.) ---
      dispatch({ type: 'CLEAR_CART' });
      alert(`Order #${order.id} placed successfully!`);
      onBack();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error placing order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="text-primary-600 dark:text-primary-400 mr-4">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commande</h1>
      </div>

      
        <form onSubmit={handleSubmit} className="space-y-6"> {/* Shipping Information */} <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"> <div className="flex items-center mb-4"> <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" /> <h2 className="text-lg font-semibold text-gray-900 dark:text-white"> Informations de Livraison </h2> </div> <div className="grid grid-cols-2 gap-4"> <input type="text" name="firstName" placeholder="Prénom" value={formData.firstName} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> <input type="text" name="lastName" placeholder="Nom" value={formData.lastName} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <div className="grid grid-cols-2 gap-4 mt-4"> <input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> <input type="tel" name="phone" placeholder="Téléphone" value={formData.phone} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <input type="text" name="address" placeholder="Adresse" value={formData.address} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mt-4" /> <div className="grid grid-cols-3 gap-4 mt-4"> <input type="text" name="city" placeholder="Ville" value={formData.city} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> <input type="text" name="state" placeholder="Gouvernorat" value={formData.state} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> <input type="text" name="zipCode" placeholder="Code Postal" value={formData.zipCode} onChange={handleInputChange} required className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> </div> {/* Shipping Methods */} {shippingMethods.length > 0 && ( <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"> <div className="flex items-center mb-4"> <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" /> <h2 className="text-lg font-semibold text-gray-900 dark:text-white"> Méthode de Livraison </h2> </div> <div className="space-y-3"> {shippingMethods.map((method) => ( <label key={method.id} className="flex items-center justify-between"> <div className="flex items-center"> <input type="radio" name="shippingMethod" value={method.id} checked={selectedShipping === method.id} onChange={(e) => setSelectedShipping(e.target.value)} className="mr-3" /> <span className="text-gray-900 dark:text-white">{method.title}</span> </div> {method.cost && ( <span className="text-primary-600 dark:text-primary-400 font-semibold"> {parseFloat(method.cost).toFixed(2)} TND </span> )} </label> ))} </div> </div> )} {/* Payment Method */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Méthode de Paiement</h2>
          </div>
          <div className="space-y-3">
            {paymentMethods.map(method => (
              <label key={method.id} className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={formData.paymentMethod === method.id}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <span className="text-gray-900 dark:text-white">{method.title}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Résumé de la Commande
          </h2>

          <div className="space-y-3">
            {state.cart.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-semibold">
                  {(parseFloat(item.product.price) * item.quantity).toFixed(2)} TND
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 mt-4 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
              <span className="font-semibold">{calculateSubtotal()} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Timbre</span>
              <span className="font-semibold">1.00 TND</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
              <span>Total</span>
              <span className="text-primary-600 dark:text-primary-400">
                {calculateTotal()} TND
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-semibold transition-colors duration-200"
        >
          {loading ? 'Traitement...' : 'Passer la Commande'}
        </button>
      </form>
    </div>
  );
}
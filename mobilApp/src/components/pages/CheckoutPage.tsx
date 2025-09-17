import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Truck, User, CheckCircle } from 'lucide-react';

import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (order: any, subtotal: string) => void;
}

export function CheckoutPage({ onBack, onOrderSuccess }: CheckoutPageProps) {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasInteractedWithPayment, setHasInteractedWithPayment] = useState(false);
  const [stepValidation, setStepValidation] = useState({
    step1: false,
    step2: false,
    step3: false,
  });
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
        // Load payment methods and shipping methods in parallel
        const [payment, shippingMethods] = await Promise.all([
          api.getPaymentMethods(),
          api.getAllShippingMethods().catch(() => [
            { id: 'flat_rate:1', title: 'Livraison standard', cost: '7.00', method_id: 'flat_rate' },
            { id: 'local_pickup:2', title: 'Retrait en magasin', cost: '0.00', method_id: 'local_pickup' },
          ])
        ]);
        
        setPaymentMethods(payment.filter(method => method.enabled));
        setShippingMethods(shippingMethods);
        
        // Set defaults - Don't auto-select payment method to prevent automatic submission
        // if (payment.length > 0) {
        //   setFormData(prev => ({ ...prev, paymentMethod: payment[0].id }));
        // }
        if (shippingMethods.length > 0 && !selectedShipping) {
          setSelectedShipping(shippingMethods[0].id);
          setShippingCost(parseFloat(shippingMethods[0].cost) || 0);
        }
      } catch (error) {
        console.error('Error loading checkout data:', error);
        
        // Quick fallback
        const fallbackMethods = [
          { id: 'flat_rate:1', title: 'Livraison standard', cost: '7.00', method_id: 'flat_rate' },
          { id: 'local_pickup:2', title: 'Retrait en magasin', cost: '0.00', method_id: 'local_pickup' },
        ];
        setShippingMethods(fallbackMethods);
        
        if (fallbackMethods.length > 0 && !selectedShipping) {
          setSelectedShipping(fallbackMethods[0].id);
          setShippingCost(parseFloat(fallbackMethods[0].cost) || 0);
        }
      } finally {
        setPageLoading(false);
      }
    };
    loadCheckoutData();
  }, []);

  // Validate steps when form data changes
  useEffect(() => {
    validateStep1();
  }, [formData.firstName, formData.lastName, formData.email, formData.phone, formData.address, formData.city, formData.state, formData.zipCode]);

  useEffect(() => {
    validateStep2();
  }, [selectedShipping]);

  useEffect(() => {
    validateStep3();
  }, [formData.paymentMethod]);

  useEffect(() => {
    const getRestrictedShippingClasses = () => {
      const restrictions = {
        'heavy-items': ['local_pickup'],
        'fragile': ['standard_shipping'],
        'oversized': ['local_pickup'],
      };

      const restrictedClasses = new Set<string>();
      state.cart.forEach(item => {
        const shippingClass = item.product.shipping_class || '';
        if (restrictions[shippingClass]) {
          restrictions[shippingClass].forEach(method => restrictedClasses.add(method));
        }
      });

      return restrictedClasses;
    };

    const calculateShipping = async () => {
      // Use address-specific calculation when address is complete
      if (formData.city && formData.state && formData.zipCode) {
        try {
          const shippingAddress = {
            city: formData.city,
            state: formData.state,
            postcode: formData.zipCode,
            country: formData.country,
          };

          const shippingRates = await api.calculateShipping(state.cart, shippingAddress);
          let availableMethods = shippingRates.shipping_rates || [];

          // Filter out restricted shipping methods
          const restrictedMethods = getRestrictedShippingClasses();
          availableMethods = availableMethods.filter(method => 
            !restrictedMethods.has(method.method_id)
          );

          setShippingMethods(availableMethods);
          
          // Auto-select first method if none selected
          if (availableMethods.length > 0 && !selectedShipping) {
            setSelectedShipping(availableMethods[0].id);
            setShippingCost(parseFloat(availableMethods[0].cost) || 0);
          }
        } catch (error) {
          console.error('Error calculating shipping:', error);
          // Fallback to all methods if address calculation fails
          try {
            const allMethods = await api.getAllShippingMethods();
            setShippingMethods(allMethods);
            
            if (allMethods.length > 0 && !selectedShipping) {
              setSelectedShipping(allMethods[0].id);
              setShippingCost(parseFloat(allMethods[0].cost) || 0);
            }
          } catch (fallbackError) {
            console.error('Error loading fallback shipping methods:', fallbackError);
          }
        }
      }
    };

    // Calculate shipping whenever cart or address changes
    calculateShipping();
  }, [formData.city, formData.state, formData.zipCode, formData.country, state.cart]);

  const calculateSubtotal = () => {
    return state.cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + price * item.quantity;
    }, 0).toFixed(2);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(calculateSubtotal());
    const timbre = 1.0;
    return (subtotal + shippingCost + timbre).toFixed(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Track when user interacts with payment method
    if (name === 'paymentMethod') {
      setHasInteractedWithPayment(true);
    }
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const methodId = e.target.value;
    setSelectedShipping(methodId);
    
    const selectedMethod = shippingMethods.find(method => method.id === methodId);
    if (selectedMethod) {
      setShippingCost(parseFloat(selectedMethod.cost) || 0);
    }
  };

  const validateStep1 = () => {
    const isValid = 
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.address.trim() !== '' &&
      formData.city.trim() !== '' &&
      formData.state.trim() !== '' &&
      formData.zipCode.trim() !== '';
    
    setStepValidation(prev => ({ ...prev, step1: isValid }));
    return isValid;
  };

  const validateStep2 = () => {
    const isValid = selectedShipping !== '';
    setStepValidation(prev => ({ ...prev, step2: isValid }));
    return isValid;
  };

  const validateStep3 = () => {
    const isValid = formData.paymentMethod !== '' && hasInteractedWithPayment;
    setStepValidation(prev => ({ ...prev, step3: isValid }));
    return isValid;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      // Clear shipping selection when moving to step 2
      setSelectedShipping('');
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      // Clear payment method when moving to step 3
      setFormData(prev => ({ ...prev, paymentMethod: '' }));
      setHasInteractedWithPayment(false);
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      // Clear selections when going back
      if (currentStep === 3) {
        // Clear payment method when going back from step 3
        setFormData(prev => ({ ...prev, paymentMethod: '' }));
        setHasInteractedWithPayment(false);
      } else if (currentStep === 2) {
        // Clear shipping method when going back from step 2
        setSelectedShipping('');
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    if (!hasInteractedWithPayment) {
      alert('Veuillez sélectionner une méthode de paiement');
      return;
    }
    
    setLoading(true);

    try {
      // ---- Create WooCommerce order ----
      const orderData = {
        payment_method: formData.paymentMethod,
        payment_method_title:
          formData.paymentMethod === 'flouci' ? 'Flouci' : formData.paymentMethod,
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
        shipping_lines: selectedShipping ? [{
          method_id: selectedShipping.split(':')[0],
          method_title: shippingMethods.find(m => m.id === selectedShipping)?.title || 'Livraison',
          total: shippingCost.toFixed(2),
        }] : [],
        fee_lines: [{ name: 'Timbre', total: '1.00', tax_status: 'none' }],
      };

      const order = await api.createOrder(orderData);

      // ---- FLOUCI online payment branch ----
      if (formData.paymentMethod === 'flouci') {
        const totalTnd = parseFloat(calculateTotal());
        // Convert TND to millimes (1 TND = 1000 millimes)
        const amountInMillimes = Math.round(totalTnd * 1000);

        // Call Flouci generate payment endpoint
        const { payment_id, payUrl } = await api.initFlouciPayment(order.id, amountInMillimes, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        });

        // Store payment_id with order for tracking
        await api.updateOrderMeta(order.id, { flouci_payment_id: payment_id });

        // Direct redirect so browser can't block it
        window.location.href = payUrl;
        return; // stop further processing; webhook will mark the order paid
      }

      // ---- Offline methods (cash, bank transfer, etc.) ----
      dispatch({ type: 'CLEAR_CART' });
      onOrderSuccess(order, calculateSubtotal());
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error placing order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => {
    const steps = [
      { id: 1, title: 'Informations', icon: User },
      { id: 2, title: 'Livraison', icon: Truck },
      { id: 3, title: 'Paiement', icon: CreditCard },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id || (step.id === 1 && stepValidation.step1) || (step.id === 2 && stepValidation.step2) || (step.id === 3 && stepValidation.step3);
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200
                    ${isActive ? 'bg-primary-600 border-primary-600 text-white' : 
                      isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                      'bg-gray-200 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'}
                  `}>
                    {isCompleted && !isActive ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className={`
                    mt-2 text-sm font-medium transition-colors duration-200
                    ${isActive ? 'text-primary-600 dark:text-primary-400' : 
                      isCompleted ? 'text-green-600 dark:text-green-400' : 
                      'text-gray-500 dark:text-gray-400'}
                  `}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    flex-1 h-1 mx-4 transition-colors duration-200
                    ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-20">
      {pageLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center mb-6">
            <button onClick={onBack} className="text-primary-600 dark:text-primary-400 mr-4">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commande</h1>
          </div>

          <StepIndicator />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informations Personnelles
                  </h2>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Prénom"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Nom"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Téléphone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder="Adresse"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      name="city"
                      placeholder="Ville"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                    />
                    <input
                      type="text"
                      name="state"
                      placeholder="Gouvernorat"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                    />
                    <input
                      type="text"
                      name="zipCode"
                      placeholder="Code Postal"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Shipping Method */}
            {currentStep === 2 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-6">
                  <Truck className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Méthode de Livraison
                  </h2>
                </div>
                {shippingMethods.length > 0 ? (
                  <div className="space-y-4">
                    {shippingMethods.map(method => (
                      <label key={method.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={method.id}
                            checked={selectedShipping === method.id}
                            onChange={handleShippingChange}
                            className="mr-4 h-4 w-4"
                            required
                          />
                          <span className="text-gray-900 dark:text-white text-lg">{method.title}</span>
                        </div>
                        {method.cost && (
                          <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                            {parseFloat(method.cost).toFixed(2)} TND
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Chargement des méthodes de livraison...</p>
                )}
              </div>
            )}

            {/* Step 3: Payment Method */}
            {currentStep === 3 && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-6">
                    <CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Méthode de Paiement
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {paymentMethods.map(method => (
                      <label key={method.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            checked={formData.paymentMethod === method.id}
                            onChange={handleInputChange}
                            className="mr-4 h-4 w-4"
                          />
                          <span className="text-gray-900 dark:text-white text-lg">{method.title}</span>
                        </div>

                        {formData.paymentMethod === method.id && (
                          <div
                            className="ml-6 mt-1 text-sm text-gray-700 dark:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: method.description }}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Résumé de la Commande
                  </h3>
                  <div className="space-y-4">
                    {state.cart.map(item => (
                      <div key={item.id} className="flex justify-between text-base">
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.product.name} × {item.quantity}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {(parseFloat(item.product.price) * item.quantity).toFixed(2)} TND
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 space-y-2">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                      <span className="text-gray-900 dark:text-white">{calculateSubtotal()} TND</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600 dark:text-gray-400">Livraison</span>
                      <span className="text-gray-900 dark:text-white">{shippingCost.toFixed(2)} TND</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600 dark:text-gray-400">Timbre</span>
                      <span className="text-gray-900 dark:text-white">1.00 TND</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-4">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">{calculateTotal()} TND</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-xl font-semibold text-lg transition-colors duration-200"
                >
                  Précédent
                </button>
              )}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!stepValidation[`step${currentStep}` as keyof typeof stepValidation]}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-semibold text-lg transition-colors duration-200"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !stepValidation.step3}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-semibold text-lg transition-colors duration-200"
                >
                  {loading ? 'Traitement...' : 'Passer la Commande'}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
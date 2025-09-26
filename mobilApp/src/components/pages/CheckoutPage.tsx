import React, { useState, useEffect } from 'react';
import { ArrowLeft , CheckCircleFill , CreditCard , Truck , Person  } from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';
import { calculateDynamicShippingCosts } from '../../utils/zoneShippingCalculator';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (order: any, subtotal: string) => void;
}

const StepIndicator = ({ currentStep, stepValidation }: { currentStep: number; stepValidation: { step1: boolean; step2: boolean; step3: boolean; } }) => {
  const steps = [
    { id: 1, title: 'Informations', icon: Person },
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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${isActive ? 'bg-primary-600 border-primary-600 text-white' : isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-200 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'}`}>
                  {isCompleted && !isActive ? (
                    <CheckCircleFill className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <span className={`mt-2 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-primary-600 dark:text-primary-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 transition-colors duration-200 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export function CheckoutPage({ onBack, onOrderSuccess }: CheckoutPageProps) {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
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

  // Auto-fill form data when user is logged in
  useEffect(() => {
    if (state.customer) {
      setFormData(prev => ({
        ...prev,
        firstName: state.customer?.first_name || prev.firstName,
        lastName: state.customer?.last_name || prev.lastName,
        email: state.customer?.email || prev.email,
        phone: state.customer?.billing?.phone || prev.phone,
        address: state.customer?.billing?.address_1 || prev.address,
        city: state.customer?.billing?.city || prev.city,
        state: state.customer?.billing?.state || prev.state,
        zipCode: state.customer?.billing?.postcode || prev.zipCode,
        country: state.customer?.billing?.country || prev.country,
      }));
    }
  }, [state.customer]);

  // Load payment methods when component mounts
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await api.getPaymentMethods();
        // Filter to show only enabled payment methods
        const enabledMethods = methods.filter((method: any) => method.enabled);
        setPaymentMethods(enabledMethods);
      } catch (error) {
        // Fallback to default payment methods if API fails
        setPaymentMethods([
          {
            id: 'cod',
            title: 'Paiement à la livraison',
            description: 'Payez en espèces à la livraison',
            enabled: true
          },
          {
            id: 'flouci',
            title: 'Paiement par Flouci',
            description: 'Payez en ligne avec Flouci',
            enabled: true
          }
        ]);
      }
    };

    loadPaymentMethods();
  }, []);

  

  // Validate steps when form data changes
  useEffect(() => {
    validateStep1();
  }, [formData.firstName, formData.lastName, formData.email, formData.phone, formData.address, formData.city, formData.state, formData.zipCode]);

  useEffect(() => {
    validateStep2();
  }, [selectedShipping]);

  /*
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
*/

  useEffect(() => {
    validateStep3();
  }, [formData.paymentMethod]);

  useEffect(() => {
    if (formData.city && formData.state && formData.zipCode) {
      calculateShippingWithBusinessRules();
    }
  }, [formData.city, formData.state, formData.zipCode, formData.country, state.cart]);

  const calculateSubtotal = () => {
    return state.cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + price * item.quantity;
    }, 0).toFixed(3);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(calculateSubtotal());
    const timbre = 1.0;
    return (subtotal + shippingCost + timbre).toFixed(3);
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

  const calculateShippingWithBusinessRules = async () => {
    if (!formData.city || !formData.state || !formData.zipCode) return;
    
    setIsCalculatingShipping(true);
    try {
      // Use only our business shipping rules
      const destination = {
        city: formData.city,
        state: formData.state,
        postalCode: formData.zipCode,
        country: formData.country
      };
      
      const result = await calculateDynamicShippingCosts(state.cart, destination);
      
      // Create shipping methods from all available methods
      // Convert millimes to TND (divide by 1000)
      const methods = result.allAvailableMethods?.map(method => ({
        id: method.methodId,
        title: method.methodName,
        cost: (method.cost / 1000).toString(),
        method_id: method.methodId
      })) || [{
        id: 'business-shipping',
        title: result.shippingMethodTitle || 'Livraison Standard',
        cost: (result.totalCost / 1000).toString(),
        method_id: 'business_shipping'
      }];
      
      setShippingMethods(methods);
      setShippingCost(result.totalCost / 1000); // Convert millimes to TND
      
      // Auto-select the first method if none selected
      if (!selectedShipping && methods.length > 0) {
        setSelectedShipping(methods[0].id);
      }
      
    } catch (error) {
      console.error('Error calculating shipping with business rules:', error);
      // Fallback to basic shipping cost
      setShippingCost(0);
      setShippingMethods([]);
    } finally {
      setIsCalculatingShipping(false);
    }
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
    
    // Validate form data before submission
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone) {
      alert('Veuillez remplir tous les champs obligatoires.');
      setCurrentStep(1);
      return;
    }
    
    if (!selectedShipping) {
      alert('Veuillez sélectionner une méthode de livraison.');
      setCurrentStep(2);
      return;
    }
    
    setLoading(true);

    try {
      // ---- Create WooCommerce order ----
      const orderData: any = {
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
          total: shippingCost.toFixed(3),
        }] : [],
        fee_lines: [{ name: 'Timbre', total: '1.00', tax_status: 'none' }],
      };

      // Link order to logged-in customer
      if (state.customer) {
        orderData.customer_id = state.customer.id;
      }

      const order = await api.createOrder(orderData);

      const codMethods = ['cheque', 'cod', 'bacs'];
      if (codMethods.includes(formData.paymentMethod)) {
        await api.updateOrder(order.id, { status: 'processing' });
      }

      // ---- FLOUCI online payment branch ----
      if (formData.paymentMethod === 'flouci') {
        const totalTnd = parseFloat(calculateTotal());
        // Convert TND to millimes (1 TND = 1000 millimes)
        const amountInMillimes = Math.round(totalTnd * 1000);

        // Prepare payment data
        const paymentData = {
          amount: amountInMillimes,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          success_link: `${window.location.origin}/payment-success?order_id=${order.id}`,
          fail_link: `${window.location.origin}/payment-failed?order_id=${order.id}`,
          session_id: `order_${order.id}`
        };

        // Call Flouci generate payment endpoint
        const payment = await api.initFlouciPayment(paymentData);

        // Store payment_id with order for tracking
        await api.updateOrderMeta(order.id, { flouci_payment_id: payment.payment_id });

        // Open payment in new tab
        window.open(payment.payUrl, '_blank');
      }

      // ---- Offline methods (cash, bank transfer, etc.) ----
      dispatch({ type: 'CLEAR_CART' });
      onOrderSuccess(order, calculateSubtotal());
    } catch (error) {
      console.error('Error creating order:', error);
      // More user-friendly error messages
      let errorMessage = 'Erreur lors de la validation de la commande. Veuillez réessayer.';
      
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = 'Problème de connexion. Veuillez vérifier votre connexion internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'La requête a pris trop de temps. Veuillez réessayer.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Veuillez vérifier les informations saisies.';
        }
      }
      
      alert(errorMessage);
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

          <StepIndicator currentStep={currentStep} stepValidation={stepValidation} />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <Person className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" />
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
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                    >
                      <option value="">Sélectionner Gouvernorat</option>
                      <option value="Ariana">Ariana</option>
                      <option value="Béja">Béja</option>
                      <option value="Ben Arous">Ben Arous</option>
                      <option value="Bizerte">Bizerte</option>
                      <option value="Gabès">Gabès</option>
                      <option value="Gafsa">Gafsa</option>
                      <option value="Jendouba">Jendouba</option>
                      <option value="Kairouan">Kairouan</option>
                      <option value="Kasserine">Kasserine</option>
                      <option value="Kebili">Kebili</option>
                      <option value="Kef">Kef</option>
                      <option value="Mahdia">Mahdia</option>
                      <option value="Manouba">Manouba</option>
                      <option value="Medenine">Medenine</option>
                      <option value="Monastir">Monastir</option>
                      <option value="Nabeul">Nabeul</option>
                      <option value="Sfax">Sfax</option>
                      <option value="Sidi Bouzid">Sidi Bouzid</option>
                      <option value="Siliana">Siliana</option>
                      <option value="Sousse">Sousse</option>
                      <option value="Tataouine">Tataouine</option>
                      <option value="Tozeur">Tozeur</option>
                      <option value="Tunis">Tunis</option>
                      <option value="Zaghouan">Zaghouan</option>
                    </select>
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
                {isCalculatingShipping ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
                    <span className="text-gray-600 dark:text-gray-400">Calcul des frais de livraison...</span>
                  </div>
                ) : shippingMethods.length > 0 ? (
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
    <span className="text-gray-900 dark:text-white text-lg">
      {method.title === 'Retrait en Showroom' ? (
        <span>Retrait en Showroom, paiement sur place. <a href="https://maps.app.goo.gl/Ve1KznAC36GBDhAf6" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google Maps</a></span>
      ) : (
        method.title
      )}
    </span>
  </div>
  {method.cost && method.title !== 'Retrait en Showroom' && (
    <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
      {parseFloat(method.cost).toFixed(3)} TND
    </span>
  )}
</label>
    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">Aucune méthode de livraison disponible</p>
                    <p className="text-sm text-gray-400">Veuillez vérifier votre adresse de livraison</p>
                  </div>
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
                      <label key={method.id} className="block p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div className="flex items-center mb-2">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            checked={formData.paymentMethod === method.id}
                            onChange={handleInputChange}
                            className="mr-4 h-4 w-4"
                          />
                          <span className="text-gray-900 dark:text-white text-lg font-medium">{method.title}</span>
                        </div>
                        
                        {method.description && formData.paymentMethod === method.id && (
                          <div
                            className="ml-8 text-sm text-gray-600 dark:text-gray-400"
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
                          {(parseFloat(item.product.price) * item.quantity).toFixed(3)} TND
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
                      <span className="text-gray-900 dark:text-white">{shippingCost.toFixed(3)} TND</span>
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
    </div>
  );
}
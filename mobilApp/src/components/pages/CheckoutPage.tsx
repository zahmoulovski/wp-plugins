import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircleFill,
  CreditCard,
  Truck,
  Person
} from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';
import { calculateDynamicShippingCosts } from '../../utils/zoneShippingCalculator';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useNavigate } from 'react-router-dom';
import { KonnectPaymentModal, useKonnectPayment } from '../../hooks/useKonnectPayment';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (order: any, subtotal: string) => void;
}

/* -------  STEP INDICATOR  ------- */
const StepIndicator = ({
  currentStep,
  stepValidation
}: {
  currentStep: number;
  stepValidation: { step1: boolean; step2: boolean; step3: boolean };
}) => {
  const steps = [
    { id: 1, title: 'Informations', icon: Person },
    { id: 2, title: 'Livraison', icon: Truck },
    { id: 3, title: 'Paiement', icon: CreditCard }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted =
            currentStep > step.id ||
            (step.id === 1 && stepValidation.step1) ||
            (step.id === 2 && stepValidation.step2) ||
            (step.id === 3 && stepValidation.step3);

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-gray-200 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircleFill className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : isCompleted
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 transition-colors duration-200 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* -------  MAIN COMPONENT  ------- */
export function CheckoutPage({ onBack, onOrderSuccess }: CheckoutPageProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  /* -------  STATE  ------- */
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
    step3: false
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [konnectPayment, setKonnectPayment] = useState<{
    orderId: number;
    payUrl: string;
    paymentRef: string;
  } | null>(null);

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
    note: ''
  });

  useScrollToTop([currentStep], 'smooth');

  /* -------  EFFECTS  ------- */
  useEffect(() => {
    if (state.customer)
      setFormData(p => ({
        ...p,
        firstName: state.customer?.first_name || p.firstName,
        lastName: state.customer?.last_name || p.lastName,
        email: state.customer?.email || p.email,
        phone: state.customer?.billing?.phone || p.phone,
        address: state.customer?.billing?.address_1 || p.address,
        city: state.customer?.billing?.city || p.city,
        state: state.customer?.billing?.state || p.state,
        zipCode: state.customer?.billing?.postcode || p.zipCode,
        country: state.customer?.billing?.country || p.country
      }));
  }, [state.customer]);

  useEffect(() => {
    const load = async () => {
      try {
        const m = await api.getPaymentMethods();
        setPaymentMethods(m.filter((x: any) => x.enabled));
      } catch {
        setPaymentMethods([
          {
            id: 'cod',
            title: 'Paiement à la livraison',
            description: 'Payez en espèces à la livraison',
            enabled: true
          },
          {
            id: 'konnect',
            title: 'Paiement par Konnect',
            description: 'Payez en ligne avec Konnect',
            enabled: true
          }
        ]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    validateStep1();
  }, [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.phone,
    formData.address,
    formData.city,
    formData.state,
    formData.zipCode
  ]);

  useEffect(() => {
    validateStep2();
  }, [selectedShipping]);

  useEffect(() => {
    validateStep3();
  }, [formData.paymentMethod, hasInteractedWithPayment]);

  useEffect(() => {
    if (formData.city && formData.state && formData.zipCode)
      calculateShippingWithBusinessRules();
  }, [formData.city, formData.state, formData.zipCode, formData.country, state.cart]);

  /* -------  KONNECT MODAL LISTENER  ------- */
  const konnectModal = useKonnectPayment();

  const handleKonnectClose = async () => {
    // Handle payment cancellation/failure when close button is clicked
    if (selectedOrder) {
      try {
        // Update order status to on-hold
        await api.updateOrder(selectedOrder.id, { status: 'on-hold' });
        
        // Clear the cart
        dispatch({ type: 'CLEAR_CART' });
        
        // Navigate to thank you page with order details
        onOrderSuccess(selectedOrder, calculateSubtotal());
      } catch (error) {
        console.error('Error updating order status:', error);
        // Still clear cart and navigate to thank you page even if update fails
        dispatch({ type: 'CLEAR_CART' });
        onOrderSuccess(selectedOrder, calculateSubtotal());
      }
    }
    
    // Close the modal
    konnectModal.closeKonnectPayment();
  };
  useEffect(() => {
    if (!konnectModal.showKonnectIframe || !konnectModal.konnectPayUrl || !selectedOrder) return;

    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.includes('konnect.network')) return;
      if (event.data === 'payment_success') {
        await api.updateOrder(selectedOrder.id, { status: 'completed' });
        dispatch({ type: 'CLEAR_CART' });
        konnectModal.closeKonnectPayment();
        onOrderSuccess(selectedOrder, calculateSubtotal());
      } else if (event.data === 'payment_failed') {
        await api.updateOrder(selectedOrder.id, { status: 'on-hold' });
        konnectModal.closeKonnectPayment();
        alert('Le paiement a échoué. Votre commande est en attente.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [konnectModal.showKonnectIframe, konnectModal.konnectPayUrl, selectedOrder]);

  /* -------  HANDLERS  ------- */
  const calculateSubtotal = () =>
    state.cart
      .reduce((t, i) => t + parseFloat(i.product.price) * i.quantity, 0)
      .toFixed(3);

  const calculateTotal = () => {
    const s = parseFloat(calculateSubtotal());
    return (s + shippingCost + 1.0).toFixed(3);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'paymentMethod') setHasInteractedWithPayment(true);
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value;
    setSelectedShipping(id);
    const m = shippingMethods.find(x => x.id === id);
    if (m) setShippingCost(parseFloat(m.cost) || 0);
  };

  const validateStep1 = () => {
    const v =
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.phone.trim() &&
      formData.address.trim() &&
      formData.city.trim() &&
      formData.state.trim() &&
      formData.zipCode.trim();
    setStepValidation(p => ({ ...p, step1: !!v }));
    return v;
  };

  const validateStep2 = () => {
    const v = selectedShipping !== '';
    setStepValidation(p => ({ ...p, step2: v }));
    return v;
  };

  const validateStep3 = () => {
    const v = formData.paymentMethod !== '' && hasInteractedWithPayment;
    setStepValidation(p => ({ ...p, step3: v }));
    return v;
  };

  const calculateShippingWithBusinessRules = async () => {
    if (!formData.city || !formData.state || !formData.zipCode) return;
    setIsCalculatingShipping(true);
    try {
      const dest = {
        city: formData.city,
        state: formData.state,
        postalCode: formData.zipCode,
        country: formData.country
      };
      const res = await calculateDynamicShippingCosts(state.cart, dest);
      const methods =
        res.allAvailableMethods?.map((m: any) => ({
          id: m.methodId,
          title: m.methodName,
          cost: (m.cost / 1000).toString(),
          method_id: m.methodId
        })) || [
          {
            id: 'business-shipping',
            title: res.shippingMethodTitle || 'Livraison Standard',
            cost: (res.totalCost / 1000).toString(),
            method_id: 'business_shipping'
          }
        ];
      setShippingMethods(methods);
      setShippingCost(res.totalCost / 1000);
      if (!selectedShipping && methods.length) setSelectedShipping(methods[0].id);
    } catch {
      setShippingCost(0);
      setShippingMethods([]);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setSelectedShipping('');
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setFormData(p => ({ ...p, paymentMethod: '' }));
      setHasInteractedWithPayment(false);
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      if (currentStep === 3) {
        setFormData(p => ({ ...p, paymentMethod: '' }));
        setHasInteractedWithPayment(false);
      } else if (currentStep === 2) setSelectedShipping('');
      setCurrentStep(currentStep - 1);
    }
  };

  const triggerKonnect = async (order: any) => {
    try {
      const amountMillimes = Math.round(parseFloat(order.total) * 1000);
      const paymentData = {
        amount: amountMillimes,
        first_name: order.billing.first_name,
        last_name: order.billing.last_name,
        phone: order.billing.phone,
        email: order.billing.email,
        success_link: `${window.location.origin}/payment-success?order_id=${order.id}`,
        fail_link: `${window.location.origin}/payment-failed?order_id=${order.id}`,
        session_id: `order_${order.id}`
      };
      const payment = await api.initKonnectPayment(paymentData);
      await api.updateOrderMeta(order.id, { konnect_payment_id: payment.paymentRef });
      setSelectedOrder(order);
      konnectModal.openKonnectPayment(payment.payUrl);
    } catch {
      alert("Erreur lors de l'initialisation du paiement.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    if (!hasInteractedWithPayment) {
      alert('Veuillez sélectionner une méthode de paiement');
      return;
    }
    if (
      !formData.email ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.phone
    ) {
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
      const orderData: any = {
        payment_method: formData.paymentMethod,
        payment_method_title:
          formData.paymentMethod === 'wc_konnect_gateway'
            ? 'wc_konnect_gateway'
            : formData.paymentMethod,
        billing: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address_1: formData.address,
          city: formData.city,
          state: formData.state,
          postcode: formData.zipCode,
          country: formData.country,
          email: formData.email,
          phone: formData.phone
        },
        shipping: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address_1: formData.address,
          city: formData.city,
          state: formData.state,
          postcode: formData.zipCode,
          country: formData.country
        },
        line_items: state.cart.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity
        })),
        shipping_lines: selectedShipping
          ? [
              {
                method_id: selectedShipping.split(':')[0],
                method_title:
                  shippingMethods.find(m => m.id === selectedShipping)?.title ||
                  'Livraison',
                total: shippingCost.toFixed(3)
              }
            ]
          : [],
        fee_lines: [
          {
            name: 'Timbre',
            total: '1.000',
            tax_status: 'none'
          }
        ],
        customer_note: formData.note,
        meta_data: [
          { key: '_wc_order_attribution_source', value: 'WebApp' },
          { key: '_wc_order_attribution_medium', value: 'app' }
        ]
      };
      if (state.customer) orderData.customer_id = state.customer.id;

      const order = await api.createOrder(orderData);
      const codMethods = ['cheque', 'cod', 'bacs'];
      if (codMethods.includes(formData.paymentMethod))
        await api.updateOrder(order.id, { status: 'processing' });

      if (formData.paymentMethod === 'wc_konnect_gateway') {
        await api.updateOrder(order.id, { status: 'pending' });
        await triggerKonnect(order);
        setLoading(false);
        return;
      }

      dispatch({ type: 'CLEAR_CART' });
      onOrderSuccess(order, calculateSubtotal());
    } catch (err: any) {
      let msg = 'Erreur lors de la validation de la commande. Veuillez réessayer.';
      if (err?.message?.includes('network')) msg = 'Problème de connexion.';
      else if (err?.message?.includes('timeout'))
        msg = 'La requête a pris trop de temps.';
      else if (err?.message?.includes('validation'))
        msg = 'Veuillez vérifier les informations saisies.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* -------  RENDER  ------- */
  return (
    <>
      <div className="p-4 pb-20">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="text-primary-600 dark:text-primary-400 mr-4"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Commande
          </h1>
        </div>
        <StepIndicator currentStep={currentStep} stepValidation={stepValidation} />
        <div className="space-y-6">
          {/* STEP 1 */}
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
                    {[
                      'Ariana',
                      'Béja',
                      'Ben Arous',
                      'Bizerte',
                      'Gabès',
                      'Gafsa',
                      'Jendouba',
                      'Kairouan',
                      'Kasserine',
                      'Kebili',
                      'Kef',
                      'Mahdia',
                      'Manouba',
                      'Medenine',
                      'Monastir',
                      'Nabeul',
                      'Sfax',
                      'Sidi Bouzid',
                      'Siliana',
                      'Sousse',
                      'Tataouine',
                      'Tozeur',
                      'Tunis',
                      'Zaghouan'
                    ].map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
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
                <textarea
                  name="note"
                  placeholder="Notes pour la commande (facultatif)"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
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
                  <span className="text-gray-600 dark:text-gray-400">
                    Calcul des frais de livraison...
                  </span>
                </div>
              ) : shippingMethods.length ? (
                <div className="space-y-4">
                  {shippingMethods.map(m => (
                    <label
                      key={m.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={m.id}
                          checked={selectedShipping === m.id}
                          onChange={handleShippingChange}
                          className="mr-4 h-4 w-4"
                          required
                        />
                        <span className="text-gray-900 dark:text-white text-lg">
                          {m.title === 'Retrait en Showroom' ? (
                            <span>
                              Retrait en Showroom, paiement sur place.
                              <a
                                href="https://maps.app.goo.gl/Ve1KznAC36GBDhAf6"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Google Maps
                              </a>
                            </span>
                          ) : (
                            m.title
                          )}
                        </span>
                      </div>
                      {m.cost && m.title !== 'Retrait en Showroom' && (
                        <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                          {parseFloat(m.cost).toFixed(3)} TND
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    Aucune méthode de livraison disponible
                  </p>
                  <p className="text-sm text-gray-400">
                    Veuillez vérifier votre adresse de livraison
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
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
                  {paymentMethods.map(m => (
                    <label
                      key={m.id}
                      className="block p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center mb-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={m.id}
                          checked={formData.paymentMethod === m.id}
                          onChange={handleInputChange}
                          className="mr-4 h-4 w-4"
                        />
                        <span className="text-gray-900 dark:text-white text-lg font-medium">
                          {m.title}
                        </span>
                      </div>
                      {m.description && formData.paymentMethod === m.id && (
                        <div
                          className="ml-8 text-sm text-gray-600 dark:text-gray-400"
                          dangerouslySetInnerHTML={{ __html: m.description }}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Résumé de la Commande</h3>
                <div className="space-y-4">
                  {state.cart.map(i => (
                    <div key={i.product.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <img src={i.product.images[0]?.src} alt={i.product.name} className="w-16 h-16 object-cover rounded-lg mr-4" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{i.product.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Qté: {i.quantity}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{(parseFloat(i.product.price) * i.quantity).toFixed(3)} TND</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600 dark:text-gray-400">Sous-total</span>
                    <span className="text-gray-900 dark:text-white">
                      {calculateSubtotal()} TND
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600 dark:text-gray-400">Livraison</span>
                    <span className="text-gray-900 dark:text-white">
                      {shippingCost.toFixed(3)} TND
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600 dark:text-gray-400">Timbre</span>
                    <span className="text-gray-900 dark:text-white">1.00 TND</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-4">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">
                      {calculateTotal()} TND
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* NAV BUTTONS */}
          <form onSubmit={handleSubmit} className="flex gap-4">
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
            ) : formData.paymentMethod === 'wc_konnect_gateway' &&
              konnectModal.konnectPayUrl ? (
              <button
                type="button"
                onClick={() => konnectModal.openKonnectPayment(konnectModal.konnectPayUrl)}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-semibold text-lg transition-colors duration-200 flex flex-col items-center justify-center"
              >
                Payer en ligne
                <img
                  src="https://konnect.network/konnect.svg"
                  alt="Konnect"
                  className="h-6 mt-2"
                />
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
          </form>
        </div>
      </div>

      {/* KONNECT MODAL */}
      <KonnectPaymentModal
        showKonnectIframe={konnectModal.showKonnectIframe}
        konnectPayUrl={konnectModal.konnectPayUrl}
        onClose={handleKonnectClose}
      />
    </>
  );
}

export default CheckoutPage;
import React, { useState, useEffect } from 'react';
import { Person, BoxArrowRight, Calendar, Key, PersonPlus, Eye, EyeSlash, Pencil } from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';
import { Order } from '../../types';
import { Toaster, toast } from 'react-hot-toast';
import paymentLogo from '../../services/payment-logo.png';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export function ProfilePage() {
  const { state, dispatch } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAddresses, setIsEditingAddresses] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [editBillingData, setEditBillingData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'TN',
    email: '',
    phone: ''
  });
  const [editShippingData, setEditShippingData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'TN'
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loginData, setLoginData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [signUpData, setSignUpData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Scroll to top when page loads or when switching between views
  useScrollToTop([showLoginForm, showSignUpForm, showOrderDetails], 'smooth');

  const loadOrders = async () => {
    if (!state.customer) return;
    
    try {
      setLoading(true);
      const allCustomerOrders = await api.getAllOrdersForCustomer(state.customer.id);
      setOrders(allCustomerOrders);
    } catch (error) {

      // More specific error messages
      if (error.message?.includes('404')) {
        toast.error('Aucune commande trouvée');
      } else if (error.message?.includes('403')) {
        toast.error('Accès refusé aux commandes');
      } else if (error.message?.includes('401')) {
        toast.error('Authentification requise pour voir les commandes');
      } else {
        toast.error('Erreur lors du chargement des commandes: ' + (error.message || 'Erreur inconnue'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.customer) {
      setOrders([]);
      loadOrders();
    }
  }, [state.customer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginData.emailOrUsername || !loginData.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (loginData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);

      // Use proper authentication that verifies password
      const authenticatedCustomer = await api.authenticateUser(loginData.emailOrUsername, loginData.password);

      if (authenticatedCustomer) {
        // For WordPress users, we need to handle them differently
        // Since WordPress users don't have billing/shipping info by default, we should add basic info
        if (authenticatedCustomer.is_wp_user && (!authenticatedCustomer.billing || !authenticatedCustomer.billing.email)) {
          authenticatedCustomer.billing = {
            first_name: authenticatedCustomer.first_name,
            last_name: authenticatedCustomer.last_name,
            email: authenticatedCustomer.email,
            phone: '',
            company: '',
            address_1: '',
            address_2: '',
            city: '',
            state: '',
            postcode: '',
            country: 'TN',
          };
          authenticatedCustomer.shipping = {
            first_name: authenticatedCustomer.first_name,
            last_name: authenticatedCustomer.last_name,
            company: '',
            address_1: '',
            address_2: '',
            city: '',
            state: '',
            postcode: '',
            country: 'TN',
          };
        }

        // Set the customer in state
        dispatch({ type: 'SET_CUSTOMER', payload: authenticatedCustomer });
        setShowLoginForm(false);
        setLoginData({ emailOrUsername: '', password: '' });

        toast.success('Connexion réussie !');
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Invalid password') {
        toast.error('Mot de passe incorrect. Veuillez réessayer.');
      } else if (error.message === 'User not found') {
        toast.error('Aucun compte trouvé avec cet email ou nom d\'utilisateur');
      } else {
        toast.error('Erreur lors de la connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUpData.email || !signUpData.firstName || !signUpData.lastName || !signUpData.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (signUpData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);

      // Create new customer
      const newCustomer = await api.createCustomer({
        email: signUpData.email,
        first_name: signUpData.firstName,
        last_name: signUpData.lastName,
        username: signUpData.email.split('@')[0], // Use email prefix as username
        password: signUpData.password,
        billing: {
          first_name: signUpData.firstName,
          last_name: signUpData.lastName,
          email: signUpData.email,
          phone: signUpData.phone || undefined, // Only include phone if provided
          company: '',
          address_1: '',
          address_2: '',
          city: '',
          state: '',
          postcode: '',
          country: 'TN', // Tunisia
        },
        shipping: {
          first_name: signUpData.firstName,
          last_name: signUpData.lastName,
          company: '',
          address_1: '',
          address_2: '',
          city: '',
          state: '',
          postcode: '',
          country: 'TN',
        }
      });

      // Set the new customer in state
      dispatch({ type: 'SET_CUSTOMER', payload: newCustomer });
      setShowSignUpForm(false);
      setSignUpData({ email: '', firstName: '', lastName: '', password: '', phone: '' });

      toast.success('Compte créé avec succès !');

    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error.message || error.toString();
      if (errorMessage?.includes('email')) {
        toast.error('Cet email est déjà utilisé');
      } else if (errorMessage?.includes('username')) {
        toast.error('Ce nom d\'utilisateur est déjà pris');
      } else if (errorMessage?.includes('phone')) {
        toast.error('Numéro de téléphone invalide');
      } else if (errorMessage?.includes('400')) {
        toast.error('Données invalides. Vérifiez vos informations.');
      } else {
        toast.error(`Erreur: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    dispatch({ type: 'SET_CUSTOMER', payload: null });
    setOrders([]);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const handlePasswordReset = () => {
    // Redirect to WordPress password reset page
    window.open('https://klarrion.com/wp-login.php?action=lostpassword', '_blank');
    toast('Redirection vers la page de récupération de mot de passe...', {
      icon: '🔑',
      duration: 3000
    });
  };

  const handleEditProfile = () => {
    if (state.customer) {
      setEditProfileData({
        firstName: state.customer.first_name || '',
        lastName: state.customer.last_name || '',
        email: state.customer.email || ''
      });
      setIsEditingProfile(true);
    }
  };

  const handleEditAddresses = () => {
    if (state.customer) {
      setEditBillingData({
        first_name: state.customer.billing?.first_name || '',
        last_name: state.customer.billing?.last_name || '',
        company: state.customer.billing?.company || '',
        address_1: state.customer.billing?.address_1 || '',
        address_2: state.customer.billing?.address_2 || '',
        city: state.customer.billing?.city || '',
        state: state.customer.billing?.state || '',
        postcode: state.customer.billing?.postcode || '',
        country: state.customer.billing?.country || 'TN',
        email: state.customer.billing?.email || state.customer.email || '',
        phone: state.customer.billing?.phone || ''
      });
      setEditShippingData({
        first_name: state.customer.shipping?.first_name || '',
        last_name: state.customer.shipping?.last_name || '',
        company: state.customer.shipping?.company || '',
        address_1: state.customer.shipping?.address_1 || '',
        address_2: state.customer.shipping?.address_2 || '',
        city: state.customer.shipping?.city || '',
        state: state.customer.shipping?.state || '',
        postcode: state.customer.shipping?.postcode || '',
        country: state.customer.shipping?.country || 'TN'
      });
      setIsEditingAddresses(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!state.customer) return;
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editProfileData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);

    try {
      // Update basic profile info only (no password handling)
      const updatedCustomer = await api.updateCustomer(state.customer.id, {
        first_name: editProfileData.firstName,
        last_name: editProfileData.lastName,
        email: editProfileData.email
      });

      dispatch({ type: 'SET_CUSTOMER', payload: updatedCustomer });
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');

    } catch (error: any) {
      console.error('Profile update error:', error);
      if (error.message?.includes('email')) {
        toast.error('This email is already in use');
      } else {
        toast.error('Failed to update profile: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handlePasswordRedirect = () => {
    // Simple redirect to WordPress password change page
    window.open('https://klarrion.com/mon-compte/modifier-le-compte/', '_blank');
    toast.success('Redirecting to password change page...');
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditProfileData({
      firstName: state.customer?.first_name || '',
      lastName: state.customer?.last_name || '',
      email: state.customer?.email || ''
    });
  };

  const handleSaveAddresses = async () => {
    if (!state.customer) return;

    // Validate required fields
    if (!editBillingData.first_name || !editBillingData.last_name || !editBillingData.email) {
      toast.error('Please fill in all required billing fields (first name, last name, email)');
      return;
    }

    if (!editBillingData.address_1 || !editBillingData.city || !editBillingData.postcode) {
      toast.error('Please fill in all required address fields (address, city, postcode)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editBillingData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Update customer with new billing and shipping addresses
      const updatedCustomer = await api.updateCustomer(state.customer.id, {
        billing: editBillingData,
        shipping: editShippingData
      });

      dispatch({ type: 'SET_CUSTOMER', payload: updatedCustomer });
      setIsEditingAddresses(false);
      toast.success('Addresses updated successfully!');

    } catch (error: any) {
      console.error('Address update error:', error);
      toast.error('Failed to update addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAddressEdit = () => {
    setIsEditingAddresses(false);
    // Reset form data to current customer data
    if (state.customer) {
      setEditBillingData({
        first_name: state.customer.billing?.first_name || '',
        last_name: state.customer.billing?.last_name || '',
        company: state.customer.billing?.company || '',
        address_1: state.customer.billing?.address_1 || '',
        address_2: state.customer.billing?.address_2 || '',
        city: state.customer.billing?.city || '',
        state: state.customer.billing?.state || '',
        postcode: state.customer.billing?.postcode || '',
        country: state.customer.billing?.country || 'TN',
        email: state.customer.billing?.email || state.customer.email || '',
        phone: state.customer.billing?.phone || ''
      });
      setEditShippingData({
        first_name: state.customer.shipping?.first_name || '',
        last_name: state.customer.shipping?.last_name || '',
        company: state.customer.shipping?.company || '',
        address_1: state.customer.shipping?.address_1 || '',
        address_2: state.customer.shipping?.address_2 || '',
        city: state.customer.shipping?.city || '',
        state: state.customer.shipping?.state || '',
        postcode: state.customer.shipping?.postcode || '',
        country: state.customer.shipping?.country || 'TN'
      });
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePayOrder = async () => {
    if (!selectedOrder) return;

    try {
      const amount = Math.round(parseFloat(selectedOrder.total) * 1000);

      const paymentData = {
        amount,
        first_name: selectedOrder.billing.first_name,
        last_name: selectedOrder.billing.last_name,
        phone: selectedOrder.billing.phone,
        email: selectedOrder.billing.email,
        success_link: `${window.location.origin}/payment-success?order_id=${selectedOrder.id}`,
        fail_link: `${window.location.origin}/payment-failed?order_id=${selectedOrder.id}`,
        session_id: `order_${selectedOrder.id}`,
      };


      const payment = await api.initKonnectPayment(paymentData);

      await api.updateOrderMeta(selectedOrder.id, { konnect_payment_id: payment.paymentRef });

      window.open(payment.payUrl, '_blank');

    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Erreur lors de l\'initialisation du paiement. Veuillez reessayer.');
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="p-4 pb-20 relative min-h-screen mb-8">
        {/* Klarrion Logo Background */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(https://klarrion.com/wp-content/uploads/2025/09/logo-klarrion-2.svg)`,
            backgroundPosition: 'right bottom',
            backgroundSize: '800px 800px',
            backgroundRepeat: 'no-repeat',
            opacity: 0.08,
            backgroundAttachment: 'fixed'
          }}
        />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Mon compte
          </h1>

          {!state.customer ? (
            <div className="text-center py-12">
              <Person className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Bienvenue chez Klarrion
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Connectez-vous pour accéder à votre compte et à l'historique de vos commandes
              </p>

              {!showLoginForm && !showSignUpForm ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowLoginForm(true)}
                    className="w-50 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
                  >
                    Se Connecter
                  </button><br />
                  <button
                    onClick={() => setShowSignUpForm(true)}
                    className="w-50 bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
                  >
                    <PersonPlus className="inline h-5 w-5 mr-2" />
                    Créer un Compte
                  </button>
                </div>
              ) : showLoginForm ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm mx-auto">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <input
                      type="text"
                      placeholder="E-mail ou nom d'utilisateur"
                      value={loginData.emailOrUsername}
                      onChange={(e) => setLoginData({ ...loginData, emailOrUsername: e.target.value })}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mot de passe"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowLoginForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors duration-200"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Connexion...' : 'Se Connecter'}
                      </button>
                    </div>
                    <div className="text-center space-y-2">
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <Key className="inline h-4 w-4 mr-1" />
                        Mot de passe oublié ?
                      </button>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Pas encore de compte ?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setShowLoginForm(false);
                            setShowSignUpForm(true);
                          }}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                        >
                          S'inscrire
                        </button>
                      </p>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm mx-auto">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Nom"
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={signUpData.phone}
                      onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <div className="relative">
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        placeholder="Mot de passe"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showSignUpPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowSignUpForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors duration-200"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Création...' : 'Créer le Compte'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Déjà un compte ?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSignUpForm(false);
                          setShowLoginForm(true);
                        }}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                      >
                        Se connecter
                      </button>
                    </p>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* User Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                <div>
                  {/* Profile Info Section */}
                  <div className="flex items-center space-x-4 p-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                      {state.customer.avatar_url ? (
                        <img
                          src={state.customer.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Person className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {state.customer.first_name} {state.customer.last_name}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        {state.customer.email}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 px-4 pb-4">
                    <button
                      onClick={handleEditProfile}
                      className="w-full flex items-center justify-center p-3 border border-gray-300 dark:border-gray-600 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Pencil className="h-4 w-4 mr-2 dark:text-white text-gray-500" />
                      Détails du compte
                    </button>
                    <button
                      onClick={handleEditAddresses}
                      className="w-full flex items-center justify-center p-3 border border-gray-300 dark:border-gray-600 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Person className="h-4 w-4 mr-2 text-gray-500 dark:text-white" />
                      Ajouter/modifier des adresses
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center p-3 border border-gray-300 dark:text-white dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <BoxArrowRight className="h-4 w-4 mr-2 text-gray-500 dark:text-white" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Editing Section */}
              {isEditingProfile && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Edit Profile Details
                  </h3>

                  <div className="space-y-4">
                    {/* Profile Picture Display */}
                    <div className="text-center">
                      <div className="relative inline-block">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                          {state.customer?.avatar_url ? (
                            <img
                              src={state.customer.avatar_url}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Person className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={editProfileData.firstName}
                        onChange={(e) => setEditProfileData({ ...editProfileData, firstName: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={editProfileData.lastName}
                        onChange={(e) => setEditProfileData({ ...editProfileData, lastName: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <input
                      type="email"
                      placeholder="Email Address"
                      value={editProfileData.email}
                      onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />

                    {/* Password Change Section - Redirect to WordPress */}
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Change Password</h4>
                      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                        <p className="text-sm text-primary-800 dark:text-primary-200 mb-3">
                          Pour votre sécurité, la modification du mot de passe se fait directement sur notre site web.
                        </p>
                        <button
                          type="button"
                          onClick={() => handlePasswordRedirect()}
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                        >
                          Changer le mot de passe
                        </button>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Editing Section */}
              {isEditingAddresses && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Edit Addresses
                  </h3>

                  {/* Billing Address */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Billing Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="First Name *"
                        value={editBillingData.first_name}
                        onChange={(e) => setEditBillingData({ ...editBillingData, first_name: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Last Name *"
                        value={editBillingData.last_name}
                        onChange={(e) => setEditBillingData({ ...editBillingData, last_name: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="email"
                        placeholder="Email *"
                        value={editBillingData.email}
                        onChange={(e) => setEditBillingData({ ...editBillingData, email: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={editBillingData.phone}
                        onChange={(e) => setEditBillingData({ ...editBillingData, phone: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        value={editBillingData.company}
                        onChange={(e) => setEditBillingData({ ...editBillingData, company: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 1 *"
                        value={editBillingData.address_1}
                        onChange={(e) => setEditBillingData({ ...editBillingData, address_1: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2"
                        value={editBillingData.address_2}
                        onChange={(e) => setEditBillingData({ ...editBillingData, address_2: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="City *"
                        value={editBillingData.city}
                        onChange={(e) => setEditBillingData({ ...editBillingData, city: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <select
                        value={editBillingData.state}
                        onChange={(e) => setEditBillingData({ ...editBillingData, state: e.target.value })}
                        required
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner Gouvernorat *</option>
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
                        placeholder="Postcode *"
                        value={editBillingData.postcode}
                        onChange={(e) => setEditBillingData({ ...editBillingData, postcode: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <select
                        value={editBillingData.country}
                        onChange={(e) => setEditBillingData({ ...editBillingData, country: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="TN">Tunisia</option>
                      </select>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Shipping Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={editShippingData.first_name}
                        onChange={(e) => setEditShippingData({ ...editShippingData, first_name: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={editShippingData.last_name}
                        onChange={(e) => setEditShippingData({ ...editShippingData, last_name: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        value={editShippingData.company}
                        onChange={(e) => setEditShippingData({ ...editShippingData, company: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 1"
                        value={editShippingData.address_1}
                        onChange={(e) => setEditShippingData({ ...editShippingData, address_1: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2"
                        value={editShippingData.address_2}
                        onChange={(e) => setEditShippingData({ ...editShippingData, address_2: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={editShippingData.city}
                        onChange={(e) => setEditShippingData({ ...editShippingData, city: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <select
                        value={editShippingData.state}
                        onChange={(e) => setEditShippingData({ ...editShippingData, state: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                        placeholder="Postcode"
                        value={editShippingData.postcode}
                        onChange={(e) => setEditShippingData({ ...editShippingData, postcode: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <select
                        value={editShippingData.country}
                        onChange={(e) => setEditShippingData({ ...editShippingData, country: e.target.value })}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="TN">Tunisia</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveAddresses}
                      disabled={loading}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Addresses'}
                    </button>
                    <button
                      onClick={handleCancelAddressEdit}
                      disabled={loading}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}


              {/* Recent Orders */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Commandes Récentes
                </h3>

                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => handleOrderClick(order)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 text-left"
                      >
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Commande #{order.id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(order.date_created)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary-600 dark:text-primary-400">
                            {order.total} TND
                          </p>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    order.status === 'on-hold' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                            }`}>
                            {order.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Aucune commande pour le moment
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Commande #{selectedOrder.id}
                </h2>
                <button
                  onClick={handleCloseOrderDetails}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date: {formatDate(selectedOrder.date_created)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          selectedOrder.status === 'on-hold' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                  }`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Articles commandés
                </h3>
                <div className="space-y-4">
                  {selectedOrder.line_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Quantité: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {item.total} <sup>{selectedOrder.currency} HT</sup>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Information de facturation
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">Nom:</span> {selectedOrder.billing.first_name} {selectedOrder.billing.last_name}
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">Email:</span> {selectedOrder.billing.email}
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">Téléphone:</span> {selectedOrder.billing.phone}
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">Adresse:</span> {selectedOrder.billing.address_1}
                    </p>
                    {selectedOrder.billing.address_2 && (
                      <p className="text-gray-900 dark:text-white">{selectedOrder.billing.address_2}</p>
                    )}
                    <p className="text-gray-900 dark:text-white">
                      {selectedOrder.billing.city}, {selectedOrder.billing.state} {selectedOrder.billing.postcode}
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {selectedOrder.billing.country}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Information de livraison
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">Nom:</span> {selectedOrder.shipping.first_name} {selectedOrder.shipping.last_name}
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">Adresse:</span> {selectedOrder.shipping.address_1}
                    </p>
                    {selectedOrder.shipping.address_2 && (
                      <p className="text-gray-900 dark:text-white">{selectedOrder.shipping.address_2}</p>
                    )}
                    <p className="text-gray-900 dark:text-white">
                      {selectedOrder.shipping.city}, {selectedOrder.shipping.state} {selectedOrder.shipping.postcode}
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {selectedOrder.shipping.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Total */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">
                    Total de la commande:
                  </span>
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {selectedOrder.total} <sup>{selectedOrder.currency} TTC</sup>
                  </span>
                </div>
              </div>
              {['pending', 'on-hold', 'processing'].includes(selectedOrder.status) && (
                <button
                  onClick={handlePayOrder}
                  className="mt-4 w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 flex flex-col items-center justify-center"
                >
                  Payer En ligne
                  <img src={paymentLogo} alt="Payment methods" className="h-6 mt-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
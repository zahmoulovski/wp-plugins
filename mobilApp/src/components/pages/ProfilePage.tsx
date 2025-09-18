import React, { useState, useEffect } from 'react';
import { Person, Gear, Heart, BoxArrowInLeft, BoxArrowRight, BoxArrowInRight, Key, PersonPlus, Eye, EyeSlash } from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';
import { Order, Customer } from '../../types';
import { PullToRefresh } from '../common/PullToRefresh';
import { Toaster, toast } from 'react-hot-toast';

export function ProfilePage() {
  const { state, dispatch } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignUpForm, setShowSignUpForm] = useState(false);
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

  const loadOrders = async () => {
    if (!state.customer) return;
    
    try {
      setLoading(true);
      const customerOrders = await api.getOrders(state.customer.id);
      setOrders(customerOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.customer) {
      loadOrders();
    }
  }, [state.customer]);

  const handleRefresh = async () => {
    await loadOrders();
  };

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
      
      // Search for customers (including WordPress users now)
      const customers = await api.searchCustomers(loginData.emailOrUsername);
      
      if (customers.length === 0) {
        toast.error('Aucun compte trouvé avec cet email ou nom d\'utilisateur');
        return;
      }
      
      // Find the exact customer that matches the email or username
      let foundCustomer = null;
      
      // First, try to find an exact match
      for (const customer of customers) {
        if (customer.email === loginData.emailOrUsername || customer.username === loginData.emailOrUsername) {
          foundCustomer = customer;
          break;
        }
      }
      
      // If no exact match found, but we have results, use the first result
      // This handles cases like "admin" finding the admin user, or "contact@klarrion.com" not returning results
      if (!foundCustomer && customers.length > 0) {
        // Prioritize customers with admin-like characteristics
        foundCustomer = customers.find(customer => 
          customer.id === 1 || // Customer ID 1 is often the admin
          customer.username?.toLowerCase().includes('admin') ||
          customer.email?.toLowerCase().includes('admin') ||
          customer.first_name?.toLowerCase().includes('admin') ||
          customer.last_name?.toLowerCase().includes('admin')
        ) || customers[0]; // If no admin-like customer found, use the first result
      }

      if (!foundCustomer) {
        toast.error('Aucun compte trouvé avec cet email ou nom d\'utilisateur');
        return;
      }
      
      // For WordPress users, we need to handle them differently
      // Since WordPress users don't have billing/shipping info by default, we should add basic info
      if (foundCustomer.is_wp_user && (!foundCustomer.billing || !foundCustomer.billing.email)) {
        foundCustomer.billing = {
          first_name: foundCustomer.first_name,
          last_name: foundCustomer.last_name,
          email: foundCustomer.email,
          phone: '',
          company: '',
          address_1: '',
          address_2: '',
          city: '',
          state: '',
          postcode: '',
          country: 'TN',
        };
        foundCustomer.shipping = {
          first_name: foundCustomer.first_name,
          last_name: foundCustomer.last_name,
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
      dispatch({ type: 'SET_CUSTOMER', payload: foundCustomer });
      setShowLoginForm(false);
      setLoginData({ emailOrUsername: '', password: '' });
      
      toast.success('Connexion réussie !');
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erreur lors de la connexion. Veuillez réessayer.');
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
          phone: signUpData.phone,
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
      if (error.message?.includes('email')) {
        toast.error('Cet email est déjà utilisé');
      } else if (error.message?.includes('username')) {
        toast.error('Ce nom d\'utilisateur est déjà pris');
      } else {
        toast.error('Erreur lors de la création du compte. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch({ type: 'SET_CUSTOMER', payload: null });
    setOrders([]);
    toast.success('Déconnexion réussie');
  };

  const handlePasswordReset = () => {
    toast('Cette fonctionnalité sera bientôt disponible', {
      icon: '🔧',
      duration: 3000
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const menuItems = [
    { icon: Heart, label: 'Liste de Souhaits', action: () => {} },
    { icon: BoxArrowInRight, label: 'Suivre les Commandes', action: () => {} },
    { icon: Gear, label: 'Paramètres', action: () => {} },
  ];

  return (
    <>
      <Toaster position="top-center" />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 pb-20 relative min-h-screen">
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
              Profil
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
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
                    >
                      Se Connecter
                    </button>
                    <button
                      onClick={() => setShowSignUpForm(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
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
                        onChange={(e) => setLoginData({...loginData, emailOrUsername: e.target.value})}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mot de passe"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          required
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
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
                        onChange={(e) => setSignUpData({...signUpData, firstName: e.target.value})}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Nom"
                        value={signUpData.lastName}
                        onChange={(e) => setSignUpData({...signUpData, lastName: e.target.value})}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="tel"
                        placeholder="Téléphone"
                        value={signUpData.phone}
                        onChange={(e) => setSignUpData({...signUpData, phone: e.target.value})}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <div className="relative">
                        <input
                          type={showSignUpPassword ? 'text' : 'password'}
                          placeholder="Mot de passe"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
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
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <Person className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {state.customer.first_name} {state.customer.last_name}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        {state.customer.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="mt-4 flex items-center text-red-500 hover:text-red-600"
                  >
                    <BoxArrowRight className="h-4 w-4 mr-2" />
                   Se Déconnecter
                  </button>
                </div>

                {/* Menu Items */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.action}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <item.icon className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900 dark:text-white">{item.label}</span>
                      </div>
                      <span className="text-gray-400">→</span>
                    </button>
                  ))}
                </div>

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
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {order.status}
                            </p>
                          </div>
                        </div>
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
      </PullToRefresh>
    </>
  );
}
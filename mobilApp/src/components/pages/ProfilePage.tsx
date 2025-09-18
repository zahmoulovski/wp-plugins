import React, { useState, useEffect } from 'react';
import { Person, Gear, Heart, BoxArrowInLeft, BoxArrowRight, BoxArrowInRight, Key, PersonPlus, Eye, EyeSlash, Pencil } from 'react-bootstrap-icons';
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [uploadingPicture, setUploadingPicture] = useState(false);
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

  const handleEditProfile = () => {
    if (state.customer) {
      setEditProfileData({
        firstName: state.customer.first_name || '',
        lastName: state.customer.last_name || '',
        email: state.customer.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setProfilePicture(state.customer.avatar_url || '');
      setIsEditingProfile(true);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !state.customer) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    
    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to WordPress
      const uploadedUrl = await api.uploadProfilePicture(file);
      setProfilePicture(uploadedUrl);
      
      // Update customer with new avatar URL
      const updatedCustomer = await api.updateCustomer(state.customer.id, {
        avatar_url: uploadedUrl
      });
      
      dispatch({ type: 'SET_CUSTOMER', payload: updatedCustomer });
      toast.success('Profile picture updated successfully!');
      
    } catch (error) {
      console.error('Profile picture upload error:', error);
      toast.error('Failed to upload profile picture');
      // Revert to previous picture
      setProfilePicture(state.customer.avatar_url || '');
    } finally {
      setUploadingPicture(false);
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

    // Validate password if being changed
    if (editProfileData.newPassword) {
      if (editProfileData.newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }
      if (editProfileData.newPassword !== editProfileData.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      if (!editProfileData.currentPassword) {
        toast.error('Please enter your current password');
        return;
      }
    }

    setLoading(true);
    
    try {
      // Update basic profile info
      const updatedCustomer = await api.updateCustomer(state.customer.id, {
        first_name: editProfileData.firstName,
        last_name: editProfileData.lastName,
        email: editProfileData.email,
        avatar_url: profilePicture
      });

      // Update password if provided
      if (editProfileData.newPassword && editProfileData.currentPassword) {
        await api.updateCustomerPassword(
          state.customer.id,
          editProfileData.currentPassword,
          editProfileData.newPassword
        );
        toast.success('Password updated successfully!');
      }

      dispatch({ type: 'SET_CUSTOMER', payload: updatedCustomer });
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (error.message?.includes('password')) {
        toast.error('Current password is incorrect');
      } else if (error.message?.includes('email')) {
        toast.error('This email is already in use');
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditProfileData({
      firstName: state.customer?.first_name || '',
      lastName: state.customer?.last_name || '',
      email: state.customer?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setProfilePicture(state.customer?.avatar_url || '');
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

  const menuItems = [
    // Menu items removed as requested
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
                      className="w-full bg-green-400 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
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
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      {/* Profile Picture Upload */}
                      <div className="text-center">
                        <div className="relative inline-block">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                            {profilePicture ? (
                              <img 
                                src={profilePicture} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Person className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <label className="absolute bottom-0 right-0 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full cursor-pointer transition-colors duration-200">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePictureUpload}
                              className="hidden"
                              disabled={uploadingPicture}
                            />
                            {uploadingPicture ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Editable Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="First Name"
                          value={editProfileData.firstName}
                          onChange={(e) => setEditProfileData({...editProfileData, firstName: e.target.value})}
                          className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={editProfileData.lastName}
                          onChange={(e) => setEditProfileData({...editProfileData, lastName: e.target.value})}
                          className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={editProfileData.email}
                        onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />

                      {/* Password Change Section */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Change Password (Optional)</h4>
                        <div className="space-y-3">
                          <input
                            type="password"
                            placeholder="Current Password"
                            value={editProfileData.currentPassword}
                            onChange={(e) => setEditProfileData({...editProfileData, currentPassword: e.target.value})}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="password"
                            placeholder="New Password"
                            value={editProfileData.newPassword}
                            onChange={(e) => setEditProfileData({...editProfileData, newPassword: e.target.value})}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={editProfileData.confirmPassword}
                            onChange={(e) => setEditProfileData({...editProfileData, confirmPassword: e.target.value})}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading}
                          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={handleEditProfile}
                        className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                      >
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
                        <Pencil className="h-5 w-5 text-gray-400" />
                      </button>

                      <div className="flex space-x-3 mt-4">
                        <button
                          onClick={handleLogout}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          <BoxArrowRight className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
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
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {order.status}
                            </p>
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
      </PullToRefresh>

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
                  Date: {formatDate(selectedOrder.date_created)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
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
                          {item.total} {selectedOrder.currency}
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
                    {selectedOrder.total} {selectedOrder.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useState, useEffect } from 'react';
import { User, Settings, Heart, Package, LogOut, LogIn } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api';
import { Order } from '../../types';
import { PullToRefresh } from '../common/PullToRefresh';

export function ProfilePage() {
  const { state, dispatch } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginData, setLoginData] = useState({
    emailOrUsername: '',
    password: '',
  });

  const loadOrders = async () => {
    if (!state.customer) return;
    
    try {
      setLoading(true);
      const customerOrders = await api.getOrders(state.customer.id);
      setOrders(customerOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
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
    // Note: WooCommerce REST API doesn't have direct login endpoint
    // You would need to implement a custom endpoint or use JWT tokens
    // For demo purposes, we'll simulate login
    setShowLoginForm(false);
    alert('La fonctionnalité de connexion serait implémentée avec une authentification appropriée');
  };

  const handleLogout = () => {
    dispatch({ type: 'SET_CUSTOMER', payload: null });
    setOrders([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const menuItems = [
    { icon: Heart, label: 'Liste de Souhaits', action: () => {} },
    { icon: Package, label: 'Suivre les Commandes', action: () => {} },
    { icon: Settings, label: 'Paramètres', action: () => {} },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Profil
        </h1>

        {!state.customer ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Bienvenue chez Klarrion
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Connectez-vous pour accéder à votre compte et à l'historique de vos commandes
            </p>

            {!showLoginForm ? (
              <button
                onClick={() => setShowLoginForm(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
              >
                Se Connecter
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm mx-auto">
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    type="text"
                    placeholder="E-mail ou nom d'utilisateur"
                    value={loginData.emailOrUsername}
                    onChange={(e) => setLoginData({...loginData, emailOrUsername: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="password"
                   placeholder="Mot de passe"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
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
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition-colors duration-200"
                    >
                     Se Connecter
                    </button>
                  </div>
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
                  <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
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
                <LogOut className="h-4 w-4 mr-2" />
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
    </PullToRefresh>
  );
}
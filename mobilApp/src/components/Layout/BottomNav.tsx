import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, Search, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function BottomNav() {
  const { state } = useApp();
  const location = useLocation();
  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/categories', icon: Grid3X3, label: 'Catégories' },
    { path: '/search', icon: Search, label: 'Recherche' },
    { path: '/cart', icon: ShoppingCart, label: 'Panier', badge: cartItemsCount },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center p-2 min-w-[60px] rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 bg-secondary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
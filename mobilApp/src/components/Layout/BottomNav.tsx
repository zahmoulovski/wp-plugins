import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, Grid3x3, Search, Cart, ChatDots, ArrowUp } from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';

export function BottomNav() {
  const { state } = useApp();
  const location = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    { path: '/', icon: House, label: 'Accueil' },
    { path: '/categories', icon: Grid3x3, label: 'Catégories'},
    { path: '/cart', icon: Cart, label: 'Panier', badge: cartItemsCount, isMiddle: true  },
    { path: '/search', icon: Search, label: 'Recherche' },
    { path: '/contact', icon: ChatDots, label: 'Contact' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 bg-primary-500 dark:bg-secondary-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-40"
          style={{ bottom: 'calc(4rem + 45px)' }} // 10px gap from navbar
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="flex justify-around items-end px-2 py-2 relative">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isMiddle = item.isMiddle;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center transition-all duration-200 ${
                  isMiddle 
                    ? 'relative bg-primary-500 dark:bg-secondary-500 text-white p-3 transform hover:scale-105' 
                    : `p-2 min-w-[60px] rounded-lg ${
                        isActive 
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                }`}
                style={isMiddle ? {
                  top: '-1.4vh',
                  borderRadius: '15%',
                  transform: 'scale(1.3) translateY(0px)'
                } : {}}
              >
                <Icon className={`${isMiddle ? 'h-6 w-6' : 'h-5 w-5'} mb-1`} />
                <span className={`text-xs font-medium ${
                  isMiddle ? 'text-white' : ''
                }`}>
                  {item.label}
                </span>
                
                {item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 bg-secondary-500 dark:bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
        {/* Extra padding to accommodate the overlapping middle button */}
        <div className="h-2"></div>
      </nav>
    </>
  );
}
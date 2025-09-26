import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Person, Search } from 'react-bootstrap-icons';
import { useApp } from '../../contexts/AppContext';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onMenuClick: () => void;
  isMenuOpen?: boolean;
}

export function Header({ currentPage, onPageChange, onMenuClick, isMenuOpen = false }: HeaderProps) {
  const { state, dispatch } = useApp();
  const [profilePicture, setProfilePicture] = useState<string>('');

  // Load profile picture from WordPress when customer changes
  useEffect(() => {
    if (state.customer) {
      setProfilePicture(state.customer.avatar_url || '');
    } else {
      setProfilePicture('');
    }
  }, [state.customer]);

  const toggleDarkMode = () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDarkMode.toString());
    dispatch({ type: 'TOGGLE_DARK_MODE', payload: isDarkMode });
  };

  const logoSrc = state.darkMode
    ? 'https://klarrion.com/signature/yellow-logo.svg'
    : 'https://klarrion.com/signature/blue-logo.svg';

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative w-9 h-9"
            aria-label="Ouvrir le menu"
          >
            {/* Animated Hamburger Icon */}
            <div className="w-5 h-4 relative">
              <span 
                className={`absolute block h-0.5 w-full bg-current text-gray-600 dark:text-gray-400 transition-all duration-300 ${
                  isMenuOpen ? 'rotate-45 top-2' : 'top-0'
                }`}
              />
              <span 
                className={`absolute block h-0.5 w-full bg-current text-gray-600 dark:text-gray-400 transition-all duration-300 top-2 ${
                  isMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span 
                className={`absolute block h-0.5 w-full bg-current text-gray-600 dark:text-gray-400 transition-all duration-300 ${
                  isMenuOpen ? '-rotate-45 top-2' : 'top-4'
                }`}
              />
            </div>
          </button>
          <Link
            to="/"
            aria-label="Aller à l'accueil"
            className="focus:outline-none hover:opacity-100 transition-opacity"
          >
            <img
              src={logoSrc}
              alt="KLARRION"
              className="h-8 w-auto"
            />
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          {/* Profile Link */}
          <Link
            to="/profile"
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Profil"
          >
            {state.customer && profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <Person className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </Link>
            
          <Link
            to="/search"
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Profil"
          >
          <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Basculer le mode sombre"
          >
            {state.darkMode ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

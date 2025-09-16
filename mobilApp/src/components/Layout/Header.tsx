import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Header({ currentPage, onPageChange }: HeaderProps) {
  const { state, dispatch } = useApp();

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
        <div className="flex items-center">
           
          <button
            onClick={() => onPageChange('home')}
            aria-label="Aller à l’accueil"
            className={`focus:outline-none ${currentPage === 'home' ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
          >
            <img
              src={logoSrc}
              alt="KLARRION"
              className="h-8 w-auto"
            />
          </button>
        </div>

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
    </header>
  );
}

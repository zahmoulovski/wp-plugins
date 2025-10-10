import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import lightImage from '../assets/404-light.png';
import darkImage from '../assets/404-dark.png';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const isDarkMode = state.darkMode;

  // Scroll to top when page loads
  useScrollToTop();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12 transition-colors duration-200 mb-12">
      <div className="max-w-md w-full text-center">
        {/* 404 Image */}
        <div>
          <img
      src={isDarkMode ? lightImage : darkImage}
      alt="404 Page Not Found"
      className="w-full max-w-sm mx-auto h-auto"
    />
        </div>

        {/* Error Text */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Page non trouvée
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Retourner à la page d'accueil
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Retour
          </button>
        </div>

        {/* Search Suggestion */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ou essayez de rechercher ce que vous cherchez :
          </p>
          <button
            onClick={() => navigate('/search')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors duration-200"
          >
            Rechercher des produits →
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
import React, { useState, useEffect } from 'react';
import { AppProvider } from './contexts/AppContext';
import { Header } from './components/Layout/Header';
import { BottomNav } from './components/Layout/BottomNav';
import { HomePage } from './components/pages/HomePage';
import { CategoriesPage } from './components/pages/CategoriesPage';
import { SearchPage } from './components/pages/SearchPage';
import { CartPage } from './components/pages/CartPage';
import { CheckoutPage } from './components/pages/CheckoutPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { ProductModal } from './components/common/ProductModal';
import { Product } from './types';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCategoryClick = (categoryId: number) => {
    setCurrentPage('categories');
    // You might want to pass the categoryId to CategoriesPage to auto-select it
  };

  const handleCheckout = () => {
    setCurrentPage('checkout');
  };

  const handleBackToCart = () => {
    setCurrentPage('cart');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onProductClick={handleProductClick} />;
      case 'categories':
        return <CategoriesPage onProductClick={handleProductClick} />;
      case 'search':
        return <SearchPage onProductClick={handleProductClick} />;
      case 'cart':
        return <CartPage onCheckout={handleCheckout} />;
      case 'checkout':
        return <CheckoutPage onBack={handleBackToCart} />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onProductClick={handleProductClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <main>
        {renderPage()}
      </main>
      {currentPage !== 'checkout' && (
        <BottomNav currentPage={currentPage} onPageChange={handlePageChange} />
      )}
      
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onCategoryClick={handleCategoryClick}
      />
    </div>
  );
}

function App() {
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark', savedDarkMode);
  }, []);

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
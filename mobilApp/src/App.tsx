import React, { useState, useEffect } from 'react';
import { AppProvider } from './contexts/AppContext';
import { Header } from './components/Layout/Header';
import { BottomNav } from './components/Layout/BottomNav';
import { HomePage } from './components/pages/HomePage';
import { CategoriesPage } from './components/pages/CategoriesPage';
import { SearchPage } from './components/pages/SearchPage';
import { CartPage } from './components/pages/CartPage';
import { CheckoutPage } from './components/pages/CheckoutPage';
import { ThankYouPage } from './components/pages/ThankYouPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { ProductModal } from './components/common/ProductModal';
import { Product } from './types';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['home']);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    // Update navigation history
    setNavigationHistory(prev => [...prev, page]);
    // Clear selected category when navigating away from categories immediately
    // This prevents timing issues with category loading
    if (page !== 'categories') {
      setSelectedCategoryId(null);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCategoryClick = (categoryId: number) => {
    console.log('handleCategoryClick called with categoryId:', categoryId);
    setSelectedCategoryId(categoryId);
    setCurrentPage('categories');
    setNavigationHistory(prev => [...prev, 'categories']);
  };

  const handleCheckout = () => {
    setCurrentPage('checkout');
  };

  const handleBackToCart = () => {
    setCurrentPage('cart');
  };

  const handleOrderSuccess = (order: any, subtotal: string) => {
    console.log('Order success triggered:', { order, subtotal });
    setCurrentPage('thank-you');
    // Store order details for thank you page
    (window as any).orderDetails = { order, subtotal };
  };

  const handleBackNavigation = () => {
    console.log('handleBackNavigation called, current history:', navigationHistory);
    
    // Always navigate back to home and reset category selection
    setCurrentPage('home');
    setSelectedCategoryId(null);
    setNavigationHistory(['home']);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onProductClick={handleProductClick} />;
      case 'categories':
        return (
          <CategoriesPage 
            onProductClick={handleProductClick} 
            selectedCategoryId={selectedCategoryId}
            onBack={handleBackNavigation}
          />
        );
      case 'search':
        return <SearchPage onProductClick={handleProductClick} />;
      case 'cart':
        return <CartPage onCheckout={handleCheckout} />;
      case 'checkout':
        return <CheckoutPage onBack={handleBackToCart} onOrderSuccess={handleOrderSuccess} />;
      case 'thank-you':
        return <ThankYouPage orderDetails={(window as any).orderDetails} onBackToHome={() => setCurrentPage('home')} onContinueShopping={() => setCurrentPage('categories')} />;
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
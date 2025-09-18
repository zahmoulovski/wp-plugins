import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { HomePage } from './components/pages/HomePage';
import { CategoriesPage } from './components/pages/CategoriesPage';
import { SearchPage } from './components/pages/SearchPage';
import { CartPage } from './components/pages/CartPage';
import { CheckoutPage } from './components/pages/CheckoutPage';
import { ThankYouPage } from './components/pages/ThankYouPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { ContactPage } from './components/pages/ContactPage';
import { ProductModal } from './components/common/ProductModal';
import { Product } from './types';

function AppContent() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const handleOrderSuccess = (order: any, subtotal: string) => {
    console.log('Order success triggered:', { order, subtotal });
    // Store order details for thank you page
    (window as any).orderDetails = { order, subtotal };
    navigate('/thank-you');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleContinueShopping = () => {
    navigate('/categories');
  };

  const isCheckoutPage = location.pathname === '/checkout';

  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header onMenuClick={handleMenuClick} isMenuOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage onProductClick={handleProductClick} />} />
          <Route path="/categories" element={<CategoriesPage onProductClick={handleProductClick} />} />
          <Route path="/categories/:categorySlug" element={<CategoriesPage onProductClick={handleProductClick} />} />
          <Route path="/search" element={<SearchPage onProductClick={handleProductClick} />} />
          <Route path="/cart" element={<CartPage onCheckout={handleCheckout} />} />
          <Route path="/checkout" element={<CheckoutPage onBack={handleBackToCart} onOrderSuccess={handleOrderSuccess} />} />
          <Route 
            path="/thank-you" 
            element={
              <ThankYouPage 
                orderDetails={(window as any).orderDetails} 
                onBackToHome={handleBackToHome} 
                onContinueShopping={handleContinueShopping} 
              />
            } 
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isCheckoutPage && <BottomNav />}
      
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
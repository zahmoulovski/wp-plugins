import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { StatePersistenceProvider, useStatePersistenceContext } from './contexts/StatePersistenceContext';
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
import { BlogPage } from './components/pages/BlogPage';
import { BlogModal } from './components/common/BlogModal';
import NotFoundPage from './components/pages/NotFoundPage';
import PortfolioPage from './components/pages/PortfolioPage';
import PortfolioDetail from './components/common/PortfolioDetail';
import SplashScreen from './components/common/SplashScreen';
import { PageWrapper } from './components/common/PageWrapper';
import { Product, BlogPost } from './types';
import { api } from './services/api';
import PaymentCallback from './components/pages/PaymentCallback';
import { initGA, logPageView } from './utils/analytics';


// Removed Capacitor - web only application

function AppContent() {
  const { restoreState, saveState } = useStatePersistenceContext();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => 
    restoreState('selectedProduct', null)
  );
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(() => 
    restoreState('selectedBlogPost', null)
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => 
    restoreState('isSidebarOpen', false)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useApp();

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    saveState('selectedProduct', product);
  };

  const handleBlogPostClick = (post: BlogPost) => {
    setSelectedBlogPost(post);
    saveState('selectedBlogPost', post);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const handleOrderSuccess = (order: any, subtotal: string) => {
    // Store order details for thank you page with order ID in URL
    const orderDetails = { order, subtotal };
    (window as any).orderDetails = orderDetails;
    
    // Store in sessionStorage for persistence after refresh
    if (order?.id) {
      sessionStorage.setItem(`order_${order.id}`, JSON.stringify(orderDetails));
      navigate(`/thank-you#${order.id}`);
    } else {
      // Fallback if no order ID
      navigate('/thank-you');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleContinueShopping = () => {
    navigate('/categories');
  };

  const isCheckoutPage = location.pathname === '/checkout';

  const handleMenuClick = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    saveState('isSidebarOpen', newState);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    saveState('isSidebarOpen', false);
  };

  // Initialize dark mode based on saved preference
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Apply dark mode on initial load
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Initialize Google Analytics
  useEffect(() => {
    initGA();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    logPageView();
  }, [location]);

  // Simulate API data loading on app start
  useEffect(() => {
    const loadInitialData = async () => {
      try {

        const [products, timeout] = await Promise.all([
          api.getProducts({ per_page: 20 }),
          new Promise(resolve => setTimeout(resolve, 4000)) // Minimum 4 seconds
        ]);
        
        setIsLoading(false);
      } catch (error) {
        // Still hide splash screen after timeout even if there's an error
        setTimeout(() => setIsLoading(false), 4000);
      }
    };

    loadInitialData();
  }, []);
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen isLoading={isLoading} onComplete={handleSplashComplete} />}
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Header onMenuClick={handleMenuClick} isMenuOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
        <main>
          <Routes>
            <Route path="/" element={
              <PageWrapper>
                <HomePage onProductClick={handleProductClick} onBlogPostClick={handleBlogPostClick} />
              </PageWrapper>
            } />
            <Route path="/categories" element={
              <PageWrapper>
                <CategoriesPage onProductClick={handleProductClick} />
              </PageWrapper>
            } />
            <Route path="/categories/:categorySlug" element={
              <PageWrapper>
                <CategoriesPage onProductClick={handleProductClick} />
              </PageWrapper>
            } />
            <Route path="/search" element={
              <PageWrapper>
                <SearchPage onProductClick={handleProductClick} />
              </PageWrapper>
            } />
            <Route path="/cart" element={
              <PageWrapper>
                <CartPage onCheckout={handleCheckout} />
              </PageWrapper>
            } />
            <Route path="/checkout" element={<CheckoutPage onBack={handleBackToCart} onOrderSuccess={handleOrderSuccess} />} />
            <Route 
              path="/thank-you" 
              element={
                <PageWrapper>
                  <ThankYouPage 
                    orderDetails={(window as any).orderDetails} 
                    onBackToHome={handleBackToHome} 
                    onContinueShopping={handleContinueShopping} 
                  />
                </PageWrapper>
              } 
            />
            <Route path="/profile" element={
              <PageWrapper>
                <ProfilePage />
              </PageWrapper>
            } />
            <Route path="/contact" element={
              <PageWrapper>
                <ContactPage />
              </PageWrapper>
            } />
            <Route path="/blog" element={
              <PageWrapper>
                <BlogPage onPostClick={handleBlogPostClick} />
              </PageWrapper>
            } />
            <Route path="/galerie" element={
              <PageWrapper>
                <PortfolioPage />
              </PageWrapper>
            } />
            <Route path="/galerie/:slug" element={
              <PageWrapper>
                <PortfolioDetail />
              </PageWrapper>
            } />
            <Route path="/payment-success" element={<PaymentCallback success={true} />} />
            <Route path="/payment-failed" element={<PaymentCallback success={false} />} />
  
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        {!isCheckoutPage && <BottomNav />}
        
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />

        <BlogModal
          post={selectedBlogPost}
          isOpen={!!selectedBlogPost}
          onClose={() => setSelectedBlogPost(null)}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <StatePersistenceProvider>
        <AppContent />
      </StatePersistenceProvider>
    </AppProvider>
  );
}

export default App;
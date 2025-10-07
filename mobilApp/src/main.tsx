import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './services/serviceWorker.ts';

// Register service worker for background state management
registerServiceWorker();

// Prevent page refresh on mobile devices when screen turns off
if ('hidden' in document) {
  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
    }
  });

  // Prevent automatic refresh on resume
  window.addEventListener('focus', () => {
  });
}

// Prevent pull-to-refresh on mobile - only when at the very top and pulling down
document.addEventListener('touchmove', (e) => {
  if (window.scrollY <= 0 && e.touches[0].clientY > e.touches[0].screenY) {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

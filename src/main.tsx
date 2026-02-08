import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.tsx';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker in production for offline support
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}

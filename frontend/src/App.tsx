import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './store/ThemeContext';
import { CartProvider } from './store/CartContext';
import { AppRoutes } from '@runtime/routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
        <CartProvider>
          <ToastProvider><AppRoutes /></ToastProvider>
        </CartProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

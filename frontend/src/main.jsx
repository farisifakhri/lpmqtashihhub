import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/ui/ToastProvider';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found in DOM');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider><App /></ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

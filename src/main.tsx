import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign development WebSocket/HMR connection rejections and error overlays
if (typeof window !== 'undefined') {
  const isWebsocketError = (err: any): boolean => {
    if (!err) return false;
    const str = String(err.message || err.description || err || '');
    return (
      str.toLowerCase().includes('websocket') ||
      str.toLowerCase().includes('failed to connect') ||
      str.toLowerCase().includes('hmr') ||
      str.toLowerCase().includes('closed without opened')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebsocketError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWebsocketError(event.error) || isWebsocketError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  // Override window-level handlers for maximum compatibility across browsers/contexts
  const originalOnUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = function (event) {
    if (isWebsocketError(event.reason)) {
      event.preventDefault();
      return true;
    }
    if (originalOnUnhandled) {
      return originalOnUnhandled.call(this, event);
    }
    return false;
  };

  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isWebsocketError(message) || isWebsocketError(error)) {
      return true; // prevent default error dialogs and browser logging
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

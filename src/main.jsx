import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';

// Register the service worker — autoUpdate takes care of refreshing stale
// assets. We swallow any errors so an SW glitch never blocks the UI.
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);

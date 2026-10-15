import api from '../api/axios';

// Web Push: lets calls ring (as a notification) when the app is closed or in
// the background. Needs a service worker + the user's permission.
// iPhone: only works once the app is added to the Home Screen (iOS 16.4+).

const APP = import.meta.env.VITE_APP_NAME || (typeof location !== 'undefined' ? location.hostname.split('.')[0] : '');

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** 'unsupported' | 'needs-install' (iPhone in Safari) | 'denied' | 'default' | 'granted' */
export function pushState() {
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

let regPromise = null;
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!regPromise) regPromise = navigator.serviceWorker.register('/sw.js').catch((e) => { console.warn('[sw]', e); return null; });
  return regPromise;
}

function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Subscribe this browser for the logged-in user (asks permission if needed — call from a tap). */
export async function enablePush({ ask = true } = {}) {
  if (!pushSupported()) return 'unsupported';
  let perm = Notification.permission;
  if (perm === 'default' && ask) perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm;
  const reg = await registerServiceWorker();
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;
  const { data } = await api.get('/push/public-key');
  const key = data.data.publicKey;
  let sub = await reg.pushManager.getSubscription();
  // Server keys changed → old subscription is useless.
  if (sub && sub.options?.applicationServerKey) {
    const cur = btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (cur !== key) { await sub.unsubscribe().catch(() => {}); sub = null; }
  }
  if (!sub) {
    // Some browsers hang here when their push service is unreachable — give up after 20s.
    sub = await Promise.race([
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Push service did not respond')), 20_000)),
    ]);
  }
  await api.post('/push/subscribe', { subscription: sub.toJSON(), app: APP });
  return 'granted';
}

/** On logout: stop this device ringing for the previous user. */
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  } catch { /* ignore */ }
}

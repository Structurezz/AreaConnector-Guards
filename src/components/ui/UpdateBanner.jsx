import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

// Detects a new deploy (dist/version.json, written at build time) and
// refreshes the app — same idea as the landing site, but it never cuts into
// something important: while live on air, in a call or typing, it waits and
// shows the banner instead. Kept identical across estatemanager, residents
// and security.

const POLL_INTERVAL_MS = 2 * 60 * 1000;
const AUTO_RELOAD_MS = 20 * 1000;
const BUSY_PATHS = [/^\/announcements\/live/, /^\/lounge\/(dj|live)/, /^\/podcasts\/live/];

/* eslint-disable no-undef */
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null;
/* eslint-enable no-undef */

const isBusy = () => {
  if (document.documentElement.dataset.inCall) return true;
  if (BUSY_PATHS.some((re) => re.test(window.location.pathname))) return true;
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

// Let a service worker pick up the new build first, so the reload isn't
// served the old cached page (matters for the installable security app).
async function reloadFresh() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    if (regs.length) {
      await Promise.race([
        Promise.all(regs.map((r) => r.update().catch(() => {}))),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    }
  } catch { /* reload anyway */ }
  window.location.reload();
}

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const checkingRef = useRef(false);
  const latestRef = useRef(CURRENT_VERSION);

  useEffect(() => {
    if (!CURRENT_VERSION || import.meta.env.DEV) return;

    const check = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.version && data.version !== CURRENT_VERSION && data.version !== latestRef.current) {
          latestRef.current = data.version;
          setUpdateAvailable(true);
          setDismissed(false);
        }
      } catch { /* offline or a network hiccup */ }
      finally { checkingRef.current = false; }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Refresh by itself after a short countdown, or the moment the app comes
  // back from the background — but only when nothing important is going on.
  useEffect(() => {
    if (!updateAvailable) return;
    const tryReload = () => { if (!isBusy()) reloadFresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') tryReload(); };
    document.addEventListener('visibilitychange', onVisible);
    let t;
    if (!dismissed) {
      const tick = () => { if (isBusy()) t = setTimeout(tick, 15000); else reloadFresh(); };
      t = setTimeout(tick, AUTO_RELOAD_MS);
    }
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [updateAvailable, dismissed]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[200] px-3 w-full sm:w-auto max-w-md pointer-events-none"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }} role="status" aria-live="polite">
      <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 border border-white/10 pl-3 pr-2 py-2 animate-fade-in">
        <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
          <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '2.5s' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight">New version available</div>
          <div className="text-[11px] text-white/60 leading-tight mt-0.5">
            {isBusy() ? 'Refresh when you’re done' : 'Refreshing automatically…'}
          </div>
        </div>
        <button onClick={reloadFresh}
          className="bg-white text-slate-900 font-semibold text-[12px] px-3 py-2 rounded-xl active:scale-95 transition-transform flex-shrink-0">
          Refresh
        </button>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss"
          className="w-8 h-8 rounded-xl text-white/50 hover:text-white hover:bg-white/5 flex items-center justify-center flex-shrink-0 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

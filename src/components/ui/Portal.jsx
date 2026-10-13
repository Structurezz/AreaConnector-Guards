import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Every overlay (modal, sheet, drawer, full-screen takeover) must render
// through this. Rendered inline, a `fixed inset-0` backdrop inherits layout
// from wherever it sits in the page tree — e.g. `space-y-*` gives it a
// margin-top that pushes it 20px down off the topbar, and any transformed or
// filtered ancestor turns `fixed` into "relative to that box". Portalling to
// <body> makes the overlay always cover exactly the viewport.
// It also holds the page scroll lock while mounted (pass lock={false} for
// non-blocking layers), so inline overlays get it without extra wiring.
export default function Portal({ children, lock = true }) {
  useScrollLock(lock);
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

// Overlay layers, lowest to highest. Keep every overlay on one of these so
// nothing (e.g. the FM pill) can float above an open dialog.
export const Z_INDEX = {
  drawer:   100,  // side drawers, sheets, standard modals
  takeover: 200,  // full-screen live/podcast experiences
  critical: 300,  // emergency alerts — always on top
};
// Tailwind classes for the same layers (literal so Tailwind can see them).
export const Z = {
  drawer:   'z-[100]',
  takeover: 'z-[200]',
  critical: 'z-[300]',
};

// Reference-counted scroll lock. The app scrolls inside <main>, not <body>,
// so both are locked; nested overlays keep the lock until the last closes.
let locks = 0;
const saved = new Map();

function lockTargets() {
  return [document.body, ...document.querySelectorAll('main')];
}

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      lockTargets().forEach((el) => {
        saved.set(el, el.style.overflow);
        el.style.overflow = 'hidden';
      });
    }
    return () => {
      if (--locks === 0) {
        saved.forEach((value, el) => { el.style.overflow = value; });
        saved.clear();
      }
    };
  }, [active]);
}

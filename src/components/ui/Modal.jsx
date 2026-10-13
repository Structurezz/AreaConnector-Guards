import { X } from 'lucide-react';
import { useEffect } from 'react';
import Portal, { Z, useScrollLock } from './Portal';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

// Standard dialog. Bottom sheet on phones, centred card from sm up. Header
// stays pinned while the body scrolls, so the close button is always reachable.
export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex items-end sm:items-center justify-center sm:p-6`} onClick={onClose}>
        <div className="overlay-backdrop" aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          className={`sheet-panel relative w-full ${SIZES[size] || SIZES.md} bg-white rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92dvh] sm:max-h-[88dvh]`}
          style={{ boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sm:hidden flex justify-center pt-2.5" aria-hidden="true">
            <div className="w-10 h-1.5 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-3 pb-4 sm:py-5 shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <h2 className="text-lg font-display font-semibold min-w-0 truncate" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 -mr-1.5 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="px-5 sm:px-6 pt-5 overflow-y-auto overscroll-contain flex-1"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}

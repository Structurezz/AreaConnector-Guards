import { useEffect, useRef, useState } from 'react';
import QrScannerLib from 'qr-scanner';
import { X, Zap, ZapOff, Camera, SwitchCamera, AlertTriangle } from 'lucide-react';
import Portal from './ui/Portal';

// Visual skin for qr-scanner's own scan-region overlay (it is positioned by the
// library exactly over the real scan region): dark surround, blue corner
// brackets and a sweeping scan line. Styling only — no behaviour change.
const SCAN_CSS = `
.gate-qr .scan-region-highlight {
  border-radius: 22px;
  box-shadow: 0 0 0 200vmax rgba(2, 6, 23, 0.58);
  overflow: visible;
}
.gate-qr .scan-region-highlight-svg {
  stroke: #3B82F6 !important;
  stroke-width: 6 !important;
  filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.65));
}
.gate-qr .code-outline-highlight {
  stroke: #60A5FA !important;
}
.gate-qr .scan-region-highlight::after {
  content: '';
  position: absolute;
  left: 7%; right: 7%; top: 6%;
  height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, rgba(59,130,246,0), #60A5FA 20%, #3B82F6 50%, #60A5FA 80%, rgba(59,130,246,0));
  box-shadow: 0 0 14px 2px rgba(59, 130, 246, 0.55);
  animation: gateQrSweep 2.2s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes gateQrSweep { from { top: 6%; } to { top: 94%; } }
@media (prefers-reduced-motion: reduce) {
  .gate-qr .scan-region-highlight::after { animation: none; top: 50%; }
}
`;

/**
 * Full-screen QR scanner modal.
 *
 * Props:
 *   open:      boolean
 *   onClose:   () => void
 *   onResult:  (text) => void       // called once per successful scan; parent decides what to do
 *   title?:    string                // overlay title (defaults to "Scan Visitor Pass")
 */
export default function QrScanner({ open, onClose, onResult, title = 'Scan Visitor Pass' }) {
  const videoRef   = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError]           = useState(null);
  const [torchOn, setTorchOn]       = useState(false);
  const [hasTorch, setHasTorch]     = useState(false);
  const [cameras, setCameras]       = useState([]);
  const [cameraIndex, setCameraIndex] = useState(0);

  // Boot the scanner when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        // Prefer back/environment camera on mobile
        const list = await QrScannerLib.listCameras(true).catch(() => []);
        if (cancelled) return;
        setCameras(list);

        const preferredIdx = Math.max(
          0,
          list.findIndex((c) => /back|rear|environment/i.test(c.label)),
        );
        setCameraIndex(preferredIdx);

        const scanner = new QrScannerLib(
          videoRef.current,
          (res) => {
            // Fire once, then stop immediately so parent decides what next
            if (!cancelled) onResult?.(res.data);
          },
          {
            preferredCamera: list[preferredIdx]?.id || 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
            returnDetailedScanResult: true,
          },
        );

        scannerRef.current = scanner;
        await scanner.start();
        if (cancelled) { scanner.stop(); scanner.destroy(); return; }

        try {
          const flashSupport = await scanner.hasFlash();
          if (!cancelled) setHasTorch(!!flashSupport);
        } catch { /* older browsers */ }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.name === 'NotAllowedError'
              ? 'Camera permission denied. Enable camera access in your browser settings.'
              : err?.message || 'Could not access the camera.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch { /* noop */ }
        try { scannerRef.current.destroy(); } catch { /* noop */ }
        scannerRef.current = null;
      }
    };
  }, [open, onResult]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      if (torchOn) await scannerRef.current.turnFlashOff();
      else         await scannerRef.current.turnFlashOn();
      setTorchOn((v) => !v);
    } catch { /* noop */ }
  };

  const switchCamera = async () => {
    if (cameras.length < 2 || !scannerRef.current) return;
    const nextIdx = (cameraIndex + 1) % cameras.length;
    try {
      await scannerRef.current.setCamera(cameras[nextIdx].id);
      setCameraIndex(nextIdx);
    } catch { /* noop */ }
  };

  if (!open) return null;

  return (
    <Portal>
    <style>{SCAN_CSS}</style>
    <div className="gate-qr" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#020617',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Video */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          playsInline
          muted
        />

        {/* Scrim gradients so controls stay readable */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(2,6,23,0.70) 0%, rgba(2,6,23,0) 22%, rgba(2,6,23,0) 72%, rgba(2,6,23,0.75) 100%)',
        }} />

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 16px',
          paddingTop: 'calc(14px + env(safe-area-inset-top))',
          display: 'flex', alignItems: 'center', gap: 10,
          color: '#fff',
        }}>
          <button
            onClick={onClose}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(7,17,31,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <X size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: '#BFDBFE' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#3B82F6', boxShadow: '0 0 0 3px rgba(59,130,246,0.25)' }} />
              Gate security · camera live
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginTop: 2 }}>
              {title}
            </div>
          </div>
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              title="Switch camera"
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'rgba(7,17,31,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.14)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
              <SwitchCamera size={16} />
            </button>
          )}
        </div>

        {/* Hint */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 28,
          display: 'flex', justifyContent: 'center', padding: '0 24px', pointerEvents: 'none',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderRadius: 999,
            background: 'rgba(7,17,31,0.65)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(59,130,246,0.35)',
            color: '#fff', fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#3B82F6' }} />
            Point the camera at the visitor's QR pass
          </span>
        </div>

        {/* Error overlay */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}>
            <div style={{
              background: '#fff', borderRadius: 20, padding: '24px 20px',
              maxWidth: 320, width: '100%', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <AlertTriangle size={22} color="#DC2626" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                Camera unavailable
              </div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 16 }}>
                {error}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '100%', border: 'none',
                  background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', height: 48, borderRadius: 14,
                }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        padding: 20,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#07111F',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={toggleTorch}
          disabled={!hasTorch}
          style={{
            width: 56, height: 56, borderRadius: 16, border: 'none', cursor: hasTorch ? 'pointer' : 'not-allowed',
            background: torchOn ? '#3B82F6' : 'rgba(255,255,255,0.10)',
            color: '#fff',
            boxShadow: torchOn ? '0 0 0 4px rgba(59,130,246,0.25)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hasTorch ? 1 : 0.4,
          }}
          title={hasTorch ? (torchOn ? 'Turn torch off' : 'Turn torch on') : 'Torch not supported'}>
          {torchOn ? <ZapOff size={22} /> : <Zap size={22} />}
        </button>
        <div style={{ flex: 1, color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600 }}>
          Hold steady while the code focuses
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(59,130,246,0.14)',
          border: '1px solid rgba(59,130,246,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#BFDBFE',
        }}>
          <Camera size={22} />
        </div>
      </div>
    </div>
    </Portal>
  );
}

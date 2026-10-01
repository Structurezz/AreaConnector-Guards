import { useEffect, useRef, useState } from 'react';
import QrScannerLib from 'qr-scanner';
import { X, Zap, ZapOff, Camera, SwitchCamera, AlertTriangle } from 'lucide-react';

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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000',
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
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.60) 100%)',
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
              width: 40, height: 40, borderRadius: 12, border: 'none',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <X size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.70)' }}>
              Gate Security
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2 }}>
              {title}
            </div>
          </div>
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              title="Switch camera"
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
              <SwitchCamera size={16} />
            </button>
          )}
        </div>

        {/* Hint */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 110,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 13, fontWeight: 600,
          padding: '0 24px',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          Point the camera at the visitor's QR pass
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
                  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
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
        background: '#000',
      }}>
        <button
          onClick={toggleTorch}
          disabled={!hasTorch}
          style={{
            width: 56, height: 56, borderRadius: 16, border: 'none', cursor: hasTorch ? 'pointer' : 'not-allowed',
            background: torchOn ? '#fff' : 'rgba(255,255,255,0.14)',
            color: torchOn ? '#1D4ED8' : '#fff',
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
          background: 'rgba(255,255,255,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.75)',
        }}>
          <Camera size={22} />
        </div>
      </div>
    </div>
  );
}

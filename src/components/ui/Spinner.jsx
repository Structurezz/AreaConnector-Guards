export default function Spinner({ size = 24, className = '' }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-emerald-400 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080B12',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
          boxShadow: '0 0 40px rgba(59,130,246,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
          <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.15)"/>
          <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.6)"/>
          <rect x="18" y="18" width="4" height="5" rx="1" fill="white"/>
          <circle cx="20" cy="17" r="1.5" fill="white"/>
        </svg>
      </div>

      {/* Brand name */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
          Area<span style={{ color: '#3B82F6' }}>Connect</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
          Guard / Staff
        </div>
      </div>

      {/* Spinner ring */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.08)',
          borderTopColor: '#3B82F6',
          animation: 'spin 0.8s linear infinite',
        }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Spinner({ size = 24, className = '' }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
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
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          boxShadow: '0 0 36px rgba(16,185,129,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none"/>
          <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.2)"/>
          <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.65)"/>
          <rect x="18" y="18" width="4" height="5" rx="1" fill="white"/>
          <circle cx="20" cy="17" r="1.5" fill="white"/>
        </svg>
      </div>

      {/* Brand name */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A', lineHeight: 1 }}>
          Area<span style={{ color: '#10B981' }}>Connect</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A3B8', marginTop: 6 }}>
          Guard / Staff
        </div>
      </div>

      {/* Spinner ring */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2.5px solid rgba(15,23,42,0.08)',
          borderTopColor: '#10B981',
          animation: 'spin 0.8s linear infinite',
        }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

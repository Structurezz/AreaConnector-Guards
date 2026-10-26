import { useEffect, useState } from 'react';

// Branded loading: the app logo breathing inside a progress ring, with phrases
// that describe what's loading on the current page.
const BRAND = {
  "logo": "/icon-192.png",
  "mark": "AC",
  "color": "#10B981",
  "dark": "#047857",
  "track": "#E2E8F0",
  "name": [
    "Area",
    "Connect"
  ],
  "tagline": "Guard / Staff",
  "fallback": [
    "Getting the gate ready",
    "Loading"
  ]
};

// [path prefix, phrases] — first match wins
const PAGE_PHRASES = [
  [
    "/verify",
    [
      "Getting the scanner ready",
      "Checking visitor passes"
    ]
  ],
  [
    "/log",
    [
      "Loading the gate log",
      "Fetching today’s entries"
    ]
  ],
  [
    "/alerts",
    [
      "Loading alerts",
      "Checking security reports"
    ]
  ],
  [
    "/calls",
    [
      "Loading calls",
      "Connecting your line"
    ]
  ],
  [
    "/settings",
    [
      "Loading settings"
    ]
  ],
  [
    "/",
    [
      "Getting the gate ready",
      "Loading expected visitors"
    ]
  ]
];

const BOOT_PHRASES = ["Signing you in", "Getting the gate ready", "Almost there"];

function phrasesForPath() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const hit = PAGE_PHRASES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`) || (prefix !== '/' && path.startsWith(prefix)));
  return hit ? hit[1] : BRAND.fallback;
}

const CSS = `
@keyframes acl-spin { to { transform: rotate(360deg); } }
@keyframes acl-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes acl-glow { 0%,100% { opacity: .18; transform: scale(.85); } 50% { opacity: .38; transform: scale(1.05); } }
@keyframes acl-phrase { 0% { opacity: 0; transform: translateY(4px); } 12%,88% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-4px); } }
@keyframes acl-dots { 0%,20% { opacity: .2; } 50% { opacity: 1; } 100% { opacity: .2; } }
`;

function Logo({ size }) {
  const [broken, setBroken] = useState(!BRAND.logo);
  if (broken) {
    return (
      <span style={{ width: size, height: size, borderRadius: size * 0.28, background: `linear-gradient(135deg, ${BRAND.color}, ${BRAND.dark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.34, letterSpacing: '-0.02em' }}>
        {BRAND.mark}
      </span>
    );
  }
  return <img src={BRAND.logo} alt="" onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: size * 0.28, display: 'block' }} />;
}

export function LogoLoader({ size = 56, phrases, showPhrase = true, className = '', style }) {
  const [auto] = useState(phrasesForPath);
  const list = phrases || auto;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!showPhrase || list.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), 1900);
    return () => clearInterval(t);
  }, [list, showPhrase]);
  const ring = size + 36;
  const r = ring / 2 - 2.5;
  const c = 2 * Math.PI * r;
  return (
    <div role="status" aria-live="polite" className={className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '8px 0', ...style }}>
      <style>{CSS}</style>
      <div style={{ position: 'relative', width: ring, height: ring }}>
        <span style={{ position: 'absolute', inset: 16, borderRadius: '50%', background: BRAND.color, filter: 'blur(16px)', opacity: .5, animation: 'acl-glow 2.2s ease-in-out infinite' }} />
        <svg width={ring} height={ring} style={{ position: 'absolute', inset: 0, animation: 'acl-spin 1.1s linear infinite' }}>
          <circle cx={ring / 2} cy={ring / 2} r={r} fill="none" stroke="#EEF2F6" strokeWidth="3" />
          <circle cx={ring / 2} cy={ring / 2} r={r} fill="none" stroke={BRAND.color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c}`} />
        </svg>
        <span style={{ position: 'absolute', inset: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'acl-breathe 2.2s ease-in-out infinite' }}>
          <span style={{ borderRadius: size * 0.28, boxShadow: `0 10px 24px -10px ${BRAND.color}`, background: '#fff' }}><Logo size={size} /></span>
        </span>
      </div>
      {showPhrase && (
        <p key={i} style={{ margin: 0, minHeight: 18, fontSize: 13, fontWeight: 500, color: '#475569', textAlign: 'center', animation: list.length > 1 ? 'acl-phrase 1.9s ease-in-out both' : undefined }}>
          {list[i % list.length]}
          <span style={{ animation: 'acl-dots 1.2s infinite' }}>.</span>
          <span style={{ animation: 'acl-dots 1.2s .2s infinite' }}>.</span>
          <span style={{ animation: 'acl-dots 1.2s .4s infinite' }}>.</span>
        </p>
      )}
    </div>
  );
}

// Small sizes stay a plain ring (buttons, inline); section/page sizes use the logo loader.
export default function Spinner({ size = 24, className = '' }) {
  if (size >= 22) {
    return (
      <div className={className} style={{ width: '100%', background: '#FFFFFF', borderRadius: 16, minHeight: 'min(60vh, 420px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogoLoader size={Math.round(Math.min(60, Math.max(44, size * 1.7)))} />
      </div>
    );
  }
  return (
    <span className={`inline-block rounded-full ${className}`}
      style={{ width: size, height: size, border: `2px solid ${BRAND.track}`, borderTopColor: BRAND.color, animation: 'acl-spin .8s linear infinite', flexShrink: 0 }}>
      <style>{CSS}</style>
    </span>
  );
}

export function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <LogoLoader size={72} phrases={BOOT_PHRASES} />
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A', lineHeight: 1 }}>
          {BRAND.name[0]}<span style={{ color: BRAND.color }}>{BRAND.name[1]}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A3B8', marginTop: 6 }}>{BRAND.tagline}</div>
      </div>
      <p style={{ position: 'fixed', bottom: 24, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#94A3B8', letterSpacing: '0.03em', margin: 0 }}>
        Powered by <span style={{ fontWeight: 600, color: '#64748B' }}>AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
      </p>
    </div>
  );
}

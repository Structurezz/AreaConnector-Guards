import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';

const DEMO = { label: 'Security Guard', email: 'security@estate-demo.com', password: 'Security@123' };

/* ── Ad sidebar slides (desktop only) ── */
const AD_SLIDES = [
  {
    tag: 'Security Guard Portal',
    headline: 'What is AreaConnect Guard?',
    body: 'AreaConnect Guard is the dedicated gate security terminal. Instantly verify visitor access codes, manage check-ins and check-outs, and respond to live estate alerts — all from one powerful interface.',
    points: ['Instant QR & Code Verification', 'Check-in & Check-out Logging', 'Real-time Alert Notifications', 'Session Entry Log'],
    accent: '#3B82F6',
    num: '01',
  },
  {
    tag: 'Gate Verification System',
    headline: 'Verify in Seconds',
    body: "Residents pre-register visitors through AreaMates and generate unique access codes. At the gate, guards enter or scan the code — the system instantly shows the visitor's details, expected time, and host information.",
    points: ['6-digit Unique Access Codes', 'Real-time Visitor Details', 'Host Resident & Unit Info', 'Blacklist Enforcement'],
    accent: '#60A5FA',
    num: '02',
  },
  {
    tag: 'Live Alert System',
    headline: 'Always First to Know',
    body: 'Receive instant push notifications for security threats, fire, medical, and other emergencies raised by residents. Acknowledge and act from the Guard portal with full context.',
    points: ['Multi-type Alert Categories', 'Severity Levels (Critical–Low)', 'Resident & Unit Info on Alerts', 'Siren & Sound Notifications'],
    accent: '#93C5FD',
    num: '03',
  },
];

function AdSidebar() {
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);

  const go = (i) => { setOut(true); setTimeout(() => { setIdx(i); setOut(false); }, 280); };

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % AD_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [idx]);

  const s = AD_SLIDES[idx];

  return (
    <div className="hidden lg:flex" style={{
      flex: 1,
      background: 'linear-gradient(180deg,#060E1A 0%,#0B1626 100%)',
      flexDirection: 'column', padding: '48px 52px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 260, height: 260, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${s.accent}20 0%, transparent 70%)`,
        transition: 'background 0.5s',
      }}/>
      <div style={{
        position: 'absolute', bottom: -60, right: -40, pointerEvents: 'none',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${s.accent}12 0%, transparent 70%)`,
        transition: 'background 0.5s',
      }}/>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11,
          background: 'linear-gradient(135deg,#3B82F6,#2563EB)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none"/>
            <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.2)"/>
            <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.65)"/>
            <rect x="18" y="18" width="4" height="5" rx="1" fill="white"/>
            <circle cx="20" cy="17" r="1.5" fill="white"/>
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
          Area<span style={{ color: '#3B82F6' }}>Connect</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}> Guard</span>
        </span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 }}>
        {s.num} <span style={{ color: 'rgba(255,255,255,0.08)' }}>/ 03</span>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        paddingTop: 20, paddingBottom: 20, position: 'relative', zIndex: 1,
        opacity: out ? 0 : 1, transform: out ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.28s, transform 0.28s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ width: 22, height: 2, borderRadius: 99, background: s.accent }}/>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: s.accent, textTransform: 'uppercase' }}>{s.tag}</span>
        </div>

        <h3 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', color: '#fff', marginBottom: 12 }}>
          {s.headline}
        </h3>

        <div style={{ width: 30, height: 3, borderRadius: 99, background: `linear-gradient(90deg,${s.accent},transparent)`, marginBottom: 16 }}/>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.42)', marginBottom: 24 }}>{s.body}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.points.map(pt => (
            <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={13} color={s.accent} style={{ flexShrink: 0, marginTop: 2 }}/>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, paddingBottom: 18, position: 'relative', zIndex: 1 }}>
        {AD_SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)} style={{
            width: i === idx ? 24 : 6, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
            background: i === idx ? s.accent : 'rgba(255,255,255,0.15)',
            transition: 'all 0.35s',
          }}/>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.55)' }}>
          Area<span style={{ color: '#10B981' }}>Connect</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>Smart Estate Technology</div>
      </div>
    </div>
  );
}

/* ── Mobile CSS ── */
const MOBILE_CSS = `
  @keyframes sgOrb1 {
    0%,100% { transform: translate(0,0) scale(1); }
    35% { transform: translate(30px,-42px) scale(1.09); }
    68% { transform: translate(-20px,28px) scale(0.93); }
  }
  @keyframes sgOrb2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40% { transform: translate(-34px,22px) scale(1.06); }
    72% { transform: translate(24px,-26px) scale(0.95); }
  }
  @keyframes sgPulse {
    0% { transform: scale(1); opacity: 0.55; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes sgCardIn {
    0% { opacity: 0; transform: translateY(36px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes sgHeroIn {
    0% { opacity: 0; transform: scale(0.92) translateY(-10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes sgScan {
    0% { top: -2px; opacity: 0.07; }
    100% { top: 101%; opacity: 0.01; }
  }
  @keyframes sgGlow {
    0%,100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .sg-input {
    width: 100%; padding: 13px 16px; border-radius: 12px;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.11);
    color: #fff; font-size: 14px; outline: none; box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .sg-input:focus { border-color: rgba(59,130,246,0.5); }
  .sg-input::placeholder { color: rgba(255,255,255,0.3); }
`;

function MobileLogin({ form, setForm, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#05091A 0%,#0A1628 100%)', position: 'relative', overflow: 'hidden' }}>
      <style>{MOBILE_CSS}</style>

      {/* Orb 1 — top right */}
      <div style={{
        position: 'fixed', top: -100, right: -80, width: 380, height: 380,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 65%)',
        animation: 'sgOrb1 10s ease-in-out infinite',
      }}/>
      {/* Orb 2 — bottom left */}
      <div style={{
        position: 'fixed', bottom: -120, left: -100, width: 340, height: 340,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 65%)',
        animation: 'sgOrb2 13s 2s ease-in-out infinite',
      }}/>
      {/* Scan line */}
      <div style={{
        position: 'fixed', left: 0, right: 0, height: 1, pointerEvents: 'none',
        background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.3), transparent)',
        animation: 'sgScan 9s linear infinite',
      }}/>

      {/* ── Hero ── */}
      <div style={{
        textAlign: 'center', padding: '64px 24px 36px',
        position: 'relative', zIndex: 1,
        animation: 'sgHeroIn 0.8s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Icon + pulse rings */}
        <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 22 }}>
          <div style={{
            position: 'absolute', inset: -18, borderRadius: '50%',
            border: '1.5px solid rgba(59,130,246,0.45)',
            animation: 'sgPulse 2.6s ease-out infinite',
          }}/>
          <div style={{
            position: 'absolute', inset: -9, borderRadius: '50%',
            border: '1.5px solid rgba(59,130,246,0.45)',
            animation: 'sgPulse 2.6s 0.7s ease-out infinite',
          }}/>
          <div style={{
            width: 76, height: 76, borderRadius: 22,
            background: 'linear-gradient(135deg,#3B82F6,#2563EB)',
            boxShadow: '0 0 56px rgba(59,130,246,0.55), 0 12px 40px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'sgGlow 3s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none"/>
              <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.2)"/>
              <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.65)"/>
              <rect x="18" y="18" width="4" height="5" rx="1" fill="white"/>
              <circle cx="20" cy="17" r="1.5" fill="white"/>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.045em', color: '#fff', marginBottom: 4 }}>
          Area<span style={{ color: '#60A5FA' }}>Connect</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, fontWeight: 700 }}> Guard</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 24 }}>
          Security Portal
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 7 }}>
          {['Gate Verification', 'Entry Log', 'Live Alerts', 'Access Control'].map(f => (
            <span key={f} style={{
              fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 99,
              background: 'rgba(59,130,246,0.12)', color: '#93C5FD',
              border: '1px solid rgba(59,130,246,0.22)',
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div style={{
        margin: '0 20px 0',
        height: 1, background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.18), transparent)',
      }}/>

      {/* ── Form card ── */}
      <div style={{
        margin: '0 12px', padding: '28px 24px 36px',
        borderRadius: '28px 28px 0 0',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderBottom: 'none',
        animation: 'sgCardIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both',
        position: 'relative', zIndex: 1,
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 2 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 22 }}>Sign in to the gate system</p>

        {/* Demo chip */}
        <button
          onClick={() => setForm({ email: DEMO.email, password: DEMO.password })}
          style={{
            width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 12,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            cursor: 'pointer', marginBottom: 22,
          }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#60A5FA', textTransform: 'uppercase', marginBottom: 3 }}>
            Try Demo Account
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{DEMO.email}</div>
        </button>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', fontSize: 13,
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              Email Address
            </label>
            <input type="email" className="sg-input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required autoComplete="email"/>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} className="sg-input" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" style={{ paddingRight: 44 }}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3B82F6,#2563EB)',
            color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: loading ? 'none' : '0 6px 24px rgba(59,130,246,0.35)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? (
              <>
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Signing in…
              </>
            ) : 'Sign In to Gate System'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#60A5FA', fontWeight: 600 }}>Sign up</Link>
          </p>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
          Powered by <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      playSound('success');
      toast.success(`Welcome, ${user?.name?.split(' ')[0] || 'Guard'}!`);
      navigate('/verify');
    } catch (err) {
      playSound('error');
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const shared = { form, setForm, showPw, setShowPw, loading, error, handleSubmit };

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        <MobileLogin {...shared}/>
      </div>

      {/* ── Desktop: sidebar + form ── */}
      <div className="hidden lg:flex min-h-screen" style={{ background: '#060E1A' }}>
        <AdSidebar />

        {/* Form panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', minHeight: '100vh', background: '#F8FAFC', padding: '40px 24px' }}>
          <div className="w-full max-w-md">
            {/* Brand mark */}
            <div className="mb-9">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 15,
                  background: 'linear-gradient(135deg,#3B82F6,#2563EB)',
                  boxShadow: '0 0 24px rgba(59,130,246,0.25), 0 4px 12px rgba(0,0,0,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Shield size={26} color="white"/>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', color: '#0F172A' }}>
                    Area<span style={{ color: '#3B82F6' }}>Connect</span>
                    <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: 16, fontWeight: 600 }}> Guard</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2, color: '#94A3B8' }}>
                    Security Portal
                  </div>
                </div>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A', marginBottom: 6 }}>Welcome back</h1>
              <p style={{ fontSize: 14, color: '#475569' }}>Sign in to the gate system</p>
            </div>

            {/* Demo quick-fill */}
            <div className="mb-6 rounded-xl p-3.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#94A3B8' }}>Demo Account</p>
              <button
                onClick={() => { setForm({ email: DEMO.email, password: DEMO.password }); setError(''); }}
                className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                onMouseOut={e  => e.currentTarget.style.borderColor = '#E2E8F0'}>
                <div className="text-xs font-semibold" style={{ color: '#0F172A' }}>{DEMO.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{DEMO.email}</div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" style={{
              background: 'linear-gradient(135deg,rgba(59,130,246,0.04) 0%,#FFFFFF 100%)',
              border: '1px solid rgba(59,130,246,0.18)',
              borderRadius: 16, padding: 24,
            }}>
              {error && (
                <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <AlertCircle size={15} className="shrink-0"/> {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#64748B' }}>Email Address</label>
                <input type="email" className="input-field" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  required autoComplete="email"/>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#64748B' }}>Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-field pr-11"
                    placeholder="••••••••" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required autoComplete="current-password"/>
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseOver={e => e.currentTarget.style.color = '#475569'}
                    onMouseOut={e  => e.currentTarget.style.color = '#94A3B8'}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg,#3B82F6,#2563EB)',
                  color: 'white', boxShadow: loading ? 'none' : '0 4px 14px rgba(59,130,246,0.35)',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign In to Gate System'}
              </button>
              <p className="text-center text-sm pt-1" style={{ color: '#94A3B8' }}>
                Don't have an account?{' '}
                <Link to="/register" className="font-medium transition-colors" style={{ color: '#60A5FA' }}
                  onMouseOver={e => e.currentTarget.style.color = '#3B82F6'}
                  onMouseOut={e  => e.currentTarget.style.color = '#60A5FA'}>
                  Sign up
                </Link>
              </p>
            </form>

            <p className="text-center text-xs mt-10" style={{ color: '#CBD5E1' }}>
              © 2025 AreaConnect · Secure Estate Technology
            </p>
            <p className="text-[11px] text-slate-400 text-center mt-2 tracking-wide">
              Powered by <span className="font-semibold text-slate-500">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

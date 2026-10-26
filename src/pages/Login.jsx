import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Eye, EyeOff, AlertCircle, KeyRound, Mail, ShieldCheck, X, UserCheck, Package, Siren, LogOut, Car, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import Portal from '../components/ui/Portal';
import { GuardMark } from '../components/layout/Sidebar';

function ForgotPasswordModal({ initialEmail = '', onClose }) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.includes('@')) { toast.error('Enter a valid email'); return; }
    setSubmitting(true);
    try { await authAPI.requestPasswordReset({ email }); } catch {}
    setSent(true); setSubmitting(false);
  };

  return (
    <Portal>
    <style>{AUTH_CSS}</style>
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <X size={14}/>
        </button>
        {sent ? (
          <div style={{ padding: '36px 28px 28px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={30}/>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Request sent</h2>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
              If an account exists for <strong>{email}</strong>, your estate manager has been notified. You'll receive a temporary password by email once they approve.
            </p>
            <button onClick={onClose}
              style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: 'radial-gradient(120% 120% at 0% 0%, rgba(59,130,246,.38) 0%, transparent 60%), #07111F', padding: '28px 28px 22px', color: '#fff' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <KeyRound size={24}/>
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 2 }}>Password help</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.25, color: '#fff' }}>Ask your estate manager to reset it</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', lineHeight: 1.5 }}>
                Enter your account email — your estate manager will approve a reset and we'll email you a temporary password.
              </p>
            </div>
            <form onSubmit={submit} style={{ padding: '20px 28px 28px' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Email address</label>
              <div style={{ position: 'relative', marginBottom: 18 }}>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className="ga-input" style={{ paddingLeft: 40 }} />
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}/>
              </div>
              <button type="submit" disabled={submitting} className="ga-btn" style={submitting ? { background: '#94A3B8', boxShadow: 'none', cursor: 'wait' } : undefined}>
                {submitting ? 'Sending request…' : 'Request password reset'}
              </button>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '12px 0 0', textAlign: 'center', lineHeight: 1.55 }}>
                Your estate manager must approve the reset — this prevents stranger-driven password resets.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
    </Portal>
  );
}

/* ── Shared auth look (also used by Register) ── */
export const AUTH_CSS = `
  .ga-input {
    width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
    background: #fff; border: 1px solid #E2E8F0; color: #0F172A;
    font-size: 14px; outline: none; box-sizing: border-box;
    transition: border-color .15s, box-shadow .15s;
  }
  .ga-input::placeholder { color: #94A3B8; }
  .ga-input:hover { border-color: #CBD5E1; }
  .ga-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 4px rgba(59,130,246,0.15); }
  .ga-label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
  .ga-btn {
    width: 100%; height: 48px; border-radius: 14px; border: none; cursor: pointer;
    background: linear-gradient(135deg,#3B82F6,#1D4ED8); color: #fff;
    font-size: 15px; font-weight: 600; letter-spacing: -0.005em;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 10px 24px -10px rgba(59,130,246,0.75);
    transition: filter .15s, transform .1s, box-shadow .15s;
  }
  .ga-btn:hover { filter: brightness(1.06); }
  .ga-btn:active { transform: scale(0.99); }
  .ga-btn:disabled { cursor: not-allowed; filter: none; opacity: .65; box-shadow: none; }
  .ga-link { color: #2563EB; font-weight: 600; text-decoration: none; }
  .ga-link:hover { color: #1D4ED8; text-decoration: underline; }
  @media (min-width: 1024px) { .ga-btn { height: 46px; border-radius: 12px; } }
  @keyframes gaIn { from { opacity: 0; transform: translateY(-10px) scale(.98); } to { opacity: 1; transform: none; } }
  @keyframes gaRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes gaPing { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
  .ga-rise { animation: gaRise .6s cubic-bezier(.22,1,.36,1) both; }
  .ga-in { animation: gaIn .45s cubic-bezier(.22,1,.36,1) both; }
`;

// Sample data only — illustrates the live gate feed on the sign-in screen.
const SAMPLE_ACTIVITY = [
  { icon: UserCheck, tone: '#10B981', title: 'Visitor checked in',   meta: 'Adaeze O. · Block C, Unit 4', tag: 'Gate A' },
  { icon: Package,   tone: '#F59E0B', title: 'Delivery cleared',     meta: 'Courier · Unit 12B',          tag: 'Gate B' },
  { icon: Siren,     tone: '#EF4444', title: 'Alert acknowledged',   meta: 'Noise report · Block A',      tag: 'Patrol' },
  { icon: LogOut,    tone: '#94A3B8', title: 'Visitor checked out',  meta: 'Tunde B. · Unit 7',           tag: 'Gate A' },
  { icon: Car,       tone: '#3B82F6', title: 'Vehicle pass verified', meta: 'LND 482 KJ · Unit 3',        tag: 'Gate B' },
  { icon: Lock,      tone: '#60A5FA', title: 'Access code verified', meta: '6-digit code · Unit 9A',      tag: 'Gate A' },
];
const AGO = ['now', '2m', '5m'];

function useTicker(ms = 2500) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), ms); return () => clearInterval(t); }, [ms]);
  return tick;
}

function ActivityRow({ ev, ago, fresh }) {
  const Icon = ev.icon;
  return (
    <div className={fresh ? 'ga-in' : ''} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: fresh ? 'rgba(59,130,246,0.10)' : 'transparent', transition: 'background .6s' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${ev.tone}22`, color: ev.tone }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
        <div style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.meta}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(226,232,240,0.55)' }}>{ev.tag}</div>
        <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.35)' }}>{ago}</div>
      </div>
    </div>
  );
}

function LiveDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 99, background: '#10B981', animation: 'gaPing 1.8s ease-out infinite' }} />
      <span style={{ position: 'relative', width: 8, height: 8, borderRadius: 99, background: '#10B981' }} />
    </span>
  );
}

function GateActivityCard() {
  const tick = useTicker(2500);
  const n = SAMPLE_ACTIVITY.length;
  const rows = [0, 1, 2].map((k) => ({ key: tick - k, ev: SAMPLE_ACTIVITY[((tick - k) % n + n) % n], ago: AGO[k], fresh: k === 0 }));
  return (
    <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LiveDot />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.7)' }}>Gate activity</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.35)' }}>Preview</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r) => <ActivityRow key={r.key} ev={r.ev} ago={r.ago} fresh={r.fresh} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[['Checked in', '38'], ['Expected', '12'], ['Open alerts', '0']].map(([l, v]) => (
          <div key={l} style={{ padding: '0 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.45)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileTicker() {
  const tick = useTicker(2500);
  const ev = SAMPLE_ACTIVITY[tick % SAMPLE_ACTIVITY.length];
  const Icon = ev.icon;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%', padding: '7px 12px 7px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <LiveDot />
      <span key={tick} className="ga-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 12, color: 'rgba(226,232,240,0.8)' }}>
        <Icon size={13} style={{ color: ev.tone, flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title} · {ev.tag}</span>
      </span>
    </div>
  );
}

function Wordmark({ size = 16 }) {
  return (
    <div style={{ fontSize: size, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>
      Area<span style={{ color: '#60A5FA' }}>Connect</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}> Guard</span>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative overflow-hidden lg:w-[52%] lg:min-h-screen flex flex-col px-5 pt-8 pb-12 lg:px-14 lg:py-12" style={{ background: '#07111F' }}>
      {/* glow + grid */}
      <div aria-hidden style={{ position: 'absolute', top: '-25%', left: '-20%', width: '80%', paddingBottom: '80%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.32) 0%, transparent 62%)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '-30%', right: '-25%', width: '70%', paddingBottom: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06, backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px', WebkitMaskImage: 'radial-gradient(ellipse at 30% 20%, #000 0%, transparent 75%)', maskImage: 'radial-gradient(ellipse at 30% 20%, #000 0%, transparent 75%)' }} />

      {/* Brand */}
      <div className="relative flex items-center gap-3">
        <GuardMark size={40} />
        <div>
          <Wordmark size={17} />
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.4)', marginTop: 3 }}>Security Portal</div>
        </div>
      </div>

      {/* Headline */}
      <div className="relative lg:flex-1 flex flex-col justify-center mt-7 lg:mt-0 lg:py-10 ga-rise">
        <h2 className="text-[26px] lg:text-[40px]" style={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff', margin: 0, maxWidth: 480 }}>
          Every gate, calm<br className="hidden lg:block" /> and <span style={{ color: '#60A5FA' }}>in control.</span>
        </h2>
        <p className="text-[13px] lg:text-[15px]" style={{ color: 'rgba(226,232,240,0.6)', lineHeight: 1.6, margin: '12px 0 0', maxWidth: 440 }}>
          Verify visitors in seconds, log every entry and respond to estate alerts the moment they happen.
        </p>

        <div className="mt-5 lg:hidden"><MobileTicker /></div>
        <div className="hidden lg:block mt-9"><GateActivityCard /></div>
      </div>

      {/* Footer */}
      <div className="relative hidden lg:flex items-center justify-between" style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)' }}>
        <span>Powered by <span style={{ fontWeight: 600, color: 'rgba(226,232,240,0.55)' }}>AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864</span>
        <span>Secure Estate Technology</span>
      </div>
    </div>
  );
}

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#07111F' }}>
      <style>{AUTH_CSS}</style>
      <BrandPanel />
      <div className="relative z-[1] flex-1 bg-white -mt-6 lg:mt-0 rounded-t-[28px] lg:rounded-none px-5 pt-8 pb-10 sm:px-8 lg:px-12 lg:py-12 lg:flex lg:items-center lg:justify-center lg:overflow-y-auto"
        style={{ boxShadow: '0 -12px 30px -18px rgba(0,0,0,0.5)' }}>
        <div className="w-full max-w-[400px] mx-auto ga-rise" style={{ animationDelay: '80ms' }}>
          {children}
          <p className="lg:hidden" style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: '#94A3B8', letterSpacing: '0.02em' }}>
            Powered by <span style={{ fontWeight: 600, color: '#64748B' }}>AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function AuthError({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 12, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13, lineHeight: 1.45 }}>
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }}/> <span>{children}</span>
    </div>
  );
}

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('forgot') === '1') setForgotOpen(true);
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      playSound('success');
      toast.success(`Welcome, ${user?.name?.split(' ')[0] || 'Guard'}!`);
      if (user?.mustChangePassword) {
        toast('Please set a new password to continue.', { icon: '🔐' });
        navigate('/settings');
      } else {
        navigate('/verify');
      }
    } catch (err) {
      playSound('error');
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => setForgotOpen(true);

  return (
    <>
      {forgotOpen && <ForgotPasswordModal initialEmail={form.email} onClose={() => setForgotOpen(false)} />}

      <AuthShell>
        <div style={{ marginBottom: 24 }}>
          <div className="g-label" style={{ color: '#2563EB', marginBottom: 6 }}>Guard sign in</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A', margin: 0 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#475569', margin: '4px 0 0' }}>Sign in to the gate system</p>
        </div>

        {error && <AuthError>{error}</AuthError>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="ga-label" htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" className="ga-input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required autoComplete="email"/>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <label className="ga-label" htmlFor="login-password">Password</label>
              <button type="button" onClick={openForgot}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input id="login-password" type={showPw ? 'text' : 'password'} className="ga-input" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" style={{ paddingRight: 46 }}/>
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="ga-btn" style={{ marginTop: 20 }}>
            {loading ? (<><Spinner /> Signing in…</>) : 'Sign in'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748B' }}>
            Don't have an account?{' '}
            <Link to="/register" className="ga-link">Sign up</Link>
          </p>
        </form>

        <div className="hidden lg:block" style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #F1F5F9', textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>
          © {new Date().getFullYear()} AreaConnect · Secure Estate Technology
        </div>
      </AuthShell>
    </>
  );
}

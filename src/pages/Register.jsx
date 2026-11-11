import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Building2, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthError } from './Login';

const FIELDS = [
  { label: 'Full name',     key: 'name',  type: 'text',  placeholder: 'John Doe',        autoComplete: 'name' },
  { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' },
  { label: 'Phone',         key: 'phone', type: 'tel',   placeholder: '+234...',         autoComplete: 'tel', inputMode: 'tel', optional: true },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'security', estateCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await register(form);
      if (res?.pendingApproval) { setPending(res.message || ''); return; }
      toast.success('Account created! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <AuthShell>
        <div style={{ textAlign: 'center' }}>
          <span style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', boxShadow: '0 10px 30px -10px rgba(59,130,246,.6)' }}>
            <Clock size={26} color="#fff" />
          </span>
          <h1 className="ga-title" style={{ marginTop: 20 }}>Waiting for your manager to approve you</h1>
          {pending && <p className="ga-sub" style={{ marginTop: 10, lineHeight: 1.55 }}>{pending}</p>}
        </div>
        <div className="ga-note" style={{ marginTop: 20 }}>
          Once you've been approved, sign in with the email and password you just chose.
        </div>
        <Link to="/login" className="ga-btn" style={{ marginTop: 20, textDecoration: 'none' }}>
          Go to sign in <ArrowRight size={18} />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div style={{ marginBottom: 22 }}>
        <div className="g-label ga-eyebrow" style={{ color: '#2563EB', marginBottom: 6 }}>Join the gate team</div>
        <h1 className="ga-title">Create your account</h1>
        <p className="ga-sub">Register as security for your site</p>
      </div>

      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FIELDS.map(({ label, key, type, placeholder, autoComplete, inputMode, optional }) => (
          <div key={key}>
            <label className="ga-label" htmlFor={`reg-${key}`}>
              {label}{optional && <span style={{ color: '#94A3B8', fontWeight: 500 }}> · optional</span>}
            </label>
            <input id={`reg-${key}`} type={type} inputMode={inputMode} className="ga-input" placeholder={placeholder} autoComplete={autoComplete}
              value={form[key]} onChange={e => set(key, e.target.value)} required={!optional} />
          </div>
        ))}

        <div>
          <label className="ga-label" htmlFor="reg-estateCode">Estate code</label>
          <div style={{ position: 'relative' }}>
            <Building2 size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input id="reg-estateCode" type="text" className="ga-input" placeholder="e.g. GREEN1"
              value={form.estateCode} onChange={e => set('estateCode', e.target.value.toUpperCase())} required
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off"
              style={{ paddingLeft: 40, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }} />
          </div>
          <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '6px 0 0' }}>Ask your manager or security lead for this code.</p>
        </div>

        <div>
          <label className="ga-label" htmlFor="reg-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input id="reg-password" type={showPw ? 'text' : 'password'} className="ga-input" placeholder="Min. 6 characters" autoComplete="new-password"
              value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} style={{ paddingRight: 46 }} />
            <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="ga-btn" style={{ marginTop: 6 }}>
          {loading ? 'Creating account…' : (<>Create account <ArrowRight size={18} className="lg:hidden" /></>)}
        </button>
        <p className="text-[14px] lg:text-[13px]" style={{ textAlign: 'center', color: '#64748B', margin: '4px 0 0' }}>
          Already have an account?{' '}
          <Link to="/login" className="ga-link">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

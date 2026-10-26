import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthError } from './Login';

const FIELDS = [
  { label: 'Full name',     key: 'name',  type: 'text',  placeholder: 'John Doe',        autoComplete: 'name' },
  { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' },
  { label: 'Phone',         key: 'phone', type: 'tel',   placeholder: '+234...',         autoComplete: 'tel', optional: true },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'security', estateCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      toast.success('Account created! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div style={{ marginBottom: 22 }}>
        <div className="g-label" style={{ color: '#2563EB', marginBottom: 6 }}>Join the gate team</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A', margin: 0 }}>Create your account</h1>
        <p style={{ fontSize: 14, color: '#475569', margin: '4px 0 0' }}>Register as a security guard for your estate</p>
      </div>

      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FIELDS.map(({ label, key, type, placeholder, autoComplete, optional }) => (
          <div key={key}>
            <label className="ga-label" htmlFor={`reg-${key}`}>
              {label}{optional && <span style={{ color: '#94A3B8', fontWeight: 500 }}> · optional</span>}
            </label>
            <input id={`reg-${key}`} type={type} className="ga-input" placeholder={placeholder} autoComplete={autoComplete}
              value={form[key]} onChange={e => set(key, e.target.value)} required={!optional} />
          </div>
        ))}

        <div>
          <label className="ga-label" htmlFor="reg-estateCode">Estate code</label>
          <div style={{ position: 'relative' }}>
            <Building2 size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input id="reg-estateCode" type="text" className="ga-input" placeholder="e.g. GREEN1"
              value={form.estateCode} onChange={e => set('estateCode', e.target.value.toUpperCase())} required
              style={{ paddingLeft: 40, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }} />
          </div>
          <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '6px 0 0' }}>Ask your estate manager for this code.</p>
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          Already have an account?{' '}
          <Link to="/login" className="ga-link">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

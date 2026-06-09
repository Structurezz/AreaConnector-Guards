import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'security', estateCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Create Account</h1>
          <p className="text-white/50 text-sm">Register as a Security Guard</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 border border-red-500/20">
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-3 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Full Name</label>
            <input className="input-field" placeholder="John Doe" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Email Address</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
              onChange={e => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Phone</label>
            <input className="input-field" placeholder="+234..." value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Estate Code</label>
            <input className="input-field font-mono uppercase tracking-widest"
              placeholder="e.g. GREEN1" value={form.estateCode}
              onChange={e => set('estateCode', e.target.value.toUpperCase())} required />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input-field pr-10"
                placeholder="Min. 6 characters" value={form.password}
                onChange={e => set('password', e.target.value)} required minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-all mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link to="/login" className="text-red-400 hover:underline transition-colors">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

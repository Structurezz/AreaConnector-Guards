import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const MOBILE_CSS = `
@keyframes sgOrb1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(30px,-40px) scale(1.12); }
  66% { transform: translate(-20px,30px) scale(0.9); }
}
@keyframes sgOrb2 {
  0%,100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(-35px,25px) scale(0.88); }
  66% { transform: translate(25px,-35px) scale(1.1); }
}
@keyframes sgPulse {
  0%,100% { opacity:0.35; transform:scale(1); }
  50% { opacity:0.08; transform:scale(1.55); }
}
@keyframes sgPulse2 {
  0%,100% { opacity:0.2; transform:scale(1); }
  50% { opacity:0.05; transform:scale(1.9); }
}
@keyframes sgCardIn {
  from { opacity:0; transform:translateY(32px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes sgHeroIn {
  from { opacity:0; transform:translateY(-16px) scale(0.92); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes sgScan {
  0%   { top:8%; opacity:0.8; }
  100% { top:92%; opacity:0; }
}
@keyframes sgGlow {
  0%,100% { box-shadow:0 0 24px rgba(59,130,246,0.55),0 0 48px rgba(59,130,246,0.25); }
  50%     { box-shadow:0 0 40px rgba(59,130,246,0.85),0 0 80px rgba(59,130,246,0.4); }
}
.sg-input-r {
  width:100%;
  background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:12px;
  padding:11px 14px;
  color:#fff;
  font-size:14px;
  outline:none;
  transition:border-color .2s,background .2s;
}
.sg-input-r::placeholder { color:rgba(255,255,255,0.3); }
.sg-input-r:focus { border-color:rgba(59,130,246,0.5); background:rgba(59,130,246,0.07); }
`;

function MobileRegister({ form, set, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <div style={{ position:'relative', minHeight:'100vh', background:'linear-gradient(160deg,#05091A 0%,#0A1628 100%)', overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      <style>{MOBILE_CSS}</style>

      {/* Orbs */}
      <div style={{ position:'absolute', top:'-10%', left:'-15%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.22) 0%,transparent 70%)', animation:'sgOrb1 14s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-12%', right:'-18%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,0.18) 0%,transparent 70%)', animation:'sgOrb2 17s ease-in-out infinite', pointerEvents:'none' }} />

      {/* Scan line */}
      <div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(59,130,246,0.45),transparent)', animation:'sgScan 4s linear infinite', pointerEvents:'none' }} />

      {/* Hero icon */}
      <div style={{ animation:'sgHeroIn .7s ease both', marginBottom:20, textAlign:'center' }}>
        <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'absolute', width:110, height:110, borderRadius:'50%', background:'rgba(59,130,246,0.12)', animation:'sgPulse 2.8s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:145, height:145, borderRadius:'50%', background:'rgba(59,130,246,0.06)', animation:'sgPulse2 2.8s ease-in-out infinite 0.4s' }} />
          <div style={{ width:76, height:76, borderRadius:22, background:'linear-gradient(135deg,#3B82F6,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', animation:'sgGlow 2.8s ease-in-out infinite', position:'relative', zIndex:1 }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
              <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.2)" />
              <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.6)" />
              <rect x="18" y="18" width="4" height="5" rx="1" fill="white" />
              <circle cx="20" cy="17" r="1.5" fill="white" />
            </svg>
          </div>
        </div>
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', color:'#fff' }}>
            Area<span style={{ color:'#3B82F6' }}>Connect</span>{' '}
            <span style={{ color:'rgba(255,255,255,0.35)', fontWeight:400 }}>Guard</span>
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:3 }}>Create your account</div>
        </div>
      </div>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:400, background:'rgba(255,255,255,0.05)', backdropFilter:'blur(28px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'24px 20px', animation:'sgCardIn .6s ease .15s both' }}>
        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'#FCA5A5', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 12px', fontSize:13, marginBottom:16 }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Full Name</label>
          <input className="sg-input-r" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Email Address</label>
          <input type="email" className="sg-input-r" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Phone</label>
          <input className="sg-input-r" placeholder="+234..." value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Estate Code</label>
          <input className="sg-input-r" style={{ fontFamily:'monospace', letterSpacing:'0.12em', textTransform:'uppercase' }} placeholder="e.g. GREEN1" value={form.estateCode} onChange={e => set('estateCode', e.target.value.toUpperCase())} required />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Password</label>
          <div style={{ position:'relative' }}>
            <input type={showPw ? 'text' : 'password'} className="sg-input-r" style={{ paddingRight:40 }} placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)', padding:0, display:'flex' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ width:'100%', padding:'13px 0', borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', background:'linear-gradient(135deg,#3B82F6,#2563EB)', color:'#fff', fontWeight:700, fontSize:15, opacity:loading?0.7:1, transition:'opacity .2s' }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
        <p style={{ textAlign:'center', marginTop:14, fontSize:13, color:'rgba(255,255,255,0.35)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#60A5FA', fontWeight:600, textDecoration:'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

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

  const shared = { form, set, showPw, setShowPw, loading, error, handleSubmit };

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden">
        <MobileRegister {...shared} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex min-h-screen" style={{ background: '#060E1A' }}>
        {/* Left info panel */}
        <div style={{ flex: 1, background: 'linear-gradient(160deg,#05091A 0%,#0A1628 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position:'absolute', top:'-10%', left:'-10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.18) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-12%', right:'-12%', width:450, height:450, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,0.14) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:400 }}>
            <div style={{ width:80, height:80, borderRadius:22, background:'linear-gradient(135deg,#3B82F6,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'0 0 36px rgba(59,130,246,0.5)' }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
                <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.2)" />
                <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.6)" />
                <rect x="18" y="18" width="4" height="5" rx="1" fill="white" />
                <circle cx="20" cy="17" r="1.5" fill="white" />
              </svg>
            </div>
            <h2 style={{ fontSize:32, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:12 }}>
              Area<span style={{ color:'#3B82F6' }}>Connect</span> Guard
            </h2>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
              Join your estate's security team. Verify visitors, log entries, and respond to alerts in real time.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div style={{ flex: 1, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
          <div style={{ width: '100%', maxWidth: 440 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 6 }}>Create Account</h1>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Register as a Security Guard</p>

            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 12px', fontSize:13, marginBottom:20 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                { label:'Full Name', key:'name', type:'text', placeholder:'John Doe' },
                { label:'Email Address', key:'email', type:'email', placeholder:'you@example.com' },
                { label:'Phone', key:'phone', type:'text', placeholder:'+234...' },
                { label:'Estate Code', key:'estateCode', type:'text', placeholder:'e.g. GREEN1', mono:true },
              ].map(({ label, key, type, placeholder, mono }) => (
                <div key={key}>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#475569', marginBottom:6 }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => set(key, key === 'estateCode' ? e.target.value.toUpperCase() : e.target.value)}
                    required={key !== 'phone'}
                    style={{ width:'100%', padding:'10px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', fontFamily: mono ? 'monospace' : undefined, letterSpacing: mono ? '0.1em' : undefined, textTransform: mono ? 'uppercase' : undefined, boxSizing:'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#475569', marginBottom:6 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6}
                    style={{ width:'100%', padding:'10px 40px 10px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ padding:'12px 0', borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', background:'linear-gradient(135deg,#3B82F6,#2563EB)', color:'#fff', fontWeight:700, fontSize:15, marginTop:4, opacity:loading?0.7:1, transition:'opacity .2s' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
              <p style={{ textAlign:'center', fontSize:13, color:'#94A3B8', marginTop:4 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:'#3B82F6', fontWeight:600, textDecoration:'none' }}>Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

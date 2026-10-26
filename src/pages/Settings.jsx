import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Camera, Save, Eye, EyeOff, User as UserIcon, Phone, Mail, Shield, X, Lock, KeyRound, ShieldCheck, LogOut, Building2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

function resizeToDataUrl(file, size = 320) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SecuritySettings() {
  const { user, estate, fetchMe, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name: '', phone: '', isDiscoverable: true, profilePhoto: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Change password ────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const mustReset = user?.mustChangePassword;

  const submitPw = async () => {
    if (!pw.next || pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pw.next !== pw.confirm)         { toast.error('Passwords don\'t match'); return; }
    if (!mustReset && !pw.current)       { toast.error('Enter your current password'); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      toast.success('Password changed — please sign in again');
      setPw({ current: '', next: '', confirm: '' });
      try { await logout?.(); } catch {}
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not change password');
    } finally { setPwSaving(false); }
  };

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        isDiscoverable: user.isDiscoverable !== false,
        profilePhoto: user.profilePhoto || '',
      });
    }
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      toast.error('Please choose a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('That image is too large. Try one under 8MB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 320);
      set('profilePhoto', dataUrl);
      toast.success('Photo ready — click Save to keep it.');
    } catch {
      toast.error('Could not read that image. Try another.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({
        name: form.name,
        phone: form.phone,
        isDiscoverable: form.isDiscoverable,
        profilePhoto: form.profilePhoto,
      });
      await fetchMe();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const initial = (form.name || user?.name || '?')[0]?.toUpperCase();
  const estateName = estate?.name || (user?.estateId && typeof user.estateId === 'object' ? user.estateId.name : '') || 'Your estate';
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try { await logout?.(); } catch {}
    navigate('/login', { replace: true });
  };

  const inputCls = 'input-field gs-input';
  const inputStyle = { height: 44, borderRadius: 12, fontSize: 14 };

  const SectionHead = ({ icon: Icon, title, hint, tone = 'brand' }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
        style={{ background: tone === 'amber' ? 'linear-gradient(135deg,#F59E0B,#D97706)' : tone === 'slate' ? 'linear-gradient(135deg,#475569,#1E293B)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>{title}</h2>
        {hint && <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{hint}</p>}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-5xl">
      <style>{`.gs-input:focus{border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,0.15)}`}</style>
      <div className="mb-4">
        <h1 className="text-[21px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>Settings</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>Your profile, privacy and sign-in.</p>
      </div>

      {mustReset && (
        <div className="g-rise rounded-2xl p-3.5 mb-4 flex items-start gap-2.5"
          style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.35)' }}>
          <ShieldCheck size={17} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.55 }}>
            <strong>Temporary password detected.</strong> Set a new password below before you can use the app.
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
        {/* ── Left: identity card ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="g-card g-rise overflow-hidden">
            <div className="h-20 relative" style={{ background: 'radial-gradient(120% 120% at 0% 0%, rgba(59,130,246,.38) 0%, transparent 60%), #07111F' }}>
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
            </div>
            <div className="px-5 pb-5 -mt-10 relative">
              <div className="relative inline-block">
                {form.profilePhoto ? (
                  <img src={form.profilePhoto} alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                    style={{ border: '4px solid #fff', boxShadow: '0 6px 18px -6px rgba(15,23,42,0.35)' }} />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center font-semibold text-2xl"
                    style={{ background: '#EFF6FF', color: '#1D4ED8', border: '4px solid #fff', boxShadow: '0 6px 18px -6px rgba(15,23,42,0.35)' }}>
                    {initial}
                  </div>
                )}
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', boxShadow: '0 4px 12px rgba(59,130,246,0.45)', border: '2px solid #fff' }}
                  title="Change photo">
                  <Camera size={14} />
                </button>
              </div>

              <div className="mt-3 text-[17px] font-semibold truncate" style={{ color: '#0F172A' }}>{form.name || 'Your name'}</div>
              <div className="text-xs mt-0.5 truncate" style={{ color: '#94A3B8' }}>{user?.email}</div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  <Shield size={11} /> Security Guard
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full max-w-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                  <Building2 size={11} className="shrink-0" /> <span className="truncate">{estateName}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex-1 h-10 text-xs font-semibold rounded-xl"
                  style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                  {uploading ? 'Processing…' : form.profilePhoto ? 'Change photo' : 'Upload photo'}
                </button>
                {form.profilePhoto && (
                  <button type="button" onClick={() => set('profilePhoto', '')}
                    className="h-10 px-3 text-xs font-medium rounded-xl flex items-center gap-1"
                    style={{ color: '#64748B', border: '1px solid rgba(15,23,42,0.08)' }}>
                    <X size={12} /> Remove
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Sign out — desktop position */}
          <button onClick={signOut} disabled={signingOut}
            className="hidden lg:flex g-card w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-red-50/40 transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              <LogOut size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: '#DC2626' }}>{signingOut ? 'Signing out…' : 'Sign out'}</div>
              <div className="text-xs" style={{ color: '#94A3B8' }}>End your session on this device</div>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>

        {/* ── Right: settings sections ── */}
        <div className="space-y-4 min-w-0">
          {/* Profile details */}
          <div className="g-card g-rise p-5" style={{ animationDelay: '60ms' }}>
            <SectionHead icon={UserIcon} title="Profile details" hint="Shown to residents and estate staff" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="g-label block mb-1.5">Full name</label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="Your name" />
              </div>
              <div>
                <label className="g-label mb-1.5 flex items-center gap-1.5"><Phone size={11} /> Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="+234…" />
              </div>
            </div>
            <div className="text-[11px] flex items-center gap-1.5 mt-3" style={{ color: '#94A3B8' }}>
              <Mail size={11} /> <span className="truncate">{user?.email}</span> <span className="opacity-70 shrink-0">· can't be changed</span>
            </div>
          </div>

          {/* Privacy */}
          <div className="g-card g-rise p-5" style={{ animationDelay: '120ms' }}>
            <SectionHead icon={form.isDiscoverable ? Eye : EyeOff} title="Privacy" hint="Group chat, alerts and estate broadcasts are unaffected." tone="slate" />
            <button type="button" onClick={() => set('isDiscoverable', !form.isDiscoverable)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                border: `1px solid ${form.isDiscoverable ? '#BFDBFE' : 'rgba(15,23,42,0.08)'}`,
                background: form.isDiscoverable ? '#EFF6FF' : '#F8FAFC',
              }}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                  {form.isDiscoverable ? 'Visible in DM search' : 'Invisible in DM search'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  {form.isDiscoverable
                    ? 'Residents can find you when they search to start a chat.'
                    : 'Your name is hidden from the DM search. Existing chats keep working.'}
                </div>
              </div>
              <div className="relative w-12 h-7 rounded-full flex-shrink-0 transition-colors"
                style={{ background: form.isDiscoverable ? '#3B82F6' : '#CBD5E1' }}>
                <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all"
                  style={{ left: form.isDiscoverable ? 'calc(100% - 26px)' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </button>
          </div>

          <button onClick={handleSave} disabled={saving || uploading}
            className="w-full h-12 lg:h-11 flex items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all active:scale-[0.99]"
            style={{
              background: saving ? '#94A3B8' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              fontSize: 14,
              boxShadow: saving ? 'none' : '0 8px 20px -8px rgba(59,130,246,0.6)',
              cursor: saving || uploading ? 'not-allowed' : 'pointer',
            }}>
            <Save size={16} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          {/* Password */}
          <div className="g-card g-rise p-5" style={{ animationDelay: '180ms', ...(mustReset ? { borderColor: 'rgba(245,158,11,0.45)' } : {}) }}>
            <SectionHead icon={KeyRound} title="Password" hint={mustReset ? 'Choose a new password to continue' : 'You will be signed out after changing it'} tone={mustReset ? 'amber' : 'brand'} />
            <div className="space-y-2.5">
              {!mustReset && (
                <input type={showPw ? 'text' : 'password'} className={inputCls} style={inputStyle}
                  placeholder="Current password" value={pw.current}
                  onChange={e => setPw({ ...pw, current: e.target.value })} />
              )}
              <div className="grid sm:grid-cols-2 gap-2.5">
                <input type={showPw ? 'text' : 'password'} className={inputCls} style={inputStyle}
                  placeholder="New password (min. 6 characters)" value={pw.next}
                  onChange={e => setPw({ ...pw, next: e.target.value })} />
                <input type={showPw ? 'text' : 'password'} className={inputCls} style={inputStyle}
                  placeholder="Confirm new password" value={pw.confirm}
                  onChange={e => setPw({ ...pw, confirm: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-xs py-1" style={{ color: '#64748B' }}>
                <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} className="accent-blue-600 w-4 h-4" />
                Show passwords
              </label>
              <button onClick={submitPw} disabled={pwSaving}
                className="w-full sm:w-auto sm:px-6 h-12 lg:h-11 flex items-center justify-center gap-2 rounded-2xl lg:rounded-xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: pwSaving ? '#94A3B8' : '#0F172A',
                  fontSize: 13,
                  cursor: pwSaving ? 'not-allowed' : 'pointer',
                }}>
                <Lock size={14} /> {pwSaving ? 'Changing…' : 'Change password'}
              </button>
              <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
                Forgot your current password?&nbsp;
                <button type="button"
                  onClick={async () => { try { await logout?.(); } catch {} navigate('/login?forgot=1', { replace: true }); }}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Request a reset from your estate manager
                </button>
              </p>
            </div>
          </div>

          {/* Sign out — mobile position */}
          <button onClick={signOut} disabled={signingOut}
            className="lg:hidden w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm"
            style={{ background: '#fff', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' }}>
            <LogOut size={16} /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Camera, Save, Eye, EyeOff, User as UserIcon, Phone, Mail, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { user, fetchMe } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name: '', phone: '', isDiscoverable: true, profilePhoto: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Update your profile and choose how you appear to residents.
        </p>
      </div>

      {/* Profile card */}
      <div className="glass-card p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#64748B' }}>
          <UserIcon size={13} /> Profile
        </h2>

        <div className="flex items-center gap-4 sm:gap-5 mb-5">
          <div className="relative flex-shrink-0">
            {form.profilePhoto ? (
              <img
                src={form.profilePhoto}
                alt="Profile"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                style={{ border: '3px solid #fff', boxShadow: '0 4px 14px rgba(59,130,246,0.30)' }}
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-bold text-2xl sm:text-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(37,99,235,0.10))',
                  border: '2px solid rgba(59,130,246,0.28)',
                  color: '#1D4ED8',
                }}
              >
                {initial}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                boxShadow: '0 4px 12px rgba(59,130,246,0.45)',
                border: '2px solid #fff',
              }}
              title="Change photo"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate" style={{ color: '#0F172A' }}>{form.name || 'Your name'}</div>
            <div className="text-xs mt-0.5 truncate" style={{ color: '#94A3B8' }}>{user?.email}</div>
            <div className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: '#2563EB' }}>
              <Shield size={11} /> Security Guard
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(59,130,246,0.10)', color: '#1D4ED8' }}
              >
                {uploading ? 'Processing…' : form.profilePhoto ? 'Change photo' : 'Upload photo'}
              </button>
              {form.profilePhoto && (
                <button
                  type="button"
                  onClick={() => set('profilePhoto', '')}
                  className="text-xs font-medium px-2 py-1.5 rounded-lg flex items-center gap-1"
                  style={{ color: '#94A3B8' }}
                >
                  <X size={11} /> Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#475569' }}>Full name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A' }}
            placeholder="Your name"
          />
        </div>

        <div className="mb-2">
          <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
            <Phone size={11} /> Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A' }}
            placeholder="+234…"
          />
        </div>

        <div className="text-[11px] flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
          <Mail size={10} /> {user?.email} <span className="opacity-70">· can't be changed</span>
        </div>
      </div>

      {/* Privacy card */}
      <div className="glass-card p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#64748B' }}>
          {form.isDiscoverable ? <Eye size={13} /> : <EyeOff size={13} />} Privacy
        </h2>

        <button
          type="button"
          onClick={() => set('isDiscoverable', !form.isDiscoverable)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
          style={{
            border: `1.5px solid ${form.isDiscoverable ? 'rgba(59,130,246,0.28)' : '#E2E8F0'}`,
            background: form.isDiscoverable ? 'rgba(59,130,246,0.05)' : '#F8FAFC',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: form.isDiscoverable ? 'rgba(59,130,246,0.14)' : 'rgba(148,163,184,0.15)',
              color: form.isDiscoverable ? '#1D4ED8' : '#64748B',
            }}
          >
            {form.isDiscoverable ? <Eye size={20} /> : <EyeOff size={20} />}
          </div>
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
          <div
            className="relative w-11 h-6 rounded-full flex-shrink-0"
            style={{ background: form.isDiscoverable ? '#3B82F6' : '#CBD5E1' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: form.isDiscoverable ? 'calc(100% - 22px)' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
            />
          </div>
        </button>

        <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#94A3B8' }}>
          Group chat, alerts and estate broadcasts are unaffected.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-white transition-all"
        style={{
          background: saving ? '#94A3B8' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
          padding: '14px',
          fontSize: 14,
          boxShadow: '0 8px 20px rgba(59,130,246,0.30)',
          cursor: saving || uploading ? 'not-allowed' : 'pointer',
        }}
      >
        <Save size={16} />
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

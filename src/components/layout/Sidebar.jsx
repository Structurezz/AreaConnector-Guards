import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { QrCode, ClipboardList, Siren, LogOut, Settings as SettingsIcon, PhoneCall, Clock } from 'lucide-react';

export const NAV = [
  { to: '/verify',   icon: QrCode,        label: 'Gate',       hint: 'Verify visitors' },
  { to: '/log',      icon: ClipboardList, label: 'Entry log',  hint: 'Who came and went' },
  { to: '/alerts',   icon: Siren,         label: 'Alerts',     hint: 'Emergencies & reports' },
  { to: '/calls',    icon: PhoneCall,     label: 'Calls',      hint: 'Residents & manager' },
  { to: '/settings', icon: SettingsIcon,  label: 'Settings',   hint: 'Profile & password' },
];

// When this browser started the current shift (first load after sign-in)
export function useShift() {
  const [start] = useState(() => {
    try {
      const v = sessionStorage.getItem('ac_shift_start');
      if (v) return new Date(Number(v));
      const now = Date.now(); sessionStorage.setItem('ac_shift_start', String(now)); return new Date(now);
    } catch { return new Date(); }
  });
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const mins = Math.max(0, Math.floor((now - start) / 60000));
  return { start, now, label: `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` };
}

export function GuardMark({ size = 38 }) {
  return (
    <span className="flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, borderRadius: size * 0.3, background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', boxShadow: '0 6px 18px -6px rgba(59,130,246,.6)' }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 40 40" fill="none">
        <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none" />
        <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.2)" />
        <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.7)" />
        <rect x="18" y="18" width="4" height="5" rx="1" fill="white" />
        <circle cx="20" cy="17" r="1.5" fill="white" />
      </svg>
    </span>
  );
}

export default function Sidebar({ mobile = false, onClose, alertCount = 0 }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket() || {};
  const navigate = useNavigate();
  const shift = useShift();
  const estateName = user?.estateId && typeof user.estateId === 'object' ? user.estateId.name : 'Your estate';

  return (
    <aside className={`flex flex-col h-full ${mobile ? 'w-[280px]' : 'w-[260px]'}`}
      style={{ background: 'radial-gradient(120% 60% at 0% 0%, rgba(59,130,246,.16) 0%, transparent 55%), #07111F', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Brand */}
      <Link to="/verify" onClick={onClose} className="flex items-center gap-3 px-5 pt-5 pb-4" style={{ textDecoration: 'none' }}>
        <GuardMark />
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] font-bold tracking-tight" style={{ color: '#fff' }}>Area<span style={{ color: '#60A5FA' }}>Connect</span></span>
          <span className="block text-[11px] text-white/40">Guard · gate security</span>
        </span>
      </Link>

      {/* Duty card */}
      <div className="mx-4 mb-3 rounded-2xl p-3.5 border border-white/10 bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">On duty at</span>
          <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold ${connected ? 'text-emerald-300' : 'text-amber-300'}`}>
            <span className="relative flex w-2 h-2">
              {connected && <span className="absolute inset-0 rounded-full bg-emerald-400" style={{ animation: 'gPing 1.6s ease-out infinite' }} />}
              <span className={`relative w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </span>
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
        <p className="mt-1 text-[14px] font-semibold text-white truncate">{estateName}</p>
        <p className="mt-1 text-[11.5px] text-white/50 flex items-center gap-1.5"><Clock size={11} /> Shift {shift.label} · since {shift.start.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, hint }) => (
          <NavLink key={to} to={to} end={to === '/verify'} onClick={onClose}
            className={({ isActive }) => `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-500/[0.14]' : 'hover:bg-white/[0.05]'}`}
            style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue-400" />}
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-blue-500 text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,.8)]' : 'bg-white/[0.06] text-white/55 group-hover:text-white/80'}`}>
                  <Icon size={17} />
                </span>
                <span className="flex-1 min-w-0 leading-tight">
                  <span className={`block text-[13.5px] font-semibold ${isActive ? 'text-white' : 'text-white/75'}`}>{label}</span>
                  <span className="block text-[11px] text-white/35 truncate">{hint}</span>
                </span>
                {to === '/alerts' && alertCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">{alertCount}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Guard */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
          <Link to="/settings" onClick={onClose} className="flex items-center gap-2.5 flex-1 min-w-0" style={{ textDecoration: 'none' }}>
            {user?.profilePhoto
              ? <img src={user.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover border border-blue-400/30" />
              : <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-blue-300 bg-blue-500/15 border border-blue-400/25">{user?.name?.[0]?.toUpperCase()}</span>}
            <span className="min-w-0 leading-tight">
              <span className="block text-[13px] font-semibold text-white/85 truncate">{user?.name}</span>
              <span className="block text-[11px] text-white/35 truncate">Security guard</span>
            </span>
          </Link>
          <button onClick={async () => { await logout(); try { sessionStorage.removeItem('ac_shift_start'); } catch { /* ignore */ } navigate('/login'); }}
            title="Sign out" className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

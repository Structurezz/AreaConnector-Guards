import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { QrCode, ClipboardList, Shield, LogOut } from 'lucide-react';

const links = [
  { to: '/verify', icon: QrCode, label: 'Verify Visitor' },
  { to: '/log', icon: ClipboardList, label: 'Entry Log' },
  { to: '/alerts', icon: Shield, label: 'Live Alerts' },
];

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const estateName = user?.estateId && typeof user.estateId === 'object' ? user.estateId.name : 'AreaConnect Guard';
  return (
    <aside className={`flex flex-col h-full bg-navy border-r border-white/10 ${mobile ? 'w-72' : 'w-64'}`}>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}>
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none"/>
              <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.15)"/>
              <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.5)"/>
              <rect x="18" y="18" width="4" height="5" rx="1" fill="white"/>
              <circle cx="20" cy="17" r="1.5" fill="white"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Area</span><span style={{ color: '#3B82F6' }}>Connect</span>
            </div>
            <div className="text-xs font-medium mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{estateName}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-medium text-white/25 uppercase tracking-widest px-3 py-2">Navigation</p>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/verify'} onClick={onClose}
            className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <Icon size={17} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-xl mb-1">
          <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-xs text-white/40 truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={async () => { await logout(); navigate('/login'); }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm mt-1">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

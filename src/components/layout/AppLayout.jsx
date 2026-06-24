import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, AlertTriangle, Megaphone, Radio, MapPin, Phone, Home, Volume2, VolumeX, QrCode, ClipboardList, LogOut, UserRound, Briefcase } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { playSiren, stopSiren } from '../../utils/sounds';

// ── Source badge config ───────────────────────────────────────────────────────
const ROLE_CFG = {
  security:      { label: 'Security Guard', Icon: Shield,      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  resident:      { label: 'Resident',       Icon: UserRound,   bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
  estate_manager:{ label: 'Estate Manager', Icon: Briefcase,   bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  super_admin:   { label: 'Estate Manager', Icon: Briefcase,   bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

const TYPE_META = {
  security: { label: 'Security Threat',   barColor: '#EF4444' },
  fire:     { label: 'Fire Emergency',    barColor: '#F97316' },
  medical:  { label: 'Medical Emergency', barColor: '#3B82F6' },
  noise:    { label: 'Noise Complaint',   barColor: '#F59E0B' },
  other:    { label: 'Alert',             barColor: '#6B7280' },
};

function AlertPopup({ alert, queueCount, onDismiss, muted, onToggleMute }) {
  const isBroadcast = alert.isEmergencyBroadcast;
  const role = alert.raisedByRole || alert.residentId?.role || 'resident';
  const roleCfg = ROLE_CFG[role] || ROLE_CFG.resident;
  const RoleIcon = roleCfg.Icon;
  const typeMeta = TYPE_META[alert.type] || TYPE_META.other;
  const sev = alert.severity || (isBroadcast ? 'high' : 'critical');
  const name = alert.residentId?.name || 'Unknown';
  const unit = alert.unitId
    ? `${alert.unitId.block ? `Block ${alert.unitId.block} · ` : ''}Unit ${alert.unitId.unitNumber}`
    : null;

  const barColor = isBroadcast ? '#7C3AED' : typeMeta.barColor;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-5 pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto" onClick={onDismiss} />

      <div className="relative pointer-events-auto w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ border: `2px solid ${barColor}30` }}>

        {/* Top colour bar */}
        <div style={{ height: 5, background: barColor, width: '100%' }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {/* Source role badge */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: roleCfg.bg, border: `1.5px solid ${roleCfg.border}` }}>
                {isBroadcast
                  ? <Radio size={20} style={{ color: '#7C3AED' }} />
                  : <RoleIcon size={20} style={{ color: roleCfg.color }} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role chip */}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: isBroadcast ? '#F5F3FF' : roleCfg.bg, color: isBroadcast ? '#7C3AED' : roleCfg.color, border: `1px solid ${isBroadcast ? '#DDD6FE' : roleCfg.border}` }}>
                    {isBroadcast ? 'Estate Broadcast' : roleCfg.label}
                  </span>
                  {/* Severity */}
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{ background: sev === 'critical' ? '#FEF2F2' : sev === 'high' ? '#FFF7ED' : '#FEFCE8', color: sev === 'critical' ? '#B91C1C' : sev === 'high' ? '#C2410C' : '#92400E', borderColor: sev === 'critical' ? '#FECACA' : sev === 'high' ? '#FED7AA' : '#FDE68A' }}>
                    {sev}
                  </span>
                  {queueCount > 1 && (
                    <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      +{queueCount - 1} more
                    </span>
                  )}
                </div>
                <p className="text-slate-900 font-bold text-base mt-0.5 leading-tight">
                  {alert.title || (isBroadcast ? 'Estate Emergency Broadcast' : `${typeMeta.label}`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onToggleMute}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                title={muted ? 'Unmute' : 'Mute siren'}>
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button onClick={onDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Raised by info */}
          <div className="flex items-center gap-3 mb-3 p-3 rounded-xl"
            style={{ background: isBroadcast ? '#F5F3FF' : roleCfg.bg, border: `1px solid ${isBroadcast ? '#DDD6FE' : roleCfg.border}` }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: '#fff', border: `1.5px solid ${isBroadcast ? '#DDD6FE' : roleCfg.border}`, color: isBroadcast ? '#7C3AED' : roleCfg.color }}>
              {name[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: '#0F172A' }}>
                {isBroadcast ? `Broadcast by ${roleCfg.label}` : `Raised by ${roleCfg.label}`}: <span style={{ color: isBroadcast ? '#7C3AED' : roleCfg.color }}>{name}</span>
              </p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {unit && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
                    <Home size={10} />{unit}
                  </span>
                )}
                {alert.residentId?.phone && (
                  <a href={`tel:${alert.residentId.phone}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: '#3B82F6' }}>
                    <Phone size={10} />{alert.residentId.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          {alert.note && (
            <p className="text-slate-600 text-sm leading-relaxed mb-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              {alert.note}
            </p>
          )}

          {/* Location / action */}
          <div className="space-y-1.5 mb-4">
            {alert.location && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={12} className="text-slate-400 flex-shrink-0" />{alert.location}
              </div>
            )}
            {alert.actionRequired && (
              <div className="flex items-start gap-2 text-sm">
                <Shield size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-amber-700 font-medium">{alert.actionRequired}</span>
              </div>
            )}
            {alert.contactNumber && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Phone size={12} className="text-slate-400 flex-shrink-0" />{alert.contactNumber}
              </div>
            )}
          </div>

          <button onClick={onDismiss}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all border"
            style={{ background: `${barColor}10`, color: barColor, borderColor: `${barColor}40` }}>
            {queueCount > 1 ? `Acknowledge & See Next (${queueCount - 1} remaining)` : 'Acknowledge & Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [muted, setMuted] = useState(false);
  const { subscribe } = useSocket() || {};
  const { logout } = useAuth();
  const navigate = useNavigate();
  const mutedRef = useRef(false);

  mutedRef.current = muted;

  const handleDismiss = useCallback(() => {
    setQueue((q) => {
      const remaining = q.slice(1);
      if (remaining.length === 0) stopSiren();
      return remaining;
    });
  }, []);

  const handleToggleMute = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      setQueue((q) => [...q, alert]);
      if (!mutedRef.current) playSiren();
    });
    return unsub;
  }, [subscribe]);

  const current = queue[0] || null;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {current && (
        <AlertPopup
          alert={current}
          queueCount={queue.length}
          onDismiss={handleDismiss}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-slide-in">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ background: '#060E1A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4, display: 'flex', flexShrink: 0 }}
          >
            <Menu size={22} />
          </button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }}>
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-bold flex-1 text-sm" style={{ letterSpacing: '-0.02em' }}>
            <span style={{ color: '#FFFFFF' }}>Area</span>
            <span style={{ color: '#3B82F6' }}>Connect</span>
            {' '}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>Guard</span>
          </span>
          {queue.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse"
              style={{ color: '#FCA5A5', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={11} /> {queue.length} ALERT{queue.length > 1 ? 'S' : ''}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30"
        style={{ background: '#060E1A', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {[
            { to: '/verify', icon: QrCode,        label: 'Scan' },
            { to: '/log',    icon: ClipboardList,  label: 'Log' },
            { to: '/alerts', icon: Shield,         label: 'Alerts' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/verify'}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
              style={({ isActive }) => ({ color: isActive ? '#3B82F6' : 'rgba(255,255,255,0.3)' })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
          >
            <LogOut size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-semibold">Sign Out</span>
          </button>
        </div>
      </nav>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid rgba(15,23,42,0.10)',
            borderRadius: '10px',
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
          },
          success: { iconTheme: { primary: '#3B82F6', secondary: '#EFF6FF' } },
        }}
      />
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Shield, AlertTriangle, Megaphone, MapPin, Phone, User, Home, Zap, Volume2, VolumeX, QrCode, ClipboardList } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { playSiren } from '../../utils/sounds';

// ── Popup ─────────────────────────────────────────────────────────────────────

const TYPE_META = {
  security:  { label: 'Security Threat',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  fire:      { label: 'Fire Emergency',    color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  medical:   { label: 'Medical Emergency', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  noise:     { label: 'Noise Complaint',   color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  other:     { label: 'Alert',             color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200' },
};

const SEV_STYLE = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  medium:   'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-blue-50 text-blue-700 border-blue-200',
};

function AlertPopup({ alert, queueCount, onDismiss, muted, onToggleMute }) {
  const isBroadcast = alert.isEmergencyBroadcast;
  const meta = TYPE_META[alert.type] || TYPE_META.other;
  const sev = alert.severity || (isBroadcast ? 'high' : 'critical');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-5 pointer-events-none">
      {/* dim backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm pointer-events-auto" onClick={onDismiss} />

      <div className={`relative pointer-events-auto w-full max-w-md rounded-2xl bg-white border ${meta.border}
        shadow-2xl shadow-slate-900/15 overflow-hidden animate-slide-down animate-siren-pulse`}>

        {/* Top severity bar */}
        <div className={`h-1.5 w-full ${
          sev === 'critical' ? 'bg-red-500' :
          sev === 'high'     ? 'bg-orange-500' :
          sev === 'medium'   ? 'bg-amber-500' : 'bg-blue-500'
        }`} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} border ${meta.border}`}>
                {isBroadcast ? <Megaphone size={20} className="text-amber-500" /> : <AlertTriangle size={20} className={meta.color} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isBroadcast
                    ? <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Estate Broadcast</span>
                    : <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  }
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEV_STYLE[sev]}`}>{sev}</span>
                  {queueCount > 1 && (
                    <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      +{queueCount - 1} more
                    </span>
                  )}
                </div>
                <p className="text-slate-900 font-bold text-base mt-0.5 leading-tight">
                  {alert.title || (isBroadcast ? 'Estate Broadcast' : `${meta.label} Raised`)}
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

          {/* Resident info (non-broadcast) */}
          {!isBroadcast && (
            <div className="flex items-center gap-4 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                {alert.residentId?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-semibold text-sm">{alert.residentId?.name || 'Unknown Resident'}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {alert.residentId?.phone && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={10} />{alert.residentId.phone}
                    </span>
                  )}
                  {alert.unitId && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Home size={10} />
                      {alert.unitId.block ? `Block ${alert.unitId.block} · ` : ''}Unit {alert.unitId.unitNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {alert.note && (
            <p className="text-slate-600 text-sm leading-relaxed mb-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              {alert.note}
            </p>
          )}

          {/* Meta fields */}
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
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              isBroadcast
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
            }`}>
            {queueCount > 1 ? `Acknowledge & See Next (${queueCount - 1} remaining)` : 'Acknowledge'}
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
  const mutedRef = useRef(false);

  mutedRef.current = muted;

  const handleDismiss = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const handleToggleMute = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      setQueue((q) => [...q, alert]);
      if (!mutedRef.current) playSiren(5);
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 12px rgba(59,130,246,0.4)' }}>
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-bold flex-1 text-base" style={{ letterSpacing: '-0.02em' }}>
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, Shield, AlertTriangle, Megaphone, MapPin, Phone, User, Home, Zap, Volume2, VolumeX } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { playSiren } from '../../utils/sounds';

// ── Popup ─────────────────────────────────────────────────────────────────────

const TYPE_META = {
  security:  { label: 'Security Threat',   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  fire:      { label: 'Fire Emergency',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medical:   { label: 'Medical Emergency', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  noise:     { label: 'Noise Complaint',   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  other:     { label: 'Alert',             color: 'text-white/60',   bg: 'bg-white/5',       border: 'border-white/15' },
};

const SEV_STYLE = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

function AlertPopup({ alert, queueCount, onDismiss, muted, onToggleMute }) {
  const isBroadcast = alert.isEmergencyBroadcast;
  const meta = TYPE_META[alert.type] || TYPE_META.other;
  const sev = alert.severity || (isBroadcast ? 'high' : 'critical');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-5 pointer-events-none">
      {/* dim backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onDismiss} />

      <div className={`relative pointer-events-auto w-full max-w-md rounded-2xl bg-[#17171B] border ${meta.border}
        shadow-2xl shadow-black/70 overflow-hidden animate-slide-down animate-siren-pulse`}>

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
                {isBroadcast ? <Megaphone size={20} className="text-amber-400" /> : <AlertTriangle size={20} className={meta.color} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isBroadcast
                    ? <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Estate Broadcast</span>
                    : <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  }
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEV_STYLE[sev]}`}>{sev}</span>
                  {queueCount > 1 && (
                    <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      +{queueCount - 1} more
                    </span>
                  )}
                </div>
                <p className="text-white font-bold text-base mt-0.5 leading-tight">
                  {alert.title || (isBroadcast ? 'Estate Broadcast' : `${meta.label} Raised`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onToggleMute}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                title={muted ? 'Unmute' : 'Mute siren'}>
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button onClick={onDismiss}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Resident info (non-broadcast) */}
          {!isBroadcast && (
            <div className="flex items-center gap-4 mb-3 p-3 bg-white/5 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                {alert.residentId?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{alert.residentId?.name || 'Unknown Resident'}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {alert.residentId?.phone && (
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <Phone size={10} />{alert.residentId.phone}
                    </span>
                  )}
                  {alert.unitId && (
                    <span className="flex items-center gap-1 text-xs text-white/40">
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
            <p className="text-white/65 text-sm leading-relaxed mb-3 bg-white/5 rounded-xl px-4 py-3">
              {alert.note}
            </p>
          )}

          {/* Meta fields */}
          <div className="space-y-1.5 mb-4">
            {alert.location && (
              <div className="flex items-center gap-2 text-sm text-white/45">
                <MapPin size={12} className="text-white/25 flex-shrink-0" />{alert.location}
              </div>
            )}
            {alert.actionRequired && (
              <div className="flex items-start gap-2 text-sm">
                <Shield size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-amber-300/80 font-medium">{alert.actionRequired}</span>
              </div>
            )}
            {alert.contactNumber && (
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Phone size={12} className="text-white/25 flex-shrink-0" />{alert.contactNumber}
              </div>
            )}
          </div>

          <button onClick={onDismiss}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isBroadcast
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25'
                : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25'
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
    <div className="flex h-screen bg-navy overflow-hidden">
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-slide-in">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#111115]">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all">
            <Menu size={22} />
          </button>
          <span className="font-medium text-white flex-1">AreaConnect Guard</span>
          {queue.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-2.5 py-1 rounded-full animate-pulse">
              <AlertTriangle size={11} /> {queue.length} ALERT{queue.length > 1 ? 'S' : ''}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1C1C20', color: '#E4E4E7', border: '1px solid #2E2E33', borderRadius: '8px', fontSize: '0.875rem' },
          success: { iconTheme: { primary: '#10B981', secondary: '#1C1C20' } },
        }}
      />
    </div>
  );
}

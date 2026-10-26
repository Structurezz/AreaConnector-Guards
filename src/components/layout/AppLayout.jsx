import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Shield, AlertTriangle, Megaphone, Radio, MapPin, Phone, Home, Volume2, VolumeX, QrCode, ClipboardList, LogOut, UserRound, Briefcase, PhoneCall, Siren, Bell } from 'lucide-react';
import Sidebar, { NAV, GuardMark } from './Sidebar';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { alertAPI } from '../../api';
import toast from 'react-hot-toast';
import { playSiren, stopSiren } from '../../utils/sounds';
import { isStatusUpdate, isIncomingAlert } from '../../utils/alertEvents';
import CallButton from '../calls/CallButton';
import LiveLocations from '../safety/LiveLocations';
import CallAlertsPrompt from '../calls/CallAlertsPrompt';

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

function AlertPopup({ alert, queueCount, onDismiss, onClose, muted, onToggleMute }) {
  const isBroadcast = alert.isEmergencyBroadcast;
  const role = alert.raisedByRole || alert.residentId?.role || 'resident';
  const roleCfg = ROLE_CFG[role] || ROLE_CFG.resident;
  const RoleIcon = roleCfg.Icon;
  const typeMeta = TYPE_META[alert.type] || TYPE_META.other;
  const sev = alert.severity || (isBroadcast ? 'high' : 'critical');
  const name = alert.residentId?.name || 'Unknown';
  const unit = alert.unitId ? `${alert.unitId.block ? `Block ${alert.unitId.block} · ` : ''}Unit ${alert.unitId.unitNumber}` : null;
  const accent = isBroadcast ? '#7C3AED' : typeMeta.barColor;
  const phone = alert.residentId?.phone || alert.contactNumber;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-[#07111F]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl animate-slide-down" style={{ maxHeight: '94vh' }}>
        {/* Alarm header */}
        <div className="relative px-5 pt-5 pb-6 text-white overflow-hidden" style={{ background: `radial-gradient(120% 140% at 100% 0%, ${accent} 0%, #450A0A 70%)` }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.25) 0 2px, transparent 2px 14px)' }} />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
              <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white" style={{ animation: 'gPing 1s ease-out infinite' }} /><span className="relative w-2 h-2 rounded-full bg-white" /></span>
              {isBroadcast ? 'Estate broadcast' : 'Emergency alert'}
            </span>
            <div className="flex items-center gap-1">
              {queueCount > 1 && <span className="text-[11px] font-bold bg-white text-red-600 px-2 py-0.5 rounded-full mr-1">+{queueCount - 1} more</span>}
              <button onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute siren'} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
              <button onClick={onClose} aria-label="Close without acknowledging" className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20"><X size={17} /></button>
            </div>
          </div>
          <div className="relative mt-5 flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center g-alarm flex-shrink-0">
              {isBroadcast ? <Radio size={30} /> : <AlertTriangle size={30} />}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-white/70">{typeMeta.label} · {sev}</p>
              <h2 className="text-[22px] font-bold leading-tight" style={{ color: '#fff' }}>{alert.title || (isBroadcast ? 'Estate emergency broadcast' : typeMeta.label)}</h2>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: '58vh' }}>
          {/* Who */}
          <div className="flex items-center gap-3 p-3 rounded-2xl border" style={{ background: roleCfg.bg, borderColor: roleCfg.border }}>
            <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center font-bold text-[16px] flex-shrink-0 border" style={{ color: roleCfg.color, borderColor: roleCfg.border }}>
              {isBroadcast ? <Radio size={18} /> : <RoleIcon size={18} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: roleCfg.color }}>{isBroadcast ? `Broadcast by ${roleCfg.label}` : `Raised by ${roleCfg.label}`}</p>
              <p className="text-[16px] font-bold text-slate-900 truncate">{name}</p>
              {unit && <p className="text-[12.5px] text-slate-600 flex items-center gap-1"><Home size={12} />{unit}</p>}
            </div>
          </div>

          {alert.note && <p className="text-[14px] text-slate-700 leading-relaxed bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">“{alert.note}”</p>}

          {(alert.location || alert.actionRequired) && (
            <div className="grid gap-2">
              {alert.location && <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[13.5px] text-slate-700"><MapPin size={15} className="text-red-500 flex-shrink-0" /><span className="font-medium">{alert.location}</span></div>}
              {alert.actionRequired && <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-[13.5px] text-amber-800"><Shield size={15} className="text-amber-500 flex-shrink-0 mt-0.5" /><span className="font-semibold">{alert.actionRequired}</span></div>}
            </div>
          )}

          {/* Contact */}
          {(phone || alert.residentId?._id) && (
            <div className="grid grid-cols-2 gap-2">
              {phone && <a href={`tel:${phone}`} className="h-12 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-[14px] font-semibold text-slate-800 hover:bg-slate-50" style={{ textDecoration: 'none' }}><Phone size={16} className="text-blue-600" /> Call phone</a>}
              {alert.residentId?._id && <div className="h-12 rounded-xl border border-slate-200 flex items-center justify-center"><CallButton person={alert.residentId} /></div>}
            </div>
          )}

          <button onClick={onDismiss} className="w-full h-14 rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
            style={{ background: isBroadcast ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'linear-gradient(135deg,#EF4444,#B91C1C)', boxShadow: '0 12px 28px -10px rgba(220,38,38,.6)' }}>
            <Shield size={18} />
            {alert.isEmergencyBroadcast
              ? (queueCount > 1 ? `Got it — next (${queueCount - 1} left)` : 'Got it')
              : (queueCount > 1 ? `I'm on it — next (${queueCount - 1} left)` : "Acknowledge — I'm on it")}
          </button>
          {!isBroadcast && <p className="text-center text-[11.5px] text-slate-400">The person who raised it is told help is on the way.</p>}
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
  const { logout, user } = useAuth();
  const myId = user?._id ? String(user._id) : null;
  const navigate = useNavigate();
  const mutedRef = useRef(false);

  mutedRef.current = muted;

  const handleDismiss = useCallback((acknowledge = true) => {
    setQueue((q) => {
      const current = q[0];
      // A guard acknowledging a resident/staff alert tells the raiser help is
      // coming. Broadcasts are informational — nothing to acknowledge.
      if (acknowledge && current?._id && !current.isEmergencyBroadcast && current.status === 'open') {
        alertAPI.acknowledge(current._id).catch(() => toast.error('Could not acknowledge — try from Alerts'));
      }
      const remaining = q.slice(1);
      if (remaining.length === 0) stopSiren();
      return remaining;
    });
  }, []);

  // Muting silences the siren immediately, not just the next alert.
  const handleToggleMute = useCallback(() => setMuted((m) => { if (!m) stopSiren(); return !m; }), []);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      // Status change (acknowledged / resolved by anyone): it's being handled,
      // so take it off the popup queue and silence the siren if nothing's left.
      if (isStatusUpdate(alert)) {
        setQueue((q) => {
          const remaining = q.filter((a) => a._id !== alert._id);
          if (remaining.length !== q.length && remaining.length === 0) stopSiren();
          return remaining;
        });
        return;
      }
      // Our own broadcast echoing back — no popup, no siren.
      if (!isIncomingAlert(alert, myId)) return;
      setQueue((q) => (q.some((a) => a._id === alert._id) ? q : [...q, alert]));
      if (!mutedRef.current) playSiren();
    });
    return unsub;
  }, [subscribe, myId]);

  // Live count of alerts still active in the estate (open + being handled)
  const [liveCount, setLiveCount] = useState(0);
  const countTimer = useRef(null);
  const refreshCount = useCallback(() => {
    alertAPI.getAll({ status: 'active', page: 1, limit: 1 })
      .then(({ data }) => setLiveCount(data.pagination?.total ?? (data.data || []).length))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    const unsub = subscribe ? subscribe('new_alert', () => { clearTimeout(countTimer.current); countTimer.current = setTimeout(refreshCount, 600); }) : null;
    return () => { clearInterval(t); clearTimeout(countTimer.current); unsub && unsub(); };
  }, [subscribe, refreshCount]);
  const alertBadge = Math.max(liveCount, queue.length);

  const current = queue[0] || null;
  const { connected } = useSocket() || {};
  const { pathname } = useLocation();
  const page = NAV.find((n) => (n.to === '/verify' ? pathname === '/verify' || pathname === '/' : pathname.startsWith(n.to))) || NAV[0];
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(t); }, []);
  const estateName = user?.estateId && typeof user.estateId === 'object' ? user.estateId.name : 'Your estate';

  return (
    <div className="flex h-screen bg-[#F4F6F8] overflow-hidden">
      {current && (
        <AlertPopup alert={current} queueCount={queue.length} onDismiss={() => handleDismiss(true)} onClose={() => handleDismiss(false)} muted={muted} onToggleMute={handleToggleMute} />
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="overlay-backdrop" aria-hidden="true" />
          <div className="absolute right-0 top-0 bottom-0 z-50 animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile onClose={() => setSidebarOpen(false)} alertCount={alertBadge} />
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-shrink-0"><Sidebar alertCount={alertBadge} /></div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex-shrink-0 bg-[#07111F] text-white border-b border-white/[0.06]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3 px-4 h-[58px]">
            <NavLink to="/verify" aria-label="Home" className="flex items-center gap-3 min-w-0 flex-1 active:opacity-80" style={{ textDecoration: 'none' }}>
              <GuardMark size={34} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[14px] font-bold tracking-tight" style={{ color: '#fff' }}>Area<span className="text-blue-400">Connect</span> <span className="text-white/40 font-medium">Guard</span></p>
                <p className="text-[11px] text-white/50 flex items-center gap-1.5 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {estateName}
                </p>
              </div>
            </NavLink>
            <button onClick={() => navigate('/alerts')} aria-label={`Alerts${alertBadge ? ` (${alertBadge})` : ''}`}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${queue.length ? 'bg-red-500 g-alarm' : 'bg-white/[0.07]'}`}>
              <Bell size={18} />
              {alertBadge > 0 && <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center border-2 border-[#07111F] ${queue.length ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>{alertBadge > 99 ? '99+' : alertBadge}</span>}
            </button>
            <button onClick={() => setSidebarOpen(true)} aria-label="Menu" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.07] active:scale-95 transition-transform">
              <Menu size={19} />
            </button>
          </div>
          {queue.length > 0 && (
            <button onClick={() => navigate('/alerts')} className="w-full flex items-center justify-center gap-2 h-9 text-[12.5px] font-bold bg-red-500 text-white">
              <AlertTriangle size={14} /> {queue.length} active alert{queue.length > 1 ? 's' : ''} — tap to respond
            </button>
          )}
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex flex-shrink-0 h-16 items-center gap-3 px-7 bg-white border-b border-slate-200/80">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[11px] text-slate-400">{estateName}</p>
            <p className="text-[16px] font-semibold text-slate-900 truncate">{page.label}</p>
          </div>
          <button onClick={() => navigate('/alerts')} aria-label="Alerts"
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${queue.length ? 'bg-red-500 border-red-500 text-white g-alarm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Bell size={18} />
            {alertBadge > 0 && <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center border-2 border-white ${queue.length ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>{alertBadge > 99 ? '99+' : alertBadge}</span>}
          </button>
          <div className="flex items-center gap-4 text-[12.5px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />{connected ? 'Connected' : 'Reconnecting…'}</span>
            <span className="tabular-nums font-semibold text-slate-800">{clock.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {pathname !== '/verify' && (
            <NavLink to="/verify" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13.5px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', textDecoration: 'none' }}>
              <QrCode size={16} /> Verify visitor
            </NavLink>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-6 lg:p-8 lg:pb-8">
          <CallAlertsPrompt appName="AC Guards" />
          {children}
        </main>
        <LiveLocations />
      </div>

      {/* ── Mobile bottom navigation with a raised Scan button ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#07111F] border-t border-white/[0.06]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 items-end h-16">
          {[NAV[1], NAV[2], NAV[0], NAV[3], NAV[4]].map(({ to, icon: Icon, label }) => {
            const center = to === '/verify';
            return (
              <NavLink key={to} to={to} end={center} className="relative flex flex-col items-center justify-center h-full gap-0.5" style={{ textDecoration: 'none' }}>
                {({ isActive }) => center ? (
                  <>
                    <span className={`-mt-7 w-[58px] h-[58px] rounded-2xl flex items-center justify-center text-white border-4 border-[#07111F] ${isActive ? '' : 'opacity-95'}`}
                      style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', boxShadow: '0 10px 24px -8px rgba(59,130,246,.8)' }}>
                      <QrCode size={26} />
                    </span>
                    <span className={`text-[10.5px] font-semibold ${isActive ? 'text-blue-400' : 'text-white/50'}`}>Scan</span>
                  </>
                ) : (
                  <>
                    <span className="relative">
                      <Icon size={22} className={isActive ? 'text-blue-400' : 'text-white/40'} strokeWidth={isActive ? 2.2 : 1.8} />
                      {to === '/alerts' && alertBadge > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9.5px] font-bold flex items-center justify-center border-2 border-[#07111F]">{alertBadge > 99 ? '99+' : alertBadge}</span>}
                    </span>
                    <span className={`text-[10.5px] font-semibold ${isActive ? 'text-blue-400' : 'text-white/45'}`}>{label}</span>
                    {isActive && <span className="absolute top-0 w-8 h-[3px] rounded-b bg-blue-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

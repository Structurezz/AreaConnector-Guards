import { useEffect, useMemo, useRef, useState } from 'react';
import { visitorAPI, estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import {
  QrCode, Search, CheckCircle, XCircle, Camera,
  LogIn, LogOut, AlertTriangle, User,
  Phone, Home, Calendar, Shield, FileText, Sparkles, Clock, Hourglass,
  Wifi, WifiOff, CloudUpload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import { format } from 'date-fns';
import QrScanner from '../components/QrScanner';
import { useOnline } from '../offline/useOnline';
import {
  findCachedVisitorByCode, saveVisitorsCache,
  readQueue, enqueueMutation,
} from '../offline/cache';
import { drainQueue } from '../offline/queueDrainer';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Extract a 6-char access code from arbitrary scanned text.
// We accept raw codes (ABC123), or any string containing one.
function extractCode(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (/^[A-Z0-9]{3,10}$/.test(s)) return s;
  const match = s.match(/[A-Z0-9]{6}/);
  return match ? match[0] : s.slice(0, 6);
}

function VisitorResultCard({ visitor, onCheckIn, onCheckOut }) {
  const isActive      = visitor.status === 'active';
  const isIn          = visitor.status === 'checked-in';
  const isDone        = visitor.status === 'checked-out';
  const isBlacklisted = visitor.status === 'blacklisted';

  return (
    <div className="glass-card p-5 sm:p-6 animate-fade-in overflow-hidden relative"
      style={isBlacklisted ? { border: '1px solid #FCA5A5', background: '#FEF2F2' } : {}}>
      {!isBlacklisted && (
        <span className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 65%)' }} />
      )}

      {/* Header */}
      <div className="relative flex items-start gap-4 mb-5">
        {visitor.visitorPhoto ? (
          <img src={visitor.visitorPhoto} alt=""
            className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
            style={{ border: '2px solid rgba(59,130,246,0.25)' }} />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(37,99,235,0.08))',
              border: '2px solid rgba(59,130,246,0.25)',
              color: '#1D4ED8',
            }}>
            {visitor.visitorName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-black truncate" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            {visitor.visitorName}
          </h2>
          {visitor.visitorPhone && (
            <a href={`tel:${visitor.visitorPhone}`}
              className="flex items-center gap-1.5 text-sm mt-1 transition-colors"
              style={{ color: '#64748B' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2563EB'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
              <Phone size={12} /> {visitor.visitorPhone}
            </a>
          )}
        </div>
        <Badge variant={visitorStatusBadge(visitor.status)}>{visitor.status}</Badge>
      </div>

      {/* Info grid */}
      <div className="relative grid grid-cols-2 gap-2.5 mb-5">
        {[
          { icon: User,     label: 'Purpose',    value: visitor.purpose },
          { icon: Home,     label: 'Host Unit',  value: visitor.hostUnitId?.unitNumber ? `Unit ${visitor.hostUnitId.unitNumber}${visitor.hostUnitId.block ? ` · Block ${visitor.hostUnitId.block}` : ''}` : visitor.hostResidentId?.name || '—' },
          { icon: Calendar, label: 'Expected',   value: format(new Date(visitor.expectedDate), 'MMM d, yyyy'), sub: format(new Date(visitor.expectedDate), 'p') },
          { icon: User,     label: 'Invited by', value: visitor.hostResidentId?.name || '—' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-xl p-2.5 sm:p-3"
            style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.05)' }}>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: '#94A3B8' }}>
              <Icon size={10} /> {label}
            </div>
            <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{value}</div>
            {sub && <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div>}
          </div>
        ))}
        {visitor.entryTime && (
          <div className="rounded-xl p-2.5 sm:p-3"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.20)' }}>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#059669' }}>
              <LogIn size={10} /> Checked In
            </div>
            <div className="text-sm font-bold" style={{ color: '#0F172A' }}>{format(new Date(visitor.entryTime), 'p')}</div>
          </div>
        )}
        {visitor.exitTime && (
          <div className="rounded-xl p-2.5 sm:p-3"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.20)' }}>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#2563EB' }}>
              <LogOut size={10} /> Checked Out
            </div>
            <div className="text-sm font-bold" style={{ color: '#0F172A' }}>{format(new Date(visitor.exitTime), 'p')}</div>
          </div>
        )}
      </div>

      {isBlacklisted && (
        <div className="relative flex items-center gap-3 p-4 rounded-xl font-bold"
          style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          <AlertTriangle size={20} /> ACCESS DENIED — This visitor is blacklisted
        </div>
      )}
      {isActive && (
        <button onClick={onCheckIn}
          className="relative w-full py-3.5 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: '0 10px 24px -8px rgba(16,185,129,0.55)',
          }}>
          <LogIn size={20} /> Check In Visitor
        </button>
      )}
      {isIn && (
        <button onClick={onCheckOut}
          className="relative w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
          style={{
            background: '#F1F5F9',
            color: '#1D4ED8',
            border: '1.5px solid rgba(59,130,246,0.30)',
          }}>
          <LogOut size={20} /> Check Out Visitor
        </button>
      )}
      {isDone && (
        <div className="relative flex items-center justify-center gap-2 p-3.5 rounded-xl"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}>
          <CheckCircle size={18} style={{ color: '#10B981' }} />
          Visitor has already checked out
        </div>
      )}
    </div>
  );
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [code, setCode]             = useState('');
  const [visitor, setVisitor]       = useState(null);
  const [state, setState]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [sessionLog, setSessionLog] = useState([]);
  const [constitution, setConstitution] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);

  const estateId = user?.estateId?._id || user?.estateId;
  const online = useOnline();
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);

  useEffect(() => {
    if (!estateId) return;
    estateAPI.getConstitutionMeta(estateId)
      .then(({ data }) => setConstitution(data.data))
      .catch(() => setConstitution(null));
  }, [estateId]);

  // Pre-cache the visitor list so offline verify has data to match against.
  // Refresh on mount + every 2 minutes while online.
  useEffect(() => {
    if (!estateId) return;
    let cancelled = false;
    const refresh = async () => {
      if (!navigator.onLine) return;
      try {
        const { data } = await visitorAPI.getAll({ limit: 500 });
        if (!cancelled) saveVisitorsCache(estateId, data?.data || []);
      } catch { /* offline — the stale cache stays */ }
    };
    refresh();
    const id = setInterval(refresh, 2 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [estateId]);

  // When the connection returns, drain any queued check-in/outs.
  useEffect(() => {
    if (!online) return;
    const q = readQueue();
    if (q.length === 0) return;

    toast.loading(`Syncing ${q.length} queued ${q.length === 1 ? 'action' : 'actions'}…`, { id: 'sync', duration: 2000 });
    drainQueue().then(({ drained, dropped, remaining }) => {
      setPendingCount(remaining);
      toast.dismiss('sync');
      if (drained > 0)   toast.success(`Synced ${drained} queued ${drained === 1 ? 'action' : 'actions'}`);
      if (dropped > 0)   toast(`Dropped ${dropped} already-handled ${dropped === 1 ? 'action' : 'actions'}`, { icon: '⚠️' });
      if (remaining > 0) toast(`${remaining} still pending`, { icon: '⏳' });
    });
  }, [online]);

  const firstName = user?.name?.split(' ')[0] || 'Guard';

  const stats = useMemo(() => {
    let ins = 0, outs = 0;
    for (const l of sessionLog) {
      if (l.action === 'Check In')  ins++;
      if (l.action === 'Check Out') outs++;
    }
    return { ins, outs, total: sessionLog.length };
  }, [sessionLog]);

  const verifyCode = async (raw) => {
    const trimmed = extractCode(raw);
    if (!trimmed) return;
    setCode(trimmed);
    setLoading(true);
    setVisitor(null);
    setState(null);
    try {
      const { data } = await visitorAPI.verify(trimmed);
      setVisitor(data.data);
      if (data.state === 'early_arrival') {
        setState('early_arrival');
        toast(`Visitor is ${data.minsEarly} min early — the host has been pinged.`, { icon: '⏳', duration: 5000 });
        playSound('click');
      } else {
        setState('found');
        playSound('click');
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) { playSound('error'); setState('not_found'); return; }
      if (status === 403) { playSound('error'); setVisitor(err.response?.data?.data); setState('blacklisted'); return; }

      // No status = network error. Fall back to the offline cache so the
      // guard can still verify a visitor they've seen before.
      if (!err.response) {
        const cached = findCachedVisitorByCode(estateId, trimmed);
        if (cached) {
          setVisitor(cached);
          setState('found');
          playSound('click');
          toast('Offline — matched from cached visitor list', { icon: '📶', duration: 4000 });
          return;
        }
        playSound('error');
        setState('not_found');
        toast.error('You\'re offline and this code isn\'t cached yet');
        return;
      }

      playSound('error');
      setState('not_found');
      toast.error('Verification failed');
    } finally { setLoading(false); }
  };

  // Listen for the host approving an early entry — auto-flip to the normal flow
  const { subscribe } = useSocket() || {};
  const visitorIdRef = useRef(null);
  useEffect(() => { visitorIdRef.current = visitor?._id?.toString() || null; }, [visitor?._id]);
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('visitor_early_approved', (payload) => {
      const current = visitorIdRef.current;
      if (!current || payload?.visitorId?.toString() !== current) return;
      playSound('checkin');
      toast.success(`${payload.visitorName} approved by ${payload.approvedBy || 'the host'} — ready to check in.`, { duration: 6000 });
      setVisitor(payload.visitor || ((v) => v ? { ...v, earlyEntryApproved: true } : v));
      setState('found');
    });
    return unsub;
  }, [subscribe]);

  const handleVerifySubmit = (e) => {
    e?.preventDefault();
    verifyCode(code);
  };

  const handleScanResult = async (text) => {
    if (scannerBusy) return;
    setScannerBusy(true);
    setShowScanner(false);
    try {
      await verifyCode(text);
    } finally {
      setTimeout(() => setScannerBusy(false), 500);
    }
  };

  const queueOffline = (type, label) => {
    const pending = enqueueMutation({ type, visitorId: visitor._id, visitorName: visitor.visitorName });
    setPendingCount(pending);
    playSound('click');
    toast.success(`${visitor.visitorName} ${label} (queued, will sync when back online)`, { icon: '📶', duration: 5000 });
    const now = new Date().toISOString();
    if (type === 'checkIn')  setVisitor((v) => ({ ...v, status: 'checked-in',  entryTime: now }));
    if (type === 'checkOut') setVisitor((v) => ({ ...v, status: 'checked-out', exitTime:  now }));
    setSessionLog((prev) => [
      { name: visitor.visitorName, action: type === 'checkIn' ? 'Check In' : 'Check Out', time: new Date(), queued: true },
      ...prev.slice(0, 9),
    ]);
  };

  const handleCheckIn = async () => {
    try {
      await visitorAPI.checkIn(visitor._id);
      playSound('checkin');
      toast.success(`✅ ${visitor.visitorName} checked in`);
      setVisitor((v) => ({ ...v, status: 'checked-in', entryTime: new Date().toISOString() }));
      setSessionLog((prev) => [{ name: visitor.visitorName, action: 'Check In', time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) {
      if (!err.response) { queueOffline('checkIn', 'checked in'); return; }
      playSound('error'); toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await visitorAPI.checkOut(visitor._id);
      playSound('click');
      toast.success(`${visitor.visitorName} checked out`);
      setVisitor((v) => ({ ...v, status: 'checked-out', exitTime: new Date().toISOString() }));
      setSessionLog((prev) => [{ name: visitor.visitorName, action: 'Check Out', time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) {
      if (!err.response) { queueOffline('checkOut', 'checked out'); return; }
      playSound('error'); toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const reset = () => { setCode(''); setVisitor(null); setState(null); };

  return (
    <div className="max-w-lg mx-auto space-y-4 sm:space-y-5 animate-fade-in">

      {/* ── Modern Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6"
        style={{
          background:
            'radial-gradient(110% 80% at 100% 0%, #60A5FA 0%, transparent 55%),' +
            'radial-gradient(90% 80% at 0% 100%, #1E40AF 0%, transparent 60%),' +
            'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          boxShadow: '0 20px 44px -18px rgba(29,78,216,0.55), 0 10px 22px -12px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {/* Mesh */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 75%)',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 75%)',
          }} />
        <div className="absolute -top-14 -right-10 w-52 h-52 rounded-full pointer-events-none blur-2xl"
          style={{ background: 'rgba(191,219,254,0.35)' }} />
        <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full pointer-events-none blur-2xl"
          style={{ background: 'rgba(30,64,175,0.55)' }} />

        <div className="relative">
          {/* Pills row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-blue-200 animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              On duty
            </span>
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.20)' }}>
              {format(new Date(), 'EEE, HH:mm')}
            </span>
            {/* Connection + queue pill */}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{
                background: online ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.28)',
                color: '#fff',
                border: `1px solid ${online ? 'rgba(167,243,208,0.45)' : 'rgba(253,230,138,0.55)'}`,
              }}>
              {online ? <Wifi size={10} /> : <WifiOff size={10} />}
              {online ? 'Online' : 'Offline'}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.28)',
                  color: '#fff',
                  border: '1px solid rgba(254,202,202,0.55)',
                }}>
                <CloudUpload size={10} /> {pendingCount} pending
              </span>
            )}
          </div>
          {/* Greeting */}
          <h1 className="text-white font-black" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            <span className="hidden sm:block text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.14em' }}>
              Gate security
            </span>
            <span className="block text-xl sm:text-4xl">
              <span className="sm:hidden">Hi, </span>{firstName}
            </span>
          </h1>
          <p className="text-[11px] sm:text-sm mt-1 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
            <Sparkles size={11} style={{ color: '#BFDBFE' }} />
            <span className="truncate">
              {sessionLog.length > 0 ? `${stats.ins} in · ${stats.outs} out this session` : 'Scan or type a code to begin'}
            </span>
          </p>
        </div>
      </div>

      {/* ── Scanner card — primary action ── */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowScanner(true)}
          className="w-full p-5 sm:p-6 flex items-center gap-4 text-left transition-all active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.03))',
          }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              boxShadow: '0 10px 24px -8px rgba(37,99,235,0.55)',
            }}>
            <QrCode size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1D4ED8' }}>
              Scan QR
            </div>
            <div className="text-base sm:text-lg font-black" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              Scan Visitor Pass
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>
              Opens the camera · fastest way to verify
            </div>
          </div>
          <Camera size={18} style={{ color: '#94A3B8' }} />
        </button>

        {/* Divider with "or" */}
        <div className="relative flex items-center gap-3 px-5 py-3" style={{ borderTop: '1px solid rgba(15,23,42,0.05)', background: '#fff' }}>
          <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
            Or enter manually
          </span>
          <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
        </div>

        {/* Manual input */}
        <form onSubmit={handleVerifySubmit} className="p-5 pt-3 space-y-3" style={{ background: '#fff' }}>
          <div className="relative">
            <input
              className="w-full py-3.5 px-4 rounded-xl text-center font-mono text-xl sm:text-2xl tracking-[0.4em] uppercase outline-none transition-all"
              style={{
                background: '#F8FAFC',
                border: `2px solid ${state === 'not_found' ? '#FCA5A5' : state === 'blacklisted' ? '#FCA5A5' : state === 'found' ? '#86EFAC' : '#E2E8F0'}`,
                color: '#0F172A',
              }}
              placeholder="ABC123"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, 6));
                if (state) setState(null);
                if (visitor) setVisitor(null);
              }}
              maxLength={6}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {/* Code progress */}
          <div className="flex justify-center gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i}
                className="w-5 h-1.5 rounded-full transition-all"
                style={{ background: i < code.length ? '#2563EB' : '#E2E8F0' }} />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length < 3}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: '#F1F5F9',
              color: '#1D4ED8',
              border: '1.5px solid rgba(59,130,246,0.25)',
            }}>
            <Search size={16} />
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>
      </div>

      {/* NOT FOUND */}
      {state === 'not_found' && (
        <div className="glass-card p-5 animate-fade-in"
          style={{ border: '1px solid #FECACA', background: '#FEF2F2' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.14)' }}>
              <XCircle size={20} style={{ color: '#EF4444' }} />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm" style={{ color: '#B91C1C' }}>Invalid Access Code</div>
              <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                No visitor pass found for <span className="font-mono font-bold" style={{ color: '#0F172A' }}>{code}</span>
              </div>
            </div>
          </div>
          <button onClick={reset} className="btn-outline w-full text-sm">Try Again</button>
        </div>
      )}

      {/* BLACKLISTED */}
      {state === 'blacklisted' && (
        <div className="glass-card p-5 animate-fade-in"
          style={{ border: '1px solid #FCA5A5', background: '#FEF2F2' }}>
          <div className="flex items-center gap-3 mb-2" style={{ color: '#B91C1C' }}>
            <AlertTriangle size={22} />
            <span className="font-black text-lg">ACCESS DENIED</span>
          </div>
          <div className="font-bold mb-0.5" style={{ color: '#0F172A' }}>{visitor?.visitorName}</div>
          <div className="text-sm mb-3" style={{ color: '#64748B' }}>{visitor?.purpose}</div>
          <div className="text-sm font-medium mb-4" style={{ color: '#DC2626' }}>
            This visitor has been blacklisted by estate management.
          </div>
          <button onClick={reset} className="btn-outline w-full text-sm">Clear</button>
        </div>
      )}

      {/* EARLY ARRIVAL — waiting for host */}
      {state === 'early_arrival' && visitor && (
        <div className="glass-card p-5 animate-fade-in overflow-hidden relative"
          style={{ border: '1px solid #FDE68A', background: '#FFFBEB' }}>
          <span className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle at top right, rgba(245,158,11,0.14), transparent 65%)' }} />
          <div className="relative">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.14)' }}>
                <Hourglass size={20} style={{ color: '#B45309' }} className="animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#B45309' }}>
                  Early arrival · waiting
                </div>
                <div className="text-base font-black mt-0.5" style={{ color: '#0F172A' }}>
                  {visitor.visitorName}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  Expected {format(new Date(visitor.expectedDate), 'h:mm a')} · {visitor.purpose}
                </div>
              </div>
            </div>

            {/* Host info */}
            <div className="rounded-xl p-3 mb-3 flex items-center gap-3"
              style={{ background: '#fff', border: '1px solid rgba(245,158,11,0.20)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.10)', color: '#1D4ED8' }}>
                {(visitor.hostResidentId?.name || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#64748B' }}>
                  Pinged host
                </div>
                <div className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>
                  {visitor.hostResidentId?.name || 'Host'}
                  {visitor.hostUnitId?.unitNumber ? ` · Unit ${visitor.hostUnitId.unitNumber}` : ''}
                </div>
              </div>
              {visitor.hostResidentId?.phone && (
                <a href={`tel:${visitor.hostResidentId.phone}`}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                  style={{ background: 'rgba(59,130,246,0.10)', color: '#1D4ED8', textDecoration: 'none' }}>
                  <Phone size={11} /> Call
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs mb-4" style={{ color: '#92400E' }}>
              <Clock size={12} />
              <span className="font-semibold">Awaiting approval. This screen will auto-advance when the resident taps Allow.</span>
            </div>

            <button onClick={reset}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FOUND */}
      {state === 'found' && visitor && (
        <>
          <VisitorResultCard visitor={visitor} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
          <button onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            Verify Another Visitor
          </button>
        </>
      )}

      {/* Session log — modern */}
      {sessionLog.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"
              style={{ color: '#64748B' }}>
              <Shield size={12} /> This session
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                <LogIn size={9} /> {stats.ins}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(59,130,246,0.10)', color: '#1D4ED8' }}>
                <LogOut size={9} /> {stats.outs}
              </span>
            </div>
          </div>
          <div>
            {sessionLog.map((log, i) => (
              <div key={i}
                className="flex items-center gap-3 px-5 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: log.action === 'Check In' ? '#10B981' : '#3B82F6' }} />
                <span className="flex-1 truncate text-sm font-medium" style={{ color: '#0F172A' }}>{log.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: log.action === 'Check In' ? '#059669' : '#1D4ED8' }}>
                  {log.action}
                </span>
                <span className="text-[11px]" style={{ color: '#94A3B8' }}>{format(new Date(log.time), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constitution reference — tucked at bottom */}
      {constitution?.hasConstitution && (
        <a
          href={`${API_BASE}${estateAPI.constitutionFileUrl(estateId)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl no-underline"
          style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(236,72,153,0.10)' }}>
            <FileText size={16} style={{ color: '#EC4899' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Estate Constitution</div>
            <div className="text-xs" style={{ color: '#64748B' }}>
              {constitution.pageCount ? `${constitution.pageCount} pages · ` : ''}Reference for gate policy
            </div>
          </div>
          <div className="text-xs font-bold" style={{ color: '#EC4899' }}>View →</div>
        </a>
      )}

      {/* ── Scanner modal ── */}
      <QrScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onResult={handleScanResult}
      />
    </div>
  );
}

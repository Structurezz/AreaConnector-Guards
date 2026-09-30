import { useEffect, useState } from 'react';
import { visitorAPI, estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import {
  QrCode, Search, CheckCircle, XCircle,
  LogIn, LogOut, AlertTriangle, User,
  Phone, Home, Calendar, Clock, Shield, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function VisitorResultCard({ visitor, onCheckIn, onCheckOut }) {
  const isActive      = visitor.status === 'active';
  const isIn          = visitor.status === 'checked-in';
  const isDone        = visitor.status === 'checked-out';
  const isBlacklisted = visitor.status === 'blacklisted';

  return (
    <div className={`glass-card p-6 animate-fade-in ${isBlacklisted ? '' : ''}`}
      style={isBlacklisted ? { border: '1px solid #FCA5A5', background: '#FEF2F2' } : {}}>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0"
          style={{ background: 'rgba(59,130,246,0.10)', border: '2px solid rgba(59,130,246,0.20)', color: '#2563EB' }}>
          {visitor.visitorName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold mb-0.5" style={{ color: '#0F172A' }}>{visitor.visitorName}</h2>
          {visitor.visitorPhone && (
            <a href={`tel:${visitor.visitorPhone}`}
              className="flex items-center gap-1.5 text-sm mt-0.5 transition-colors"
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
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: User,     label: 'Purpose',    value: visitor.purpose },
          { icon: Home,     label: 'Host Unit',  value: visitor.hostUnitId?.unitNumber ? `Unit ${visitor.hostUnitId.unitNumber}${visitor.hostUnitId.block ? ` · Block ${visitor.hostUnitId.block}` : ''}` : visitor.hostResidentId?.name || '—' },
          { icon: Calendar, label: 'Expected',   value: format(new Date(visitor.expectedDate), 'MMM d, yyyy'), sub: format(new Date(visitor.expectedDate), 'p') },
          { icon: User,     label: 'Invited by', value: visitor.hostResidentId?.name || '—' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#94A3B8' }}>
              <Icon size={10} /> {label}
            </div>
            <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{value}</div>
            {sub && <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div>}
          </div>
        ))}
        {visitor.entryTime && (
          <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#059669' }}>
              <LogIn size={10} /> Checked In
            </div>
            <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{format(new Date(visitor.entryTime), 'p')}</div>
          </div>
        )}
        {visitor.exitTime && (
          <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' }}>
            <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#2563EB' }}>
              <LogOut size={10} /> Checked Out
            </div>
            <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{format(new Date(visitor.exitTime), 'p')}</div>
          </div>
        )}
      </div>

      {isBlacklisted && (
        <div className="flex items-center gap-3 p-4 rounded-xl font-bold"
          style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          <AlertTriangle size={20} /> ACCESS DENIED — This visitor is blacklisted
        </div>
      )}
      {isActive && (
        <button onClick={onCheckIn} className="btn-primary w-full gap-2 py-3.5 text-base">
          <LogIn size={20} /> Check In Visitor
        </button>
      )}
      {isIn && (
        <button onClick={onCheckOut} className="btn-outline w-full gap-2 py-3.5 text-base">
          <LogOut size={20} /> Check Out Visitor
        </button>
      )}
      {isDone && (
        <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl"
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
  const [code, setCode]           = useState('');
  const [visitor, setVisitor]     = useState(null);
  const [state, setState]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [sessionLog, setSessionLog] = useState([]);
  const [constitution, setConstitution] = useState(null);

  const estateId = user?.estateId?._id || user?.estateId;
  useEffect(() => {
    if (!estateId) return;
    estateAPI.getConstitutionMeta(estateId)
      .then(({ data }) => setConstitution(data.data))
      .catch(() => setConstitution(null));
  }, [estateId]);

  const handleVerify = async (e) => {
    e?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setVisitor(null);
    setState(null);
    try {
      const { data } = await visitorAPI.verify(trimmed);
      setVisitor(data.data);
      setState('found');
      playSound('click');
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) { playSound('error'); setState('not_found'); }
      else if (status === 403) { playSound('error'); setVisitor(err.response?.data?.data); setState('blacklisted'); }
      else { playSound('error'); setState('not_found'); toast.error('Verification failed'); }
    } finally { setLoading(false); }
  };

  const handleCheckIn = async () => {
    try {
      await visitorAPI.checkIn(visitor._id);
      playSound('checkin');
      toast.success(`✅ ${visitor.visitorName} checked in`);
      setVisitor((v) => ({ ...v, status: 'checked-in', entryTime: new Date().toISOString() }));
      setSessionLog((prev) => [{ name: visitor.visitorName, action: 'Check In', time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) { playSound('error'); toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCheckOut = async () => {
    try {
      await visitorAPI.checkOut(visitor._id);
      playSound('click');
      toast.success(`${visitor.visitorName} checked out`);
      setVisitor((v) => ({ ...v, status: 'checked-out', exitTime: new Date().toISOString() }));
      setSessionLog((prev) => [{ name: visitor.visitorName, action: 'Check Out', time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) { playSound('error'); toast.error(err.response?.data?.message || 'Failed'); }
  };

  const reset = () => { setCode(''); setVisitor(null); setState(null); };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-center"
        style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 60%, #1D4ED8 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.05)' }} />

        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}>
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
            Gate Security
          </h1>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Visitor access verification terminal
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
            {format(new Date(), 'EEEE · HH:mm')}
          </div>
        </div>
      </div>

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
            <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>Estate Constitution</div>
            <div className="text-xs" style={{ color: '#64748B' }}>
              {constitution.pageCount ? `${constitution.pageCount} pages · ` : ''}Reference for gate policy
            </div>
          </div>
          <div className="text-xs font-semibold" style={{ color: '#EC4899' }}>View →</div>
        </a>
      )}

      {/* Code input */}
      <div className="glass-card p-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block text-center" style={{ color: '#475569' }}>
              Visitor Access Code
            </label>
            <div className="relative">
              <QrCode size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
              <input
                className="input-field text-center text-2xl tracking-[0.4em] uppercase pl-10 py-4 visitor-code"
                placeholder="ABC123"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().slice(0, 6));
                  if (state) setState(null);
                  if (visitor) setVisitor(null);
                }}
                maxLength={6}
                autoFocus
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || code.trim().length < 3}
            className="btn-primary w-full py-3.5 text-base gap-2">
            <Search size={18} />
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {/* Code progress */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}
              className="w-5 h-1.5 rounded-full transition-all"
              style={{ background: i < code.length ? '#3B82F6' : '#E2E8F0' }} />
          ))}
        </div>
      </div>

      {/* NOT FOUND */}
      {state === 'not_found' && (
        <div className="glass-card p-5 animate-fade-in"
          style={{ border: '1px solid #FECACA', background: '#FEF2F2' }}>
          <div className="flex items-center gap-3 mb-3">
            <XCircle size={24} style={{ color: '#EF4444', flexShrink: 0 }} />
            <div>
              <div className="font-bold" style={{ color: '#B91C1C' }}>Invalid Access Code</div>
              <div className="text-sm" style={{ color: '#64748B' }}>
                No visitor pass found for <span className="font-mono" style={{ color: '#0F172A' }}>{code}</span>
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
            <span className="font-bold text-lg">ACCESS DENIED</span>
          </div>
          <div className="font-semibold mb-0.5" style={{ color: '#0F172A' }}>{visitor?.visitorName}</div>
          <div className="text-sm mb-3" style={{ color: '#64748B' }}>{visitor?.purpose}</div>
          <div className="text-sm font-medium mb-4" style={{ color: '#DC2626' }}>
            This visitor has been blacklisted by estate management.
          </div>
          <button onClick={reset} className="btn-outline w-full text-sm">Clear</button>
        </div>
      )}

      {/* FOUND */}
      {state === 'found' && visitor && (
        <>
          <VisitorResultCard visitor={visitor} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
          <button onClick={reset} className="btn-outline w-full text-sm">
            Verify Another Visitor
          </button>
        </>
      )}

      {/* Session log */}
      {sessionLog.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>
            This Session
          </h2>
          <div className="space-y-2">
            {sessionLog.map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: log.action === 'Check In' ? '#10B981' : '#3B82F6' }} />
                <span className="flex-1 truncate" style={{ color: '#334155' }}>{log.name}</span>
                <span className="text-xs font-semibold"
                  style={{ color: log.action === 'Check In' ? '#10B981' : '#3B82F6' }}>
                  {log.action}
                </span>
                <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>{format(new Date(log.time), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

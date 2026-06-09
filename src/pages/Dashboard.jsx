import { useState } from 'react';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import {
  QrCode, Search, CheckCircle, XCircle,
  LogIn, LogOut, AlertTriangle, User,
  Phone, Home, Calendar, Clock, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import { format } from 'date-fns';

function VisitorResultCard({ visitor, onCheckIn, onCheckOut }) {
  const isActive = visitor.status === 'active';
  const isIn = visitor.status === 'checked-in';
  const isDone = visitor.status === 'checked-out';
  const isBlacklisted = visitor.status === 'blacklisted';

  return (
    <div className={`glass-card-gold p-6 animate-fade-in ${isBlacklisted ? 'border-red-500/50 bg-red-500/5' : ''}`}>
      {/* Visitor header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-gold text-3xl font-bold flex-shrink-0">
          {visitor.visitorName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-display font-bold text-white leading-tight">{visitor.visitorName}</h2>
          {visitor.visitorPhone && (
            <a href={`tel:${visitor.visitorPhone}`} className="flex items-center gap-1.5 text-white/50 text-sm mt-0.5 hover:text-gold transition-colors">
              <Phone size={12} /> {visitor.visitorPhone}
            </a>
          )}
        </div>
        <Badge variant={visitorStatusBadge(visitor.status)}>{visitor.status}</Badge>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><User size={10} /> Purpose</div>
          <div className="text-white text-sm font-medium">{visitor.purpose}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><Home size={10} /> Host Unit</div>
          <div className="text-white text-sm font-medium">
            {visitor.hostUnitId?.unitNumber
              ? `Unit ${visitor.hostUnitId.unitNumber}${visitor.hostUnitId.block ? ` · Block ${visitor.hostUnitId.block}` : ''}`
              : visitor.hostResidentId?.name || '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><Calendar size={10} /> Expected</div>
          <div className="text-white text-sm font-medium">
            {format(new Date(visitor.expectedDate), 'MMM d, yyyy')}
          </div>
          <div className="text-white/40 text-xs">{format(new Date(visitor.expectedDate), 'p')}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><User size={10} /> Invited by</div>
          <div className="text-white text-sm font-medium">{visitor.hostResidentId?.name || '—'}</div>
        </div>
        {visitor.entryTime && (
          <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
            <div className="text-emerald-400 text-xs mb-1 flex items-center gap-1"><LogIn size={10} /> Checked In</div>
            <div className="text-white text-sm font-medium">{format(new Date(visitor.entryTime), 'p')}</div>
          </div>
        )}
        {visitor.exitTime && (
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
            <div className="text-blue-400 text-xs mb-1 flex items-center gap-1"><LogOut size={10} /> Checked Out</div>
            <div className="text-white text-sm font-medium">{format(new Date(visitor.exitTime), 'p')}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      {isBlacklisted && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
          <AlertTriangle size={20} />
          ACCESS DENIED — This visitor is blacklisted
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
        <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-white/5 text-white/50">
          <CheckCircle size={18} className="text-emerald-400" />
          Visitor has already checked out
        </div>
      )}
    </div>
  );
}

export default function SecurityDashboard() {
  const [code, setCode] = useState('');
  const [visitor, setVisitor] = useState(null);
  const [state, setState] = useState(null); // null | 'found' | 'not_found' | 'blacklisted'
  const [loading, setLoading] = useState(false);
  const [sessionLog, setSessionLog] = useState([]);

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
      else if (status === 403) {
        playSound('error');
        setVisitor(err.response?.data?.data);
        setState('blacklisted');
      } else {
        playSound('error');
        setState('not_found');
        toast.error('Verification failed');
      }
    } finally {
      setLoading(false);
    }
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
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
          <Shield size={28} className="text-gold" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Gate Security</h1>
        <p className="text-white/45 text-sm">Enter or scan a visitor access code to verify</p>
      </div>

      {/* Code input form */}
      <div className="glass-card-gold p-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block text-center">Visitor Access Code</label>
            <div className="relative">
              <QrCode size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                className="input-field text-center visitor-code text-2xl tracking-[0.4em] uppercase pl-10 py-4"
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
            className="btn-primary w-full py-3.5 text-base gap-2"
          >
            <Search size={18} />
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {/* Code progress indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-5 h-1.5 rounded-full transition-all ${i < code.length ? 'bg-gold' : 'bg-white/15'}`} />
          ))}
        </div>
      </div>

      {/* NOT FOUND */}
      {state === 'not_found' && (
        <div className="glass-card p-5 border-red-500/30 bg-red-500/5 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <XCircle className="text-red-400 flex-shrink-0" size={24} />
            <div>
              <div className="font-bold text-red-400">Invalid Access Code</div>
              <div className="text-sm text-white/60">No visitor pass found for <span className="font-mono text-white">{code}</span></div>
            </div>
          </div>
          <button onClick={reset} className="btn-outline w-full text-sm">Try Again</button>
        </div>
      )}

      {/* BLACKLISTED */}
      {state === 'blacklisted' && (
        <div className="glass-card p-5 border-red-500/40 bg-red-500/10 animate-fade-in">
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <AlertTriangle size={22} />
            <span className="font-bold text-lg">ACCESS DENIED</span>
          </div>
          <div className="text-white font-semibold">{visitor?.visitorName}</div>
          <div className="text-white/50 text-sm mb-3">{visitor?.purpose}</div>
          <div className="text-red-400 text-sm font-medium">This visitor has been blacklisted by estate management.</div>
          <button onClick={reset} className="btn-outline w-full text-sm mt-4">Clear</button>
        </div>
      )}

      {/* FOUND — show visitor card */}
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
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">This Session</h2>
          <div className="space-y-2">
            {sessionLog.map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.action === 'Check In' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                <span className="text-white/75 flex-1 truncate">{log.name}</span>
                <span className={`text-xs font-semibold ${log.action === 'Check In' ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {log.action}
                </span>
                <span className="text-white/25 text-xs ml-1">{format(new Date(log.time), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

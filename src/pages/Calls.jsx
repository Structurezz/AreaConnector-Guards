import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, RefreshCw, ShieldCheck, Users, History, X } from 'lucide-react';
import { callAPI } from '../api';
import { useCall } from '../context/CallContext';

// Estate staff calling: managers can call any resident or guard in the
// estate for free, and see their recent calls (incl. emergency calls in).

const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const ROLE_LABEL = { security: 'Security', estate_manager: 'Estate Manager', super_admin: 'Estate Manager', resident: 'Resident' };

function Avatar({ person, size = 44 }) {
  const staff = person.role && person.role !== 'resident';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {person.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" style={{ border: '1px solid rgba(15,23,42,0.06)' }} />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center font-semibold"
          style={{
            fontSize: size * 0.36,
            background: staff ? '#0F172A' : '#EFF6FF',
            color: staff ? '#93C5FD' : '#1D4ED8',
          }}>
          {(person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      )}
      {person.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online now" />}
    </div>
  );
}

function CallButton({ onClick, disabled, label, soft = false }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="shrink-0 w-12 h-12 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={soft
        ? { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }
        : { background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', color: '#fff', boxShadow: '0 6px 16px -6px rgba(59,130,246,0.7)' }}>
      <Phone size={18} />
    </button>
  );
}

const STATUS_PILL = {
  completed: { bg: '#ECFDF5', fg: '#047857' },
  answered:  { bg: '#ECFDF5', fg: '#047857' },
  missed:    { bg: '#FEF2F2', fg: '#DC2626' },
  declined:  { bg: '#FEF2F2', fg: '#DC2626' },
  failed:    { bg: '#FEF2F2', fg: '#DC2626' },
  cancelled: { bg: '#F1F5F9', fg: '#64748B' },
};

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#F1F5F9', color: '#94A3B8' }}>
        <Icon size={20} />
      </div>
      <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>{title}</div>
      {hint && <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{hint}</div>}
    </div>
  );
}

export default function Calls() {
  const { call, startCall } = useCall() || {};
  const [dir, setDir] = useState({ neighbours: [], staff: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('residents');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([callAPI.directory(), callAPI.history()]);
      setDir(d.data.data);
      setHistory(h.data.data);
    } catch {
      toast.error('Could not load contacts');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!call) load(); }, [call]); // refresh history after a call

  const people = tab === 'staff' ? dir.staff : dir.neighbours;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? people.filter((p) => `${p.name} ${p.unit || ''} ${ROLE_LABEL[p.role] || ''}`.toLowerCase().includes(term)) : people;
    return [...list].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  }, [people, q]);

  const findPerson = (id) => dir.neighbours.find((x) => String(x._id) === String(id)) || dir.staff.find((x) => String(x._id) === String(id));
  const missedIn = history.filter((c) => c.direction === 'incoming' && ['missed', 'declined'].includes(c.status) && Date.now() - new Date(c.createdAt) < 86400000).length;
  const onlineCount = [...(dir.neighbours || []), ...(dir.staff || [])].filter((p) => p.online).length;

  // Group call history by day for easier scanning
  const groups = useMemo(() => {
    const out = [];
    history.forEach((c) => {
      const label = dayLabel(new Date(c.createdAt));
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(c);
      else out.push({ label, items: [c] });
    });
    return out;
  }, [history]);

  const tabs = [
    ['residents', 'Residents', dir.neighbours.length],
    ['staff', 'Staff', dir.staff.length],
    ['recent', 'Recent', null],
  ];

  const directory = (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'staff' ? 'Search staff' : 'Search by name or unit'}
          className="input-field pl-10 pr-10 focus:!border-blue-500 focus:!shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" style={{ height: 46, borderRadius: 14 }} />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="g-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <span className="g-label">{tab === 'staff' ? 'Security & management' : 'Residents'}</span>
          <span className="text-xs" style={{ color: '#94A3B8' }}>{filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}</span>
        </div>
        {loading ? (
          <div className="py-16 flex justify-center"><RefreshCw size={22} className="animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users}
            title={q ? `No match for “${q}”` : tab === 'staff' ? 'No other staff in this estate yet' : 'No residents yet'}
            hint={q ? 'Try a name or unit number' : null} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((p, i) => (
              <li key={p._id} className="g-rise flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors"
                style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                <Avatar person={p} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{p.name}</div>
                  <div className="text-xs truncate flex items-center gap-1.5 mt-0.5" style={{ color: '#94A3B8' }}>
                    <span className="truncate">{p.role === 'resident' ? (p.unit || 'Resident') : ROLE_LABEL[p.role]}</span>
                    {p.online && <span className="shrink-0 font-semibold" style={{ color: '#059669' }}>· online</span>}
                  </div>
                </div>
                <CallButton onClick={() => startCall(p)} disabled={!!call} label={`Call ${p.name}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const recent = (
    <div className="g-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <span className="text-[15px] font-semibold flex items-center gap-2" style={{ color: '#0F172A' }}>
          <History size={15} className="text-slate-400" /> Recent calls
        </span>
        {missedIn > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            {missedIn} missed today
          </span>
        )}
      </div>
      {history.length === 0 ? (
        <EmptyState icon={Phone} title="No calls yet" hint="Calls you make or receive will show here" />
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.label}>
              <div className="g-label px-4 pt-3 pb-1.5" style={{ background: '#FAFBFC' }}>{g.label}</div>
              <ul className="divide-y divide-slate-100">
                {g.items.map((c) => {
                  const out = c.direction === 'outgoing';
                  const other = (out ? c.calleeId : c.callerId) || {};
                  const missed = ['missed', 'declined', 'cancelled', 'failed'].includes(c.status);
                  const Icon = missed && !out ? PhoneMissed : out ? PhoneOutgoing : PhoneIncoming;
                  const person = findPerson(other._id);
                  const pill = STATUS_PILL[c.status] || { bg: '#F1F5F9', fg: '#64748B' };
                  const chip = missed && !out
                    ? { bg: '#FEF2F2', fg: '#DC2626' }
                    : out ? { bg: '#EFF6FF', fg: '#2563EB' } : { bg: '#F1F5F9', fg: '#475569' };
                  return (
                    <li key={c._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: chip.bg, color: chip.fg }}>
                        <Icon size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${missed && !out ? 'text-red-600' : ''}`} style={missed && !out ? undefined : { color: '#0F172A' }}>
                          {other.name || 'Unknown'}
                          {c.kind === 'emergency' && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 align-middle">EMERGENCY</span>}
                        </div>
                        <div className="text-xs truncate mt-0.5 flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
                          <span>{out ? 'Outgoing' : 'Incoming'} · {format(new Date(c.createdAt), 'h:mm a')}</span>
                          {c.durationSec ? (
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>· {mmss(c.durationSec)}</span>
                          ) : (
                            <span className="px-1.5 py-px rounded-full text-[10px] font-semibold capitalize" style={{ background: pill.bg, color: pill.fg }}>{c.status}</span>
                          )}
                        </div>
                      </div>
                      {person && (
                        <CallButton soft onClick={() => startCall(person)} disabled={!!call} label={`Call ${person.name} back`} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Heading */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[21px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>Calls</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>Call any resident, manager or fellow guard.</p>
        </div>
        <button onClick={load} aria-label="Refresh"
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-slate-500 hover:text-blue-600 shrink-0"
          style={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
          <ShieldCheck size={13} /> Calls from security are always free
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(15,23,42,0.08)', color: '#475569' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {onlineCount} online now
        </span>
        {missedIn > 0 && (
          <button onClick={() => setTab('recent')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            <PhoneMissed size={13} /> {missedIn} missed in 24h
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
        <div className="space-y-3 min-w-0">
          {/* Segmented control */}
          <div className="flex p-1 rounded-2xl bg-slate-200/60">
            {tabs.map(([id, label, count]) => (
              <button key={id} onClick={() => { setTab(id); setQ(''); }}
                className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${id === 'recent' ? 'lg:hidden' : ''} ${tab === id ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                style={tab === id ? { color: '#0F172A' } : undefined}>
                {label}
                {count ? <span className="ml-1.5 text-[11px] font-medium" style={{ color: tab === id ? '#2563EB' : '#94A3B8' }}>{count}</span> : null}
                {id === 'recent' && missedIn > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full align-middle">{missedIn}</span>
                )}
              </button>
            ))}
          </div>

          <div className={tab === 'recent' ? 'hidden lg:block' : ''}>{directory}</div>
          <div className={tab === 'recent' ? 'lg:hidden' : 'hidden'}>{recent}</div>
        </div>

        <div className="hidden lg:block min-w-0 lg:sticky lg:top-4">{recent}</div>
      </div>
    </div>
  );
}

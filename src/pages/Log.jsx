import { useEffect, useMemo, useState } from 'react';
import { visitorAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { FileText, LogIn, LogOut, Search, Clock, Phone, WifiOff, Ban, X, CalendarDays } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import Pagination from '../components/ui/Pagination';
import { useOnline } from '../offline/useOnline';
import { useAuth } from '../context/AuthContext';
import { readVisitorsCache, saveVisitorsCache, enqueueMutation } from '../offline/cache';

const PAGE_SIZE = 20;
// Guards only see visitors once they reach the gate — never who is expected
const NOT_ARRIVED = new Set(['active', 'pending']);

const STATUS_FILTERS = [
  { key: 'all',          label: 'All'          },
  { key: 'checked-in',   label: 'Inside'       },
  { key: 'checked-out',  label: 'Checked out'  },
  { key: 'blacklisted',  label: 'Blocked'      },
];

// Visual config per visitor status: pill colours + direction icon
const STATUS_CFG = {
  'checked-in':  { label: 'Inside',      bg: 'rgba(16,185,129,0.10)', color: '#047857', border: 'rgba(16,185,129,0.25)', Icon: LogIn,  chip: 'linear-gradient(135deg,#10B981,#047857)' },
  'checked-out': { label: 'Checked out', bg: 'rgba(100,116,139,0.10)', color: '#475569', border: 'rgba(100,116,139,0.22)', Icon: LogOut, chip: 'linear-gradient(135deg,#64748B,#334155)' },
  active:        { label: 'Expected',    bg: 'rgba(245,158,11,0.10)', color: '#B45309', border: 'rgba(245,158,11,0.28)', Icon: Clock,  chip: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  pending:       { label: 'Pending',     bg: 'rgba(245,158,11,0.10)', color: '#B45309', border: 'rgba(245,158,11,0.28)', Icon: Clock,  chip: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  blacklisted:   { label: 'Blocked',     bg: 'rgba(239,68,68,0.10)',  color: '#B91C1C', border: 'rgba(239,68,68,0.28)',  Icon: Ban,    chip: 'linear-gradient(135deg,#EF4444,#B91C1C)' },
  expired:       { label: 'Expired',     bg: 'rgba(148,163,184,0.12)', color: '#64748B', border: 'rgba(148,163,184,0.28)', Icon: Clock, chip: 'linear-gradient(135deg,#94A3B8,#64748B)' },
};
const cfgFor = (s) => STATUS_CFG[s] || { ...STATUS_CFG.expired, label: s };

// The moment that best represents this visitor's latest gate movement
const activityTime = (v) => new Date(v.exitTime || v.entryTime || v.expectedDate);

const dayLabel = (d) => {
  if (isNaN(d)) return 'Unknown date';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, d MMM yyyy');
};

const safeFormat = (value, fmt) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : format(d, fmt);
};

export default function SecurityLog() {
  const { user } = useAuth();
  const estateId = user?.estateId?._id || user?.estateId;
  const online = useOnline();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [fromCache, setFromCache] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll({ page: p, limit: PAGE_SIZE });
      setVisitors(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
      setFromCache(false);
      // Keep offline cache fresh with everything we've just seen
      if (p === 1) saveVisitorsCache(estateId, data.data);
    } catch (err) {
      if (!err.response) {
        // Offline — fall back to the cached snapshot
        const { list, updatedAt } = readVisitorsCache(estateId);
        setVisitors(list.slice(0, PAGE_SIZE));
        setPagination({ total: list.length, pages: Math.max(1, Math.ceil(list.length / PAGE_SIZE)) });
        setFromCache(true);
        if (list.length === 0) toast.error('Offline — no cached log yet');
        else toast(`Offline — showing ${list.length} cached ${list.length === 1 ? 'visitor' : 'visitors'} from ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, { icon: '📶', duration: 5000 });
      } else {
        toast.error('Failed to load');
      }
    } finally { setLoading(false); }
  };

  const handlePage = (p) => { setPage(p); load(p); };

  useEffect(() => { load(1); }, []);

  const handleAction = async (v) => {
    try {
      if (v.status === 'active') {
        await visitorAPI.checkIn(v._id);
        playSound('checkin');
        toast.success(`${v.visitorName} checked in`);
      } else if (v.status === 'checked-in') {
        await visitorAPI.checkOut(v._id);
        playSound('click');
        toast.success(`${v.visitorName} checked out`);
      }
      load(page);
    } catch (err) {
      if (!err.response) {
        // Queue for later sync when the connection returns
        const type = v.status === 'active' ? 'checkIn' : 'checkOut';
        enqueueMutation({ type, visitorId: v._id, visitorName: v.visitorName });
        playSound('click');
        toast.success(`${v.visitorName} ${type === 'checkIn' ? 'checked in' : 'checked out'} (queued offline)`, { icon: '📶', duration: 5000 });
        // Optimistic local update
        const now = new Date().toISOString();
        setVisitors((prev) => prev.map((x) =>
          x._id === v._id
            ? { ...x, status: type === 'checkIn' ? 'checked-in' : 'checked-out', ...(type === 'checkIn' ? { entryTime: now } : { exitTime: now }) }
            : x,
        ));
        return;
      }
      playSound('error'); toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visitors.filter((v) => {
      if (NOT_ARRIVED.has(v.status)) return false;
      if (filter !== 'all' && v.status !== filter) return false;
      if (!q) return true;
      const hay = [
        v.visitorName,
        v.visitorCode,
        v.visitorPhone,
        v.purpose,
        v.hostResidentId?.name,
        v.hostUnitId?.unitNumber,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [visitors, search, filter]);

  // Group the filtered list into day buckets (newest day first, newest movement first)
  const groups = useMemo(() => {
    const map = new Map();
    const sorted = [...filtered].sort((a, b) => (activityTime(b) - activityTime(a)) || 0);
    for (const v of sorted) {
      const d = activityTime(v);
      const key = isNaN(d) ? 'unknown' : format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, { key, label: dayLabel(d), items: [] });
      map.get(key).items.push(v);
    }
    return [...map.values()];
  }, [filtered]);

  const stats = useMemo(() => {
    let inside = 0, out = 0, blocked = 0;
    for (const v of visitors) {
      if (v.status === 'checked-in')  inside++;
      if (v.status === 'checked-out') out++;
      if (v.status === 'blacklisted') blocked++;
    }
    return { inside, out, blocked };
  }, [visitors]);

  const arrived = visitors.filter((v) => !NOT_ARRIVED.has(v.status));
  const filterCount = (key) => (key === 'all' ? arrived.length : arrived.filter((v) => v.status === key).length);

  return (
    <div className="space-y-4 lg:space-y-5 animate-fade-in">
      {/* Heading */}
      <div className="flex items-end justify-between gap-3 g-rise">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
            Entry log
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>Visitor movements through the gate, newest first</p>
        </div>
        {!loading && pagination.total > 0 && (
          <span className="g-label hidden sm:inline">{pagination.total} records</span>
        )}
      </div>

      {(!online || fromCache) && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#B45309' }}>
          <WifiOff size={14} className="flex-shrink-0" />
          <span>Offline — showing the last cached snapshot. Actions you take will sync when the connection returns.</span>
        </div>
      )}

      {/* Stat chips */}
      {!loading && visitors.length > 0 && (
        <div className="grid grid-cols-3 gap-2 lg:gap-3 g-rise" style={{ animationDelay: '60ms' }}>
          <StatChip label="Inside"   value={stats.inside}   Icon={LogIn}  tone="emerald" />
          <StatChip label="Exited"   value={stats.out}      Icon={LogOut} tone="slate" />
          <StatChip label="Blocked"  value={stats.blocked}  Icon={Ban}    tone="red" />
        </div>
      )}

      {/* Filter bar */}
      {!loading && visitors.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center g-rise" style={{ animationDelay: '120ms' }}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitor, code, host or unit…"
              className="w-full h-12 pl-10 pr-10 rounded-2xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: '#94A3B8' }}>
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {STATUS_FILTERS.map(({ key, label }) => {
              const active = filter === key;
              const n = filterCount(key);
              return (
                <button key={key}
                  onClick={() => setFilter(key)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 h-10 text-xs font-semibold px-3.5 rounded-xl transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)' : '#FFFFFF',
                    color: active ? '#fff' : '#475569',
                    border: `1px solid ${active ? 'transparent' : '#E2E8F0'}`,
                    boxShadow: active ? '0 4px 12px rgba(59,130,246,0.28)' : 'none',
                  }}>
                  {label}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: active ? 'rgba(255,255,255,0.22)' : '#F1F5F9', color: active ? '#fff' : '#64748B' }}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : visitors.length === 0 ? (
        <EmptyState icon={FileText} title="No visitor records" />
      ) : filtered.length === 0 ? (
        <div className="g-card text-center py-12 px-4">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#F1F5F9' }}>
            <Search size={20} style={{ color: '#94A3B8' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>No visitors match</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Try a different name, code or unit.</p>
          <button onClick={() => { setSearch(''); setFilter('all'); }}
            className="text-xs font-semibold mt-3 h-10 px-4 rounded-xl" style={{ color: '#1D4ED8', background: 'rgba(59,130,246,0.08)' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile / tablet: day-grouped timeline */}
          <div className="lg:hidden space-y-5">
            {groups.map((g, gi) => (
              <section key={g.key} className="g-rise" style={{ animationDelay: `${Math.min(gi, 4) * 60}ms` }}>
                <DayHeader label={g.label} count={g.items.length} />
                <ol className="relative mt-2.5 ml-[19px] pl-6 space-y-2.5" style={{ borderLeft: '2px solid #E2E8F0' }}>
                  {g.items.map((v) => (
                    <TimelineItem key={v._id} v={v} onAction={handleAction} />
                  ))}
                </ol>
              </section>
            ))}
          </div>

          {/* Desktop table, grouped by day */}
          <div className="hidden lg:block g-card overflow-hidden g-rise">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    {['', 'Visitor', 'Host', 'Unit', 'Expected', 'In', 'Out', 'Status', ''].map((h, i) => (
                      <th key={i} className="text-left g-label px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key}>
                    <tr>
                      <td colSpan={9} className="px-4 py-2" style={{ background: '#F4F6F8', borderTop: '1px solid rgba(15,23,42,0.06)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                        <div className="flex items-center gap-2">
                          <CalendarDays size={13} style={{ color: '#1D4ED8' }} />
                          <span className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{g.label}</span>
                          <span className="text-[11px]" style={{ color: '#94A3B8' }}>· {g.items.length} {g.items.length === 1 ? 'visitor' : 'visitors'}</span>
                        </div>
                      </td>
                    </tr>
                    {g.items.map((v, i) => {
                      const cfg = cfgFor(v.status);
                      const entry = safeFormat(v.entryTime, 'HH:mm');
                      const exit = safeFormat(v.exitTime, 'HH:mm');
                      return (
                        <tr key={v._id}
                          className="hover:bg-slate-50 transition-colors"
                          style={{ borderTop: i > 0 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                          <td className="pl-4 py-3 w-12">
                            <DirectionChip status={v.status} size={34} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>{v.visitorName}</div>
                            <div className="font-mono text-[11px] mt-0.5" style={{ color: '#1D4ED8' }}>{v.visitorCode}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px]" style={{ color: '#475569' }}>
                            <div>{v.hostResidentId?.name || '—'}</div>
                            {v.visitorPhone && (
                              <a href={`tel:${v.visitorPhone}`} className="inline-flex items-center gap-1 text-[11px] mt-0.5 hover:underline" style={{ color: '#94A3B8' }}>
                                <Phone size={10} /> {v.visitorPhone}
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: '#0F172A' }}>{v.hostUnitId?.unitNumber || '—'}</td>
                          <td className="px-4 py-3 text-[13px] whitespace-nowrap" style={{ color: '#475569' }}>
                            {safeFormat(v.expectedDate, 'MMM d, p') || '—'}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold tabular-nums" style={{ color: entry ? '#059669' : '#CBD5E1' }}>
                            {entry || '—'}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold tabular-nums" style={{ color: exit ? '#475569' : '#CBD5E1' }}>
                            {exit || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={v.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {['active', 'checked-in'].includes(v.status) && (
                              <ActionButton v={v} onAction={handleAction} compact />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        </>
      )}

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />
    </div>
  );
}

function StatChip({ label, value, Icon, tone }) {
  const tones = {
    amber:   { color: '#B45309', chip: 'linear-gradient(135deg,#F59E0B,#D97706)' },
    emerald: { color: '#047857', chip: 'linear-gradient(135deg,#10B981,#047857)' },
    slate:   { color: '#334155', chip: 'linear-gradient(135deg,#64748B,#334155)' },
    red:     { color: '#B91C1C', chip: 'linear-gradient(135deg,#EF4444,#B91C1C)' },
  }[tone] || {};
  return (
    <div className="g-card px-3 py-3 lg:px-4 lg:py-3.5 flex items-center gap-2.5 lg:gap-3">
      <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 hidden min-[380px]:flex"
        style={{ background: tones.chip }}>
        <Icon size={16} color="#fff" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-none tabular-nums" style={{ color: '#0F172A' }}>{value}</div>
        <div className="text-[11px] font-semibold mt-1" style={{ color: tones.color }}>{label}</div>
      </div>
    </div>
  );
}

function DayHeader({ label, count }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: label === 'Today' ? 'linear-gradient(135deg,#3B82F6,#1D4ED8)' : '#E2E8F0' }}>
        <CalendarDays size={13} color={label === 'Today' ? '#fff' : '#475569'} />
      </div>
      <h2 className="text-[14px] font-semibold" style={{ color: '#0F172A' }}>{label}</h2>
      <span className="text-[11px]" style={{ color: '#94A3B8' }}>{count} {count === 1 ? 'visitor' : 'visitors'}</span>
      <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = cfgFor(status);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function DirectionChip({ status, size = 38 }) {
  const cfg = cfgFor(status);
  const { Icon } = cfg;
  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: cfg.chip, boxShadow: '0 0 0 4px #F4F6F8' }}>
      <Icon size={Math.round(size * 0.45)} color="#fff" />
    </div>
  );
}

function ActionButton({ v, onAction, compact = false }) {
  const isIn = v.status === 'active';
  return (
    <button
      onClick={() => onAction(v)}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all active:scale-[0.98] ${compact ? 'text-xs h-9 px-3' : 'text-sm h-11 px-4'}`}
      style={isIn
        ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', boxShadow: '0 4px 12px -2px rgba(59,130,246,0.40)' }
        : { background: '#fff', color: '#0F172A', border: '1px solid #CBD5E1' }}>
      {isIn ? <><LogIn size={compact ? 13 : 15} /> Check in</> : <><LogOut size={compact ? 13 : 15} /> Check out</>}
    </button>
  );
}

function TimelineItem({ v, onAction }) {
  const canAct = ['active', 'checked-in'].includes(v.status);
  const entry = safeFormat(v.entryTime, 'HH:mm');
  const exit = safeFormat(v.exitTime, 'HH:mm');
  const expected = safeFormat(v.expectedDate, 'MMM d · HH:mm');
  const main = exit || entry || safeFormat(v.expectedDate, 'HH:mm');
  return (
    <li className="relative">
      {/* Direction marker on the rail */}
      <div className="absolute -left-[45px] top-3">
        <DirectionChip status={v.status} size={38} />
      </div>
      <div className="g-card p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[14px] truncate" style={{ color: '#0F172A' }}>{v.visitorName}</span>
              <StatusPill status={v.status} />
            </div>
            <div className="text-[12px] mt-0.5 truncate" style={{ color: '#475569' }}>
              {v.hostResidentId?.name ? <>Visiting <span className="font-semibold" style={{ color: '#0F172A' }}>{v.hostResidentId.name}</span></> : 'No host'}
              {v.hostUnitId?.unitNumber ? <> · Unit {v.hostUnitId.unitNumber}</> : null}
            </div>
          </div>
          {main && (
            <div className="text-right flex-shrink-0">
              <div className="text-[15px] font-semibold tabular-nums leading-none" style={{ color: '#0F172A' }}>{main}</div>
              <div className="text-[10px] mt-1 font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                {exit ? 'Out' : entry ? 'In' : 'Due'}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 text-[11px]" style={{ color: '#94A3B8' }}>
          {v.visitorCode && <span className="font-mono font-semibold" style={{ color: '#1D4ED8' }}>{v.visitorCode}</span>}
          {expected && <span className="inline-flex items-center gap-1"><Clock size={10} />{expected}</span>}
          {entry && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#059669' }}>
              <LogIn size={10} />{entry}
            </span>
          )}
          {exit && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#475569' }}>
              <LogOut size={10} />{exit}
            </span>
          )}
          {v.visitorPhone && (
            <a href={`tel:${v.visitorPhone}`} className="inline-flex items-center gap-1 font-semibold" style={{ color: '#475569' }}>
              <Phone size={10} />{v.visitorPhone}
            </a>
          )}
        </div>

        {canAct && (
          <div className="mt-3">
            <div className="[&>button]:w-full">
              <ActionButton v={v} onAction={onAction} />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

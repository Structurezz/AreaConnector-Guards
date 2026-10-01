import { useEffect, useMemo, useState } from 'react';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { FileText, LogIn, LogOut, Search, Clock, Phone, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import Pagination from '../components/ui/Pagination';
import { useOnline } from '../offline/useOnline';
import { useAuth } from '../context/AuthContext';
import { readVisitorsCache, saveVisitorsCache, enqueueMutation } from '../offline/cache';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { key: 'all',          label: 'All'          },
  { key: 'active',       label: 'Expected'     },
  { key: 'checked-in',   label: 'Inside'       },
  { key: 'checked-out',  label: 'Checked out'  },
  { key: 'blacklisted',  label: 'Blocked'      },
];

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

  const stats = useMemo(() => {
    let inside = 0, out = 0, expected = 0;
    for (const v of visitors) {
      if (v.status === 'checked-in')  inside++;
      if (v.status === 'checked-out') out++;
      if (v.status === 'active')      expected++;
    }
    return { inside, out, expected };
  }, [visitors]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            Entry Log
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Today's visitor movements through the gate</p>
        </div>
      </div>

      {(!online || fromCache) && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#B45309' }}>
          <WifiOff size={14} className="flex-shrink-0" />
          <span>Offline — showing the last cached snapshot. Actions you take will sync when the connection returns.</span>
        </div>
      )}

      {/* Stat chips */}
      {!loading && visitors.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatChip label="Expected" value={stats.expected} tone="slate" />
          <StatChip label="Inside"   value={stats.inside}   tone="emerald" />
          <StatChip label="Exited"   value={stats.out}      tone="blue" />
        </div>
      )}

      {/* Filter bar */}
      {!loading && visitors.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitor, code, host or unit…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'thin' }}>
            {STATUS_FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button key={key}
                  onClick={() => setFilter(key)}
                  className="flex-shrink-0 inline-flex items-center text-xs font-bold px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)' : '#FFFFFF',
                    color: active ? '#fff' : '#475569',
                    border: `1px solid ${active ? 'transparent' : '#E2E8F0'}`,
                    boxShadow: active ? '0 4px 12px rgba(59,130,246,0.30)' : 'none',
                  }}>
                  {label}
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
        <div className="text-center py-12 px-4 glass-card">
          <Search size={24} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
          <p className="text-sm font-semibold" style={{ color: '#334155' }}>No visitors match</p>
          <button onClick={() => { setSearch(''); setFilter('all'); }}
            className="text-xs font-semibold mt-2" style={{ color: '#2563EB' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-2.5">
            {filtered.map((v) => (
              <LogCard key={v._id} v={v} onAction={handleAction} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    {['Visitor', 'Host', 'Unit', 'Expected', 'Entry', 'Exit', 'Status', ''].map((h) => (
                      <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => (
                    <tr key={v._id}
                      className="hover:bg-slate-50 transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-sm">{v.visitorName}</div>
                        <div className="font-mono text-[11px] mt-0.5" style={{ color: '#2563EB' }}>{v.visitorCode}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{v.hostResidentId?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{v.hostUnitId?.unitNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {format(new Date(v.expectedDate), 'MMM d, p')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: v.entryTime ? '#059669' : '#CBD5E1' }}>
                        {v.entryTime ? format(new Date(v.entryTime), 'HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: v.exitTime ? '#2563EB' : '#CBD5E1' }}>
                        {v.exitTime ? format(new Date(v.exitTime), 'HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {['active', 'checked-in'].includes(v.status) && (
                          <button
                            onClick={() => handleAction(v)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                            style={{
                              background: v.status === 'active' ? 'rgba(16,185,129,0.10)' : 'rgba(59,130,246,0.10)',
                              color: v.status === 'active' ? '#059669' : '#1D4ED8',
                            }}
                          >
                            {v.status === 'active' ? <><LogIn size={12} /> Check in</> : <><LogOut size={12} /> Check out</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />
    </div>
  );
}

function StatChip({ label, value, tone }) {
  const tones = {
    slate:   { bg: 'rgba(15,23,42,0.05)',   color: '#0F172A', border: 'rgba(15,23,42,0.08)' },
    emerald: { bg: 'rgba(16,185,129,0.08)', color: '#047857', border: 'rgba(16,185,129,0.20)' },
    blue:    { bg: 'rgba(59,130,246,0.08)', color: '#1D4ED8', border: 'rgba(59,130,246,0.20)' },
  }[tone] || {};
  return (
    <div className="rounded-xl px-3 py-2.5"
      style={{ background: tones.bg, border: `1px solid ${tones.border}` }}>
      <div className="text-xl font-black leading-none" style={{ color: tones.color }}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: tones.color, opacity: 0.75 }}>{label}</div>
    </div>
  );
}

function LogCard({ v, onAction }) {
  const canAct = ['active', 'checked-in'].includes(v.status);
  return (
    <div className="glass-card p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: 'rgba(59,130,246,0.10)', color: '#1D4ED8', border: '1px solid rgba(59,130,246,0.20)' }}>
        {v.visitorName[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>{v.visitorName}</div>
          <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="font-mono text-[11px] font-bold" style={{ color: '#2563EB' }}>{v.visitorCode}</span>
          <span className="text-[11px]" style={{ color: '#94A3B8' }}>·</span>
          <span className="text-[11px] truncate" style={{ color: '#64748B' }}>
            {v.hostResidentId?.name || '—'}{v.hostUnitId?.unitNumber ? ` · Unit ${v.hostUnitId.unitNumber}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2.5 mt-1 text-[10px]" style={{ color: '#94A3B8' }}>
          <span className="inline-flex items-center gap-1">
            <Clock size={9} />{format(new Date(v.expectedDate), 'MMM d · HH:mm')}
          </span>
          {v.entryTime && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#059669' }}>
              <LogIn size={9} />{format(new Date(v.entryTime), 'HH:mm')}
            </span>
          )}
          {v.exitTime && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#1D4ED8' }}>
              <LogOut size={9} />{format(new Date(v.exitTime), 'HH:mm')}
            </span>
          )}
        </div>
      </div>
      {canAct && (
        <button
          onClick={() => onAction(v)}
          className="flex-shrink-0 text-xs font-bold px-2.5 py-2 rounded-lg flex items-center gap-1 transition-all"
          style={{
            background: v.status === 'active' ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            color: '#fff',
            boxShadow: v.status === 'active' ? '0 4px 10px -2px rgba(16,185,129,0.40)' : '0 4px 10px -2px rgba(59,130,246,0.40)',
          }}>
          {v.status === 'active' ? <><LogIn size={12} /> In</> : <><LogOut size={12} /> Out</>}
        </button>
      )}
    </div>
  );
}

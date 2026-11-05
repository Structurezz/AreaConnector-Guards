import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Truck, Car, Plus, LogOut, Search, X, Clock, Package, User, Phone, MapPin, Building2, StickyNote, History,
} from 'lucide-react';
import { gateLogAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useSite } from '../context/SiteContext';
import { playSound } from '../utils/sounds';

const BRAND_GRAD   = 'linear-gradient(135deg,#3B82F6,#1D4ED8)';
const EMERALD_GRAD = 'linear-gradient(135deg,#10B981,#047857)';

const safeDate = (d) => { if (!d) return null; const x = new Date(d); return isNaN(x) ? null : x; };
const fmt = (d, f) => { const x = safeDate(d); return x ? format(x, f) : '—'; };
const duration = (from, to = new Date()) => {
  const a = safeDate(from); if (!a) return '—';
  const mins = Math.max(0, Math.floor(((safeDate(to) || new Date()) - a) / 60000));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const EMPTY = { kind: 'delivery', vehiclePlate: '', driverName: '', driverPhone: '', company: '', goods: '', destination: '', notes: '' };

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block min-w-0">
      <span className="g-label flex items-center gap-1"><Icon size={11} /> {label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
const inputCls = 'w-full h-12 px-3 rounded-xl text-[15px] outline-none transition-all focus:ring-4 focus:ring-blue-500/15';
const inputStyle = { background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A' };

function KindIcon({ kind, size = 18 }) {
  return kind === 'vehicle' ? <Car size={size} /> : <Truck size={size} />;
}

function EntryRow({ e, onOut, busy, now }) {
  const open = !e.timeOut;
  return (
    <div className="flex items-center gap-3 px-3.5 sm:px-4 py-3" style={{ minHeight: 64 }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={e.kind === 'vehicle' ? { background: '#EDE9FE', color: '#6D28D9' } : { background: '#E0F2FE', color: '#0369A1' }}>
        <KindIcon kind={e.kind} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {e.vehiclePlate && (
            <span className="font-mono text-[14px] font-bold tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: '#FEF9C3', color: '#0F172A', border: '1px solid #FDE047' }}>{e.vehiclePlate}</span>
          )}
          <span className="text-[14px] font-semibold truncate" style={{ color: '#0F172A' }}>
            {e.company || e.driverName || (e.kind === 'vehicle' ? 'Vehicle' : 'Delivery')}
          </span>
        </div>
        <div className="text-[12px] truncate mt-0.5" style={{ color: '#64748B' }}>
          {[e.driverName && e.company ? e.driverName : null, e.goods, e.destination && `→ ${e.destination}`].filter(Boolean).join(' · ') || (e.kind === 'vehicle' ? 'Vehicle' : 'Delivery')}
        </div>
        <div className="text-[11.5px] mt-0.5 tabular-nums" style={{ color: '#94A3B8' }}>
          In {fmt(e.timeIn, isToday(safeDate(e.timeIn) || new Date(0)) ? 'HH:mm' : 'MMM d, HH:mm')}
          {e.timeOut ? ` · Out ${fmt(e.timeOut, 'HH:mm')} · ${duration(e.timeIn, e.timeOut)}` : ''}
          {e.loggedBy?.name ? ` · by ${e.loggedBy.name.split(' ')[0]}` : ''}
        </div>
      </div>
      {open ? (
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold tabular-nums"
            style={{ background: '#FEF3C7', color: '#B45309' }}>
            <Clock size={11} /> {duration(e.timeIn, now)}
          </span>
          <button onClick={() => onOut(e)} disabled={busy}
            className="h-10 px-3.5 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
            style={{ background: '#0F172A' }}>
            {busy ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <LogOut size={14} />} Mark out
          </button>
        </div>
      ) : (
        <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold flex-shrink-0" style={{ background: '#F1F5F9', color: '#475569' }}>Left</span>
      )}
    </div>
  );
}

export default function Deliveries() {
  const { terms } = useSite();
  const { subscribe } = useSocket() || {};
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openList, setOpenList] = useState([]);
  const [todayList, setTodayList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(new Date());
  const plateRef = useRef(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    try {
      const [o, t] = await Promise.all([
        gateLogAPI.list({ open: 1, limit: 200 }),
        gateLogAPI.list({ date: format(new Date(), 'yyyy-MM-dd'), limit: 200 }),
      ]);
      setOpenList(o.data?.data || []);
      setTodayList(t.data?.data || []);
    } catch (err) {
      if (err.response?.data?.code !== 'MODULE_OFF') toast.error(err.response?.data?.message || 'Could not load the gate log');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 2 * 60 * 1000); return () => clearInterval(t); }, [load]);

  // Live updates from other guards / the office
  const upsert = useCallback((entry) => {
    if (!entry?._id) return;
    const put = (list) => {
      const i = list.findIndex((x) => x._id === entry._id);
      if (i === -1) return [entry, ...list];
      const next = list.slice(); next[i] = { ...list[i], ...entry }; return next;
    };
    setOpenList((l) => (entry.timeOut ? l.filter((x) => x._id !== entry._id) : put(l)));
    if (isToday(safeDate(entry.timeIn) || new Date(0))) setTodayList(put);
    setResults((r) => (r ? r.map((x) => (x._id === entry._id ? { ...x, ...entry } : x)) : r));
  }, []);
  useEffect(() => {
    if (!subscribe) return;
    return subscribe('gatelog_update', upsert);
  }, [subscribe, upsert]);

  // Server search across all days
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      gateLogAPI.list({ q, limit: 50 }).then(({ data }) => setResults(data?.data || [])).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'vehiclePlate' ? e.target.value.toUpperCase() : e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.vehiclePlate.trim() && !form.driverName.trim() && !form.company.trim()) {
      playSound('error');
      toast.error('Add a plate number, driver or company');
      return;
    }
    setSaving(true);
    try {
      const { data } = await gateLogAPI.create(form);
      upsert(data.data);
      playSound('checkin');
      toast.success(`${form.vehiclePlate || form.company || form.driverName} logged in`);
      setForm((f) => ({ ...EMPTY, kind: f.kind }));
      plateRef.current?.focus();
    } catch (err) {
      playSound('error');
      toast.error(err.response ? (err.response.data?.message || 'Could not log entry') : 'You\'re offline — try again when connected');
    } finally { setSaving(false); }
  };

  const markOut = async (entry) => {
    setBusyId(entry._id);
    try {
      const { data } = await gateLogAPI.markOut(entry._id);
      upsert(data.data || { ...entry, timeOut: new Date().toISOString() });
      playSound('click');
      toast.success(`${entry.vehiclePlate || entry.company || entry.driverName || 'Entry'} marked out`);
    } catch (err) {
      playSound('error');
      if (err.response?.status === 409) { upsert({ ...entry, timeOut: entry.timeOut || new Date().toISOString() }); load(); }
      toast.error(err.response?.data?.message || 'Could not mark out');
    } finally { setBusyId(null); }
  };

  const q = query.trim().toLowerCase();
  const match = (e) => !q || [e.vehiclePlate, e.driverName, e.driverPhone, e.company, e.goods, e.destination, e.notes]
    .some((s) => String(s || '').toLowerCase().includes(q));
  const onSite = useMemo(() => openList.filter(match), [openList, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const history = useMemo(() => todayList.filter((e) => e.timeOut).filter(match), [todayList, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const deliveriesToday = todayList.filter((e) => e.kind !== 'vehicle').length;
  const vehiclesToday = todayList.filter((e) => e.kind === 'vehicle').length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 lg:space-y-5">
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">

        {/* ═════ Log entry ═════ */}
        <form onSubmit={submit} className="g-card overflow-hidden g-rise">
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[20px] lg:text-[22px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>Log entry</h1>
                <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>Deliveries and vehicles coming in</p>
              </div>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <KindIcon kind={form.kind} />
              </span>
            </div>

            {/* Kind toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl" style={{ background: '#F1F5F9' }}>
              {[{ k: 'delivery', label: 'Delivery', Icon: Truck }, { k: 'vehicle', label: 'Vehicle', Icon: Car }].map(({ k, label, Icon }) => {
                const on = form.kind === k;
                return (
                  <button type="button" key={k} onClick={() => setForm((f) => ({ ...f, kind: k }))}
                    className="h-12 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all"
                    style={on ? { background: BRAND_GRAD, color: '#fff', boxShadow: '0 8px 18px -10px rgba(59,130,246,.8)' } : { color: '#64748B' }}>
                    <Icon size={18} /> {label}
                  </button>
                );
              })}
            </div>

            <Field icon={Car} label="Plate number">
              <input ref={plateRef} value={form.vehiclePlate} onChange={set('vehiclePlate')} placeholder="LAG 123 AB"
                autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20}
                className={`${inputCls} h-14 font-mono text-[22px] font-bold tracking-[0.15em] uppercase`} style={inputStyle} />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field icon={User} label="Driver">
                <input value={form.driverName} onChange={set('driverName')} placeholder="Name" className={inputCls} style={inputStyle} />
              </Field>
              <Field icon={Phone} label="Phone">
                <input value={form.driverPhone} onChange={set('driverPhone')} placeholder="080…" type="tel" inputMode="tel" className={inputCls} style={inputStyle} />
              </Field>
              <Field icon={Building2} label="Company">
                <input value={form.company} onChange={set('company')} placeholder="e.g. DHL" className={inputCls} style={inputStyle} />
              </Field>
              <Field icon={Package} label={form.kind === 'vehicle' ? 'Purpose' : 'Goods'}>
                <input value={form.goods} onChange={set('goods')} placeholder={form.kind === 'vehicle' ? 'e.g. Pick-up' : 'e.g. 3 cartons'} className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <Field icon={MapPin} label="Going to">
              <input value={form.destination} onChange={set('destination')} placeholder={`${terms.unit}, person or department`} className={inputCls} style={inputStyle} />
            </Field>
            <Field icon={StickyNote} label="Notes">
              <input value={form.notes} onChange={set('notes')} placeholder="Optional" className={inputCls} style={inputStyle} />
            </Field>

            <button type="submit" disabled={saving}
              className="w-full h-14 rounded-2xl font-semibold text-white text-[16px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{ background: EMERALD_GRAD, boxShadow: '0 12px 26px -10px rgba(16,185,129,0.65)' }}>
              {saving ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Plus size={20} />}
              Log {form.kind === 'vehicle' ? 'vehicle' : 'delivery'} in
            </button>
          </div>
        </form>

        {/* ═════ Lists ═════ */}
        <div className="space-y-4 lg:space-y-5">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'On site now', value: openList.length, color: '#B45309', bg: '#FEF3C7', Icon: Clock },
              { label: 'Deliveries today', value: deliveriesToday, color: '#0369A1', bg: '#E0F2FE', Icon: Truck },
              { label: 'Vehicles today', value: vehiclesToday, color: '#6D28D9', bg: '#EDE9FE', Icon: Car },
            ].map(({ label, value, color, bg, Icon }) => (
              <div key={label} className="g-card p-3.5 g-rise">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg, color }}><Icon size={16} /></span>
                  <span className="text-[22px] font-semibold tabular-nums" style={{ color: '#0F172A' }}>{value}</span>
                </div>
                <div className="text-[12px] mt-2 font-medium" style={{ color: '#475569' }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plate, driver, company, goods…"
              className="w-full h-12 pl-10 pr-10 rounded-2xl text-[14px] outline-none focus:ring-4 focus:ring-blue-500/15"
              style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#0F172A' }} />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: '#94A3B8' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* On site now */}
          <div className="g-card overflow-hidden g-rise">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <h2 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: '#0F172A' }}>
                <span className="w-2 h-2 rounded-full bg-amber-500" /> On site now
              </h2>
              <span className="min-w-[24px] h-6 px-2 rounded-full text-[12px] font-bold flex items-center justify-center tabular-nums" style={{ background: '#FEF3C7', color: '#B45309' }}>{onSite.length}</span>
            </div>
            {loading ? (
              <div className="py-10 flex justify-center"><span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" /></div>
            ) : onSite.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13.5px] font-semibold" style={{ color: '#94A3B8' }}>
                {q ? 'No matches on site' : 'Nothing on site right now'}
              </div>
            ) : (
              <div>
                {onSite.map((e, i) => (
                  <div key={e._id} style={{ borderTop: i ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                    <EntryRow e={e} onOut={markOut} busy={busyId === e._id} now={now} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's history / search results */}
          <div className="g-card overflow-hidden g-rise">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <h2 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: '#0F172A' }}>
                <History size={15} style={{ color: '#64748B' }} /> {results ? 'Search results (all days)' : 'Left today'}
              </h2>
              <span className="text-[12px]" style={{ color: '#94A3B8' }}>{format(now, 'EEE, MMM d')}</span>
            </div>
            {(() => {
              const list = results || history;
              if (list.length === 0) {
                return <div className="px-5 py-8 text-center text-[13.5px] font-semibold" style={{ color: '#94A3B8' }}>{results ? 'No entries found' : 'Nothing has left yet today'}</div>;
              }
              return (
                <div className="max-h-[480px] overflow-y-auto">
                  {list.map((e, i) => (
                    <div key={e._id} style={{ borderTop: i ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                      <EntryRow e={e} onOut={markOut} busy={busyId === e._id} now={now} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

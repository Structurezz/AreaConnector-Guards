import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Search, X, BadgeCheck, Clock, Home, Contact, Briefcase, Phone, BedDouble, UserX, AlertTriangle, GraduationCap, Radio } from 'lucide-react';
import { siteAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { playSound } from '../utils/sounds';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const safeDate = (d) => { if (!d) return null; const x = new Date(d); return isNaN(x) ? null : x; };
const fmt = (d, f) => { const x = safeDate(d); return x ? format(x, f) : '—'; };

function daysLabel(days) {
  if (!days?.length || days.length === 7) return 'every day';
  const s = [...days].sort((a, b) => a - b);
  if (s.join() === '1,2,3,4,5') return 'Mon–Fri';
  if (s.join() === '0,6') return 'weekends';
  return s.map((d) => DAYS[d]).join(', ');
}

// University students have no shift — show them as a verified member, not an alarm
function MemberChip({ label }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: '#EFF6FF', border: '2px solid #93C5FD' }}>
      <div className="text-[17px] font-extrabold tracking-wide flex items-center justify-center gap-2" style={{ color: '#1D4ED8' }}>
        <GraduationCap size={20} /> {label.toUpperCase()} · <span className="font-bold normal-case tracking-normal text-[14px]">verified member</span>
      </div>
    </div>
  );
}

function ShiftChip({ shift }) {
  if (!shift) {
    return (
      <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: '#F1F5F9', border: '2px solid #CBD5E1' }}>
        <div className="text-[16px] font-extrabold tracking-wide" style={{ color: '#475569' }}>NO SHIFT SET</div>
      </div>
    );
  }
  const on = shift.onShift;
  return (
    <div className="rounded-xl px-3 py-2.5 text-center"
      style={on ? { background: 'linear-gradient(135deg,#10B981,#047857)', border: '2px solid #059669' } : { background: '#FFFBEB', border: '2px solid #F59E0B' }}>
      <div className="text-[18px] font-extrabold tracking-wide flex items-center justify-center gap-2" style={{ color: on ? '#fff' : '#B45309' }}>
        {on ? <BadgeCheck size={20} /> : <AlertTriangle size={19} />} {on ? 'ON SHIFT' : 'OFF SHIFT'}
      </div>
      <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: on ? 'rgba(255,255,255,0.9)' : '#92400E' }}>
        Hours {shift.start}–{shift.end} · {daysLabel(shift.days)}
      </div>
    </div>
  );
}

// Who they are on the site: "Doctor · Cardiology", "Nurse", "Supervisor"…
// plus an On call pill. Non-estate sites only.
function RoleChip({ p }) {
  const text = [p.roleLabel, p.specialty].filter(Boolean).join(' · ');
  const staff = !!p.staff;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[14px] font-extrabold"
        style={staff ? { background: '#1E3A8A', color: '#fff', border: '2px solid #1E3A8A' } : { background: '#F1F5F9', color: '#0F172A', border: '2px solid #CBD5E1' }}>
        {staff ? <Briefcase size={15} /> : <Contact size={15} />} {text}
      </span>
      {p.onCall && (
        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-extrabold tracking-wide"
          style={{ background: '#047857', color: '#fff', border: '2px solid #047857' }}>
          <Radio size={14} /> ON CALL
        </span>
      )}
    </div>
  );
}

const STAY = {
  in_house:    { label: 'IN HOUSE',    bg: '#ECFDF5', fg: '#047857', border: '#6EE7B7' },
  upcoming:    { label: 'UPCOMING',    bg: '#EFF6FF', fg: '#1D4ED8', border: '#93C5FD' },
  checked_out: { label: 'CHECKED OUT', bg: '#FEF2F2', fg: '#B91C1C', border: '#F87171' },
};

function StayChip({ stay }) {
  const state = stay.state || stay.status;
  const st = STAY[state] || { label: 'NO STAY', bg: '#F1F5F9', fg: '#475569', border: '#CBD5E1' };
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: st.bg, border: `2px solid ${st.border}` }}>
      <div className="text-[18px] font-extrabold tracking-wide flex items-center justify-center gap-2" style={{ color: st.fg }}>
        <BedDouble size={19} /> {st.label}
      </div>
      <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: st.fg }}>
        {fmt(stay.checkIn, 'EEE d MMM, HH:mm')} → {fmt(stay.checkOut, 'EEE d MMM, HH:mm')}
      </div>
      {state === 'checked_out' && (
        <div className="text-[12px] font-bold mt-1" style={{ color: '#B91C1C' }}>Stay has ended — no longer a guest</div>
      )}
    </div>
  );
}

function PersonCard({ p, terms, university, showRole }) {
  const mp = p.memberProfile || {};
  const initial = (p.name || '?')[0]?.toUpperCase();
  return (
    <div className="g-card overflow-hidden g-rise">
      <div className="p-4 flex items-center gap-4">
        {p.profilePhoto
          ? <img src={p.profilePhoto} alt="" className="w-[72px] h-[72px] rounded-2xl object-cover flex-shrink-0" style={{ border: '2px solid rgba(15,23,42,0.08)' }} />
          : <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-[28px] font-semibold flex-shrink-0" style={{ background: '#F1F5F9', color: '#334155' }}>{initial}</div>}
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold truncate" style={{ color: '#0F172A' }}>{p.name}</div>
          {mp.title && <div className="text-[13.5px] font-medium truncate flex items-center gap-1.5" style={{ color: '#475569' }}><Briefcase size={12} /> {mp.title}</div>}
          {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 mt-0.5 text-[12.5px] hover:text-blue-600" style={{ color: '#64748B' }}><Phone size={12} /> {p.phone}</a>}
        </div>
      </div>
      {showRole && p.roleLabel && <div className="px-4 pb-3 -mt-1"><RoleChip p={p} /></div>}
      {(mp.idNumber || mp.className || p.unit) && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {mp.idNumber && (
            <div className="rounded-xl p-2.5 min-w-0" style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="g-label flex items-center gap-1"><Contact size={11} /> {terms.idLabel || 'ID number'}</div>
              <div className="text-[15px] font-bold font-mono tracking-wide truncate mt-0.5" style={{ color: '#0F172A' }}>{mp.idNumber}</div>
            </div>
          )}
          {mp.className && (
            <div className="rounded-xl p-2.5 min-w-0" style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="g-label flex items-center gap-1"><GraduationCap size={11} /> {terms.classLabel || 'Class'}</div>
              <div className="text-[14px] font-semibold truncate mt-0.5" style={{ color: '#0F172A' }}>{mp.className}</div>
            </div>
          )}
          {p.unit && (
            <div className="rounded-xl p-2.5 min-w-0" style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="g-label flex items-center gap-1"><Home size={11} /> {terms.block ? `${terms.block} · ${terms.unit}` : terms.unit}</div>
              <div className="text-[14px] font-semibold truncate mt-0.5" style={{ color: '#0F172A' }}>{p.unit}</div>
            </div>
          )}
        </div>
      )}
      <div className="px-4 pb-4 space-y-2">
        {p.isActive === false && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl text-[13px] font-bold" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
            <UserX size={16} /> Account deactivated
          </div>
        )}
        {p.stay && <StayChip stay={p.stay} />}
        {p.shift ? <ShiftChip shift={p.shift} />
          : p.stay ? null
          : university ? <MemberChip label={terms.member} />
          : <ShiftChip shift={null} />}
      </div>
    </div>
  );
}

export default function StaffCheck() {
  const { terms, isEstate, type } = useSite();
  const university = type === 'university';
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setError(''); setLoading(false); return; }
    setLoading(true);
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await siteAPI.staffCheck(term);
        if (id !== seq.current) return;
        const list = data?.data || [];
        setResults(list);
        setError('');
        // Nudge the guard when the only match is off shift / checked out
        // (university: only for deactivated accounts — students have no shifts)
        const p0 = list[0];
        if (list.length === 1 && (p0.isActive === false || (!university && (p0.stay?.state === 'checked_out' || p0.shift?.onShift === false)))) playSound('error');
      } catch (err) {
        if (id !== seq.current) return;
        setResults([]);
        setError(err.response ? (err.response.data?.message || 'Search failed') : 'You\'re offline');
      } finally { if (id === seq.current) setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="g-card p-4 sm:p-5 g-rise">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h1 className="text-[20px] lg:text-[22px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>{terms.idCheck || 'Staff check'}</h1>
            <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>
              {university ? 'Check a student or staff member by matric / staff no. or name.' : <>Is this person {isEstate ? 'on shift' : `on shift${terms.member === 'Guest' ? ' or still a guest' : ''}`}?</>} Warning only — nothing is blocked.
            </p>
          </div>
          <span className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Clock size={18} />
          </span>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={university ? 'Matric no., name, phone or email' : `Name, phone, email or ${(terms.idLabel || 'staff ID').toLowerCase()}`}
            autoComplete="off" spellCheck={false}
            className="w-full h-14 pl-11 pr-11 rounded-2xl text-[16px] outline-none focus:ring-4 focus:ring-blue-500/15"
            style={{ background: '#F8FAFC', border: '2px solid #E2E8F0', color: '#0F172A' }} />
          {q && (
            <button onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/60" style={{ color: '#94A3B8' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-8 flex justify-center"><span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" /></div>
      )}
      {!loading && error && (
        <div className="g-card p-4 text-[13.5px] font-semibold" style={{ color: '#B91C1C' }}>{error}</div>
      )}
      {!loading && !error && results && results.length === 0 && (
        <div className="g-card px-5 py-10 text-center">
          <div className="text-[15px] font-bold" style={{ color: '#0F172A' }}>No one found</div>
          <div className="text-[12.5px] mt-1" style={{ color: '#94A3B8' }}>Not registered at this {terms.site.toLowerCase()} — check with {terms.manager.toLowerCase()}</div>
        </div>
      )}
      {!loading && results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((p) => <PersonCard key={p._id} p={p} terms={terms} university={university} showRole={!isEstate} />)}
        </div>
      )}
      {!results && !loading && (
        <div className="text-center text-[12.5px] py-6" style={{ color: '#94A3B8' }}>Type at least 2 characters to search</div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { visitorAPI, estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  QrCode, Search, CheckCircle, XCircle, Camera,
  LogIn, LogOut, AlertTriangle, User,
  Phone, Home, Calendar, Shield, FileText, Clock, Hourglass,
  Wifi, WifiOff, CloudUpload, ShieldCheck, ShieldX, ChevronRight, Users, DoorOpen, X,
  BookOpenCheck, Clock3, MapPin, Navigation,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { CATEGORY_STYLE, localGateInfo } from '../utils/siteTypes';
import { CategoryChip, CATEGORY_ICON } from '../components/ui/CategoryChip';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import { format, isToday } from 'date-fns';
import QrScanner from '../components/QrScanner';
import { GuardMark, useShift } from '../components/layout/Sidebar';
import { useOnline } from '../offline/useOnline';
import {
  findCachedVisitorByCode, saveVisitorsCache, readVisitorsCache,
  readQueue, enqueueMutation,
} from '../offline/cache';
import { drainQueue } from '../offline/queueDrainer';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const EMERALD_GRAD = 'linear-gradient(135deg,#10B981,#047857)'; // status: allowed / check-in
const BRAND_GRAD   = 'linear-gradient(135deg,#3B82F6,#1D4ED8)'; // brand: primary actions

// Extract a 6-char access code from arbitrary scanned text.
// We accept raw codes (ABC123), or any string containing one.
function extractCode(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (/^[A-Z0-9]{3,10}$/.test(s)) return s;
  const match = s.match(/[A-Z0-9]{6}/);
  return match ? match[0] : s.slice(0, 6);
}

const safeDate = (d) => { if (!d) return null; const x = new Date(d); return isNaN(x) ? null : x; };
const fmt = (d, f) => { const x = safeDate(d); return x ? format(x, f) : '—'; };

// Host's unit in the site's words: "Unit 12 · Block A" (estate), "Room 204",
// "Class JSS2", "Ward B", "Department Finance".
function unitLabel(v, terms) {
  const u = v?.hostUnitId;
  if (!u?.unitNumber) return '—';
  const word = terms?.unit || 'Unit';
  let block = u.block || '';
  if (block && terms?.block && !block.toLowerCase().includes(terms.block.toLowerCase())) block = `${block} ${terms.block}`;
  else if (block && word === 'Unit') block = `Block ${block}`;
  return `${word} ${u.unitNumber}${block ? ` · ${block}` : ''}`;
}

// ── Pass category (school pickup, contractor, delivery, patient visit…) ──
// Where the visitor is going (host's hall / building) with a Google Maps link
function PlaceStrip({ place }) {
  if (!place?.name) return null;
  const url = place.directionsUrl
    || (place.lat != null && place.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}` : null);
  return (
    <div className="mb-4 rounded-2xl p-3 flex items-center gap-3" style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
        <MapPin size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="g-label" style={{ color: '#1D4ED8' }}>Going to</div>
        <div className="text-[17px] font-bold truncate" style={{ color: '#0F172A' }}>{place.name}</div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer"
          className="h-11 px-4 rounded-xl flex items-center gap-1.5 text-[13.5px] font-semibold text-white flex-shrink-0 active:scale-[0.97] transition-transform"
          style={{ background: BRAND_GRAD, textDecoration: 'none' }}>
          <Navigation size={15} /> Directions
        </a>
      )}
    </div>
  );
}

function CategoryBanner({ visitor, label }) {
  const cat = visitor?.category;
  if (!cat || cat === 'guest') return null;
  const d = visitor.details || {};
  const st = CATEGORY_STYLE[cat] || { bg: '#F1F5F9', fg: '#475569', border: '#E2E8F0', grad: 'linear-gradient(135deg,#64748B,#334155)' };
  const Icon = CATEGORY_ICON[cat] || FileText;
  let headline = null;
  const rows = [];
  if (cat === 'pickup') {
    headline = d.studentName ? <>Collecting: {d.studentName}{d.studentClass ? <span style={{ opacity: 0.85 }}> ({d.studentClass})</span> : null}</> : 'Collecting: — (no student named)';
  } else if (cat === 'patient_visit') {
    headline = d.patientName ? <>Patient: {d.patientName}</> : 'Patient: —';
    if (d.ward) rows.push(['Ward', d.ward]);
  } else {
    headline = d.company || '—';
    if (d.job) rows.push(['Job', d.job]);
    if (d.goods) rows.push([cat === 'contractor' ? 'Items' : 'Goods', d.goods]);
    if (d.vehiclePlate) rows.push(['Vehicle', d.vehiclePlate, true]);
  }
  return (
    <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: `2px solid ${st.border}` }}>
      <div className="px-3.5 py-2 flex items-center gap-2 text-white" style={{ background: st.grad }}>
        <Icon size={16} />
        <span className="text-[12.5px] font-extrabold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="px-3.5 py-3" style={{ background: st.bg }}>
        <div className={`${cat === 'pickup' ? 'text-[22px]' : 'text-[19px]'} font-bold leading-tight break-words`} style={{ color: '#0F172A' }}>
          {headline}
        </div>
        {rows.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {rows.map(([k, v, mono]) => (
              <div key={k} className="min-w-0">
                <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: st.fg }}>{k} </span>
                <span className={`text-[15px] font-semibold ${mono ? 'font-mono tracking-wider px-1.5 py-0.5 rounded-md bg-white' : ''}`} style={{ color: '#0F172A', border: mono ? `1px solid ${st.border}` : undefined }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeWindow(v) {
  const s = safeDate(v?.expectedDate);
  if (!s) return { main: '—', sub: '' };
  const e = new Date(s.getTime() + (Number(v.expectedDuration) || 720) * 60000);
  const sameDay = s.toDateString() === e.toDateString();
  return {
    main: `${format(s, 'HH:mm')} – ${format(e, sameDay ? 'HH:mm' : 'MMM d, HH:mm')}`,
    sub: isToday(s) ? 'Today' : format(s, 'EEE, MMM d'),
  };
}

// Unused passes stop being valid when their window closes (server/utils/passExpiry).
// Mirrors the server so stale lists and the offline cache never show them as valid.
const passEnd = (v) => {
  const s = safeDate(v?.expectedDate);
  return s ? new Date(s.getTime() + (Number(v.expectedDuration) || 720) * 60000) : null;
};
const isPastExpiry = (v) => ['active', 'pending'].includes(v?.status) && !!passEnd(v) && new Date() > passEnd(v);
const effective = (v) => (v && isPastExpiry(v) ? { ...v, status: 'expired' } : v);

// ── Status pill ──
const PILL = {
  active:        { label: 'Expected',    bg: '#FEF3C7', fg: '#B45309' },
  pending:       { label: 'Pending',     bg: '#FEF3C7', fg: '#B45309' },
  'checked-in':  { label: 'Inside',      bg: '#D1FAE5', fg: '#047857' },
  'checked-out': { label: 'Checked out', bg: '#F1F5F9', fg: '#475569' },
  expired:       { label: 'Expired',     bg: '#FEE2E2', fg: '#B91C1C' },
  cancelled:     { label: 'Cancelled',   bg: '#FEE2E2', fg: '#B91C1C' },
  blacklisted:   { label: 'Blacklisted', bg: '#FEE2E2', fg: '#B91C1C' },
};
function StatusPill({ status }) {
  const p = PILL[status] || { label: status || '—', bg: '#F1F5F9', fg: '#475569' };
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: p.bg, color: p.fg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.fg }} />
      {p.label}
    </span>
  );
}

// ── Count-up number ──
function useCountUp(value, ms = 600) {
  const [n, setN] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(); const a = from.current; const b = value;
    if (a === b) return;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(a + (b - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value, ms]);
  return n;
}

function StatTile({ icon: Icon, label, value, color, bg, delay = 0 }) {
  const n = useCountUp(value);
  return (
    <div className="g-card p-3.5 g-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
          <Icon size={16} />
        </span>
        <span className="text-[22px] font-semibold tabular-nums" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>{n}</span>
      </div>
      <div className="text-[12px] mt-2 font-medium" style={{ color: '#475569' }}>{label}</div>
    </div>
  );
}

// ── Avatar ──
function Avatar({ visitor, size = 40, ring = 'rgba(15,23,42,0.08)' }) {
  const initial = (visitor?.visitorName || '?')[0]?.toUpperCase();
  if (visitor?.visitorPhoto) {
    return <img src={visitor.visitorPhoto} alt="" className="object-cover flex-shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.3, border: `2px solid ${ring}` }} />;
  }
  return (
    <div className="flex items-center justify-center flex-shrink-0 font-semibold"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: '#F1F5F9', color: '#334155',
               border: `2px solid ${ring}`, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}

// ── Verdict banner shared by every result ──
const TONES = {
  allowed: { grad: 'linear-gradient(135deg,#10B981,#047857)', icon: ShieldCheck, border: 'rgba(16,185,129,0.35)', ring: 'rgba(16,185,129,0.35)' },
  inside:  { grad: 'linear-gradient(135deg,#0F766E,#064E3B)', icon: DoorOpen,    border: 'rgba(15,118,110,0.30)', ring: 'rgba(15,118,110,0.30)' },
  done:    { grad: 'linear-gradient(135deg,#64748B,#334155)', icon: CheckCircle, border: 'rgba(100,116,139,0.30)', ring: 'rgba(100,116,139,0.25)' },
  denied:  { grad: 'linear-gradient(135deg,#EF4444,#B91C1C)', icon: ShieldX,     border: 'rgba(239,68,68,0.40)',  ring: 'rgba(239,68,68,0.35)' },
  hold:    { grad: 'linear-gradient(135deg,#F59E0B,#B45309)', icon: Hourglass,   border: 'rgba(245,158,11,0.40)', ring: 'rgba(245,158,11,0.35)' },
};

function Verdict({ tone, title, sub, code, alarm }) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div className="relative overflow-hidden px-5 py-4 sm:py-5 flex items-center gap-4" style={{ background: t.grad }}>
      <span className="absolute -right-10 -top-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.10)' }} />
      <span className={`relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${alarm ? 'g-alarm' : ''}`}
        style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)' }}>
        <Icon size={24} color="#fff" />
      </span>
      <div className="relative flex-1 min-w-0">
        <h2 className="text-[20px] sm:text-[22px] font-bold tracking-wide leading-tight" style={{ color: '#fff' }}>{title}</h2>
        {sub && <div className="text-[12.5px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{sub}</div>}
      </div>
      {code && (
        <span className="relative hidden sm:inline-flex font-mono text-[13px] font-semibold px-2.5 py-1 rounded-lg tracking-[0.2em]"
          style={{ background: 'rgba(0,0,0,0.18)', color: '#fff' }}>{code}</span>
      )}
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-xl p-3 min-w-0"
      style={{ background: accent ? accent.bg : '#F8FAFC', border: `1px solid ${accent ? accent.border : 'rgba(15,23,42,0.06)'}` }}>
      <div className="flex items-center gap-1 g-label" style={accent ? { color: accent.fg } : undefined}>
        <Icon size={11} /> {label}
      </div>
      <div className="text-[14px] font-semibold truncate mt-1" style={{ color: '#0F172A' }}>{value}</div>
      {sub && <div className="text-[11.5px] mt-0.5 truncate" style={{ color: '#94A3B8' }}>{sub}</div>}
    </div>
  );
}

function VisitorResultCard({ visitor: raw, code, gate, problem, onCheckIn, onCheckOut, onReset }) {
  const { terms, categoryLabel, management, type } = useSite();
  const hoursWord = type === 'university' ? 'hostel visiting hours' : 'visiting hours';
  const visitor = effective(raw);
  const [accepted, setAccepted] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const isExpired     = visitor.status === 'expired';
  const isActive      = visitor.status === 'active';
  const isIn          = visitor.status === 'checked-in';
  const isDone        = visitor.status === 'checked-out';
  const isBlacklisted = visitor.status === 'blacklisted';

  let tone = 'hold', title = 'CHECK WITH HOST', sub = `Pass status: ${visitor.status}`;
  if (isActive)      { tone = 'allowed'; title = 'ACCESS ALLOWED';  sub = 'Valid pass — check the visitor in'; }
  if (isIn)          { tone = 'inside';  title = 'ON SITE';         sub = `Checked in at ${fmt(visitor.entryTime, 'HH:mm')} — check out on exit`; }
  if (isDone)        { tone = 'done';    title = 'PASS USED';       sub = 'This visitor has already checked out'; }
  if (isBlacklisted) { tone = 'denied';  title = 'ACCESS DENIED';   sub = 'This visitor is blacklisted'; }
  if (visitor.status === 'cancelled') { tone = 'denied'; title = 'ACCESS DENIED'; sub = 'Pass cancelled by the host'; }
  if (isExpired) {
    const end = passEnd(visitor);
    tone = 'denied'; title = 'PASS EXPIRED';
    sub = end ? `Expired ${isToday(end) ? `today at ${format(end, 'HH:mm')}` : format(end, 'EEE d MMM, HH:mm')} — do not admit` : 'This pass is no longer valid — do not admit';
  }

  const win = timeWindow(visitor);

  // Site rules: contractor induction and hospital visiting hours
  const induction = gate?.induction;
  const needInduction = isActive && !!induction?.required;
  const visiting = gate?.visiting;
  const outside = !!visiting?.outside;
  const needReason = isActive && (outside || !!problem);
  const canCheckIn = !busy && (!needInduction || accepted) && (!needReason || reason.trim().length >= 3);
  if (isActive && (outside || problem)) {
    tone = 'hold';
    title = problem?.code === 'PATIENT_VISITOR_LIMIT' ? 'VISITOR LIMIT REACHED' : `OUTSIDE ${hoursWord.toUpperCase()}`;
    sub = 'Valid pass — entry needs an override reason';
  } else if (needInduction) {
    sub = 'Valid pass — safety induction required first';
  }
  const doCheckIn = async () => {
    if (!canCheckIn) return;
    setBusy(true);
    try {
      await onCheckIn({
        ...(needInduction || induction?.required ? { inductionAccepted: accepted } : {}),
        ...(needReason && reason.trim() ? { overrideReason: reason.trim() } : {}),
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="g-card overflow-hidden g-rise" style={{ borderColor: TONES[tone].border }}>
      <Verdict tone={tone} title={title} sub={sub} code={visitor.visitorCode || code} alarm={tone === 'denied'} />

      <div className="p-4 sm:p-5">
        {/* Identity */}
        <div className="flex items-center gap-4 mb-4">
          <Avatar visitor={visitor} size={72} ring={TONES[tone].ring} />
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-semibold truncate" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
              {visitor.visitorName}
            </div>
            {visitor.visitorPhone && (
              <a href={`tel:${visitor.visitorPhone}`}
                className="inline-flex items-center gap-1.5 text-[13px] mt-0.5 hover:text-blue-600 transition-colors"
                style={{ color: '#475569' }}>
                <Phone size={12} /> {visitor.visitorPhone}
              </a>
            )}
            <div className="mt-1.5"><StatusPill status={visitor.status} /></div>
          </div>
        </div>

        <CategoryBanner visitor={visitor} label={categoryLabel(visitor.category)} />
        <PlaceStrip place={gate?.place} />

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <InfoCell icon={User}     label="Host"        value={visitor.hostResidentId?.name || '—'} />
          <InfoCell icon={Home}     label={terms.unit}  value={unitLabel(visitor, terms)} />
          <InfoCell icon={FileText} label="Purpose"     value={visitor.purpose || '—'} />
          <InfoCell icon={Calendar} label="Time window" value={win.main} sub={win.sub} />
          {visitor.entryTime && (
            <InfoCell icon={LogIn} label="Checked in" value={fmt(visitor.entryTime, 'HH:mm')} sub={fmt(visitor.entryTime, 'MMM d')}
              accent={{ bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.22)', fg: '#059669' }} />
          )}
          {visitor.exitTime && (
            <InfoCell icon={LogOut} label="Checked out" value={fmt(visitor.exitTime, 'HH:mm')} sub={fmt(visitor.exitTime, 'MMM d')}
              accent={{ bg: '#F1F5F9', border: '#E2E8F0', fg: '#475569' }} />
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {isExpired && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl text-[13.5px] font-semibold"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <span>Expired pass — do not admit. Ask the visitor to contact {visitor.hostResidentId?.name || 'their host'} for a new pass.</span>
            </div>
          )}
          {isBlacklisted && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl text-[13.5px] font-semibold"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
              <AlertTriangle size={18} className="flex-shrink-0" /> Do not admit — blacklisted by {management}
            </div>
          )}

          {/* Visiting hours / visitor limit (hospital) */}
          {isActive && (outside || problem) && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #FCA5A5' }}>
              <div className="flex items-start gap-3 p-3.5" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
                <Clock3 size={22} className="flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold uppercase tracking-wide leading-tight">
                    {problem?.code === 'PATIENT_VISITOR_LIMIT' ? 'Visitor limit reached'
                      : `Outside ${hoursWord}${visiting?.start ? ` (${visiting.start}–${visiting.end})` : ''}`}
                  </div>
                  <div className="text-[12.5px] font-medium mt-0.5" style={{ color: '#991B1B' }}>
                    {problem?.message && problem.code !== 'OUTSIDE_VISITING_HOURS' ? `${problem.message} ` : ''}
                    Only admit with a good reason — it is recorded against your name.
                  </div>
                </div>
              </div>
              <div className="p-3" style={{ background: '#FFFBEB', borderTop: '1px solid #FDE68A' }}>
                <label className="g-label" style={{ color: '#92400E' }} htmlFor="override-reason">Override reason (required to admit)</label>
                <input id="override-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
                  placeholder="e.g. Doctor approved · critical patient"
                  className="mt-1 w-full h-12 px-3 rounded-xl text-[15px] outline-none focus:ring-4 focus:ring-amber-500/20"
                  style={{ background: '#fff', border: '2px solid #FCD34D', color: '#0F172A' }} />
              </div>
            </div>
          )}

          {/* Safety induction (contractors / suppliers) */}
          {isActive && induction?.text && (induction.required || accepted) && (
            <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${accepted ? '#6EE7B7' : '#FDBA74'}` }}>
              <div className="px-3.5 py-2 flex items-center gap-2" style={{ background: accepted ? '#ECFDF5' : '#FFF7ED', color: accepted ? '#047857' : '#C2410C' }}>
                <BookOpenCheck size={17} />
                <span className="text-[13px] font-extrabold uppercase tracking-wide">Safety induction</span>
              </div>
              <div className="max-h-48 overflow-y-auto px-3.5 py-3 text-[14px] leading-relaxed whitespace-pre-wrap"
                style={{ background: '#fff', color: '#0F172A', borderTop: '1px solid #FED7AA', borderBottom: '1px solid #FED7AA' }}>
                {induction.text}
              </div>
              <label className="flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none" style={{ background: accepted ? '#ECFDF5' : '#FFF7ED' }}>
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
                  className="w-6 h-6 flex-shrink-0 accent-emerald-600" />
                <span className="text-[14px] font-semibold" style={{ color: '#0F172A' }}>Visitor has read and accepted the safety induction</span>
              </label>
            </div>
          )}
          {!isActive && induction?.acceptedAt && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-[12.5px] font-semibold" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857' }}>
              <BookOpenCheck size={15} /> Safety induction accepted {fmt(induction.acceptedAt, 'MMM d, HH:mm')}
            </div>
          )}

          {isActive && (
            <button onClick={doCheckIn} disabled={!canCheckIn}
              className="w-full h-14 rounded-2xl font-semibold text-white text-[16px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100"
              style={{ background: needReason ? 'linear-gradient(135deg,#F59E0B,#B45309)' : EMERALD_GRAD, boxShadow: '0 12px 26px -10px rgba(16,185,129,0.65)' }}>
              {busy ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <LogIn size={20} />}
              {needReason ? 'Override & check in' : 'Check in visitor'}
            </button>
          )}
          {isActive && !canCheckIn && !busy && (
            <div className="text-center text-[12px] font-semibold -mt-1" style={{ color: '#B45309' }}>
              {needInduction && !accepted ? 'Tick the induction box to continue' : 'Type an override reason to continue'}
            </div>
          )}
          {isIn && (
            <button onClick={onCheckOut}
              className="w-full h-14 rounded-2xl font-semibold text-white text-[16px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              style={{ background: '#0F172A', boxShadow: '0 12px 26px -12px rgba(15,23,42,0.6)' }}>
              <LogOut size={20} /> Check out visitor
            </button>
          )}
          {isDone && (
            <div className="flex items-center justify-center gap-2 h-12 rounded-2xl text-[13.5px]"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
              <CheckCircle size={17} style={{ color: '#10B981' }} />
              Visitor has already checked out
            </div>
          )}
          <button onClick={onReset}
            className="w-full h-12 rounded-2xl text-[14px] font-semibold transition-colors hover:bg-slate-50"
            style={{ background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
            Verify another visitor
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const { site, terms, categoryLabel, management, isEstate } = useSite();
  const [gate, setGate]             = useState(null);   // server gate rules for the scanned pass
  const [problem, setProblem]       = useState(null);   // 409 overridable problem from check-in
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
  const shift = useShift();

  // Visitor list already fetched for the offline cache — also kept here to
  // power today's gate activity (counts + expected / inside lists).
  const [visitors, setVisitors] = useState(() => {
    try { return (estateId && readVisitorsCache(estateId)?.list) || []; } catch { return []; }
  });
  const [listTab, setListTab] = useState('inside');
  const [listQuery, setListQuery] = useState('');
  const verifyRef = useRef(null);

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
        if (!cancelled) {
          saveVisitorsCache(estateId, data?.data || []);
          setVisitors(data?.data || []);
        }
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

  // Re-check expiry every minute so passes flip to Expired as their window closes
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 60000); return () => clearInterval(t); }, []);

  // Today's gate activity, derived from the loaded visitor list
  const today = useMemo(() => {
    const expected = [], inside = [], out = [];
    for (const v of visitors) {
      const exp = safeDate(v.expectedDate);
      if ((v.status === 'active' || v.status === 'pending') && exp && isToday(exp) && !isPastExpiry(v)) expected.push(v);
      else if (v.status === 'checked-in') inside.push(v);
      else if (v.status === 'checked-out' && safeDate(v.exitTime) && isToday(safeDate(v.exitTime))) out.push(v);
    }
    const by = (k, dir = 1) => (a, b) => dir * ((safeDate(a[k])?.getTime() || 0) - (safeDate(b[k])?.getTime() || 0));
    expected.sort(by('expectedDate'));
    inside.sort(by('entryTime', -1));
    out.sort(by('exitTime', -1));
    return { expected, inside, out };
  }, [visitors, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchVisitor = (id, changes) => {
    if (!id) return;
    setVisitors((list) => list.map((v) => (v._id === id ? { ...v, ...changes } : v)));
  };

  const verifyCode = async (raw) => {
    const trimmed = extractCode(raw);
    if (!trimmed) return;
    setCode(trimmed);
    setLoading(true);
    setVisitor(null);
    setState(null);
    setGate(null);
    setProblem(null);
    try {
      const { data } = await visitorAPI.verify(trimmed);
      setVisitor(data.data);
      const g = data.gate && typeof data.gate === 'object' ? data.gate : localGateInfo(data.data, site);
      setGate(g);
      if (isPastExpiry(data.data)) {
        setState('expired'); playSound('expired');
        patchVisitor(data.data?._id, { status: 'expired' });
      } else if (data.state === 'early_arrival') {
        setState('early_arrival');
        toast(`Visitor is ${data.minsEarly} min early — the host has been pinged.`, { icon: '⏳', duration: 5000 });
        playSound('click');
      } else {
        setState('found');
        // Outside visiting hours: warn the guard loudly
        if (g?.visiting?.outside && data.data?.status === 'active') playSound('error');
        else playSound('click');
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) { playSound('error'); setState('not_found'); return; }
      // Expired pass: show who it was for, sound the expired alarm
      if (err.response?.data?.code === 'PASS_EXPIRED') {
        const v = err.response.data.data;
        setVisitor(v ? { ...v, status: 'expired' } : null);
        setState('expired'); playSound('expired');
        if (v?._id) patchVisitor(v._id, { status: 'expired' });
        return;
      }
      if (status === 410 && err.response?.data?.data) { playSound('error'); setVisitor(err.response.data.data); setState('found'); return; }
      if (status === 423 || err.response?.data?.code === 'PASS_AWAITING_APPROVAL') { playSound('error'); setVisitor(err.response?.data?.data); setState('awaiting_approval'); return; }
      if (status === 403) { playSound('error'); setVisitor(err.response?.data?.data); setState('blacklisted'); return; }

      // No status = network error. Fall back to the offline cache so the
      // guard can still verify a visitor they've seen before.
      if (!err.response) {
        const cached = findCachedVisitorByCode(estateId, trimmed);
        if (cached) {
          setVisitor(cached);
          // No server gate info offline — apply the site's rules locally
          let g = {};
          try { g = localGateInfo(cached, site); } catch { g = {}; }
          setGate(g);
          if (isPastExpiry(cached) || cached.status === 'expired') { setState('expired'); playSound('expired'); return; }
          setState(cached.status === 'pending' && cached.awaitingApproval ? 'awaiting_approval' : 'found');
          playSound(g?.visiting?.outside && cached.status === 'active' ? 'error' : 'click');
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

  // Tap a row in today's lists → run the normal verify flow on its code
  const verifyFromList = (v) => {
    if (!v?.visitorCode) return;
    verifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    verifyCode(v.visitorCode);
  };

  const queueOffline = (type, label, body) => {
    const pending = enqueueMutation({ type, visitorId: visitor._id, visitorName: visitor.visitorName, ...(body && Object.keys(body).length ? { body } : {}) });
    setPendingCount(pending);
    playSound('click');
    toast.success(`${visitor.visitorName} ${label} (queued, will sync when back online)`, { icon: '📶', duration: 5000 });
    const now = new Date().toISOString();
    if (type === 'checkIn')  { setVisitor((v) => ({ ...v, status: 'checked-in',  entryTime: now })); patchVisitor(visitor._id, { status: 'checked-in',  entryTime: now }); }
    if (type === 'checkOut') { setVisitor((v) => ({ ...v, status: 'checked-out', exitTime:  now })); patchVisitor(visitor._id, { status: 'checked-out', exitTime:  now }); }
    setSessionLog((prev) => [
      { name: visitor.visitorName, action: type === 'checkIn' ? 'Check In' : 'Check Out', time: new Date(), queued: true },
      ...prev.slice(0, 9),
    ]);
  };

  const handleCheckIn = async (body = {}) => {
    try {
      await visitorAPI.checkIn(visitor._id, body);
      setProblem(null);
      playSound('checkin');
      toast.success(`✅ ${visitor.visitorName} checked in`);
      const now = new Date().toISOString();
      setVisitor((v) => ({ ...v, status: 'checked-in', entryTime: now }));
      patchVisitor(visitor._id, { status: 'checked-in', entryTime: now });
      setSessionLog((prev) => [{ name: visitor.visitorName, action: 'Check In', time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) {
      if (!err.response) { queueOffline('checkIn', 'checked in', body); return; }
      const resp = err.response?.data || {};
      // Contractor / supplier must accept the safety induction first
      if (err.response.status === 428 || resp.code === 'INDUCTION_REQUIRED') {
        playSound('error');
        setGate((g) => ({ ...(g || {}), ...(resp.gate || {}), induction: { required: true, text: resp.gate?.induction?.text || g?.induction?.text || site.inductionText || 'Read the site safety rules to the visitor.', acceptedAt: null } }));
        toast.error(resp.message || 'Safety induction required before entry', { duration: 5000 });
        return;
      }
      // Hospital: outside visiting hours / patient visitor limit — guard may override with a reason
      if (resp.overridable || resp.code === 'OUTSIDE_VISITING_HOURS' || resp.code === 'PATIENT_VISITOR_LIMIT') {
        playSound('error');
        if (resp.gate) setGate((g) => ({ ...(g || {}), ...resp.gate }));
        setProblem({ code: resp.code, message: resp.message });
        toast.error(`${resp.message || 'Entry needs an override'} Enter a reason to admit.`, { duration: 6000 });
        return;
      }
      if (resp.code === 'PASS_EXPIRED') {
        playSound('expired'); setState('expired');
        setVisitor((v) => ({ ...v, status: 'expired' })); patchVisitor(visitor._id, { status: 'expired' });
        return;
      }
      playSound('error'); toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await visitorAPI.checkOut(visitor._id);
      playSound('click');
      toast.success(`${visitor.visitorName} checked out`);
      const now = new Date().toISOString();
      setVisitor((v) => ({ ...v, status: 'checked-out', exitTime: now }));
      patchVisitor(visitor._id, { status: 'checked-out', exitTime: now });
      setSessionLog((prev) => [{ name: visitor.visitorName, action: 'Check Out', time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) {
      if (!err.response) { queueOffline('checkOut', 'checked out'); return; }
      playSound('error'); toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const reset = () => { setCode(''); setVisitor(null); setState(null); setGate(null); setProblem(null); };

  const inputBorder =
    state === 'not_found' || state === 'blacklisted' || state === 'expired' ? '#F87171'
      : state === 'found' ? '#34D399'
      : state === 'early_arrival' || state === 'awaiting_approval' ? '#FBBF24'
      : '#E2E8F0';

  const LISTS = [
    { key: 'inside',   label: 'Inside',   items: today.inside },
    { key: 'out',      label: 'Left today', items: today.out },
  ];
  const activeList = LISTS.find((l) => l.key === listTab) || LISTS[0];
  const q = listQuery.trim().toLowerCase();
  const filtered = q
    ? activeList.items.filter((v) =>
        [v.visitorName, v.visitorCode, v.hostResidentId?.name, v.hostUnitId?.unitNumber, v.purpose,
          categoryLabel(v.category), v.details?.company, v.details?.studentName, v.details?.patientName, v.details?.vehiclePlate]
          .some((s) => String(s || '').toLowerCase().includes(q)))
    : activeList.items;

  return (
    <div className="max-w-6xl mx-auto space-y-4 lg:space-y-5">

      {/* ── Shift strip ── */}
      <div className="g-card px-3.5 py-2.5 flex items-center gap-3 g-rise">
        <GuardMark size={34} />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold truncate" style={{ color: '#0F172A' }}>
            On duty · {firstName}
          </div>
          <div className="text-[11.5px] truncate" style={{ color: '#94A3B8' }}>
            Shift {shift.label} · since {format(shift.start, 'HH:mm')}
            {sessionLog.length > 0 && <span className="hidden sm:inline"> · {stats.ins} in, {stats.outs} out</span>}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold"
          style={online
            ? { background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }
            : { background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'Online' : 'Offline'}
        </span>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold"
            style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            <CloudUpload size={12} /> {pendingCount}<span className="hidden sm:inline"> pending</span>
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">

        {/* ═════════ Left: verify + result ═════════ */}
        <div className="space-y-4 lg:space-y-5" ref={verifyRef} style={{ scrollMarginTop: 80 }}>

          {/* ── Verify a visitor (hero) ── */}
          <div className="g-card overflow-hidden g-rise" style={{ animationDelay: '40ms' }}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h1 className="text-[20px] lg:text-[22px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Verify a visitor
                  </h1>
                  <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>Scan their QR pass or type the 6-character code</p>
                </div>
                <span className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <Shield size={18} />
                </span>
              </div>

              {/* Scan button */}
              <button
                onClick={() => setShowScanner(true)}
                className="relative w-full overflow-hidden rounded-2xl px-4 sm:px-5 h-[76px] sm:h-[84px] flex items-center gap-4 text-left text-white transition-transform active:scale-[0.985]"
                style={{ background: BRAND_GRAD, boxShadow: '0 16px 32px -14px rgba(59,130,246,0.7)' }}>
                <span className="absolute -right-8 -top-10 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.10)' }} />
                <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>
                  <QrCode size={26} />
                </span>
                <span className="relative flex-1 min-w-0">
                  <span className="block text-[17px] font-semibold">Scan visitor pass</span>
                  <span className="block text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>Opens the camera · fastest way to verify</span>
                </span>
                <Camera size={20} className="relative" style={{ color: 'rgba(255,255,255,0.85)' }} />
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
                <span className="g-label">or type the code</span>
                <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
              </div>

              {/* Manual input */}
              <form onSubmit={handleVerifySubmit} className="space-y-3">
                <div className="relative">
                  <input
                    className="w-full h-16 sm:h-[72px] px-4 rounded-2xl text-center font-mono text-[28px] sm:text-[32px] font-semibold tracking-[0.45em] uppercase outline-none transition-all focus:ring-4 focus:ring-blue-500/15"
                    style={{
                      background: '#F8FAFC',
                      border: `2px solid ${inputBorder}`,
                      color: '#0F172A',
                      paddingLeft: 'calc(1rem + 0.45em)',
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
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={loading}
                  />
                  {code && !loading && (
                    <button type="button" onClick={reset} aria-label="Clear code"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/60"
                      style={{ color: '#94A3B8' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Code progress */}
                <div className="flex justify-center gap-1.5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i}
                      className="w-6 h-1.5 rounded-full transition-all"
                      style={{ background: i < code.length ? '#3B82F6' : '#E2E8F0' }} />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.trim().length < 3}
                  className="w-full h-12 rounded-2xl font-semibold text-[14.5px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.99]"
                  style={{ background: '#0F172A', color: '#fff' }}>
                  {loading
                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <Search size={16} />}
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>
              </form>
            </div>
          </div>

          {/* ── NOT FOUND ── */}
          {state === 'not_found' && (
            <div className="g-card overflow-hidden g-rise" style={{ borderColor: TONES.denied.border }}>
              <Verdict tone="denied" title="ACCESS DENIED" sub="Invalid access code" code={code} alarm />
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <XCircle size={20} style={{ color: '#DC2626' }} className="flex-shrink-0" />
                  <div className="text-[13.5px]" style={{ color: '#475569' }}>
                    No visitor pass found for <span className="font-mono font-semibold tracking-wider" style={{ color: '#0F172A' }}>{code}</span>.
                    Ask the visitor to show their pass again or contact the host.
                  </div>
                </div>
                <button onClick={reset}
                  className="w-full h-12 rounded-2xl text-[14px] font-semibold hover:bg-slate-50"
                  style={{ background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* ── BLACKLISTED ── */}
          {state === 'blacklisted' && (
            <div className="g-card overflow-hidden g-rise" style={{ borderColor: TONES.denied.border }}>
              <Verdict tone="denied" title="ACCESS DENIED" sub="Visitor is blacklisted" code={code} alarm />
              <div className="p-4 sm:p-5 space-y-3">
                {visitor && (
                  <div className="flex items-center gap-4">
                    <Avatar visitor={visitor} size={64} ring={TONES.denied.ring} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[17px] font-semibold truncate" style={{ color: '#0F172A' }}>{visitor?.visitorName}</div>
                      <div className="text-[13px] truncate" style={{ color: '#475569' }}>{visitor?.purpose}</div>
                      <div className="mt-1.5"><StatusPill status="blacklisted" /></div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3.5 rounded-xl text-[13.5px] font-semibold"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  This visitor has been blacklisted by {management}.
                </div>
                <button onClick={reset}
                  className="w-full h-12 rounded-2xl text-[14px] font-semibold hover:bg-slate-50"
                  style={{ background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── AWAITING ESTATE APPROVAL — guards are deliberately not told why ── */}
          {state === 'awaiting_approval' && (
            <div className="g-card overflow-hidden g-rise" style={{ borderColor: TONES.hold.border }}>
              <Verdict tone="hold" title="HOLD — NOT YET APPROVED" sub={`Pass is awaiting ${management} approval`} code={visitor?.visitorCode || code} />
              <div className="p-4 sm:p-5 space-y-3">
                {visitor && (
                  <div className="flex items-center gap-4">
                    <Avatar visitor={visitor} size={64} ring={TONES.hold.ring} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[17px] font-semibold truncate" style={{ color: '#0F172A' }}>{visitor.visitorName}</div>
                      <div className="text-[13px] truncate" style={{ color: '#475569' }}>{visitor.purpose}{visitor.hostResidentId?.name ? ` · for ${visitor.hostResidentId.name}` : ''}</div>
                    </div>
                  </div>
                )}
                <div className="p-3.5 rounded-xl text-[13.5px] font-medium" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                  Please ask the visitor to wait and contact the {isEstate ? 'estate ' : ''}office. Entry is allowed once management approves the pass.
                  Medical and emergency visitors should always be let in.
                </div>
                <button onClick={reset}
                  className="w-full h-12 rounded-2xl text-[14px] font-semibold hover:bg-slate-50"
                  style={{ background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── EARLY ARRIVAL — waiting for host ── */}
          {state === 'early_arrival' && visitor && (
            <div className="g-card overflow-hidden g-rise" style={{ borderColor: TONES.hold.border }}>
              <Verdict tone="hold" title="HOLD — EARLY ARRIVAL" sub="Waiting for the host to approve" code={visitor.visitorCode || code} />
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-4">
                  <Avatar visitor={visitor} size={64} ring={TONES.hold.ring} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-semibold truncate" style={{ color: '#0F172A' }}>{visitor.visitorName}</div>
                    <div className="text-[13px] truncate" style={{ color: '#475569' }}>
                      Expected {fmt(visitor.expectedDate, 'h:mm a')} · {visitor.purpose}
                    </div>
                  </div>
                </div>

                <CategoryBanner visitor={visitor} label={categoryLabel(visitor.category)} />
                <PlaceStrip place={gate?.place} />

                {/* Host info */}
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-semibold flex-shrink-0"
                    style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                    {(visitor.hostResidentId?.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="g-label">Pinged host</div>
                    <div className="text-[14px] font-semibold truncate" style={{ color: '#0F172A' }}>
                      {visitor.hostResidentId?.name || 'Host'}
                      {visitor.hostUnitId?.unitNumber ? ` · ${terms.unit} ${visitor.hostUnitId.unitNumber}` : ''}
                    </div>
                  </div>
                  {visitor.hostResidentId?.phone && (
                    <a href={`tel:${visitor.hostResidentId.phone}`}
                      className="h-11 px-4 rounded-xl flex items-center gap-1.5 text-[13px] font-semibold text-white"
                      style={{ background: BRAND_GRAD, textDecoration: 'none' }}>
                      <Phone size={14} /> Call
                    </a>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl text-[12.5px]" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                  <Hourglass size={14} className="flex-shrink-0 mt-0.5 animate-pulse" />
                  <span className="font-medium">Awaiting approval. This screen will auto-advance when the {isEstate ? 'resident' : 'host'} taps Allow.</span>
                </div>

                <button onClick={reset}
                  className="w-full h-12 rounded-2xl text-[14px] font-semibold hover:bg-slate-50"
                  style={{ background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── FOUND ── */}
          {(state === 'found' || state === 'expired') && visitor && (
            <VisitorResultCard key={visitor._id || code} visitor={state === 'expired' ? { ...visitor, status: 'expired' } : visitor} code={code}
              gate={state === 'expired' ? null : gate} problem={problem}
              onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onReset={reset} />
          )}
          {state === 'expired' && !visitor && (
            <div className="g-card overflow-hidden g-rise" style={{ borderColor: '#FCA5A5' }}>
              <Verdict tone="denied" title="PASS EXPIRED" sub="This pass is no longer valid — do not admit" code={code} alarm />
              <div className="p-4 sm:p-5">
                <button onClick={reset} className="w-full h-12 rounded-2xl text-[14px] font-semibold hover:bg-slate-50"
                  style={{ background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }}>Verify another visitor</button>
              </div>
            </div>
          )}
        </div>

        {/* ═════════ Right: today's gate activity ═════════ */}
        <div className="space-y-4 lg:space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Today at the gate</h2>
              <span className="text-[12px]" style={{ color: '#94A3B8' }}>{format(shift.now, 'EEE, MMM d')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile icon={Users}  label="Inside now"        value={today.inside.length}   color="#047857" bg="#D1FAE5" delay={100} />
              <StatTile icon={LogOut} label="Checked out today" value={today.out.length}      color="#475569" bg="#F1F5F9" delay={140} />
              <StatTile icon={LogIn}  label="Your check-ins this shift" value={stats.ins}     color="#1D4ED8" bg="#DBEAFE" delay={180} />
            </div>
          </div>

          {/* ── Inside / left-today lists (guards never see who is expected) ── */}
          <div className="g-card overflow-hidden g-rise" style={{ animationDelay: '200ms' }}>
            <div className="p-3 sm:p-3.5 space-y-2.5" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: '#F1F5F9' }}>
                {LISTS.map((l) => {
                  const on = l.key === listTab;
                  return (
                    <button key={l.key} onClick={() => setListTab(l.key)}
                      className="h-9 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                      style={on ? { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(15,23,42,0.12)' } : { color: '#64748B' }}>
                      {l.label}
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center tabular-nums"
                        style={on ? { background: '#3B82F6', color: '#fff' } : { background: '#E2E8F0', color: '#475569' }}>
                        {l.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
              {activeList.items.length > 4 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input value={listQuery} onChange={(e) => setListQuery(e.target.value)}
                    placeholder={`Filter by name, code, host or ${terms.unit.toLowerCase()}`}
                    className="w-full h-10 pl-9 pr-3 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-2.5" style={{ background: '#F1F5F9', color: '#94A3B8' }}>
                  {listTab === 'inside' ? <Users size={20} /> : listTab === 'out' ? <LogOut size={20} /> : <Calendar size={20} />}
                </div>
                <div className="text-[13.5px] font-semibold" style={{ color: '#0F172A' }}>
                  {q ? 'No matches' : listTab === 'inside' ? 'Nobody checked in right now' : listTab === 'out' ? 'No check-outs yet today' : 'No more visitors expected today'}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: '#94A3B8' }}>
                  {q ? 'Try a different name or code' : 'Lists refresh every 2 minutes'}
                </div>
              </div>
            ) : (
              <div className="max-h-[440px] overflow-y-auto">
                {filtered.map((v, i) => {
                  const t = listTab === 'expected' ? v.expectedDate : listTab === 'inside' ? v.entryTime : v.exitTime;
                  return (
                    <button key={v._id || i} onClick={() => verifyFromList(v)}
                      className="w-full flex items-center gap-3 px-3.5 sm:px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                      style={{ borderTop: i > 0 ? '1px solid rgba(15,23,42,0.05)' : 'none', minHeight: 60 }}>
                      <Avatar visitor={v} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[14px] font-semibold truncate" style={{ color: '#0F172A' }}>{v.visitorName}</span>
                          <CategoryChip category={v.category} label={categoryLabel(v.category)} />
                        </div>
                        <div className="text-[12px] truncate" style={{ color: '#94A3B8' }}>
                          {v.category === 'pickup' && v.details?.studentName ? `Collecting ${v.details.studentName} · `
                            : v.category === 'patient_visit' && v.details?.patientName ? `Patient ${v.details.patientName} · `
                            : ['contractor', 'supplier', 'delivery'].includes(v.category) && v.details?.company ? `${v.details.company} · ` : ''}
                          {v.hostResidentId?.name || 'Host'}{v.hostUnitId?.unitNumber ? ` · ${terms.unit} ${v.hostUnitId.unitNumber}` : ''}
                          {v.visitorCode && <span className="font-mono tracking-wider"> · {v.visitorCode}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#475569' }}>{fmt(t, 'HH:mm')}</span>
                        <StatusPill status={effective(v).status} />
                      </div>
                      <ChevronRight size={16} className="flex-shrink-0 hidden sm:block" style={{ color: '#CBD5E1' }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Session log ── */}
          {sessionLog.length > 0 && (
            <div className="g-card overflow-hidden g-rise">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: '#0F172A' }}>
                  <Shield size={14} style={{ color: '#3B82F6' }} /> This session
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full" style={{ background: '#D1FAE5', color: '#047857' }}>
                    <LogIn size={11} /> {stats.ins}
                  </span>
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                    <LogOut size={11} /> {stats.outs}
                  </span>
                </div>
              </div>
              <div>
                {sessionLog.map((log, i) => {
                  const isInLog = log.action === 'Check In';
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderTop: i > 0 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={isInLog ? { background: '#D1FAE5', color: '#047857' } : { background: '#F1F5F9', color: '#475569' }}>
                        {isInLog ? <LogIn size={13} /> : <LogOut size={13} />}
                      </span>
                      <span className="flex-1 truncate text-[13.5px] font-medium" style={{ color: '#0F172A' }}>{log.name}</span>
                      {log.queued && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 h-5 rounded-md" style={{ background: '#FEF3C7', color: '#B45309' }}>
                          <CloudUpload size={10} /> queued
                        </span>
                      )}
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isInLog ? '#059669' : '#64748B' }}>
                        {log.action}
                      </span>
                      <span className="text-[11.5px] tabular-nums" style={{ color: '#94A3B8' }}>{format(new Date(log.time), 'HH:mm')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Constitution reference ── */}
          {constitution?.hasConstitution && (
            <a
              href={`${API_BASE}${estateAPI.constitutionFileUrl(estateId)}`}
              target="_blank"
              rel="noreferrer"
              className="g-card flex items-center gap-3 px-4 py-3 no-underline hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: '#F1F5F9', color: '#475569' }}>
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold" style={{ color: '#0F172A' }}>{isEstate ? 'Estate constitution' : `${terms.site} rules`}</div>
                <div className="text-[12px]" style={{ color: '#94A3B8' }}>
                  {constitution.pageCount ? `${constitution.pageCount} pages · ` : ''}Reference for gate policy
                </div>
              </div>
              <span className="text-[12.5px] font-semibold flex items-center gap-0.5" style={{ color: '#2563EB' }}>
                View <ChevronRight size={14} />
              </span>
            </a>
          )}
        </div>
      </div>

      {/* ── Scanner modal ── */}
      <QrScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onResult={handleScanResult}
      />
    </div>
  );
}

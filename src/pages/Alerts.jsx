import { useEffect, useMemo, useState } from 'react';
import { alertAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import {
  ShieldAlert, Flame, HeartPulse, Volume2, CircleHelp, Megaphone, Check, CheckCircle2, Phone, MapPin, Home, Clock,
  ChevronLeft, ChevronRight, X, Users, Briefcase, UserCog, Shield, AlertTriangle, AlertOctagon, Info, Send, Radio,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../utils/sounds';
import Pagination from '../components/ui/Pagination';
import Portal from '../components/ui/Portal';
import { upsertAlert } from '../utils/alertEvents';
import CallButton from '../components/calls/CallButton';

const PAGE_SIZE = 15;

// Plain words + one big picture for every kind of alert
const KIND = {
  security: { word: 'Security danger', ask: 'Thief, intruder or suspicious person', Icon: ShieldAlert, color: '#DC2626', soft: '#FEF2F2' },
  fire:     { word: 'Fire',            ask: 'Fire or smoke',                        Icon: Flame,       color: '#EA580C', soft: '#FFF7ED' },
  medical:  { word: 'Someone is hurt', ask: 'Sick, injured or needs a doctor',      Icon: HeartPulse,  color: '#DB2777', soft: '#FDF2F8' },
  noise:    { word: 'Noise or fight',  ask: 'Loud noise, quarrel or disturbance',   Icon: Volume2,     color: '#7C3AED', soft: '#F5F3FF' },
  other:    { word: 'Something else',  ask: 'Any other problem',                    Icon: CircleHelp,  color: '#475569', soft: '#F1F5F9' },
};
const LEVEL = [
  { v: 'critical', word: 'Very dangerous', sub: 'Everyone must act now', Icon: AlertOctagon, color: '#DC2626' },
  { v: 'high',     word: 'Serious',        sub: 'People should be careful', Icon: AlertTriangle, color: '#EA580C' },
  { v: 'medium',   word: 'Just so you know', sub: 'Not dangerous right now', Icon: Info, color: '#2563EB' },
];
const WHO = [
  { v: 'all',            word: 'Everyone in the estate', sub: 'All residents, manager and guards', Icon: Users },
  { v: 'staff',          word: 'Manager and guards',     sub: 'Not residents',                     Icon: Briefcase },
  { v: 'estate_manager', word: 'Only the manager',       sub: 'Estate manager',                    Icon: UserCog },
  { v: 'security',       word: 'Only the guards',        sub: 'Security team',                     Icon: Shield },
];
const WHO_SHORT = { all: 'everyone in the estate', staff: 'the manager and guards', estate_manager: 'the estate manager', security: 'the guards' };
const PLACES = ['Main gate', 'Back gate', 'Car park', 'Fence', 'Playground', 'Street'];
const DO_THIS = ['Stay indoors', 'Lock your doors', 'Avoid the area', 'Come out now', 'Call the gate'];
const ago = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '');
const ROLE_WORD = { security: 'Guard', resident: 'Resident', estate_manager: 'Estate manager', super_admin: 'AreaConnect' };

/* ── One alert: what, who, where — then Respond → Resolve ─────────── */
function AlertCard({ a, onAck, onResolve, busy }) {
  const k = KIND[a.type] || KIND.other;
  const open = a.status === 'open';
  const done1 = !open;
  const who = a.residentId?.name || 'Someone';
  const role = ROLE_WORD[a.raisedByRole || a.residentId?.role] || 'Resident';
  const house = a.unitId ? `${a.unitId.block ? `Block ${a.unitId.block} · ` : ''}Unit ${a.unitId.unitNumber}` : null;
  const phone = a.residentId?.phone || a.contactNumber;
  const urgent = open && (a.severity === 'critical' || a.severity === 'high');
  const lvl = LEVEL.find((l) => l.v === a.severity);

  return (
    <div className="g-card overflow-hidden g-rise relative">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: open ? k.color : a.isEmergencyBroadcast ? '#2563EB' : '#F59E0B' }} />
      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className={`relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? 'g-alarm' : ''}`} style={{ background: k.soft, color: k.color }}>
            <k.Icon size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[16px] font-semibold text-slate-900">{a.isEmergencyBroadcast ? 'Estate broadcast' : k.word}</p>
              {open && !a.isEmergencyBroadcast && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Needs response</span>}
              {!open && !a.isEmergencyBroadcast && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Guard on the way</span>}
              {lvl && a.severity !== 'medium' && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${lvl.color}12`, color: lvl.color }}>{lvl.word}</span>}
            </div>
            <p className="text-[12.5px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock size={12} />{ago(a.createdAt)}</p>
          </div>
        </div>

        {(a.title || a.note) && (
          <div className="mt-3">
            {a.title && <p className="text-[14.5px] font-semibold text-slate-900">{a.title}</p>}
            {a.note && <p className="text-[14px] text-slate-600 leading-relaxed mt-0.5">{a.note}</p>}
          </div>
        )}

        {/* Facts */}
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
            {a.residentId?.profilePhoto
              ? <img src={a.residentId.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <span className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 text-[13px] font-semibold flex items-center justify-center">{who[0]?.toUpperCase()}</span>}
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] text-slate-500">{a.isEmergencyBroadcast ? 'Sent by' : 'Raised by'} · {role}</p>
              <p className="text-[14px] font-semibold text-slate-900 truncate">{who}</p>
            </div>
          </div>
          {house && (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500"><Home size={15} /></span>
              <div className="leading-tight"><p className="text-[11px] text-slate-500">House</p><p className="text-[14px] font-semibold text-slate-900">{house}</p></div>
            </div>
          )}
          {a.location && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50/70 px-3 py-2.5">
              <span className="w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center text-red-500"><MapPin size={15} /></span>
              <div className="leading-tight"><p className="text-[11px] text-red-700/70">Location</p><p className="text-[14px] font-semibold text-slate-900">{a.location}</p></div>
            </div>
          )}
          {a.actionRequired && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-50/70 px-3 py-2.5">
              <span className="w-8 h-8 rounded-lg bg-white border border-amber-100 flex items-center justify-center text-amber-600"><AlertTriangle size={15} /></span>
              <div className="leading-tight"><p className="text-[11px] text-amber-700/80">People should</p><p className="text-[14px] font-semibold text-slate-900">{a.actionRequired}</p></div>
            </div>
          )}
        </div>

        {/* Steps */}
        {a.isEmergencyBroadcast ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => onResolve(a._id)} className="flex-1 min-w-[180px] h-12 rounded-xl text-[14.5px] font-semibold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-60">
              <CheckCircle2 size={17} /> Mark as over
            </button>
            {phone && <a href={`tel:${phone}`} className="h-12 px-4 rounded-xl border border-slate-200 flex items-center gap-2 text-[14px] font-semibold text-slate-800 hover:bg-slate-50" style={{ textDecoration: 'none' }}><Phone size={16} className="text-blue-600" /> Call</a>}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 p-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button disabled={busy || done1} onClick={() => onAck(a._id)}
                className={`h-12 rounded-xl text-[14.5px] font-semibold flex items-center justify-center gap-2 transition-colors ${done1 ? 'bg-emerald-50 text-emerald-700' : 'text-white bg-red-600 hover:bg-red-700'}`}>
                <span className={`w-6 h-6 rounded-full text-[12px] font-bold flex items-center justify-center ${done1 ? 'bg-emerald-500 text-white' : 'bg-white/20'}`}>{done1 ? <Check size={14} /> : '1'}</span>
                {done1 ? 'Responding' : 'Respond'}
              </button>
              <button disabled={busy || !done1} onClick={() => onResolve(a._id)}
                className={`h-12 rounded-xl text-[14.5px] font-semibold flex items-center justify-center gap-2 transition-colors ${done1 ? 'text-white bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full text-[12px] font-bold flex items-center justify-center ${done1 ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>2</span>
                Resolve
              </button>
            </div>
            <p className="px-2 pt-1.5 pb-0.5 text-[11.5px] text-slate-500 text-center">{done1 ? 'Mark resolved once it is safe.' : `Respond lets ${who.split(' ')[0]} know help is coming.`}</p>
          </div>
        )}
        {!a.isEmergencyBroadcast && (phone || a.residentId?._id) && (
          <div className="mt-2 flex gap-2">
            {phone && <a href={`tel:${phone}`} className="flex-1 h-11 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-50" style={{ textDecoration: 'none' }}><Phone size={15} className="text-blue-600" /> Call phone</a>}
            {a.residentId?._id && <CallButton person={a.residentId} className="flex-1 !h-11 !rounded-xl !text-[13.5px] justify-center" style={{ border: '1px solid #DBEAFE', background: '#EFF6FF', color: '#1D4ED8' }} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Send an alert: one simple question per step ───────────────────── */
function BigChoice({ on, onClick, Icon, color = '#2563EB', word, sub }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${on ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'}`}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, color }}><Icon size={19} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-semibold text-slate-900">{word}</span>
        {sub && <span className="block text-[12.5px] text-slate-500">{sub}</span>}
      </span>
      {on ? <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center"><Check size={12} /></span> : <ChevronRight size={16} className="text-slate-300" />}
    </button>
  );
}

function Chips({ items, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <button key={t} type="button" onClick={() => onPick(value === t ? '' : t)}
          className={`h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors ${value === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>{t}</button>
      ))}
    </div>
  );
}

function SendAlertWizard({ onClose }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ title: '', note: '', type: '', severity: '', location: '', actionRequired: '', contactNumber: user?.phone || '', audience: '' });
  const [sending, setSending] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pick = (k, v) => { set(k, v); setTimeout(() => setStep((s) => s + 1), 180); };
  const k = KIND[form.type] || KIND.other;
  const lvl = LEVEL.find((l) => l.v === form.severity);
  const STEPS = ['What is happening?', 'How serious is it?', 'Who should we tell?', 'Where, and what should people do?', 'Check and send'];

  const send = async () => {
    setSending(true);
    try {
      const payload = { ...form, title: form.title.trim() || k.word, note: form.note.trim() || [k.word, form.location && `at ${form.location}`, form.actionRequired && `— ${form.actionRequired}`].filter(Boolean).join(' ') };
      await alertAPI.broadcast(payload);
      playSound('success');
      toast.success(`Alert sent to ${WHO_SHORT[form.audience]}`);
      onClose();
    } catch { playSound('error'); toast.error('Could not send. Try again.'); }
    finally { setSending(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-6">
        <div className="overlay-backdrop" aria-hidden="true" onClick={onClose} />
        <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-down" style={{ maxHeight: '92vh' }}>
        {/* Header with step dots */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button onClick={() => (step ? setStep(step - 1) : onClose())} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50" aria-label={step ? 'Back' : 'Close'}>
              {step ? <ChevronLeft size={18} /> : <X size={17} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-semibold text-blue-600 uppercase tracking-wider">Step {step + 1} of {STEPS.length}</p>
              <p className="text-[16px] font-semibold text-slate-900 leading-tight">{STEPS[step]}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {STEPS.map((_, i) => <span key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ background: i <= step ? '#2563EB' : '#E2E8F0' }} />)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {step === 0 && Object.entries(KIND).map(([key, m]) => (
            <BigChoice key={key} on={form.type === key} onClick={() => pick('type', key)} Icon={m.Icon} color={m.color} word={m.word} sub={m.ask} />
          ))}
          {step === 1 && LEVEL.map((l) => (
            <BigChoice key={l.v} on={form.severity === l.v} onClick={() => pick('severity', l.v)} Icon={l.Icon} color={l.color} word={l.word} sub={l.sub} />
          ))}
          {step === 2 && WHO.map((w) => (
            <BigChoice key={w.v} on={form.audience === w.v} onClick={() => pick('audience', w.v)} Icon={w.Icon} word={w.word} sub={w.sub} />
          ))}
          {step === 3 && (
            <div className="space-y-5 pt-1">
              <div>
                <p className="text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><MapPin size={15} className="text-red-500" /> Location</p>
                <Chips items={PLACES} value={form.location} onPick={(v) => set('location', v)} />
                <input className="input-field mt-2 !h-11" placeholder="Or type the location" value={form.location} onChange={(e) => set('location', e.target.value)} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber-500" /> What should people do?</p>
                <Chips items={DO_THIS} value={form.actionRequired} onPick={(v) => set('actionRequired', v)} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-700 mb-2">Message <span className="font-normal text-slate-400">· optional</span></p>
                <textarea className="input-field min-h-[84px]" placeholder="e.g. A man in a black shirt climbed the back fence" value={form.note} onChange={(e) => set('note', e.target.value)} />
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200 relative">
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: k.color }} />
                <div className="flex items-center gap-3 p-4 pl-5">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: k.soft, color: k.color }}><k.Icon size={21} /></span>
                  <div><p className="text-[16px] font-semibold text-slate-900 leading-tight">{form.title || k.word}</p><p className="text-[12.5px] font-medium" style={{ color: lvl?.color }}>{lvl?.word}</p></div>
                </div>
                <div className="px-5 pb-4 space-y-1.5 text-[14px]">
                  {form.location && <p className="flex items-center gap-2 text-slate-800"><MapPin size={18} className="text-red-500" /> {form.location}</p>}
                  {form.actionRequired && <p className="flex items-center gap-2 font-semibold text-amber-700"><AlertTriangle size={18} /> {form.actionRequired}</p>}
                  {form.note && <p className="text-slate-700">“{form.note}”</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-2.5">
                <Radio size={17} className="text-blue-600 flex-shrink-0" />
                <p className="text-[13px] text-slate-700">This goes to <b>{WHO_SHORT[form.audience]}</b> straight away, with a loud alarm.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div className="flex-shrink-0 px-5 pt-3 border-t border-slate-100" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {step === 3 && (
            <button onClick={() => setStep(4)} className="w-full h-12 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700">
              Review alert <ChevronRight size={18} />
            </button>
          )}
          {step === 4 && (
            <button disabled={sending} onClick={send} className="w-full h-12 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60">
              <Send size={17} /> {sending ? 'Sending…' : 'Send alert'}
            </button>
          )}
          {step < 3 && <p className="text-center text-[12.5px] text-slate-400 pb-1">Choose one to continue</p>}
        </div>
        </div>
      </div>
    </Portal>
  );
}

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [busy, setBusy] = useState(null);
  const { subscribe } = useSocket() || {};

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await alertAPI.getAll({ status: 'active', page: p, limit: PAGE_SIZE });
      setAlerts(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch { toast.error('Could not load alerts'); } finally { setLoading(false); }
  };
  const handlePage = (p) => { setPage(p); load(p); };
  useEffect(() => { load(1); }, []);

  useEffect(() => {
    if (!subscribe) return;
    // Live sync: add new alerts, update acknowledged ones in place, drop resolved ones
    const unsub = subscribe('new_alert', (alert) => {
      setAlerts((prev) => (alert.status === 'resolved' ? prev.filter((a) => a._id !== alert._id) : upsertAlert(prev, alert)));
    });
    return unsub;
  }, [subscribe]);

  const handleAck = async (id) => {
    setBusy(id);
    try {
      await alertAPI.acknowledge(id);
      playSound('click');
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, status: 'acknowledged' } : a)));
      toast.success('Responding — they have been told');
    } catch { playSound('error'); toast.error('Did not work. Try again.'); } finally { setBusy(null); }
  };
  const handleResolve = async (id) => {
    setBusy(id);
    try {
      await alertAPI.resolve(id);
      playSound('success');
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      toast.success('Alert resolved');
    } catch { playSound('error'); toast.error('Did not work. Try again.'); } finally { setBusy(null); }
  };

  // Most urgent first: open help requests, then ones a guard is handling, then estate messages
  const ordered = useMemo(() => {
    const rank = (a) => (a.isEmergencyBroadcast ? 2 : a.status === 'open' ? 0 : 1);
    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...alerts].sort((a, b) => rank(a) - rank(b) || (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2) || new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts]);
  const openCount = alerts.filter((a) => !a.isEmergencyBroadcast && a.status === 'open').length;

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      {/* Status + send */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className={`flex-1 g-card px-4 py-3.5 flex items-center gap-3 ${openCount ? '!border-red-200 !bg-red-50/60' : ''}`}>
          <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${openCount ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
            {openCount ? <ShieldAlert size={19} /> : <CheckCircle2 size={19} />}
            {openCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900">{loading ? 'Checking…' : openCount ? `${openCount} alert${openCount === 1 ? '' : 's'} need${openCount === 1 ? 's' : ''} a response` : 'All clear'}</p>
            <p className="text-[12.5px] text-slate-500">{openCount ? 'Respond first, then resolve when it is safe.' : 'No open alerts in the estate right now.'}</p>
          </div>
        </div>
        <button onClick={() => setShowBroadcast(true)} className="h-12 sm:h-[60px] px-5 rounded-xl sm:rounded-2xl text-[14.5px] font-semibold text-white flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800">
          <span className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center"><Megaphone size={15} /></span>
          Send an alert
        </button>
      </div>

      {loading ? <Spinner size={30} /> : (
        <div className="space-y-4">
          {ordered.map((a) => <AlertCard key={a._id} a={a} onAck={handleAck} onResolve={handleResolve} busy={busy === a._id} />)}
          {pagination.pages > 1 && <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />}
        </div>
      )}

      {showBroadcast && <SendAlertWizard onClose={() => { setShowBroadcast(false); load(page); }} />}
    </div>
  );
}

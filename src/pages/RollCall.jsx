import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Siren, Phone, LifeBuoy, UserX, ShieldCheck, Users, CheckCircle2, ChevronDown } from 'lucide-react';
import { useRollCall } from '../components/rollcall/RollCall';
import CallButton from '../components/calls/CallButton';

const ago = (d) => { try { return d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : ''; } catch { return ''; } };

function Count({ n, word, bg, fg, border }) {
  return (
    <div className="rounded-2xl px-3 py-3 text-center" style={{ background: bg, border: `2px solid ${border}` }}>
      <div className="text-[30px] font-extrabold leading-none tabular-nums" style={{ color: fg }}>{n ?? 0}</div>
      <div className="text-[12px] font-bold uppercase tracking-wide mt-1" style={{ color: fg }}>{word}</div>
    </div>
  );
}

function PersonRow({ p, tone }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      {p.profilePhoto
        ? <img src={p.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        : <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0">{(p.name || '?')[0]?.toUpperCase()}</span>}
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-[15px] font-bold text-slate-900 truncate">{p.name || 'Unknown'}</p>
        <p className="text-[12.5px] text-slate-600 truncate">{[p.roleLabel, p.unit].filter(Boolean).join(' · ')}</p>
        {p.note && <p className="text-[13px] font-semibold mt-0.5" style={{ color: tone }}>“{p.note}”</p>}
      </div>
      {p.phone && (
        <a href={`tel:${p.phone}`} className="h-11 px-3 rounded-xl flex items-center gap-1.5 text-[13.5px] font-bold text-white flex-shrink-0" style={{ background: '#1D4ED8', textDecoration: 'none' }}>
          <Phone size={15} /> Call
        </a>
      )}
      {p._id && <CallButton person={p} label="App" className="!h-11 !rounded-xl flex-shrink-0" style={{ border: '1px solid #DBEAFE', background: '#EFF6FF', color: '#1D4ED8' }} />}
    </div>
  );
}

function Section({ title, Icon, color, people, empty, tone, collapsible }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="g-card overflow-hidden">
      <button type="button" onClick={() => collapsible && setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center gap-2.5 border-b border-slate-100 text-left">
        <Icon size={18} style={{ color }} />
        <span className="flex-1 text-[15px] font-extrabold text-slate-900">{title} <span className="text-slate-500 font-bold">({people.length})</span></span>
        {collapsible && <ChevronDown size={17} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (people.length
        ? <div className="divide-y divide-slate-100">{people.map((p, i) => <PersonRow key={p._id || i} p={p} tone={tone} />)}</div>
        : <p className="px-4 py-4 text-[13px] text-slate-500">{empty}</p>)}
    </div>
  );
}

export default function RollCallPage() {
  const { active, refresh, end, openStart } = useRollCall();
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  if (!active || active.endedAt) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="g-card px-5 py-10 text-center g-rise">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={28} /></span>
          <p className="mt-3 text-[17px] font-bold text-slate-900">No roll-call running</p>
          <p className="text-[13px] text-slate-600 mt-1">In an evacuation, start one so everyone says if they are safe.</p>
          <button onClick={openStart} className="mt-5 h-12 px-5 rounded-xl text-[15px] font-extrabold text-white bg-red-600 hover:bg-red-700 inline-flex items-center gap-2">
            <Siren size={18} /> Start roll-call
          </button>
        </div>
      </div>
    );
  }

  const full = !!active.canManage;
  const doEnd = async () => {
    setEnding(true);
    const ok = await end();
    setEnding(false);
    if (ok) setConfirmEnd(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="g-card p-4 sm:p-5 g-rise" style={{ borderColor: '#FCA5A5' }}>
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 g-alarm"><Siren size={21} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider text-red-700">Emergency roll-call</p>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">{active.reason || 'Emergency'}</h1>
            <p className="text-[12.5px] text-slate-600 mt-0.5">Started {ago(active.startedAt)} · {active.expected} expected</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Count n={active.expected} word="Expected" bg="#F8FAFC" fg="#0F172A" border="#CBD5E1" />
          <Count n={active.safe} word="Safe" bg="#ECFDF5" fg="#047857" border="#6EE7B7" />
          <Count n={active.help} word="Need help" bg={active.help ? '#DC2626' : '#FEF2F2'} fg={active.help ? '#fff' : '#B91C1C'} border={active.help ? '#B91C1C' : '#FECACA'} />
          <Count n={active.missing} word="Missing" bg="#FFFBEB" fg="#B45309" border="#FCD34D" />
        </div>
      </div>

      {full ? (
        <>
          <Section title="Need help" Icon={LifeBuoy} color="#DC2626" tone="#B91C1C" people={active.needHelp || []} empty="Nobody has asked for help." />
          <Section title="Missing — not answered" Icon={UserX} color="#B45309" tone="#92400E" people={active.missingPeople || []} empty="Everyone has answered." />
          <Section title="Safe" Icon={ShieldCheck} color="#047857" people={active.safePeople || []} empty="Nobody yet." collapsible />
        </>
      ) : (
        <div className="g-card p-4 text-[13.5px] text-slate-600 flex items-center gap-2"><Users size={16} /> Only the people running the roll-call can see the lists.</div>
      )}

      {full && (
        <div className="g-card p-4">
          {!confirmEnd ? (
            <button onClick={() => setConfirmEnd(true)} className="w-full h-12 rounded-xl text-[15px] font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2">
              <CheckCircle2 size={17} /> End roll-call
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[14px] font-semibold text-slate-900 text-center">
                End the roll-call?{active.missing ? ` ${active.missing} still missing.` : ''}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfirmEnd(false)} className="h-12 rounded-xl border-2 border-slate-200 text-[14.5px] font-bold text-slate-800">Keep running</button>
                <button disabled={ending} onClick={doEnd} className="h-12 rounded-xl text-[14.5px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">{ending ? 'Ending…' : 'Yes, end it'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

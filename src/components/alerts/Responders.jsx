import { Footprints, CheckCircle2, Ban, TrendingUp } from 'lucide-react';

// Who is answering an alert on sites with roles (hospitals, schools,
// hotels…): "Dr Ade (Doctor) · On my way". Hidden for estates by the caller.
const STATUS = {
  on_my_way: { word: 'On my way', Icon: Footprints,  bg: '#FFFBEB', fg: '#92400E', border: '#FCD34D' },
  arrived:   { word: 'Arrived',   Icon: CheckCircle2, bg: '#ECFDF5', fg: '#065F46', border: '#6EE7B7' },
  cannot:    { word: "Can't come", Icon: Ban,        bg: '#F1F5F9', fg: '#475569', border: '#CBD5E1' },
};

export const myResponse = (alert, userId) =>
  (alert?.responders || []).find((r) => userId && String(r.userId?._id || r.userId) === String(userId)) || null;

export function EscalatedBadge({ alert, className = '' }) {
  if (!alert?.escalatedAt) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${className}`}
      style={{ background: '#7F1D1D', color: '#fff' }} title="Nobody responded in time — sent to every responder">
      <TrendingUp size={12} /> Escalated
    </span>
  );
}

export default function Responders({ alert }) {
  const list = alert?.responders || [];
  if (!list.length) {
    if (alert?.status !== 'open' || alert?.isEmergencyBroadcast) return null;
    return (
      <p className="text-[12.5px] font-semibold rounded-xl px-3 py-2" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
        No one has responded yet
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Responding</p>
      {list.map((r, i) => {
        const st = STATUS[r.status] || STATUS.on_my_way;
        return (
          <div key={`${r.userId}-${i}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
            <st.Icon size={16} style={{ color: st.fg }} className="flex-shrink-0" />
            <p className="flex-1 min-w-0 text-[13.5px] text-slate-900 truncate">
              <b>{r.name || 'Someone'}</b>{r.role ? <span className="text-slate-600"> ({r.role})</span> : null}
            </p>
            <span className="text-[12.5px] font-bold flex-shrink-0" style={{ color: st.fg }}>{st.word}</span>
          </div>
        );
      })}
    </div>
  );
}

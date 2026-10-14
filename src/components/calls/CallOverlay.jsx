import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, ShieldCheck } from 'lucide-react';
import Portal from '../ui/Portal';
import { useCall, END_TEXT, REASON_TEXT } from '../../context/CallContext';

const ROLE_LABEL = { security: 'Security', estate_manager: 'Estate Manager', super_admin: 'AreaConnect support', resident: 'Neighbour' };

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function PersonAvatar({ person, size = 112, ring = false }) {
  const initials = (person?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {ring && (
        <>
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <span className="absolute -inset-3 rounded-full border border-white/20" />
        </>
      )}
      {person?.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className="relative w-full h-full rounded-full object-cover border-4 border-white/80 shadow-xl" />
      ) : (
        <div className="relative w-full h-full rounded-full flex items-center justify-center font-black text-white border-4 border-white/80 shadow-xl"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', fontSize: size * 0.34 }}>
          {initials}
        </div>
      )}
    </div>
  );
}

function RoundButton({ onClick, label, tone, children }) {
  const bg = { red: 'bg-red-500 hover:bg-red-600', green: 'bg-emerald-500 hover:bg-emerald-600', glass: 'bg-white/15 hover:bg-white/25' }[tone];
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group" aria-label={label}>
      <span className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all group-active:scale-95 ${bg}`}>
        {children}
      </span>
      <span className="text-xs font-semibold text-white/80">{label}</span>
    </button>
  );
}

// Full-screen call UI: incoming ring, outgoing ringing, in-call, end state.
export default function CallOverlay() {
  const { call, accept, decline, hangup, toggleMute } = useCall() || {};
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (call?.status !== 'active') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  if (!call) return null;
  const { peer = {}, status, kind, direction } = call;
  const free = kind !== 'standard';
  const elapsed = call.connectedAt ? (now - call.connectedAt) / 1000 : 0;
  const left = call.maxSeconds && kind === 'standard' && direction === 'outgoing' ? Math.max(0, call.maxSeconds - elapsed) : null;

  let subtitle;
  if (status === 'incoming') subtitle = kind === 'emergency' ? 'Emergency call' : kind === 'staff' ? `${ROLE_LABEL[peer.role] || 'Estate staff'} calling` : 'Neighbour calling';
  else if (status === 'ringing') subtitle = 'Calling…';
  else if (status === 'connecting') subtitle = 'Connecting…';
  else if (status === 'active') subtitle = mmss(elapsed);
  else if (status === 'ended') {
    const e = call.end || {};
    subtitle = REASON_TEXT[e.reason] && e.reason !== 'no_answer' ? REASON_TEXT[e.reason] : END_TEXT[e.status] || 'Call ended';
    if (e.durationSec) subtitle += ` · ${mmss(e.durationSec)}`;
    // Only the caller pays, so only the caller sees the charge.
    if (e.creditsCharged && direction === 'outgoing') subtitle += ` · ${e.creditsCharged} credit${e.creditsCharged > 1 ? 's' : ''}`;
  }

  return (
    <Portal>
      <div className="fixed inset-0 flex flex-col items-center justify-between text-white"
        style={{ zIndex: 350, background: 'linear-gradient(160deg,#1E1B4B 0%,#312E81 45%,#4338CA 100%)', paddingTop: 'max(3rem, env(safe-area-inset-top))', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
        role="dialog" aria-modal="true" aria-label={`Call with ${peer.name || 'neighbour'}`}>

        <div className="flex flex-col items-center text-center px-6 mt-6">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-8 ${free ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-indigo-100'}`}>
            {free ? <><ShieldCheck size={12} /> {kind === 'emergency' ? 'Emergency · free' : 'Free call'}</> : 'Call'}
          </span>
          <PersonAvatar person={peer} ring={status === 'incoming' || status === 'ringing'} />
          <h2 className="text-2xl font-bold mt-6">{peer.name || 'Neighbour'}</h2>
          <p className="text-sm text-indigo-200 mt-1">{[ROLE_LABEL[peer.role] && peer.role !== 'resident' ? ROLE_LABEL[peer.role] : null, peer.unit].filter(Boolean).join(' · ')}</p>
          <p className={`mt-5 text-lg font-medium ${status === 'active' ? 'tabular-nums' : ''}`}>{subtitle}</p>
          {status === 'active' && call.path && (
            <p className="mt-1 text-[11px] text-indigo-200/80">{call.path === 'direct' ? 'Direct connection' : 'Connected via AreaConnect relay'}</p>
          )}
          {left != null && status === 'active' && (
            <p className={`mt-1 text-xs ${left < 90 ? 'text-amber-300 font-semibold' : 'text-indigo-200'}`}>
              {left < 90 ? `Credits run out in ${mmss(left)}` : `About ${Math.floor(left / 60)} min of credit left`}
            </p>
          )}
        </div>

        {status === 'incoming' ? (
          <div className="flex items-center justify-center gap-16">
            <RoundButton onClick={decline} label="Decline" tone="red"><PhoneOff size={26} /></RoundButton>
            <RoundButton onClick={accept} label="Accept" tone="green"><Phone size={26} /></RoundButton>
          </div>
        ) : status === 'ended' ? (
          <button onClick={hangup} className="px-8 py-3 rounded-full bg-white/15 hover:bg-white/25 text-sm font-semibold">Close</button>
        ) : (
          <div className="flex items-center justify-center gap-12">
            <RoundButton onClick={toggleMute} label={call.muted ? 'Unmute' : 'Mute'} tone="glass">
              {call.muted ? <MicOff size={24} /> : <Mic size={24} />}
            </RoundButton>
            <RoundButton onClick={hangup} label="End" tone="red"><PhoneOff size={26} /></RoundButton>
          </div>
        )}
      </div>
    </Portal>
  );
}

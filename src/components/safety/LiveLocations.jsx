import { useEffect, useState } from 'react';
import { MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { safetyAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import CallButton from '../calls/CallButton';

// Residents who are sharing their live location with estate staff (personal
// safety). Pops up in the corner for security and estate managers, with a
// live map, how fresh the fix is, and a one-tap call.

const ago = (ts) => {
  if (!ts) return 'waiting for location…';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  return s < 60 ? `updated ${s}s ago` : `updated ${Math.floor(s / 60)}m ago`;
};

export default function LiveLocations() {
  const { subscribe } = useSocket() || {};
  const [shares, setShares] = useState({}); // userId → { person, last, startedAt }
  const [collapsed, setCollapsed] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    safetyAPI.activeLocations()
      .then(({ data }) => setShares(Object.fromEntries((data.data || []).map((s) => [s.userId, s]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!subscribe) return;
    const offs = [
      subscribe('safety:location_start', (s) => { setShares((m) => ({ ...m, [s.userId]: s })); setCollapsed(false); }),
      subscribe('safety:location', (p) => setShares((m) => (m[p.userId] ? { ...m, [p.userId]: { ...m[p.userId], last: p } } : m))),
      subscribe('safety:location_end', (p) => setShares((m) => { const n = { ...m }; delete n[p.userId]; return n; })),
    ];
    return () => offs.forEach((off) => off?.());
  }, [subscribe]);

  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 5000); return () => clearInterval(t); }, []);

  const list = Object.values(shares);
  if (!list.length) return null;

  return (
    <div className="fixed left-3 right-3 sm:left-auto sm:right-4 sm:w-[360px] z-[90] bottom-20 lg:bottom-4 rounded-2xl bg-white shadow-2xl border border-red-200 overflow-hidden">
      <button onClick={() => setCollapsed((c) => !c)} className="w-full flex items-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-bold">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-white" />
        </span>
        <MapPin size={15} />
        <span className="flex-1 text-left">{list.length} resident{list.length > 1 ? 's' : ''} sharing live location</span>
        {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {!collapsed && (
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {list.map((s) => {
            const { person = {}, last } = s;
            return (
              <div key={s.userId} className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  {person.profilePhoto
                    ? <img src={person.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 font-bold flex items-center justify-center shrink-0">{(person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{person.name}</div>
                    <div className="text-xs text-slate-400 truncate">{person.unit} · {ago(last?.at)}{last?.accuracy ? ` · ±${Math.round(last.accuracy)}m` : ''}</div>
                  </div>
                  <CallButton person={{ _id: person._id, name: person.name, role: 'resident', profilePhoto: person.profilePhoto, unit: person.unit }} label="Call" />
                </div>
                {last && (
                  <>
                    <iframe title={`Location of ${person.name}`} className="w-full h-40 rounded-xl border border-slate-200"
                      src={`https://maps.google.com/maps?q=${last.lat},${last.lng}&z=18&output=embed`} loading="lazy" />
                    <a href={`https://maps.google.com/?q=${last.lat},${last.lng}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                      <ExternalLink size={12} /> Open in Google Maps
                    </a>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import { siteAPI } from '../api';
import { useSite } from '../context/SiteContext';

// Kinds → words (hall = hall/hostel on campuses, block elsewhere)
const KIND_WORD = {
  hall: 'Hall', building: 'Building', faculty: 'Faculty', gate: 'Gate', clinic: 'Clinic', library: 'Library',
  sports: 'Sports', parking: 'Parking', security: 'Security', chapel: 'Chapel / mosque', food: 'Food', office: 'Office', other: 'Other',
};

const linkFor = (p) => p.directionsUrl
  || (p.lat != null && p.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : null);

export default function Places() {
  const { terms, type } = useSite();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    siteAPI.places()
      .then(({ data }) => setPlaces(data?.data || []))
      .catch((err) => setError(err.response ? (err.response.data?.message || 'Could not load places') : 'You\'re offline'))
      .finally(() => setLoading(false));
  }, []);

  const kindWord = (k) => (k === 'hall' ? (terms.block || (type === 'estate' ? 'Block' : 'Hall')) : KIND_WORD[k] || 'Place');
  const term = q.trim().toLowerCase();
  const list = useMemo(() => (term
    ? places.filter((p) => [p.name, p.block, p.address, p.description, kindWord(p.kind)].some((s) => String(s || '').toLowerCase().includes(term)))
    : places), [places, term]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="g-card p-4 sm:p-5 g-rise">
        <h1 className="text-[20px] lg:text-[22px] font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>Places</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#475569' }}>Direct visitors around the {terms.site.toLowerCase()} — Directions opens Google Maps.</p>
        {places.length > 5 && (
          <div className="relative mt-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a hall, building, gate…"
              className="w-full h-12 pl-10 pr-10 rounded-2xl text-[15px] outline-none focus:ring-4 focus:ring-blue-500/15"
              style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#0F172A' }} />
            {q && (
              <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#94A3B8' }}>
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" /></div>
      ) : error ? (
        <div className="g-card p-4 text-[13.5px] font-semibold" style={{ color: '#B91C1C' }}>{error}</div>
      ) : list.length === 0 ? (
        <div className="g-card px-5 py-10 text-center">
          <div className="text-[15px] font-bold" style={{ color: '#0F172A' }}>{term ? 'No matches' : 'No places added yet'}</div>
          <div className="text-[12.5px] mt-1" style={{ color: '#94A3B8' }}>{term ? 'Try another name' : `The ${terms.manager.toLowerCase()} adds places on the map`}</div>
        </div>
      ) : (
        <div className="g-card overflow-hidden g-rise">
          {list.map((p, i) => {
            const url = linkFor(p);
            return (
              <div key={p._id || i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? '1px solid rgba(15,23,42,0.05)' : 'none', minHeight: 64 }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  <MapPin size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate" style={{ color: '#0F172A' }}>{p.name}</div>
                  <div className="text-[12px] truncate" style={{ color: '#64748B' }}>
                    {[kindWord(p.kind), p.description || p.address].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {url && (
                  <a href={url} target="_blank" rel="noreferrer"
                    className="h-10 px-3.5 rounded-xl flex items-center gap-1.5 text-[13px] font-semibold text-white flex-shrink-0 active:scale-[0.97] transition-transform"
                    style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', textDecoration: 'none' }}>
                    <Navigation size={14} /> Directions
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

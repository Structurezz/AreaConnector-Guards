import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { siteAPI } from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { fallbackSite, CATEGORY_INFO, normType } from '../utils/siteTypes';

// The site's type, wording (terms) and modules. Renders with the estate
// fallback (or the last cached config) until GET /api/site returns, and
// refreshes when the manager changes settings (socket `site_update`).
const SiteContext = createContext(null);

const cacheKey = (estateId) => `ac_site_${estateId}`;
const readCache = (estateId) => {
  try { const v = localStorage.getItem(cacheKey(estateId)); return v ? JSON.parse(v) : null; } catch { return null; }
};
const writeCache = (estateId, site) => {
  try { localStorage.setItem(cacheKey(estateId), JSON.stringify(site)); } catch { /* ignore */ }
};

function normalise(raw, type) {
  const base = fallbackSite(raw?.type || type);
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    type: normType(raw.type || base.type),
    terms: { ...base.terms, ...(raw.terms || {}) },
    modules: { ...base.modules, ...(raw.modules || {}) },
    passCategories: Array.isArray(raw.passCategories) ? raw.passCategories : base.passCategories,
    visitingHours: { ...base.visitingHours, ...(raw.visitingHours || {}) },
  };
}

export const SiteProvider = ({ children }) => {
  const { user } = useAuth();
  const { subscribe } = useSocket() || {};
  const estateObj = user?.estateId && typeof user.estateId === 'object' ? user.estateId : null;
  const estateId = estateObj?._id || user?.estateId || null;
  const populatedType = estateObj?.site?.type;

  const [raw, setRaw] = useState(() => (estateId ? readCache(estateId) : null));
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((data) => {
    if (!data) return;
    setRaw(data);
    if (estateId) writeCache(estateId, data);
  }, [estateId]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await siteAPI.get();
      apply(data?.data);
    } catch { /* offline or older server — keep the fallback */ }
    finally { setLoaded(true); }
  }, [user, apply]);

  // Reload whenever the signed-in guard / estate changes
  useEffect(() => {
    setRaw(estateId ? readCache(estateId) : null);
    setLoaded(false);
    if (user) refresh();
  }, [estateId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!subscribe) return;
    return subscribe('site_update', (payload) => {
      if (payload && typeof payload === 'object' && payload.type) apply({ ...(raw || {}), ...payload });
      else refresh();
    });
  }, [subscribe, apply, refresh, raw]);

  // Friendly re-sync when the server says a module was switched off
  useEffect(() => {
    const onOff = () => refresh();
    window.addEventListener('site:module_off', onOff);
    return () => window.removeEventListener('site:module_off', onOff);
  }, [refresh]);

  const value = useMemo(() => {
    const site = normalise(raw, populatedType);
    const isEstate = site.type === 'estate';
    const categoryLabel = (key) => {
      if (!key || key === 'guest') return 'Visitor';
      return site.passCategories.find((c) => c.key === key)?.label || CATEGORY_INFO[key]?.label || key;
    };
    // "estate management" stays word-for-word for estates
    const management = isEstate ? 'estate management' : 'management';
    return { site, terms: site.terms, modules: site.modules, type: site.type, isEstate, loaded, refresh, categoryLabel, management };
  }, [raw, populatedType, loaded, refresh]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

const FALLBACK = (() => {
  const site = fallbackSite('estate');
  return {
    site, terms: site.terms, modules: site.modules, type: 'estate', isEstate: true, loaded: false,
    refresh: () => {}, categoryLabel: (k) => CATEGORY_INFO[k]?.label || 'Visitor', management: 'estate management',
  };
})();

export const useSite = () => useContext(SiteContext) || FALLBACK;

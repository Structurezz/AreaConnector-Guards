import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Search + analytics wiring for this SPA. Mounted once inside <BrowserRouter>.
//
// - Public pages (login / register) get their own title, description and
//   canonical URL and are indexable, so the app shows up when people search
//   for it by name.
// - Every other route is behind auth and may contain residents' data, so it is
//   marked noindex.
// - Sends a GA4 page_view on each route change (gtag is injected at build time
//   by vite.config.js when VITE_GA_MEASUREMENT_ID is set). IDs and tokens in
//   the path are masked so no personal data reaches Google Analytics.

const SITE_URL  = 'https://area-guards.areaconnect.pro';
const APP_TITLE = 'AreaConnect Guard — Gate Security App';

const PUBLIC_PAGES = {
  '/login': [
    "AreaConnect Guard Login — Security Officer App",
    "Sign in to AreaConnect Guard to verify visitor QR passes and 6-digit codes, check guests in and out, and receive estate security alerts — even offline.",
  ],
  '/register': [
    "Register as a Security Officer | AreaConnect Guard",
    "Create your AreaConnect Guard account to manage gate access for your estate: scan visitor passes, log entries and respond to resident alerts.",
  ],
};

const DEFAULT_DESCRIPTION = "Sign in to AreaConnect Guard to verify visitor QR passes and 6-digit codes, check guests in and out, and receive estate security alerts — even offline.";

function setMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

// "/visitors/66f1c2…" → "/visitors/:id". Masks Mongo IDs, tokens and codes.
function maskPath(pathname) {
  return pathname
    .split('/')
    .map(seg => (seg.length >= 16 || /\d/.test(seg) ? ':id' : seg))
    .join('/');
}

export default function SeoTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PUBLIC_PAGES[pathname];
    const title = page ? page[0] : APP_TITLE;

    document.title = title;
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: page ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
    });
    setMeta('meta[name="description"]', { name: 'description', content: page ? page[1] : DEFAULT_DESCRIPTION });
    if (page) {
      setMeta('link[rel="canonical"]', { rel: 'canonical', href: `${SITE_URL}${pathname}` });
    } else {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    }

    if (typeof window.gtag === 'function') {
      const path = maskPath(pathname);
      window.gtag('event', 'page_view', {
        page_path: path,
        page_location: `${SITE_URL}${path}`,
        page_title: title,
      });
    }
  }, [pathname]);

  return null;
}

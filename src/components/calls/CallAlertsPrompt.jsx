import { useEffect, useState } from 'react';
import { BellRing, Share, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { enablePush, pushState, registerServiceWorker } from '../../utils/push';

const KEY = 'call_alerts_prompt_dismissed';
const SNOOZE_MS = 3 * 24 * 3600_000;

// Asks once (then every few days) to turn on call alerts, so calls ring as a
// notification when the app is closed. Already allowed → quietly keeps this
// device subscribed for whoever is logged in.
export default function CallAlertsPrompt({ appName = 'the app' }) {
  const [state, setState] = useState(() => pushState());
  const [hidden, setHidden] = useState(() => Date.now() - Number(localStorage.getItem(KEY) || 0) < SNOOZE_MS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    if (state === 'granted') enablePush({ ask: false }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => { localStorage.setItem(KEY, String(Date.now())); setHidden(true); };

  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePush({ ask: true });
      setState(pushState());
      if (r === 'granted') toast.success('Call alerts are on — calls will ring even when the app is closed');
      else if (r === 'denied') toast.error('Notifications are blocked. Allow them in your browser settings.');
    } catch {
      toast.error('Couldn\'t turn on call alerts');
    } finally { setBusy(false); }
  };

  if (hidden || state === 'granted' || state === 'unsupported') return null;

  return (
    <div className="mb-4 rounded-2xl bg-slate-900 text-white p-3.5 flex items-start gap-3 shadow-lg">
      <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"><BellRing size={18} /></span>
      <div className="flex-1 min-w-0">
        {state === 'needs-install' ? (
          <>
            <p className="text-sm font-semibold">Get calls when {appName} is closed</p>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              On iPhone, tap <Share size={12} className="inline -mt-0.5" /> <b>Share</b> → <b>Add to Home Screen</b>, then open {appName} from your Home Screen and turn on call alerts.
            </p>
          </>
        ) : state === 'denied' ? (
          <>
            <p className="text-sm font-semibold">Call alerts are blocked</p>
            <p className="text-xs text-white/70 mt-0.5">Allow notifications for this site in your browser settings so calls can reach you when the app is closed.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Don't miss calls</p>
            <p className="text-xs text-white/70 mt-0.5">Turn on call alerts so your phone rings even when {appName} is closed.</p>
            <button onClick={turnOn} disabled={busy} className="mt-2.5 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold disabled:opacity-60">
              {busy ? 'Turning on…' : 'Turn on call alerts'}
            </button>
          </>
        )}
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="p-1 text-white/60 hover:text-white"><X size={16} /></button>
    </div>
  );
}

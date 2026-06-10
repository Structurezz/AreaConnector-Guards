import { useEffect, useState } from 'react';
import { alertAPI } from '../api';
import Badge, { alertTypeBadge, alertStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Bell, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { playSound } from '../utils/sounds';

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket() || {};

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await alertAPI.getAll({ status: 'open' });
      setAlerts(data.data);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      toast.error(`🚨 ${alert.type?.toUpperCase()} ALERT — ${alert.residentId?.name}!`, { duration: 8000 });
    });
    return unsub;
  }, [subscribe]);

  const handleAck = async (id) => {
    try {
      await alertAPI.acknowledge(id);
      playSound('click');
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, status: 'acknowledged' } : a));
      toast.success('Acknowledged');
    } catch { playSound('error'); toast.error('Failed'); }
  };

  const handleResolve = async (id) => {
    try {
      await alertAPI.resolve(id);
      playSound('success');
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      toast.success('Resolved');
    } catch { playSound('error'); toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Active Alerts</h1>
        <p className="text-slate-500 text-sm">Real-time security and emergency alerts</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : alerts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
          <div className="text-emerald-600 font-semibold text-lg">All Clear</div>
          <div className="text-slate-400 text-sm mt-1">No open alerts at this time</div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <div
              key={a._id}
              className={`glass-card p-5 border ${
                a.status === 'open'
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-amber-200 bg-amber-50/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {a.status === 'open' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    )}
                    <Badge variant={alertTypeBadge(a.type)}>{a.type}</Badge>
                    <Badge variant={alertStatusBadge(a.status)}>{a.status}</Badge>
                  </div>
                  <div className="text-slate-900 font-semibold mb-0.5">
                    {a.residentId?.name}
                    {a.unitId?.unitNumber && ` · Unit ${a.unitId.unitNumber}`}
                  </div>
                  {a.note && <p className="text-slate-500 text-sm mb-2">{a.note}</p>}
                  <div className="text-xs text-slate-400">
                    {format(new Date(a.createdAt), 'MMM d, yyyy · HH:mm:ss')}
                  </div>
                  {a.residentId?.phone && (
                    <a href={`tel:${a.residentId.phone}`} className="text-emerald-600 text-sm hover:underline mt-1 block">
                      Call {a.residentId.phone}
                    </a>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {a.status === 'open' && (
                    <button onClick={() => handleAck(a._id)} className="btn-outline text-sm px-3 py-1.5">
                      Acknowledge
                    </button>
                  )}
                  <button onClick={() => handleResolve(a._id)} className="btn-primary text-sm px-3 py-1.5">
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

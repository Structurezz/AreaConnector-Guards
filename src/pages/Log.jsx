import { useEffect, useState } from 'react';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { FileText, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';

export default function SecurityLog() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll({ limit: 50 });
      setVisitors(data.data);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (v) => {
    try {
      if (v.status === 'active') {
        await visitorAPI.checkIn(v._id);
        playSound('checkin');
        toast.success('Checked in');
      } else if (v.status === 'checked-in') {
        await visitorAPI.checkOut(v._id);
        playSound('click');
        toast.success('Checked out');
      }
      load();
    } catch (err) { playSound('error'); toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Entry Log</h1>
        <p className="text-white/50 text-sm">Today's visitor movements</p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : visitors.length === 0 ? (
          <EmptyState icon={FileText} title="No visitor records" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Visitor', 'Host', 'Unit', 'Expected', 'Entry', 'Exit', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visitors.map((v) => (
                  <tr key={v._id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm">{v.visitorName}</div>
                      <div className="visitor-code text-gold text-xs">{v.visitorCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">{v.hostResidentId?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/70">{v.hostUnitId?.unitNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/70 whitespace-nowrap">
                      {format(new Date(v.expectedDate), 'MMM d, p')}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400">
                      {v.entryTime ? format(new Date(v.entryTime), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400">
                      {v.exitTime ? format(new Date(v.exitTime), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {['active', 'checked-in'].includes(v.status) && (
                        <button
                          onClick={() => handleAction(v)}
                          className={`p-1.5 rounded-lg transition-all text-sm ${
                            v.status === 'active'
                              ? 'hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400'
                              : 'hover:bg-blue-500/20 text-white/40 hover:text-blue-400'
                          }`}
                        >
                          {v.status === 'active' ? <LogIn size={15} /> : <LogOut size={15} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

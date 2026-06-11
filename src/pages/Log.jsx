import { useEffect, useState } from 'react';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { FileText, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 20;

export default function SecurityLog() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll({ page: p, limit: PAGE_SIZE });
      setVisitors(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  const handlePage = (p) => { setPage(p); load(p); };

  useEffect(() => { load(1); }, []);

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
      load(page);
    } catch (err) { playSound('error'); toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Entry Log</h1>
        <p className="text-slate-500 text-sm">Today's visitor movements</p>
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
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Visitor', 'Host', 'Unit', 'Expected', 'Entry', 'Exit', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visitors.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 text-sm">{v.visitorName}</div>
                      <div className="visitor-code text-emerald-600 text-xs">{v.visitorCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.hostResidentId?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.hostUnitId?.unitNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {format(new Date(v.expectedDate), 'MMM d, p')}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                      {v.entryTime ? format(new Date(v.entryTime), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">
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
                              ? 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-transparent hover:border-emerald-200'
                              : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-transparent hover:border-blue-200'
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

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />
    </div>
  );
}

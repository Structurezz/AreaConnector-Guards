import { useEffect, useState } from 'react';
import { alertAPI } from '../api';
import Badge, { alertTypeBadge, alertStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { Bell, CheckCircle, Radio, X, MapPin, Zap, Phone, Users, Shield, Briefcase, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { playSound } from '../utils/sounds';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 15;

const ROLE_COLORS = {
  security:       { bg: '#EFF6FF', color: '#1D4ED8', label: 'Security Guard' },
  resident:       { bg: '#FFF1F2', color: '#BE123C', label: 'Resident' },
  estate_manager: { bg: '#FFF7ED', color: '#C2410C', label: 'Estate Manager' },
  super_admin:    { bg: '#FFF7ED', color: '#C2410C', label: 'Estate Manager' },
};

function RaisedByBadge({ alert }) {
  const role = alert.raisedByRole || alert.residentId?.role || 'resident';
  const cfg = ROLE_COLORS[role] || ROLE_COLORS.resident;
  const name = alert.residentId?.name || '—';
  const unit = alert.unitId
    ? `${alert.unitId.block ? `Block ${alert.unitId.block} · ` : ''}Unit ${alert.unitId.unitNumber}`
    : null;
  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
      <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{name}</span>
      {unit && <span className="text-xs" style={{ color: '#64748B' }}>{unit}</span>}
      {alert.residentId?.phone && (
        <a href={`tel:${alert.residentId.phone}`} className="text-xs hover:underline" style={{ color: '#3B82F6' }}>
          {alert.residentId.phone}
        </a>
      )}
    </div>
  );
}

const AUDIENCE_OPTIONS = [
  { value: 'all',            label: 'Everyone',       sub: 'All residents + staff', Icon: Users },
  { value: 'staff',          label: 'Staff only',     sub: 'Estate manager + security', Icon: Briefcase },
  { value: 'estate_manager', label: 'Estate Manager', sub: 'Managers only', Icon: UserCog },
  { value: 'security',       label: 'Security only',  sub: 'Security team only', Icon: Shield },
];

const AUDIENCE_LABELS = {
  all: 'all residents + staff',
  staff: 'estate manager + security',
  estate_manager: 'estate managers',
  security: 'security team',
};

function BroadcastModal({ onClose }) {
  const [form, setForm] = useState({ title: '', note: '', type: 'security', severity: 'high', location: '', actionRequired: '', contactNumber: '', audience: 'all' });
  const [sending, setSending] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = async () => {
    if (!form.title.trim() && !form.note.trim()) { toast.error('Add a title or message'); return; }
    setSending(true);
    try {
      await alertAPI.broadcast(form);
      toast.success(`Alert sent to ${AUDIENCE_LABELS[form.audience] || 'recipients'}`);
      onClose();
    } catch { toast.error('Broadcast failed. Try again.'); }
    finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 24px 64px rgba(124,58,237,0.2)', border: '2px solid #7C3AED' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #DC2626 100%)', padding: '20px 20px 16px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={14} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Security Broadcast</div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Send Alert</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '18px 20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Send to</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {AUDIENCE_OPTIONS.map(({ value, label, sub, Icon }) => {
                const active = form.audience === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('audience', value)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${active ? '#7C3AED' : '#E2E8F0'}`,
                      background: active ? 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(220,38,38,0.05))' : '#F8FAFC',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                    <Icon size={16} color={active ? '#7C3AED' : '#64748B'} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#7C3AED' : '#0F172A' }}>{label}</div>
                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}>
                <option value="security">Security</option>
                <option value="fire">Fire</option>
                <option value="medical">Medical</option>
                <option value="noise">Noise</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Suspicious activity at main gate"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Message *</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Describe the situation clearly…" rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}><MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Block A entrance"
                style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}><Phone size={10} style={{ display: 'inline', marginRight: 3 }} />Contact No.</label>
              <input value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="Guard's number"
                style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}><Zap size={10} style={{ display: 'inline', marginRight: 3 }} />Action Required</label>
            <input value={form.actionRequired} onChange={e => set('actionRequired', e.target.value)} placeholder="e.g. Lock doors, stay indoors"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending}
              style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #7C3AED, #DC2626)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
              {sending ? 'Sending…' : `📡 Send to ${AUDIENCE_LABELS[form.audience]}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showBroadcast, setShowBroadcast] = useState(false);
  const { subscribe } = useSocket() || {};

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await alertAPI.getAll({ status: 'open', page: p, limit: PAGE_SIZE });
      setAlerts(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  const handlePage = (p) => { setPage(p); load(p); };

  useEffect(() => { load(1); }, []);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
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
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Active Alerts</h1>
          <p className="text-slate-500 text-sm">Real-time security and emergency alerts</p>
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #DC2626)', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
          <Radio size={15} /> Broadcast Alert
        </button>
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
            <div key={a._id}
              className={`glass-card p-5 border ${a.isEmergencyBroadcast ? 'border-purple-200 bg-purple-50/30' : a.status === 'open' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/30'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {a.isEmergencyBroadcast && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        <Radio size={9} /> Broadcast
                      </span>
                    )}
                    {a.status === 'open' && !a.isEmergencyBroadcast && (
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    )}
                    <Badge variant={alertTypeBadge(a.type)}>{a.type}</Badge>
                    <Badge variant={alertStatusBadge(a.status)}>{a.status}</Badge>
                  </div>

                  {/* Title */}
                  {a.title && <div className="font-bold text-slate-900 mb-0.5">{a.title}</div>}

                  {/* Who raised it */}
                  <RaisedByBadge alert={a} />

                  {a.note && <p className="text-slate-500 text-sm mt-2">{a.note}</p>}
                  {a.location && <p className="text-slate-400 text-xs mt-1">📍 {a.location}</p>}
                  {a.actionRequired && <p className="text-amber-700 text-xs font-medium mt-1">⚡ {a.actionRequired}</p>}
                  <div className="text-xs text-slate-400 mt-1">{format(new Date(a.createdAt), 'MMM d, yyyy · HH:mm:ss')}</div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {a.status === 'open' && !a.isEmergencyBroadcast && (
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

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />
    </div>
  );
}

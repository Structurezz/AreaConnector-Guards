import { Phone } from 'lucide-react';
import { useCall } from '../../context/CallContext';

// In-app voice call (free for staff). `person` needs at least { _id, name }.
export default function CallButton({ person, label = 'Call in app', className = '', style }) {
  const { call, startCall } = useCall() || {};
  if (!person?._id || !startCall) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); startCall(person); }}
      disabled={!!call}
      className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 ${className}`}
      style={{ background: '#EEF2FF', color: '#4338CA', ...style }}
    >
      <Phone size={11} /> {label}
    </button>
  );
}

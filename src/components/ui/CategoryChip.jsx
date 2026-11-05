import { Baby, HardHat, Package, Truck, HeartPulse, FileText } from 'lucide-react';
import { CATEGORY_STYLE } from '../../utils/siteTypes';

// Pass category chip (school pickup, contractor, supplier, delivery, patient visit)
export const CATEGORY_ICON = { pickup: Baby, contractor: HardHat, supplier: Package, delivery: Truck, patient_visit: HeartPulse };

export function CategoryChip({ category, label, size = 'sm' }) {
  if (!category || category === 'guest') return null;
  const st = CATEGORY_STYLE[category] || { bg: '#F1F5F9', fg: '#475569', border: '#E2E8F0' };
  const Icon = CATEGORY_ICON[category] || FileText;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide whitespace-nowrap ${size === 'sm' ? 'h-5 px-1.5 text-[9.5px]' : 'h-6 px-2 text-[10.5px]'}`}
      style={{ background: st.bg, color: st.fg, border: `1px solid ${st.border}` }}>
      <Icon size={size === 'sm' ? 10 : 12} /> {label}
    </span>
  );
}


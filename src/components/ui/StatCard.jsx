import { useEffect, useState } from 'react';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = parseInt(value) || 0;
    const duration = 800;
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplay(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
};

export default function StatCard({ label, value, icon: Icon, color = 'green', trend, suffix = '' }) {
  const colorMap = {
    gold:   'text-emerald-600 bg-emerald-50 border border-emerald-100',
    green:  'text-emerald-600 bg-emerald-50 border border-emerald-100',
    red:    'text-red-600 bg-red-50 border border-red-100',
    blue:   'text-blue-600 bg-blue-50 border border-blue-100',
    purple: 'text-violet-600 bg-violet-50 border border-violet-100',
  };

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          <Icon size={22} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">
        <AnimatedNumber value={value} />{suffix}
      </div>
      <div className="text-sm text-slate-500 font-medium">{label}</div>
    </div>
  );
}

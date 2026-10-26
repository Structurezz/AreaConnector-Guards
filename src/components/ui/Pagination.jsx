import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, limit, onPage }) {
  if (!pages || pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Build page numbers: always show first, last, current ±1, with ellipsis
  const nums = new Set([1, pages, page, page - 1, page + 1].filter(n => n >= 1 && n <= pages));
  const sorted = [...nums].sort((a, b) => a - b);
  const withGaps = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) withGaps.push('…');
    withGaps.push(n);
  });

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 38, height: 38, padding: '0 6px', borderRadius: 11, fontSize: 13, fontWeight: 500,
    border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all .15s', fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
      <span style={{ fontSize: 12, color: '#94A3B8' }}>
        Showing <strong style={{ color: '#475569' }}>{from}–{to}</strong> of <strong style={{ color: '#475569' }}>{total}</strong>
      </span>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          style={{ ...btnBase, background: page === 1 ? '#F8FAFC' : '#FFF', color: page === 1 ? '#CBD5E1' : '#475569', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
        >
          <ChevronLeft size={16} />
        </button>

        {withGaps.map((n, i) =>
          n === '…' ? (
            <span key={`gap-${i}`} style={{ ...btnBase, border: 'none', color: '#CBD5E1', cursor: 'default' }}>…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              style={{
                ...btnBase,
                background: n === page ? 'linear-gradient(135deg,#3B82F6,#1D4ED8)' : '#FFF',
                color: n === page ? '#FFF' : '#475569',
                borderColor: n === page ? '#2563EB' : '#E2E8F0',
                boxShadow: n === page ? '0 4px 12px -4px rgba(59,130,246,0.55)' : 'none',
                fontWeight: n === page ? 700 : 500,
              }}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          style={{ ...btnBase, background: page === pages ? '#F8FAFC' : '#FFF', color: page === pages ? '#CBD5E1' : '#475569', cursor: page === pages ? 'not-allowed' : 'pointer' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

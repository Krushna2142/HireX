// components/Pagination.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable pagination component with smart page windowing.
//
// Design decisions:
//   - Always shows first + last page for orientation
//   - Shows a window of ±2 pages around current page
//   - Collapses gaps with an ellipsis (…) — but only when gap > 1 page
//   - Prev/Next buttons with disabled state
//   - Lightweight: zero dependencies, pure CSS-in-JS matching your dark theme
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

interface PaginationProps {
  currentPage:  number;          // 1-indexed
  totalPages:   number;
  totalItems:   number;
  pageSize:     number;
  onPageChange: (page: number) => void;
  loading?:     boolean;
}

// ── Build the page-number sequence with ellipsis markers ──────────────────────
// Returns an array of numbers and 'ellipsis-left' / 'ellipsis-right' strings.
// e.g. [1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 20]
function buildPageWindows(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    // No ellipsis needed — show all pages
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const window  = 2; // pages to show either side of current
  const first   = 1;
  const last    = total;
  const rangeStart = Math.max(2,     current - window);
  const rangeEnd   = Math.min(total - 1, current + window);

  const pages: (number | string)[] = [first];

  // Left gap: only add ellipsis if there's actually a gap (> 1 page missing)
  if (rangeStart > 2) pages.push('ellipsis-left');

  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);

  // Right gap
  if (rangeEnd < total - 1) pages.push('ellipsis-right');

  pages.push(last);
  return pages;
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const baseBtn = (active: boolean, disabled: boolean): React.CSSProperties => ({
  minWidth:     36,
  height:       36,
  padding:      '0 10px',
  borderRadius: 8,
  fontSize:     13,
  fontWeight:   active ? 700 : 500,
  cursor:       disabled ? 'not-allowed' : 'pointer',
  transition:   'all 0.15s',
  display:      'inline-flex',
  alignItems:   'center',
  justifyContent: 'center',
  border: active
    ? '1px solid rgba(124,58,237,0.5)'
    : '1px solid rgba(255,255,255,0.09)',
  background: active
    ? 'rgba(124,58,237,0.2)'
    : disabled
    ? 'rgba(255,255,255,0.02)'
    : 'rgba(255,255,255,0.04)',
  color: active
    ? '#A78BFA'
    : disabled
    ? 'rgba(255,255,255,0.2)'
    : 'var(--text-muted)',
  opacity: disabled ? 0.5 : 1,
});

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages      = buildPageWindows(currentPage, totalPages);
  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd   = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            12,
      marginTop:      '2rem',
      paddingTop:     '1.5rem',
      borderTop:      '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* ── Page range label ── */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        Showing{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {rangeStart}–{rangeEnd}
        </span>{' '}
        of{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {totalItems}
        </span>{' '}
        jobs
      </p>

      {/* ── Buttons row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          style={{ ...baseBtn(false, currentPage === 1 || loading), gap: 4 }}
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          typeof p === 'string' ? (
            // Ellipsis — not clickable
            <span
              key={p}
              style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, padding: '0 2px', userSelect: 'none' }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={loading}
              style={baseBtn(p === currentPage, loading)}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          style={{ ...baseBtn(false, currentPage === totalPages || loading), gap: 4 }}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      {/* ── Page jump input (useful beyond 10 pages) ── */}
      {totalPages > 10 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            key={currentPage}            // reset input when page changes externally
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (val >= 1 && val <= totalPages) onPageChange(val);
              }
            }}
            style={{
              width:        56,
              background:   'rgba(255,255,255,0.03)',
              border:       '1px solid rgba(255,255,255,0.09)',
              borderRadius: 8,
              padding:      '5px 8px',
              fontSize:     13,
              color:        'var(--text-primary)',
              outline:      'none',
              textAlign:    'center',
            }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

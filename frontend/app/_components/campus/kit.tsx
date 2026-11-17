'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared visual language for every Campus Hiring page.
import { type CSSProperties, type ReactNode } from 'react';
import type {
  CampusBatch, DriveStatus, EligibilityStatus, OfferStatus,
} from '@/lib/axios';

export const C = {
  bg: '#080C14', panel: '#0D1220', panel2: '#101827',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(167,139,250,0.30)',
  text: '#F8FAFC', muted: 'rgba(226,232,240,0.68)', faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8', purple: '#A78BFA', pink: '#F472B6', green: '#34D399',
  yellow: '#FBBF24', red: '#F87171', orange: '#FB923C',
};

export const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: `radial-gradient(circle at 8% 0%, rgba(56,189,248,0.10), transparent 30%), radial-gradient(circle at 92% 0%, rgba(167,139,250,0.12), transparent 30%), ${C.bg}`,
  color: C.text, padding: '2rem', fontFamily: "'Sora', sans-serif",
};
export const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' };
export const titleStyle: CSSProperties = { margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: '-0.04em' };
export const subtitleStyle: CSSProperties = { margin: '6px 0 0', color: C.faint, fontSize: 13, maxWidth: 860, lineHeight: 1.6 };
export const panelStyle: CSSProperties = { border: `1px solid ${C.border}`, background: 'rgba(13,18,32,0.86)', borderRadius: 20, padding: '1.25rem', backdropFilter: 'blur(18px)' };
export const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 };
export const labelStyle: CSSProperties = { color: C.faint, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em' };
export const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, background: 'rgba(15,23,42,0.86)', color: C.text, borderRadius: 12, padding: '11px 12px', outline: 'none', fontSize: 13, fontFamily: "'Sora', sans-serif" };
export const primaryBtn: CSSProperties = { border: 'none', borderRadius: 14, padding: '11px 16px', color: '#020617', fontWeight: 950, cursor: 'pointer', background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`, fontFamily: "'Sora', sans-serif", textDecoration: 'none' };
export const secondaryBtn: CSSProperties = { border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 14px', color: C.text, fontWeight: 850, cursor: 'pointer', background: 'rgba(15,23,42,0.72)', fontFamily: "'Sora', sans-serif", textDecoration: 'none' };
export const dangerBtn: CSSProperties = { ...secondaryBtn, color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' };
export const smallBtn: CSSProperties = { ...secondaryBtn, padding: '6px 10px', fontSize: 11, borderRadius: 999 };
export const tblWrap: CSSProperties = { width: '100%', overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 16, background: C.panel };
export const tbl: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 };
export const thStyle: CSSProperties = { textAlign: 'left', padding: '12px 14px', color: C.faint, fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
export const tdStyle: CSSProperties = { padding: '12px 14px', borderBottom: `1px solid rgba(255,255,255,0.05)`, color: C.muted, verticalAlign: 'top' };

export function CampusPage({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={{ margin: '0 0 6px', color: C.purple, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Campus Hiring</p>
          <h1 style={titleStyle}>{title}</h1>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
      </header>
      {children}
    </main>
  );
}

export function StatCard({ label, value, color, sub }: { label: string; value: ReactNode; color?: string; sub?: string }) {
  return (
    <div style={{ ...panelStyle, padding: '1rem 1.1rem', display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <strong style={{ color: color ?? C.text, fontSize: 26, fontWeight: 950, fontFamily: 'monospace', lineHeight: 1 }}>{value}</strong>
      {sub && <span style={{ color: C.faint, fontSize: 11 }}>{sub}</span>}
    </div>
  );
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ border: `1px solid ${color}55`, background: `${color}14`, color, borderRadius: 999, padding: '4px 9px', fontSize: 10.5, fontWeight: 900, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {children}
    </span>
  );
}

const DRIVE_TONE: Record<string, string> = {
  DRAFT: C.faint, PENDING_APPROVAL: C.yellow, PUBLISHED: C.green,
  CLOSED: C.orange, CANCELLED: C.red, COMPLETED: C.purple,
};
export function DriveStatusPill({ status }: { status: DriveStatus | string }) {
  return <Pill color={DRIVE_TONE[String(status)] ?? C.faint}>{String(status).replaceAll('_', ' ').toLowerCase()}</Pill>;
}

const ELIG_TONE: Record<string, string> = { ELIGIBLE: C.green, NOT_ELIGIBLE: C.red, NEEDS_INFO: C.yellow };
export function EligibilityPill({ status }: { status: EligibilityStatus | string }) {
  const s = String(status);
  return <Pill color={ELIG_TONE[s] ?? C.faint}>{s.replaceAll('_', ' ').toLowerCase()}</Pill>;
}

const OFFER_TONE: Record<string, string> = {
  DRAFT: C.faint, RELEASED: C.sky, ACCEPTED: C.green, JOINED: C.green,
  DECLINED: C.red, REVOKED: C.red, EXPIRED: C.orange,
};
export function OfferPill({ status }: { status: OfferStatus | string }) {
  return <Pill color={OFFER_TONE[String(status)] ?? C.faint}>{String(status).toLowerCase()}</Pill>;
}

export function StatusPill({ status }: { status: string }) {
  const s = String(status ?? '').toLowerCase();
  let color = C.sky;
  if (s.includes('reject') || s.includes('fail')) color = C.red;
  else if (s.includes('hire') || s.includes('offer')) color = C.green;
  else if (s.includes('interview')) color = C.purple;
  else if (s.includes('shortlist')) color = C.yellow;
  else if (s.includes('hold')) color = C.orange;
  return <Pill color={color}>{s.replaceAll('_', ' ')}</Pill>;
}

export function Empty({ icon = '📭', title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div style={{ ...panelStyle, textAlign: 'center', padding: '3rem 1.5rem', display: 'grid', gap: 10, justifyItems: 'center' }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <strong style={{ fontSize: 16 }}>{title}</strong>
      {body && <p style={{ margin: 0, color: C.faint, fontSize: 13, maxWidth: 460, lineHeight: 1.6 }}>{body}</p>}
      {action}
    </div>
  );
}

export function Err({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: '#FCA5A5', borderRadius: 16, padding: '12px 14px', fontSize: 13, fontWeight: 800, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && <button type="button" onClick={onRetry} style={smallBtn}>Retry</button>}
    </div>
  );
}

export function SkeletonRows({ rows = 4, height = 64 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height, borderRadius: 14, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.4s ease infinite' }} />
      ))}
      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
    </div>
  );
}

export function BatchProgress({ batch }: { batch: CampusBatch | null }) {
  if (!batch) return null;
  const done = batch.processed + batch.failed;
  const pct = batch.total > 0 ? Math.round((done / batch.total) * 100) : 0;
  const result = (batch.result ?? {}) as Record<string, any>;
  const doneState = batch.status === 'COMPLETED' || batch.status === 'FAILED' || batch.status === 'CANCELLED';
  return (
    <div style={{ ...panelStyle, borderColor: doneState ? (batch.failed ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.35)') : 'rgba(251,191,36,0.35)', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>{batch.type.replaceAll('_', ' ')} · {batch.status}</strong>
        <span style={{ color: C.faint, fontSize: 12 }}>{done}/{batch.total} · {batch.failed} failed</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: batch.failed ? `linear-gradient(90deg, ${C.orange}, ${C.red})` : `linear-gradient(90deg, ${C.sky}, ${C.green})`, transition: 'width .4s ease' }} />
      </div>
      {batch.error && <span style={{ color: C.red, fontSize: 12 }}>{batch.error}</span>}
      {result.downloadUrl && (
        <a href={String(result.downloadUrl)} target="_blank" rel="noreferrer" style={{ ...smallBtn, color: C.sky, textDecoration: 'none', width: 'fit-content' }}>⬇ Download CSV</a>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 560 }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ width: `min(${width}px, 100%)`, maxHeight: '88vh', overflowY: 'auto', background: C.panel, border: `1px solid ${C.borderStrong}`, borderRadius: 22, padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ ...smallBtn, fontSize: 14 }}>✕</button>
        </div>
        {children}
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={{ color: C.faint, fontSize: 11 }}>{hint}</span>}
    </label>
  );
}

export function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function money(v: unknown, currency = 'INR') {
  const n = num(v);
  if (!n) return '—';
  const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '';
  return n >= 100000 ? `${sym}${(n / 100000).toFixed(2)}L` : `${sym}${n.toLocaleString()}`;
}
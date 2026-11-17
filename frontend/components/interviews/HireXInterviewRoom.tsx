'use client';
/**
 * HireXInterviewRoom — HireX interview studio.
 * Green room now has live mic / camera on-off controls; the chosen state is
 * carried into the room when joining. In-room: mirror-safe screen share,
 * recruiter-only scorecard / recording / end, candidate Leave only.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api, { interviewApi } from '@/lib/axios';
import { useAuth } from '@/components/providers/AuthProvider';
import { useInterviewRoom, type JoinPreferences } from '@/hooks/useInterviewRoom';

interface RoomInfo {
  id: string; interviewId?: string; roundId?: string; jobTitle?: string; companyName?: string;
  candidateName?: string; recruiterName?: string; roundNumber?: number; roundType?: string;
  durationMins?: number; scheduledAt?: string | null;
}
interface Tile {
  id: string; name: string; role: 'candidate' | 'recruiter' | 'observer';
  stream: MediaStream | null; videoOn: boolean; micOn: boolean;
  isScreen: boolean; presenting: boolean;
  isLocal: boolean; speaking: boolean; connected: boolean; link: string;
}
interface ChatMsg { id: string; sender: string; text: string; time: string; isMe: boolean; role: string }
interface TranscriptLine { id: string; speaker: string; text: string; time: string }
interface Note { id: string; text: string; tag: 'positive' | 'concern' | 'neutral'; time: string }
type Verdict = 'SHORTLIST' | 'REVIEW' | 'REJECT' | null;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type CriterionKey = 'technical' | 'communication' | 'problemSolving' | 'cultureFit';
type Scores = Record<CriterionKey, { checked: boolean; rating: number }>;

const CRITERIA: { key: CriterionKey; label: string; desc: string; icon: string }[] = [
  { key: 'technical', label: 'Technical Depth', desc: 'Role skills, coding & design understanding', icon: '💻' },
  { key: 'communication', label: 'Communication', desc: 'Clarity, structure, explanation quality', icon: '🗣️' },
  { key: 'problemSolving', label: 'Problem Solving', desc: 'Reasoning, debugging, trade-off thinking', icon: '🧩' },
  { key: 'cultureFit', label: 'Culture Fit', desc: 'Ownership, collaboration, attitude', icon: '🤝' },
];
const INITIAL_SCORES: Scores = {
  technical: { checked: true, rating: 0 }, communication: { checked: true, rating: 0 },
  problemSolving: { checked: true, rating: 0 }, cultureFit: { checked: true, rating: 0 },
};
const RATE_WORDS = ['Not rated', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'];

const P = {
  ink: '#05070F', surface: '#111827', surfaceAlt: '#161E2E',
  border: 'rgba(148,163,184,0.16)', borderStrong: 'rgba(148,163,184,0.3)',
  text: '#F0F4FF', muted: 'rgba(230,236,255,0.6)', faint: 'rgba(230,236,255,0.34)',
  violet: '#8B5CF6', violetLight: '#A78BFA', blue: '#3B82F6', cyan: '#22D3EE',
  green: '#10B981', greenLight: '#34D399', amber: '#F59E0B', amberLight: '#FCD34D',
  red: '#EF4444', redLight: '#F87171', gold: '#FBBF24', teal: '#14B8A6',
};
const BRAND = 'linear-gradient(135deg,#6366F1 0%,#8B5CF6 45%,#22D3EE 100%)';
const DANGER = 'linear-gradient(135deg,#EF4444,#F97316)';

const uid = () => Math.random().toString(36).slice(2, 10);
const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
function fmt(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60, h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'HX';
const roleColor = (r: string) => (r === 'recruiter' ? P.violet : r === 'candidate' ? P.cyan : P.teal);
function verdictMeta(v: Verdict) {
  if (v === 'SHORTLIST') return { color: P.green, grad: 'linear-gradient(135deg,#10B981,#14B8A6)', label: 'Shortlist', emoji: '✅' };
  if (v === 'REVIEW') return { color: P.amber, grad: 'linear-gradient(135deg,#F59E0B,#FBBF24)', label: 'Review', emoji: '🔍' };
  if (v === 'REJECT') return { color: P.red, grad: DANGER, label: 'Reject', emoji: '📋' };
  return { color: P.muted, grad: 'linear-gradient(135deg,#475569,#64748B)', label: 'No verdict', emoji: '—' };
}
const suggestVerdict = (avg: number): Verdict => (avg >= 4 ? 'SHORTLIST' : avg >= 2.5 ? 'REVIEW' : avg > 0 ? 'REJECT' : null);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
.hx *{box-sizing:border-box}
.hx ::-webkit-scrollbar{width:8px;height:8px}
.hx ::-webkit-scrollbar-track{background:transparent}
.hx ::-webkit-scrollbar-thumb{background:rgba(139,92,246,.35);border-radius:8px}
.hx ::-webkit-scrollbar-thumb:hover{background:rgba(139,92,246,.6)}
.hx{scrollbar-width:thin;scrollbar-color:rgba(139,92,246,.45) transparent}
@keyframes hx-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes hx-spin{to{transform:rotate(360deg)}}
@keyframes hx-eq{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
@keyframes hx-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes hx-glow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.35)}50%{box-shadow:0 0 0 6px rgba(16,185,129,0)}}
.hx-rise{animation:hx-rise .35s ease both}
.hx-tip{position:relative}
.hx-tip::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(4px);background:#0B1020;border:1px solid rgba(148,163,184,.3);color:#E2E8F0;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;opacity:0;pointer-events:none;transition:all .15s;z-index:90}
.hx-tip:hover::after{opacity:1;transform:translateX(-50%) translateY(0)}
.hx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;border:1px solid rgba(148,163,184,.2);background:rgba(255,255,255,.06);color:#F0F4FF;font:700 12px 'Sora',sans-serif;padding:10px 14px;cursor:pointer;transition:all .15s}
.hx-btn:hover{background:rgba(255,255,255,.12)}
.hx-btn:disabled{opacity:.45;cursor:not-allowed}
.hx-input{width:100%;border-radius:12px;border:1px solid rgba(148,163,184,.2);background:rgba(5,7,15,.6);color:#F0F4FF;font:400 13px 'Sora',sans-serif;padding:10px 12px;outline:none}
.hx-input:focus{border-color:rgba(139,92,246,.6)}
.hx-pj-toggle{background:none;border:none;padding:0;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;font-family:'Sora',sans-serif}
.hx-pj-toggle:disabled{cursor:not-allowed;opacity:.45}
.hx-pj-circle{transition:transform .15s ease, background .15s ease, box-shadow .15s ease}
.hx-pj-toggle:hover:not(:disabled) .hx-pj-circle{transform:scale(1.07)}
.hx-pj-toggle:active:not(:disabled) .hx-pj-circle{transform:scale(.96)}
`;

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const Icon = {
  mic: (off?: boolean) => off ? <svg width="20" height="20" viewBox="0 0 24 24" {...S}><line x1="2" y1="2" x2="22" y2="22" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="22" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
  cam: (off?: boolean) => off ? <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34" /><path d="M23 7l-7 5 7 5V7z" /><line x1="2" y1="2" x2="22" y2="22" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" {...S}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
  screen: () => <svg width="20" height="20" viewBox="0 0 24 24" {...S}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  chat: () => <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  people: () => <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  spark: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>,
  rec: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>,
  end: () => <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88 19.73 19.73 0 0 1 1.36 1.18 2 2 0 0 1 3.36 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.5 8.68" /><line x1="23" y1="1" x2="1" y2="23" /></svg>,
  close: () => <svg width="16" height="16" viewBox="0 0 24 24" {...S} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  send: () => <svg width="16" height="16" viewBox="0 0 24 24" {...S}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  check: () => <svg width="12" height="12" viewBox="0 0 24 24" {...S} strokeWidth={3.2}><polyline points="20 6 9 17 4 12" /></svg>,
  pin: () => <svg width="14" height="14" viewBox="0 0 24 24" {...S}><path d="M12 17v5" /><path d="M9 3h6l1 7 3 2v2H5v-2l3-2z" /></svg>,
};
const Star = ({ on, size = 20 }: { on: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={on ? 0 : 1.5} strokeLinejoin="round"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" /></svg>
);

function ScoreRing({ value, size = 88 }: { value: number; size?: number }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  const color = value >= 80 ? P.green : value >= 50 ? P.amber : value > 0 ? P.red : 'rgba(148,163,184,.3)';
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(148,163,184,.15)" strokeWidth={7} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .5s' }} />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill={value > 0 ? color : P.faint} fontSize={size * 0.26} fontWeight={800} fontFamily="monospace">{value > 0 ? value : '—'}</text>
      <text x="50%" y="66%" textAnchor="middle" fill={P.faint} fontSize={size * 0.11} fontWeight={700}>/ 100</text>
    </svg>
  );
}
function Stars({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div style={{ display: 'flex', gap: 3 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onMouseEnter={() => setHover(n)} onClick={() => onChange(value === n ? 0 : n)}
          style={{ background: 'none', border: 'none', padding: 2, cursor: disabled ? 'not-allowed' : 'pointer', color: n <= active ? P.gold : 'rgba(148,163,184,.35)', filter: n <= active ? 'drop-shadow(0 0 6px rgba(251,191,36,.5))' : 'none', opacity: disabled ? 0.4 : 1 }}>
          <Star on={n <= active} />
        </button>
      ))}
    </div>
  );
}
const Eq = () => <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 12 }}>{[0, 1, 2].map((i) => <i key={i} style={{ width: 3, height: 12, borderRadius: 2, background: P.greenLight, animation: `hx-eq .5s ${i * 0.12}s infinite alternate` }} />)}</span>;

function VideoTile({ t, large, pinned, onPin, onReconnect, onStopShare }: {
  t: Tile; large?: boolean; pinned?: boolean;
  onPin?: (id: string) => void; onReconnect?: (id: string) => void; onStopShare?: () => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const attach = useCallback((el: HTMLVideoElement | null) => {
    ref.current = el;
    if (el) { el.srcObject = t.stream; if (t.stream) void el.play().catch(() => {}); }
  }, [t.stream]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.srcObject = t.stream;
    if (t.stream) void el.play().catch(() => {});
  }, [t.stream]);
  const live = t.videoOn && !!t.stream?.getVideoTracks().some((tr) => tr.readyState === 'live' && tr.enabled);
  const rc = roleColor(t.role);
  const conn = !t.connected ? P.amber : t.link === 'connected' ? P.green : t.link === 'failed' ? P.red : P.amber;
  const showPresentCard = t.isLocal && t.presenting && !live;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: large ? 300 : 180, borderRadius: 18, overflow: 'hidden', background: t.isScreen ? '#000' : 'linear-gradient(150deg,#0D1525,#0A0F1E)', border: t.speaking ? `2px solid ${P.green}` : pinned ? `2px solid ${P.violet}` : t.presenting || t.isScreen ? `2px solid ${P.green}` : `1px solid ${P.border}`, boxShadow: t.speaking ? '0 0 0 3px rgba(16,185,129,.18)' : t.presenting || t.isScreen ? '0 0 0 3px rgba(16,185,129,.12)' : 'none' }}>
      <video ref={attach} autoPlay playsInline muted={t.isLocal} onCanPlay={(e) => void e.currentTarget.play().catch(() => {})}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: t.isScreen ? 'contain' : 'cover', background: t.isScreen ? '#000' : 'transparent', display: live ? 'block' : 'none', transform: t.isLocal && !t.isScreen ? 'scaleX(-1)' : 'none' }} />
      {showPresentCard && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: 'radial-gradient(circle at 50% 30%, rgba(16,185,129,.14), transparent 60%), linear-gradient(150deg,#0D1525,#0A0F1E)' }}>
          <div style={{ width: large ? 84 : 60, height: large ? 84 : 60, borderRadius: 22, display: 'grid', placeItems: 'center', color: P.greenLight, background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.4)', animation: 'hx-glow 2s infinite' }}>{Icon.screen()}</div>
          <div>
            <p style={{ margin: 0, fontSize: large ? 18 : 14, fontWeight: 800, color: P.text }}>You&apos;re presenting</p>
            <p style={{ margin: '6px auto 0', maxWidth: 340, fontSize: 12, lineHeight: 1.6, color: P.muted }}>Participants can see your screen. Your own preview is hidden here to prevent the infinite-mirror effect.</p>
          </div>
          {onStopShare && <button onClick={onStopShare} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', background: DANGER, color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>{Icon.screen()} Stop sharing</button>}
        </div>
      )}
      {!live && !showPresentCard && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: large ? 88 : 56, height: large ? 88 : 56, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: large ? 30 : 20, fontWeight: 800, color: rc, background: `${rc}1e`, border: `2px solid ${rc}55` }}>{initials(t.name)}</div>
          <span style={{ fontSize: 12, color: P.muted }}>{t.videoOn ? 'Connecting…' : 'Camera off'}</span>
        </div>
      )}
      <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 8, fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: rc, background: `${rc}1e`, border: `1px solid ${rc}44`, backdropFilter: 'blur(8px)' }}>{t.role}</span>
      {(t.isScreen || t.presenting) && (
        <span style={{ position: 'absolute', top: 10, right: onPin ? 48 : 10, padding: '4px 9px', borderRadius: 8, fontSize: 9, fontWeight: 800, color: P.greenLight, background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.green, animation: 'hx-pulse 1.2s infinite' }} />
          {t.presenting ? 'PRESENTING' : 'SCREEN'}
        </span>
      )}
      {onPin && <button onClick={() => onPin(t.id)} title={pinned ? 'Unpin' : 'Pin'} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 10, border: '1px solid rgba(148,163,184,.3)', background: 'rgba(5,7,15,.65)', color: '#E2E8F0', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.pin()}</button>}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '26px 12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'linear-gradient(to top,rgba(0,0,0,.78),transparent)' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}{t.isLocal ? ' (You)' : ''}</span>
          {t.speaking && <Eq />}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!t.isLocal && <span style={{ width: 8, height: 8, borderRadius: '50%', background: conn, boxShadow: `0 0 8px ${conn}` }} />}
          {!t.isLocal && t.link === 'failed' && onReconnect && <button className="hx-btn" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => onReconnect(t.id)}>Retry</button>}
          {!t.micOn && <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 8, background: 'rgba(239,68,68,.85)', color: '#fff' }}>{Icon.mic(true)}</span>}
        </span>
      </div>
    </div>
  );
}

/* ── Green-room device toggle (mic / camera) ── */
function DeviceToggle({ on, disabled, onClick, onIcon, offIcon, label, tip }: {
  on: boolean; disabled?: boolean; onClick: () => void;
  onIcon: ReactNode; offIcon: ReactNode; label: string; tip: string;
}) {
  return (
    <button type="button" className="hx-pj-toggle hx-tip" data-tip={tip} disabled={disabled} onClick={onClick} aria-pressed={on} aria-label={tip}>
      <span className="hx-pj-circle" style={{
        width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center',
        color: '#fff',
        background: on ? 'rgba(8,12,24,.78)' : 'rgba(239,68,68,.94)',
        border: on ? '1px solid rgba(148,163,184,.4)' : '1px solid rgba(248,113,113,.7)',
        backdropFilter: 'blur(12px)',
        boxShadow: on ? '0 10px 28px rgba(0,0,0,.45)' : '0 10px 28px rgba(239,68,68,.4)',
      }}>
        {on ? onIcon : offIcon}
      </span>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.04em', color: on ? 'rgba(240,244,255,.9)' : '#FCA5A5', textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{label}</span>
    </button>
  );
}

function PreJoin({ info, name, isRecruiter, joining, onJoin, onBack }: {
  info: RoomInfo; name: string; isRecruiter: boolean; joining: boolean;
  onJoin: (prefs: JoinPreferences) => void; onBack: () => void;
}) {
  const vRef = useRef<HTMLVideoElement>(null);
  const mRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<MediaStream | null>(null);
  const cRef = useRef<AudioContext | null>(null);
  const rRef = useRef(0);
  const [camHardware, setCamHardware] = useState<'pending' | 'ok' | 'off'>('pending');
  const [micHardware, setMicHardware] = useState<'pending' | 'ok' | 'off'>('pending');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const micOnRef = useRef(true);
  const camOnRef = useRef(true);

  const stop = useCallback(() => {
    cancelAnimationFrame(rRef.current);
    void cRef.current?.close().catch(() => {}); cRef.current = null;
    sRef.current?.getTracks().forEach((t) => t.stop()); sRef.current = null;
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (dead) { s.getTracks().forEach((t) => t.stop()); return; }
        sRef.current = s;
        s.getAudioTracks().forEach((t) => { t.enabled = micOnRef.current; });
        s.getVideoTracks().forEach((t) => { t.enabled = camOnRef.current; });
        if (vRef.current) { vRef.current.srcObject = s; void vRef.current.play().catch(() => {}); }
        setCamHardware(s.getVideoTracks().length ? 'ok' : 'off');
        setMicHardware(s.getAudioTracks().length ? 'ok' : 'off');
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC && s.getAudioTracks().length) {
          const ctx = new AC(); cRef.current = ctx;
          const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(s).connect(an);
          const buf = new Uint8Array(an.fftSize);
          const loop = () => {
            an.getByteTimeDomainData(buf);
            let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
            const level = micOnRef.current ? Math.min(1, Math.sqrt(sum / buf.length) * 3.2) : 0;
            if (mRef.current) mRef.current.style.transform = `scaleX(${level})`;
            rRef.current = requestAnimationFrame(loop);
          };
          loop();
        }
      } catch { if (!dead) { setCamHardware('off'); setMicHardware('off'); } }
    })();
    return () => { dead = true; stop(); };
  }, [stop]);

  const toggleMic = () => {
    const next = !micOnRef.current;
    micOnRef.current = next; setMicOn(next);
    sRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
  };
  const toggleCam = () => {
    const next = !camOnRef.current;
    camOnRef.current = next; setCamOn(next);
    sRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
  };
  const handleJoin = () => { stop(); onJoin({ micOn: micOnRef.current, camOn: camOnRef.current }); };

  const camAvailable = camHardware === 'ok';
  const micAvailable = micHardware === 'ok';
  const showVideo = camAvailable && camOn;
  const joinCamOn = camAvailable && camOn;
  const joinMicOn = micAvailable && micOn;

  const chip = (label: string, state: 'ok' | 'off' | 'pending') => (
    <span style={{
      padding: '6px 11px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '.03em',
      display: 'inline-flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(10px)',
      color: state === 'ok' ? P.greenLight : state === 'off' ? P.redLight : P.muted,
      background: state === 'ok' ? 'rgba(16,185,129,.16)' : state === 'off' ? 'rgba(239,68,68,.16)' : 'rgba(255,255,255,.1)',
      border: `1px solid ${state === 'ok' ? 'rgba(16,185,129,.45)' : state === 'off' ? 'rgba(239,68,68,.45)' : 'rgba(148,163,184,.35)'}`,
    }}>
      {state === 'ok' ? '✓' : state === 'off' ? '✕' : '…'} {label}
    </span>
  );

  return (
    <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'grid', placeItems: 'center', padding: 24, overflowY: 'auto' }}>
      <div className="hx-rise" style={{ width: 'min(940px,100%)', display: 'grid', gridTemplateColumns: '1.15fr .85fr', borderRadius: 26, border: '1px solid rgba(148,163,184,.22)', background: 'rgba(13,18,32,.85)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.5)' }}>
        {/* Preview + device controls */}
        <div style={{ position: 'relative', background: '#05070F', minHeight: 360 }}>
          <video ref={vRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: showVideo ? 'block' : 'none' }} />
          {!showVideo && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'radial-gradient(circle at 50% 32%, rgba(139,92,246,.14), transparent 62%), #05070F' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 800, color: isRecruiter ? P.violetLight : P.cyan, background: 'rgba(255,255,255,.05)', border: `2px solid ${isRecruiter ? P.violet : P.cyan}66`, boxShadow: `0 0 46px ${isRecruiter ? P.violet : P.cyan}33` }}>
                {initials(name)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: P.muted }}>
                {camHardware === 'pending' ? 'Starting camera…' : camAvailable ? 'Camera is off' : 'Camera unavailable'}
              </span>
            </div>
          )}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8, zIndex: 3 }}>
            {chip(camHardware === 'pending' ? 'Camera…' : camAvailable ? (camOn ? 'Camera on' : 'Camera off') : 'No camera', camHardware === 'pending' ? 'pending' : joinCamOn ? 'ok' : 'off')}
            {chip(micHardware === 'pending' ? 'Mic…' : micAvailable ? (micOn ? 'Mic on' : 'Mic off') : 'No mic', micHardware === 'pending' ? 'pending' : joinMicOn ? 'ok' : 'off')}
          </div>
          {/* Mic / camera on-off controls */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, display: 'flex', justifyContent: 'center', gap: 22, zIndex: 4 }}>
            <DeviceToggle on={micOn} disabled={!micAvailable && micHardware !== 'pending'} onClick={toggleMic}
              onIcon={Icon.mic(false)} offIcon={Icon.mic(true)} label={micOn ? 'Mic on' : 'Mic off'} tip={micOn ? 'Turn off microphone' : 'Turn on microphone'} />
            <DeviceToggle on={camOn} disabled={!camAvailable && camHardware !== 'pending'} onClick={toggleCam}
              onIcon={Icon.cam(false)} offIcon={Icon.cam(true)} label={camOn ? 'Camera on' : 'Camera off'} tip={camOn ? 'Turn off camera' : 'Turn on camera'} />
          </div>
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden', opacity: micOn ? 1 : 0.35, transition: 'opacity .2s' }}>
            <div ref={mRef} style={{ height: '100%', width: '100%', transformOrigin: 'left', transform: 'scaleX(0)', background: 'linear-gradient(90deg,#10B981,#22D3EE)' }} />
          </div>
        </div>
        {/* Join panel */}
        <div style={{ padding: '30px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ alignSelf: 'flex-start', padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: isRecruiter ? P.violetLight : P.cyan, border: `1px solid ${isRecruiter ? P.violet : P.cyan}55`, background: `${isRecruiter ? P.violet : P.cyan}14` }}>{isRecruiter ? 'RECRUITER' : 'CANDIDATE'}</span>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800 }}>{info.jobTitle ?? 'Interview'}</h1>
            <p style={{ margin: 0, fontSize: 12, color: P.muted }}>Round {info.roundNumber ?? 1} · {(info.roundType ?? 'technical').toUpperCase()} · {info.durationMins ?? 45} min</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Candidate', info.candidateName], ['Recruiter', info.recruiterName]].map(([l, v]) => (
              <div key={l} style={{ padding: '12px 14px', borderRadius: 14, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.03)' }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: P.faint }}>{String(l).toUpperCase()}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{v ?? '—'}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(34,211,238,.25)', background: 'rgba(34,211,238,.06)', fontSize: 11, color: P.muted, lineHeight: 1.7 }}>
            You&apos;ll join as <strong style={{ color: P.text }}>{name}</strong> with{' '}
            <strong style={{ color: joinCamOn ? P.greenLight : P.redLight }}>{joinCamOn ? 'camera on' : 'camera off'}</strong> and{' '}
            <strong style={{ color: joinMicOn ? P.greenLight : P.redLight }}>{joinMicOn ? 'mic on' : 'mic off'}</strong>.
            You can change this any time in the room.
          </div>
          <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
            <button className="hx-btn" disabled={joining} onClick={handleJoin} style={{ border: 'none', background: BRAND, color: '#fff', padding: '14px 16px', fontSize: 14, fontWeight: 800 }}>
              {joining ? 'Connecting…' : 'Join Interview Room →'}
            </button>
            <button className="hx-btn" onClick={onBack}>Go back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantPanel(props: {
  info: RoomInfo; transcript: TranscriptLine[]; scores: Scores;
  onScore: (k: CriterionKey, p: Partial<{ checked: boolean; rating: number }>) => void;
  verdict: Verdict; onVerdict: (v: Verdict) => void; overall: number; avg: number; rated: number;
  notes: Note[]; onNote: (t: string) => void; saveState: SaveState; onSave: () => void; onClose: () => void;
}) {
  const { info, transcript, scores, onScore, verdict, onVerdict, overall, avg, rated, notes, onNote, saveState, onSave, onClose } = props;
  const [tab, setTab] = useState<'score' | 'notes' | 'transcript'>('score');
  const [draft, setDraft] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const analyze = useCallback(async () => {
    if (!transcript.length) return;
    setLoading(true);
    try {
      const res = await api.post('/live-interview/assistant', {
        roomId: info.id, transcript: transcript.slice(-20).map((l) => `${l.speaker}: ${l.text}`).join('\n'),
        currentQuestion: null, role: info.jobTitle ?? 'Software Engineer', skills: [],
      });
      const d = res.data as { suggestedFollowUp?: string; suggestedScore?: number };
      setInsight(d.suggestedFollowUp ?? '');
      setAiScore(typeof d.suggestedScore === 'number' ? Math.max(1, Math.min(5, Math.round(d.suggestedScore / 20))) : null);
    } catch { setInsight('AI assistant unavailable — rate manually below.'); }
    finally { setLoading(false); }
  }, [transcript, info.id, info.jobTitle]);
  return (
    <div style={{ width: 344, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: `1px solid ${P.border}`, background: 'rgba(13,18,32,.9)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${P.border}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: P.text }}><span style={{ color: P.violetLight }}>{Icon.spark()}</span> AI Assistant</span>
        <button className="hx-btn" style={{ padding: 6 }} onClick={onClose}>{Icon.close()}</button>
      </div>
      <div style={{ display: 'flex', borderBottom: `1px solid ${P.border}` }}>
        {(['score', 'notes', 'transcript'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: tab === t ? `2px solid ${P.violet}` : '2px solid transparent', color: tab === t ? P.violetLight : P.muted, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
            {t === 'score' ? '★ Scorecard' : t === 'notes' ? 'Notes' : 'Transcript'}
          </button>
        ))}
      </div>
      <div className="hx" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
        {tab === 'score' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, borderRadius: 16, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.03)' }}>
              <ScoreRing value={overall} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: P.faint }}>OVERALL</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: overall >= 80 ? P.greenLight : overall >= 50 ? P.amberLight : overall > 0 ? P.redLight : P.muted }}>{avg > 0 ? avg.toFixed(1) : '—'} <span style={{ fontSize: 12, color: P.faint }}>/ 5</span></p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: P.faint }}>{rated} of {CRITERIA.length} rated</p>
              </div>
            </div>
            {CRITERIA.map((c) => {
              const s = scores[c.key];
              return (
                <div key={c.key} style={{ padding: 12, borderRadius: 14, border: `1px solid ${s.checked && s.rating > 0 ? 'rgba(251,191,36,.3)' : P.border}`, background: s.checked ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.015)', opacity: s.checked ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <button role="checkbox" aria-checked={s.checked} onClick={() => onScore(c.key, { checked: !s.checked })} style={{ width: 20, height: 20, borderRadius: 6, border: s.checked ? 'none' : '1.5px solid rgba(148,163,184,.4)', background: s.checked ? BRAND : 'rgba(255,255,255,.04)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>{s.checked && Icon.check()}</button>
                    <span style={{ fontSize: 15 }}>{c.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: P.text }}>{c.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: P.faint }}>{c.desc}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: s.rating > 0 ? P.gold : P.faint }}>{s.checked ? (s.rating > 0 ? `${s.rating}/5` : '—') : 'skip'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stars value={s.rating} disabled={!s.checked} onChange={(n) => onScore(c.key, { rating: n, checked: true })} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.rating >= 4 ? P.greenLight : s.rating >= 3 ? P.amberLight : s.rating > 0 ? P.redLight : P.faint }}>{s.checked ? RATE_WORDS[s.rating] : 'Not included'}</span>
                  </div>
                </div>
              );
            })}
            {insight && (
              <div style={{ padding: 12, borderRadius: 14, border: '1px solid rgba(139,92,246,.35)', background: 'rgba(139,92,246,.08)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: P.violetLight, display: 'flex', gap: 6, alignItems: 'center' }}>{Icon.spark()} FOLLOW-UP</p>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: P.text }}>{insight}</p>
                {aiScore !== null && <button className="hx-btn" style={{ marginTop: 10, padding: '6px 10px', fontSize: 10, color: P.gold }} onClick={() => onScore('technical', { checked: true, rating: aiScore })}>Apply AI rating ({aiScore}/5)</button>}
              </div>
            )}
            <button className="hx-btn" disabled={loading || !transcript.length} onClick={() => void analyze()} style={{ borderColor: 'rgba(139,92,246,.45)', background: 'rgba(139,92,246,.14)', color: P.violetLight }}>{loading ? 'Analyzing…' : '✦ Analyze Transcript'}</button>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: P.faint }}>FINAL VERDICT</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {(['SHORTLIST', 'REVIEW', 'REJECT'] as Verdict[]).map((v) => {
                  const m = verdictMeta(v); const on = verdict === v;
                  return <button key={v} className="hx-btn" onClick={() => onVerdict(v)} style={on ? { borderColor: m.color, background: `${m.color}1c`, color: m.color } : { fontSize: 11 }}>{m.emoji} {m.label}</button>;
                })}
              </div>
              <button className="hx-btn" style={{ width: '100%', marginTop: 8, fontSize: 11 }} disabled={avg <= 0} onClick={() => onVerdict(suggestVerdict(avg))}>Auto-suggest from stars</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${P.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: saveState === 'saved' ? P.greenLight : saveState === 'error' ? P.redLight : P.faint }}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Save failed' : 'Not saved'}</span>
              <button className="hx-btn" style={{ padding: '7px 12px', fontSize: 11 }} disabled={saveState === 'saving'} onClick={onSave}>Save</button>
            </div>
          </div>
        )}
        {tab === 'notes' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {notes.length === 0 && <p style={{ color: P.faint, fontSize: 12, textAlign: 'center', margin: '18px 0' }}>No notes yet. Prefix + for strengths, - for concerns.</p>}
            {notes.map((n) => (
              <div key={n.id} style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${n.tag === 'positive' ? 'rgba(16,185,129,.3)' : n.tag === 'concern' ? 'rgba(239,68,68,.3)' : P.border}`, background: 'rgba(255,255,255,.03)', display: 'flex', gap: 9 }}>
                <span>{n.tag === 'positive' ? '✓' : n.tag === 'concern' ? '⚠' : '•'}</span>
                <div><p style={{ margin: 0, fontSize: 12, color: P.text }}>{n.text}</p><span style={{ fontSize: 10, color: P.faint }}>{n.time}</span></div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="hx-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onNote(draft.trim()); setDraft(''); } }} placeholder="+ strong answer, - missed edge case…" />
              <button className="hx-btn" style={{ background: BRAND, border: 'none', color: '#fff' }} onClick={() => { if (draft.trim()) { onNote(draft.trim()); setDraft(''); } }}>{Icon.send()}</button>
            </div>
          </div>
        )}
        {tab === 'transcript' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {transcript.length === 0 ? <p style={{ color: P.faint, fontSize: 12, textAlign: 'center', margin: '18px 0' }}>Transcript appears as the interview progresses.</p> : transcript.map((l) => (
              <div key={l.id} style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 10, fontWeight: 800, color: P.violetLight }}>{l.speaker}</span><span style={{ fontSize: 10, color: P.faint }}>{l.time}</span></div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: P.text }}>{l.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ messages, onSend, onClose }: { messages: ChatMsg[]; onSend: (t: string) => void; onClose: () => void }) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  const send = () => { const t = input.trim(); if (!t) return; onSend(t); setInput(''); };
  return (
    <div style={{ width: 344, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: `1px solid ${P.border}`, background: 'rgba(13,18,32,.9)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: P.text }}>{Icon.chat()} In-call chat</span>
        <button className="hx-btn" style={{ padding: 6 }} onClick={onClose}>{Icon.close()}</button>
      </div>
      <div className="hx" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && <p style={{ color: P.faint, fontSize: 12, textAlign: 'center', marginTop: 20 }}>No messages yet. Say hello 👋</p>}
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.isMe ? 'flex-end' : 'flex-start' }}>
            {!m.isMe && <span style={{ fontSize: 10, fontWeight: 700, color: roleColor(m.role), marginBottom: 3 }}>{m.sender}</span>}
            <div style={{ maxWidth: '85%', padding: '9px 12px', fontSize: 12, lineHeight: 1.5, borderRadius: 14, color: '#fff', background: m.isMe ? BRAND : 'rgba(255,255,255,.07)', border: m.isMe ? 'none' : `1px solid ${P.border}`, borderBottomRightRadius: m.isMe ? 4 : 14, borderBottomLeftRadius: m.isMe ? 14 : 4 }}>{m.text}</div>
            <span style={{ fontSize: 9, color: P.faint, marginTop: 3 }}>{m.time}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px 14px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
        <input className="hx-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message everyone…" />
        <button className="hx-btn" style={{ background: BRAND, border: 'none', color: '#fff', padding: '10px 13px' }} onClick={send}>{Icon.send()}</button>
      </div>
    </div>
  );
}

function EndModal({ verdict, overall, scores, info, onConfirm, onCancel }: {
  verdict: Verdict; overall: number; scores: Scores; info: RoomInfo;
  onConfirm: (v: Verdict, notes: string) => void; onCancel: () => void;
}) {
  const [v, setV] = useState<Verdict>(verdict);
  const [notes, setNotes] = useState('');
  const m = verdictMeta(v);
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(3,5,12,.8)', backdropFilter: 'blur(12px)' }}>
      <div onClick={(e) => e.stopPropagation()} className="hx hx-rise" style={{ width: 'min(480px,100%)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, border: '1px solid rgba(148,163,184,.25)', background: 'linear-gradient(160deg,#111827,#0A0F1E)', padding: 26 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: P.text }}>End Interview</h2>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: P.muted }}>Ending <strong style={{ color: P.text }}>{info.jobTitle}</strong> with {info.candidateName ?? 'Candidate'}</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 14, borderRadius: 16, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.03)', marginBottom: 18 }}>
          <ScoreRing value={overall} size={76} />
          <div style={{ flex: 1, display: 'grid', gap: 5 }}>
            {CRITERIA.map((c) => (
              <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: P.muted }}>{c.label}</span>
                <span style={{ display: 'flex', gap: 1, color: scores[c.key].checked && scores[c.key].rating > 0 ? P.gold : 'rgba(148,163,184,.3)' }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} on={scores[c.key].checked && n <= scores[c.key].rating} size={11} />)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {(['SHORTLIST', 'REVIEW', 'REJECT'] as Verdict[]).map((x) => {
            const xm = verdictMeta(x); const on = v === x;
            return <button key={x} className="hx-btn" onClick={() => setV(x)} style={on ? { borderColor: xm.color, background: `${xm.color}1c`, color: xm.color } : { fontSize: 11 }}>{xm.emoji} {xm.label}</button>;
          })}
        </div>
        <textarea className="hx-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Summary, key observations, reasons…" style={{ resize: 'vertical', lineHeight: 1.6 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="hx-btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="hx-btn" style={{ flex: 2, border: 'none', background: m.grad, color: '#fff', fontWeight: 800 }} onClick={() => onConfirm(v, notes)}>{m.emoji} {m.label} &amp; End</button>
        </div>
      </div>
    </div>
  );
}

export default function HireXInterviewRoom({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const role = String((user as { role_normalized?: string } | null)?.role_normalized ?? user?.role ?? '').toLowerCase();
  const isRecruiter = role === 'recruiter';
  const displayName = user?.full_name ?? user?.email?.split('@')[0] ?? 'You';

  const [info, setInfo] = useState<RoomInfo>({ id: roomId });
  const [infoLoading, setInfoLoading] = useState(true);
  const [panel, setPanel] = useState<'chat' | 'people' | 'assistant' | null>(null);
  const [unread, setUnread] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>(INITIAL_SCORES);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [notes, setNotes] = useState<Note[]>([]);
  const prevChat = useRef(0);

  const room = useInterviewRoom({
    roomId,
    onRemoteTranscript: (l) => setTranscript((p) => [...p.slice(-199), { id: uid(), speaker: l.name, text: l.text, time: nowTime() }]),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/interviews/room/${roomId}/info`);
        const i = data?.info;
        if (alive && i) setInfo({ id: roomId, interviewId: i.interviewId, roundId: i.roundId, jobTitle: i.jobTitle, companyName: i.companyName, candidateName: i.candidateName, recruiterName: i.recruiterName, roundNumber: i.roundNumber, roundType: i.roundType, durationMins: i.durationMins, scheduledAt: i.scheduledAt });
      } catch { /* slug fallback */ }
      finally { if (alive) setInfoLoading(false); }
    })();
    return () => { alive = false; };
  }, [roomId]);

  useEffect(() => {
    if (room.status !== 'joined') return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [room.status]);

  useEffect(() => {
    if (room.status !== 'joined' || !room.micOn) return;
    const Ctor = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const text = String(e.results[i][0].transcript ?? '').trim();
        if (!text) continue;
        if (isRecruiter) setTranscript((p) => [...p.slice(-199), { id: uid(), speaker: displayName, text, time: nowTime() }]);
        else room.sendTranscript(text);
      }
    };
    rec.onerror = () => {};
    try { rec.start(); } catch { /* unsupported */ }
    return () => { try { rec.stop(); } catch { /* noop */ } };
  }, [room.status, room.micOn, isRecruiter, displayName, room.sendTranscript]);

  useEffect(() => {
    if (room.chat.length > prevChat.current && panel !== 'chat') setUnread((n) => n + (room.chat.length - prevChat.current));
    prevChat.current = room.chat.length;
  }, [room.chat.length, panel]);

  useEffect(() => {
    if (!isRecruiter || room.status !== 'joined' || hydrated) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/interviews/room/${roomId}/scorecard`);
        const rubric = data?.scorecard?.rubric;
        if (alive && Array.isArray(rubric?.criteria)) {
          setScores((prev) => {
            const next = { ...prev };
            for (const c of rubric.criteria as { key: string; checked?: boolean; score?: number }[]) {
              if (c.key in next) next[c.key as CriterionKey] = { checked: c.checked !== false, rating: Math.max(0, Math.min(5, Number(c.score) || 0)) };
            }
            return next;
          });
          const r = rubric.recommendation;
          if (r === 'hire' || r === 'strong_hire') setVerdict('SHORTLIST');
          else if (r === 'reject' || r === 'strong_reject') setVerdict('REJECT');
          else if (r === 'hold') setVerdict('REVIEW');
        }
      } catch { /* none saved */ }
      finally { if (alive) setHydrated(true); }
    })();
    return () => { alive = false; };
  }, [isRecruiter, room.status, roomId, hydrated]);

  const { overall, avg, rated } = useMemo(() => {
    const list = CRITERIA.filter((c) => scores[c.key].checked && scores[c.key].rating > 0);
    const a = list.length ? list.reduce((s, c) => s + scores[c.key].rating, 0) / list.length : 0;
    return { overall: Math.round(a * 20), avg: a, rated: list.length };
  }, [scores]);

  const onScore = useCallback((k: CriterionKey, p: Partial<{ checked: boolean; rating: number }>) => {
    setScores((prev) => ({ ...prev, [k]: { ...prev[k], ...p } }));
    setSaveState('idle');
  }, []);
  const saveScorecard = useCallback(async () => {
    if (!isRecruiter) return;
    setSaveState('saving');
    try {
      await api.post(`/interviews/room/${encodeURIComponent(roomId)}/scorecard`, {
        criteria: CRITERIA.map((c) => ({ key: c.key, label: c.label, checked: scores[c.key].checked, score: scores[c.key].rating > 0 ? scores[c.key].rating : undefined })),
        comments: notes.map((n) => `${n.tag === 'positive' ? '+' : n.tag === 'concern' ? '-' : '•'} ${n.text}`).join('\n') || undefined,
        recommendation: verdict === 'SHORTLIST' ? 'hire' : verdict === 'REVIEW' ? 'hold' : verdict === 'REJECT' ? 'reject' : undefined,
      });
      setSaveState('saved');
    } catch { setSaveState('error'); }
  }, [isRecruiter, roomId, scores, notes, verdict]);
  useEffect(() => {
    if (!hydrated || !isRecruiter || room.status !== 'joined') return;
    const t = window.setTimeout(() => void saveScorecard(), 900);
    return () => window.clearTimeout(t);
  }, [scores, verdict, notes, hydrated, isRecruiter, room.status, saveScorecard]);

  const tiles: Tile[] = useMemo(() => {
    const self: Tile = {
      id: room.selfUserId ?? 'local', name: displayName, role: isRecruiter ? 'recruiter' : 'candidate',
      stream: room.localStream, videoOn: room.camOn, micOn: room.micOn,
      isScreen: false, presenting: room.screenSharing,
      isLocal: true, speaking: room.speaking.has('local'), connected: true, link: 'connected',
    };
    const remotes = room.peers.map((p) => ({
      id: p.userId, name: p.name,
      role: (p.role === 'recruiter' || p.role === 'candidate' ? p.role : 'observer') as Tile['role'],
      stream: p.stream, videoOn: p.camOn || p.screenSharing, micOn: p.micOn,
      isScreen: p.screenSharing, presenting: false,
      isLocal: false, speaking: room.speaking.has(p.userId), connected: p.connected, link: p.link,
    }));
    return [self, ...remotes];
  }, [room.selfUserId, room.localStream, room.micOn, room.camOn, room.screenSharing, room.peers, room.speaking, displayName, isRecruiter]);

  const chatMessages: ChatMsg[] = useMemo(() => room.chat.map((m) => ({
    id: m.id, sender: m.senderName, text: m.message, role: m.role,
    time: new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    isMe: m.senderId === room.selfUserId,
  })), [room.chat, room.selfUserId]);

  const togglePanel = (p: typeof panel) => { if (p === 'chat') setUnread(0); setPanel((cur) => (cur === p ? null : p)); };
  const addNote = useCallback((text: string) => {
    const tag: Note['tag'] = text.startsWith('+') ? 'positive' : text.startsWith('-') ? 'concern' : 'neutral';
    setNotes((p) => [...p, { id: uid(), text: text.replace(/^[+-]\s*/, ''), tag, time: nowTime() }]);
    setSaveState('idle');
  }, []);
  const handleLeave = useCallback(() => { void room.leave(); router.replace(isRecruiter ? '/recruiter/interviews' : '/interviews'); }, [room.leave, router, isRecruiter]);
  const handleEnd = useCallback((v: Verdict, notesText: string) => {
    setShowEnd(false);
    void (async () => {
      const feedback = [notesText.trim(), 'Scorecard (out of 5):', ...CRITERIA.map((c) => `- ${c.label}: ${scores[c.key].checked ? (scores[c.key].rating > 0 ? `${scores[c.key].rating}/5` : 'not rated') : 'skipped'}`), `Overall: ${overall}/100`].filter(Boolean).join('\n');
      try {
        await api.post(`/interviews/room/${encodeURIComponent(roomId)}/end`, { feedback, verdict: v ?? undefined, durationSeconds: elapsed, score: overall || undefined });
        if (info.roundId) await interviewApi.submitRoundResult(info.roundId, { result: v === 'SHORTLIST' ? 'pass' : v === 'REJECT' ? 'fail' : 'pending', score: overall || undefined, feedback });
      } catch { /* realtime end still broadcast */ }
      void room.endRoom();
      router.replace('/recruiter/interviews');
    })();
  }, [roomId, info.roundId, elapsed, scores, overall, room.endRoom, router]);

  const shell = (children: ReactNode) => (
    <div className="hx" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: P.ink, color: P.text, fontFamily: "'Sora',sans-serif", overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(900px 520px at 10% -12%,rgba(139,92,246,.16),transparent 60%),radial-gradient(820px 540px at 110% 10%,rgba(34,211,238,.1),transparent 60%)' }} />
      {children}
    </div>
  );

  if (infoLoading) return shell(<div style={{ position: 'relative', flex: 1, display: 'grid', placeItems: 'center' }}><p style={{ color: P.muted, fontSize: 13 }}>Loading interview room…</p></div>);
  if (room.status === 'idle') return shell(<PreJoin info={info} name={displayName} isRecruiter={isRecruiter} joining={false} onJoin={(prefs) => void room.start(prefs)} onBack={() => router.back()} />);
  if (room.status === 'starting' || room.status === 'connecting') return shell(
    <div style={{ position: 'relative', flex: 1, display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto 18px', borderRadius: '50%', border: '3px solid rgba(34,211,238,.25)', borderTopColor: P.cyan, animation: 'hx-spin .8s linear infinite' }} />
        <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>{room.status === 'starting' ? 'Preparing camera & mic…' : 'Securing your seat…'}</p>
        <p style={{ margin: 0, fontSize: 12, color: P.muted }}>Connecting to the interview room</p>
      </div>
    </div>
  );
  if (room.status === 'rejected' || room.status === 'error' || room.status === 'ended' || room.status === 'replaced') {
    const title = room.status === 'ended' ? 'Interview ended' : room.status === 'replaced' ? 'Joined from another tab' : room.error?.message ?? 'Unable to join';
    return shell(
      <div style={{ position: 'relative', flex: 1, display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 20, padding: 28, maxWidth: 420, textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800 }}>{title}</p>
          {room.status === 'rejected' && room.error?.opensAt && <p style={{ margin: 0, fontSize: 12, color: P.muted }}>Opens at {new Date(room.error.opensAt).toLocaleString()}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
            {(room.status === 'error' || room.status === 'rejected') && <button className="hx-btn" style={{ background: BRAND, border: 'none', color: '#fff' }} onClick={() => void room.start()}>Retry</button>}
            <button className="hx-btn" onClick={() => router.replace(isRecruiter ? '/recruiter/interviews' : '/interviews')}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  const pinned = pinnedId ? tiles.find((t) => t.id === pinnedId) ?? null : null;
  const grid = pinned ? tiles.filter((t) => t.id !== pinnedId) : tiles;
  const cols = grid.length <= 1 ? 1 : grid.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(grid.length / cols));
  const durationSecs = (info.durationMins ?? 45) * 60;
  const progress = Math.min(100, (elapsed / durationSecs) * 100);

  const dockBtn = (active: boolean, onClick: () => void, icon: ReactNode, tip: string, opts?: { off?: boolean; on?: boolean; rec?: boolean; disabled?: boolean }) => (
    <button className="hx-tip" data-tip={tip} disabled={opts?.disabled} onClick={onClick}
      style={{ width: 48, height: 48, borderRadius: 16, display: 'grid', placeItems: 'center', cursor: opts?.disabled ? 'not-allowed' : 'pointer', opacity: opts?.disabled ? 0.4 : 1, border: `1px solid ${opts?.rec ? 'rgba(239,68,68,.6)' : opts?.on ? 'rgba(16,185,129,.5)' : opts?.off ? 'rgba(239,68,68,.5)' : P.border}`, background: opts?.rec ? 'rgba(239,68,68,.2)' : opts?.on ? 'rgba(16,185,129,.16)' : opts?.off ? 'rgba(239,68,68,.16)' : 'rgba(255,255,255,.06)', color: opts?.rec || opts?.off ? P.redLight : opts?.on ? P.greenLight : P.text, animation: opts?.rec ? 'hx-pulse 1.4s infinite' : 'none' }}>
      {icon}
    </button>
  );

  return shell(
    <>
      <div style={{ position: 'relative', zIndex: 5, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '0 18px', borderBottom: `1px solid ${P.border}`, background: 'rgba(10,14,26,.8)', backdropFilter: 'blur(18px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 15, background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⬡ HireX</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.jobTitle ?? 'Interview'}</p>
            <p style={{ margin: 0, fontSize: 10, color: P.faint }}>Round {info.roundNumber ?? 1} · {(info.roundType ?? 'technical').toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {room.screenSharing && (
            <button onClick={() => void room.toggleScreenShare()} className="hx-tip" data-tip="Stop sharing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(16,185,129,.5)', background: 'rgba(16,185,129,.14)', color: P.greenLight, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: P.green, animation: 'hx-pulse 1.2s infinite' }} />
              Presenting · Stop
            </button>
          )}
          {room.recording && <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: P.redLight, border: '1px solid rgba(239,68,68,.5)', background: 'rgba(239,68,68,.12)' }}><span style={{ animation: 'hx-pulse 1.2s infinite', display: 'flex' }}>{Icon.rec()}</span> REC</span>}
          {room.status === 'reconnecting' && <span style={{ fontSize: 11, color: P.amberLight, animation: 'hx-pulse 1.4s infinite' }}>Reconnecting…</span>}
          <span style={{ padding: '6px 14px', borderRadius: 999, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.05)', fontFamily: 'monospace', fontSize: 14, fontWeight: 800 }}>{fmt(elapsed)}</span>
          <span style={{ fontSize: 11, color: P.faint }}>/ {info.durationMins ?? 45} min</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: P.faint }}>{tiles.length} in call</span>
          {isRecruiter && <button className="hx-tip" data-tip="AI Assistant" onClick={() => togglePanel('assistant')} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${panel === 'assistant' ? 'rgba(139,92,246,.5)' : P.border}`, background: panel === 'assistant' ? 'rgba(139,92,246,.18)' : 'rgba(255,255,255,.04)', color: panel === 'assistant' ? P.violetLight : P.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.spark()}</button>}
          <button className="hx-tip" data-tip="Participants" onClick={() => togglePanel('people')} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${panel === 'people' ? 'rgba(59,130,246,.5)' : P.border}`, background: panel === 'people' ? 'rgba(59,130,246,.18)' : 'rgba(255,255,255,.04)', color: panel === 'people' ? '#60A5FA' : P.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.people()}</button>
          <button className="hx-tip" data-tip="Chat" onClick={() => togglePanel('chat')} style={{ position: 'relative', width: 38, height: 38, borderRadius: 12, border: `1px solid ${panel === 'chat' ? 'rgba(59,130,246,.5)' : P.border}`, background: panel === 'chat' ? 'rgba(59,130,246,.18)' : 'rgba(255,255,255,.04)', color: panel === 'chat' ? '#60A5FA' : P.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            {Icon.chat()}
            {unread > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: DANGER, color: '#fff', fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{unread > 9 ? '9+' : unread}</span>}
          </button>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 5, height: 3, background: 'rgba(148,163,184,.1)' }}><div style={{ height: '100%', width: `${progress}%`, background: progress > 80 ? P.amber : BRAND, transition: 'width 1s linear' }} /></div>
      {room.notice && <div style={{ position: 'fixed', top: 74, left: '50%', transform: 'translateX(-50%)', zIndex: 150, padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(251,191,36,.4)', background: 'rgba(251,191,36,.12)', color: P.amberLight, fontSize: 12, fontWeight: 700 }}>{room.notice}</div>}

      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pinned ? (
              <>
                <div style={{ flex: 1, minHeight: 0 }}><VideoTile t={pinned} large pinned onPin={(id) => setPinnedId(pinnedId === id ? null : id)} onReconnect={room.reconnectPeer} onStopShare={pinned.isLocal ? () => void room.toggleScreenShare() : undefined} /></div>
                <div className="hx" style={{ display: 'flex', gap: 10, height: 120, flexShrink: 0, overflowX: 'auto' }}>
                  {grid.map((t) => <div key={t.id} style={{ width: 180, flexShrink: 0, height: '100%' }}><VideoTile t={t} onPin={setPinnedId} onReconnect={room.reconnectPeer} onStopShare={t.isLocal ? () => void room.toggleScreenShare() : undefined} /></div>)}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gap: 14, gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gridTemplateRows: `repeat(${rows},minmax(0,1fr))`, justifyContent: 'center', alignContent: 'center' }}>
                {grid.map((t) => <VideoTile key={t.id} t={t} onPin={setPinnedId} onReconnect={room.reconnectPeer} onStopShare={t.isLocal ? () => void room.toggleScreenShare() : undefined} />)}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '0 16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 22, border: '1px solid rgba(148,163,184,.2)', background: 'rgba(10,14,26,.85)', backdropFilter: 'blur(20px)', boxShadow: '0 18px 50px rgba(0,0,0,.5)' }}>
              {dockBtn(room.micOn, room.toggleMic, Icon.mic(!room.micOn), room.micOn ? 'Mute mic' : 'Unmute mic', { off: !room.micOn, disabled: !room.hasMic })}
              {dockBtn(room.camOn, room.toggleCam, Icon.cam(!room.camOn), room.camOn ? 'Stop video' : 'Start video', { off: !room.camOn, disabled: !room.hasCamera })}
              <span style={{ width: 1, height: 30, background: 'rgba(148,163,184,.2)' }} />
              {dockBtn(room.screenSharing, () => void room.toggleScreenShare(), Icon.screen(), room.screenSharing ? 'Stop sharing' : 'Share screen', { on: room.screenSharing })}
              {isRecruiter && dockBtn(room.recording, () => void room.toggleRecording(), Icon.rec(), room.recording ? 'Stop recording' : 'Record', { rec: room.recording })}
              <span style={{ width: 1, height: 30, background: 'rgba(148,163,184,.2)' }} />
              {isRecruiter ? (
                <button className="hx-tip" data-tip="End interview for everyone" onClick={() => setShowEnd(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 20px', borderRadius: 16, border: 'none', background: DANGER, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>{Icon.end()} End</button>
              ) : (
                <button className="hx-tip" data-tip="Leave the interview" onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 20px', borderRadius: 16, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.06)', color: P.text, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>{Icon.end()} Leave</button>
              )}
            </div>
          </div>
        </div>

        {panel === 'assistant' && isRecruiter && (
          <AssistantPanel info={info} transcript={transcript} scores={scores} onScore={onScore} verdict={verdict} onVerdict={(v) => { setVerdict(v); setSaveState('idle'); }} overall={overall} avg={avg} rated={rated} notes={notes} onNote={addNote} saveState={saveState} onSave={() => void saveScorecard()} onClose={() => setPanel(null)} />
        )}
        {panel === 'chat' && <ChatPanel messages={chatMessages} onSend={(t) => void room.sendChat(t)} onClose={() => setPanel(null)} />}
        {panel === 'people' && (
          <div style={{ width: 344, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: `1px solid ${P.border}`, background: 'rgba(13,18,32,.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${P.border}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800 }}>{Icon.people()} Participants ({tiles.length})</span>
              <button className="hx-btn" style={{ padding: 6 }} onClick={() => setPanel(null)}>{Icon.close()}</button>
            </div>
            <div className="hx" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'grid', gap: 8, alignContent: 'start' }}>
              {tiles.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 14, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,.03)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: roleColor(t.role), background: `${roleColor(t.role)}1e`, border: `1px solid ${roleColor(t.role)}44`, flexShrink: 0 }}>{initials(t.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}{t.isLocal ? ' (You)' : ''}</p>
                    <span style={{ fontSize: 10, color: roleColor(t.role), fontWeight: 700, textTransform: 'capitalize' }}>{t.role}{t.presenting || t.isScreen ? ' · presenting' : ''}</span>
                  </div>
                  {t.speaking && <Eq />}
                  {!t.micOn && <span style={{ color: P.redLight, display: 'flex' }}>{Icon.mic(true)}</span>}
                  {!t.videoOn && !t.isScreen && <span style={{ color: P.faint, display: 'flex' }}>{Icon.cam(true)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isRecruiter && showEnd && <EndModal verdict={verdict} overall={overall} scores={scores} info={info} onConfirm={handleEnd} onCancel={() => setShowEnd(false)} />}
    </>
  );
}
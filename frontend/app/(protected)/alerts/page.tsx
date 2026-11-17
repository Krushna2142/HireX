'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/alerts/page.tsx
// Google-Messages-style inbox with premium glass app-bars.
// Lives inside (protected) so the app sidebar + layout wrap it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCheck, MessagesSquare, RefreshCw, Search } from 'lucide-react';
import { useAlerts } from '@/hooks/useRealTimeAlerts';
import { useAuth } from '@/components/providers/AuthProvider';

type Alert = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
};
type ThreadKey = 'interviews' | 'applications' | 'matches' | 'offers' | 'resume' | 'system';

const THREADS: Record<ThreadKey, { label: string; icon: string; grad: string; blurb: string; accent: string }> = {
  interviews:   { label: 'Interviews',   icon: '🎯', grad: 'linear-gradient(135deg,#8B5CF6,#5B21B6)', blurb: 'Schedules, reminders & round results', accent: '#A78BFA' },
  applications: { label: 'Applications', icon: '📋', grad: 'linear-gradient(135deg,#38BDF8,#0369A1)', blurb: 'Updates on your applications',        accent: '#7DD3FC' },
  matches:      { label: 'Job Matches',  icon: '✨', grad: 'linear-gradient(135deg,#34D399,#047857)', blurb: 'Roles matched to your profile',       accent: '#6EE7B7' },
  offers:       { label: 'Offers',       icon: '🎉', grad: 'linear-gradient(135deg,#FBBF24,#B45309)', blurb: 'Offer & hiring updates',              accent: '#FDE68A' },
  resume:       { label: 'Resume',       icon: '📄', grad: 'linear-gradient(135deg,#F472B6,#9D174D)', blurb: 'Uploads & AI analysis',               accent: '#F9A8D4' },
  system:       { label: 'HireX System', icon: '⚙️', grad: 'linear-gradient(135deg,#94A3B8,#334155)', blurb: 'Account & system activity',           accent: '#CBD5E1' },
};
const THREAD_ORDER: ThreadKey[] = ['interviews', 'applications', 'matches', 'offers', 'resume', 'system'];

function categoryOf(type: string): ThreadKey {
  const t = (type ?? '').toLowerCase();
  if (t.includes('interview')) return 'interviews';
  if (t.includes('offer')) return 'offers';
  if (t.includes('match')) return 'matches';
  if (t.includes('resume')) return 'resume';
  if (t.includes('application') || t.includes('applicant')) return 'applications';
  return 'system';
}
function getAlertHref(alert: Alert, role: string | null): string | null {
  const md = alert.metadata ?? {};
  const interviewId = typeof md.interviewId === 'string' ? md.interviewId : null;
  const roundNumber = typeof md.roundNumber === 'number' ? md.roundNumber : null;
  const t = (alert.type ?? '').toLowerCase();
  if (t.startsWith('interview') && interviewId) {
    if (roundNumber) return `/interviews/room/jc-${interviewId}-r${roundNumber}`;
    return role === 'recruiter' ? '/recruiter/interviews' : '/interviews';
  }
  if (t === 'application_update') return role === 'recruiter' ? '/recruiter/dashboard?tab=applications' : '/candidate/applications';
  if (t === 'job_match') return '/jobs';
  if (t === 'new_applicant') return '/recruiter/dashboard?tab=applications';
  return null;
}
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) => {
  const d = new Date(iso).toDateString();
  if (d === new Date().toDateString()) return 'Today';
  if (d === new Date(Date.now() - 864e5).toDateString()) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const C = {
  text: '#E8EAED', muted: 'rgba(232,234,237,0.62)', faint: 'rgba(232,234,237,0.38)',
  border: 'rgba(255,255,255,0.07)', accent: '#8AB4F8', green: '#34D399',
};
const HDR_BG = 'linear-gradient(180deg, rgba(17,24,41,0.92), rgba(10,14,26,0.78))';
const HDR_BLUR = 'blur(22px) saturate(150%)';
const HDR_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.28)';
const GLASS = 'rgba(13,18,32,0.55)';
const GLASS_STRONG = 'rgba(11,16,32,0.72)';

export default function AlertsMessagesPage() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const { alerts, unreadCount, loading, markRead, markAllRead, refresh } = useAlerts();
  const rows = useMemo(() => (alerts ?? []) as Alert[], [alerts]);
  const role = (user?.role_normalized ?? user?.role ?? null) as string | null;

  const [selected, setSelected] = useState<ThreadKey | null>(null);
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [pendingNew, setPendingNew] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readAttempted = useRef<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const threads = useMemo(() => {
    const map = new Map<ThreadKey, Alert[]>();
    for (const a of rows) {
      const k = categoryOf(a.type);
      const list = map.get(k) ?? [];
      list.push(a);
      map.set(k, list);
    }
    for (const list of map.values()) list.sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));
    return map;
  }, [rows]);
  const activeThreads = useMemo(() => THREAD_ORDER.filter((k) => (threads.get(k)?.length ?? 0) > 0), [threads]);

  useEffect(() => {
    if (selected && threads.get(selected)?.length) return;
    const firstUnread = THREAD_ORDER.find((k) => (threads.get(k) ?? []).some((a) => !a.read));
    setSelected(firstUnread ?? activeThreads[0] ?? null);
  }, [activeThreads, selected, threads]);

  const searching = query.trim().length > 0;
  const messages = useMemo(() => {
    if (searching) {
      const q = query.trim().toLowerCase();
      return rows
        .filter((a) => `${a.title} ${a.message}`.toLowerCase().includes(q))
        .sort((x, y) => +new Date(x.created_at) - +new Date(y.created_at));
    }
    if (!selected) return [];
    return [...(threads.get(selected) ?? [])].sort((x, y) => +new Date(x.created_at) - +new Date(y.created_at));
  }, [rows, searching, query, selected, threads]);

  // Auto mark-read when a conversation is open (like opening a text thread)
  useEffect(() => {
    if (!selected || searching) return;
    const unreadIds = (threads.get(selected) ?? [])
      .filter((a) => !a.read)
      .map((a) => a.id)
      .filter((id) => !readAttempted.current.has(id));
    if (!unreadIds.length) return;
    unreadIds.forEach((id) => readAttempted.current.add(id));
    const t = setTimeout(() => { void Promise.all(unreadIds.map((id) => markRead(id))); }, 450);
    return () => clearTimeout(t);
  }, [selected, searching, rows, threads, markRead]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newIds = messages.filter((m) => !prevIds.current.has(m.id)).map((m) => m.id);
    const firstLoad = prevIds.current.size === 0 && messages.length > 0;
    if (newIds.length) {
      if (firstLoad || atBottom) el.scrollTo({ top: el.scrollHeight, behavior: firstLoad ? 'auto' : 'smooth' });
      else setPendingNew((p) => p + newIds.length);
    }
    prevIds.current = new Set(messages.map((m) => m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    setPendingNew(0);
  }, [selected, searching]);

  const openHref = (href: string | null, id: string) => {
    if (!href) return;
    void markRead(id);
    router.push(href);
  };

  const threadCount = selected ? (threads.get(selected)?.length ?? 0) : 0;

  const hairline = (
    <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.45), rgba(167,139,250,0.45), rgba(244,114,182,0.28), transparent)' }} />
  );

  const Bubble = ({ a, showThread }: { a: Alert; showThread?: boolean }) => {
    const k = categoryOf(a.type);
    const meta = THREADS[k];
    const href = getAlertHref(a, role);
    return (
      <motion.div layout="position" initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 720 }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 14, background: meta.grad, boxShadow: '0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)' }}>{meta.icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{
            background: a.read ? GLASS : `linear-gradient(135deg, rgba(56,189,248,.14), rgba(139,92,246,.10)), ${GLASS}`,
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${a.read ? C.border : 'rgba(138,180,248,.35)'}`,
            borderRadius: '18px 18px 18px 6px', padding: '10px 14px',
            boxShadow: '0 6px 24px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.05)',
          }}>
            {showThread && <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: meta.accent, marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase' }}>{meta.label}</span>}
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.text }}>{a.title}</p>
            {a.message && <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.55, color: C.muted, whiteSpace: 'pre-line' }}>{a.message}</p>}
            {href && (
              <button type="button" onClick={() => openHref(href, a.id)} className="mxChip">Open tracking →</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 2px 0' }}>
            <span style={{ fontSize: 10.5, color: C.faint }}>{fmtTime(a.created_at)}</span>
            {!a.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />}
          </div>
        </div>
      </motion.div>
    );
  };

  const listPane = (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%', background: GLASS, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: `1px solid ${C.border}` }}>
      {/* ── Premium list header ── */}
      <div style={{ position: 'relative', padding: '16px 18px 14px', background: HDR_BG, backdropFilter: HDR_BLUR, WebkitBackdropFilter: HDR_BLUR, boxShadow: HDR_SHADOW, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(139,92,246,0.22))',
          border: '1px solid rgba(138,180,248,0.30)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 20px rgba(56,189,248,0.16)' }}>
          <MessagesSquare size={18} style={{ color: '#9CCBFF' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em',
            background: 'linear-gradient(92deg,#F8FAFC 20%,#9CCBFF 70%,#C4B5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Messages
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999,
              background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.28)', fontSize: 10, fontWeight: 800, color: '#6EE7B7', letterSpacing: '.04em' }}>
              <i style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'mxLive 1.8s ease infinite' }} />
              LIVE
            </span>
            <span style={{ fontSize: 10.5, color: C.faint }}>syncs every 8s</span>
          </div>
        </div>
        {unreadCount > 0 && (
          <span style={{ padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 900, color: '#06121F',
            background: 'linear-gradient(135deg,#38BDF8,#8B5CF6)', boxShadow: '0 6px 18px rgba(56,189,248,0.35)' }}>
            {unreadCount} new
          </span>
        )}
        {hairline}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10 }}>
        {loading && activeThreads.length === 0 && (
          <div style={{ display: 'grid', gap: 8, padding: 6 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 66, borderRadius: 16, background: 'rgba(255,255,255,.05)', animation: 'mxLive 1.4s infinite' }} />)}
          </div>
        )}
        {!loading && activeThreads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: C.faint }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.muted }}>No messages yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6 }}>Application updates, interview invites and job matches arrive here like texts.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {activeThreads.map((k) => {
            const list = threads.get(k) ?? [];
            const latest = list[0];
            const unread = list.filter((a) => !a.read).length;
            const active = selected === k;
            return (
              <motion.button key={k} type="button" layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                onClick={() => { setSelected(k); setQuery(''); }}
                style={{
                  width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: '12px 10px', borderRadius: 16,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? 'linear-gradient(135deg, rgba(56,189,248,.12), rgba(139,92,246,.10))' : 'transparent',
                  outline: active ? '1px solid rgba(138,180,248,.28)' : 'none',
                  boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                }}>
                <span style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 19, background: THREADS[k].grad, boxShadow: '0 6px 16px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)' }}>
                  {THREADS[k].icon}
                  {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'linear-gradient(135deg,#38BDF8,#8B5CF6)', color: '#06121F', fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center', border: '2px solid rgba(13,18,32,.95)' }}>{unread > 9 ? '9+' : unread}</span>}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 13.5, color: '#F8FAFC', fontWeight: unread ? 850 : 650 }}>{THREADS[k].label}</strong>
                    <span style={{ fontSize: 10.5, color: C.faint, flexShrink: 0 }}>{timeAgo(latest.created_at)}</span>
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: unread ? C.muted : C.faint, fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{latest.title}</span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );

  const messagePane = (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%', background: 'transparent' }}>
      {/* ── Premium conversation header ── */}
      <div style={{ position: 'relative', padding: '12px 16px', background: HDR_BG, backdropFilter: HDR_BLUR, WebkitBackdropFilter: HDR_BLUR, boxShadow: HDR_SHADOW, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {isMobile && (
          <button type="button" className="mxTile" onClick={() => setSelected(null)} aria-label="Back to conversations">
            <ArrowLeft size={17} />
          </button>
        )}
        {selected && !searching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <span style={{ position: 'relative', width: 42, height: 42, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 18,
              background: THREADS[selected].grad,
              boxShadow: `0 0 0 2px ${THREADS[selected].accent}55, 0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.3)` }}>
              {THREADS[selected].icon}
              <i style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: C.green, border: '2px solid #0D1220', boxShadow: `0 0 8px ${C.green}` }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 850, letterSpacing: '-0.02em', color: '#F8FAFC' }}>{THREADS[selected].label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {THREADS[selected].blurb} <span style={{ opacity: 0.6 }}>·</span> {threadCount} message{threadCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 850, color: '#F8FAFC' }}>Search results</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.faint }}>{messages.length} message{messages.length === 1 ? '' : 's'} matching “{query}”</p>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="mxSearch">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages" aria-label="Search messages" />
          </label>
          <span aria-hidden style={{ width: 1, height: 22, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.14), transparent)' }} />
          <button type="button" className="mxTile" title="Mark all read" onClick={() => void markAllRead()} aria-label="Mark all as read">
            <CheckCheck size={16} />
          </button>
          <button type="button" className="mxTile mxRefresh" title="Refresh" onClick={() => void refresh()} aria-label="Refresh messages">
            <RefreshCw size={15} />
          </button>
        </div>
        {hairline}
      </div>

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!selected && !searching && (
          <div style={{ margin: 'auto', textAlign: 'center', color: C.faint, padding: 24, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, borderRadius: 22, maxWidth: 420 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📥</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.muted }}>Select a conversation</p>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>Your notifications are grouped by topic, just like message threads.</p>
          </div>
        )}
        {messages.length === 0 && (selected || searching) && !loading && (
          <div style={{ margin: 'auto', textAlign: 'center', color: C.faint, padding: 24, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, borderRadius: 22, maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.muted }}>Nothing here yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>{searching ? 'Try a different search term.' : 'New messages will pop in automatically.'}</p>
          </div>
        )}
        {messages.map((a, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(a.created_at);
          return (
            <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {newDay && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12))' }} />
                  <span style={{ padding: '4px 14px', borderRadius: 999, background: GLASS, backdropFilter: 'blur(10px)', border: `1px solid ${C.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', color: C.faint, fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em' }}>{dayLabel(a.created_at)}</span>
                  <i style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent)' }} />
                </div>
              )}
              <Bubble a={a} showThread={searching} />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {pendingNew > 0 && !atBottom && (
          <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            type="button"
            onClick={() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); setPendingNew(0); }}
            style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 22, padding: '9px 18px', borderRadius: 999, border: 'none',
              background: 'linear-gradient(135deg,#38BDF8,#8B5CF6)', color: '#06121F', fontSize: 12, fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(56,189,248,.4), inset 0 1px 0 rgba(255,255,255,.4)' }}>
            ↓ {pendingNew} new message{pendingNew === 1 ? '' : 's'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes mxLive { 0%,100%{opacity:1} 50%{opacity:.35} }
        .mxTile{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;cursor:pointer;flex-shrink:0;
          border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(232,234,237,.75);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);transition:all .16s ease;}
        .mxTile:hover{background:rgba(255,255,255,0.09);color:#F8FAFC;transform:translateY(-1px);
          border-color:rgba(138,180,248,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 20px rgba(0,0,0,.3);}
        .mxTile:active{transform:scale(.95);}
        .mxRefresh:hover svg{transform:rotate(120deg);}
        .mxRefresh svg{transition:transform .35s ease;}
        .mxSearch{display:flex;align-items:center;gap:8px;height:38px;padding:0 13px;border-radius:999px;
          border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(232,234,237,.45);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);transition:all .18s ease;}
        .mxSearch:focus-within{border-color:rgba(138,180,248,.5);background:rgba(138,180,248,.08);color:#9CCBFF;
          box-shadow:0 0 0 3px rgba(138,180,248,.15), inset 0 1px 0 rgba(255,255,255,.06);}
        .mxSearch input{border:none;outline:none;background:transparent;color:#E8EAED;font-size:12.5px;width:${isMobile ? 90 : 170}px;font-family:'Sora',sans-serif;}
        .mxSearch input::placeholder{color:rgba(232,234,237,.35);}
        .mxChip{margin-top:8px;padding:6px 12px;border-radius:999px;border:1px solid rgba(138,180,248,.4);
          background:rgba(138,180,248,.12);backdrop-filter:blur(8px);color:#8AB4F8;font-size:11.5px;font-weight:800;cursor:pointer;transition:all .15s ease;}
        .mxChip:hover{background:rgba(138,180,248,.2);transform:translateY(-1px);}
      `}</style>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent', color: C.text, fontFamily: "'Sora', sans-serif", overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '340px 1fr', position: 'relative' }}>
          {(!isMobile || !selected) && listPane}
          {(!isMobile || selected) && <div style={{ position: 'relative', minWidth: 0, minHeight: 0, height: '100%' }}>{messagePane}</div>}
        </div>
      </div>
    </>
  );
}
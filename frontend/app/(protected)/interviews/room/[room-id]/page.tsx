'use client';

// frontend/app/(protected)/interviews/room/[room-id]/page.tsx
//
// Production-grade live interview room.
//
// Architecture:
//   - Uses useWebRTCRoom hook (existing) for all WebRTC + socket logic
//   - Clean video grid with participant tiles
//   - Controls bar: mic, camera, screen share, chat, leave, end (recruiter)
//   - Chat panel (slide-in)
//   - Interview timer
//   - Recruiter: "End & Give Feedback" button after minimum 5 mins
//   - Candidate: can view current stage + notes
//   - Error states handled gracefully
//
// Route params:
//   roomId format: jc-{interviewId}-r{roundNumber}

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth }              from '@/components/providers/AuthProvider';
import { useWebRTCRoom }        from '@/hooks/useWebRTCRoom';

// ─────────────────────────────────────────────────────────────────────────────
// Utility: format timer
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoTile
// ─────────────────────────────────────────────────────────────────────────────

function VideoTile({
  stream,
  name,
  isSelf,
  micOn,
  camOn,
  isActive,
}: {
  stream:   MediaStream | null;
  name:     string;
  isSelf:   boolean;
  micOn:    boolean;
  camOn:    boolean;
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{
      position: 'relative', borderRadius: 12, overflow: 'hidden',
      background: '#0B0F1C', aspectRatio: '16/9',
      border: isActive ? '2px solid #38BDF8' : '1px solid rgba(255,255,255,0.08)',
      transition: 'border-color 0.2s',
      boxShadow: isActive ? '0 0 20px rgba(56,189,248,0.2)' : 'none',
    }}>
      {stream && camOn ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isSelf}
          playsInline
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: isSelf ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          {!camOn && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Camera off</span>
          )}
        </div>
      )}

      {/* Name badge */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,0,0,0.65)', borderRadius: 8,
        padding: '4px 10px', backdropFilter: 'blur(4px)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
          {name}{isSelf ? ' (You)' : ''}
        </span>
        {!micOn && <span style={{ fontSize: 12 }}>🔇</span>}
      </div>

      {/* Self label */}
      {isSelf && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)',
          borderRadius: 6, padding: '2px 7px', fontSize: 10, color: '#38BDF8', fontWeight: 700,
        }}>
          YOU
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel
// ─────────────────────────────────────────────────────────────────────────────

function ChatPanel({
  messages,
  onSend,
  onClose,
  selfId,
}: {
  messages: { userId: string; name: string; message: string; timestamp: string }[];
  onSend:   (msg: string) => void;
  onClose:  () => void;
  selfId:   string;
}) {
  const [draft, setDraft]     = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft('');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 300, height: '100%',
      background: '#0D1220', borderLeft: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>💬 Chat</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 20 }}>
            No messages yet
          </p>
        )}
        {messages.map((msg, i) => {
          const isSelf = msg.userId === selfId;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                {isSelf ? 'You' : msg.name}
              </span>
              <div style={{
                maxWidth: '85%', padding: '8px 12px', borderRadius: isSelf ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: isSelf ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.08)',
                border: isSelf ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.08)',
                fontSize: 13, color: '#F1F5F9', wordBreak: 'break-word', lineHeight: 1.5,
              }}>
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#F1F5F9', fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={send} disabled={!draft.trim()} style={{
          padding: '8px 12px', borderRadius: 8, border: 'none',
          background: draft.trim() ? '#38BDF8' : 'rgba(255,255,255,0.06)',
          color: draft.trim() ? '#001018' : 'rgba(255,255,255,0.2)',
          fontSize: 14, cursor: draft.trim() ? 'pointer' : 'not-allowed',
        }}>→</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ControlButton
// ─────────────────────────────────────────────────────────────────────────────

function ControlBtn({
  icon, label, onClick, active = false, danger = false, disabled = false, badge,
}: {
  icon:      string;
  label:     string;
  onClick:   () => void;
  active?:   boolean;
  danger?:   boolean;
  disabled?: boolean;
  badge?:    number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          position: 'relative', width: 48, height: 48, borderRadius: 12,
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: danger ? 'rgba(239,68,68,0.9)' : active ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.1)',
          color: danger ? '#fff' : active ? '#38BDF8' : '#E2E8F0',
          fontSize: 20, transition: 'all 0.15s', opacity: disabled ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#F87171', border: '2px solid #080C14',
            fontSize: 10, color: '#fff', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {badge > 9 ? '9+' : badge}
          </div>
        )}
      </button>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Room Page
// ─────────────────────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  const params   = useParams<Record<string, string | string[]>>();
  const router   = useRouter();
  const roomId   = getRouteParam(params, 'room-id');
  const { user, loading: authLoading } = useAuth();

  const [chatOpen,    setChatOpen]    = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [endPrompt,   setEndPrompt]   = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse interviewId + roundNumber from roomId (format: jc-{uuid}-r{n})
  const parsed = useMemo(() => {
    const m = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(roomId);
    if (!m) return null;
    return { interviewId: m[1], roundNumber: Number(m[2]) };
  }, [roomId]);

  // ── WebRTC ──────────────────────────────────────────────────────────────
  const {
    connectionState,
    connected,
    connecting,
    localStream,
    peers,
    messages,
    micOn,
    camOn,
    screenSharing,
    error: rtcError,
    roomEnded,
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    endRoom,
    canEndRoom,
  } = useWebRTCRoom({
    roomId,
    user: user ? { id: user.id, full_name: user.full_name, role: user.role } : null,
  });

  // Auto-join when auth ready
  useEffect(() => {
    if (!authLoading && user?.id && roomId && !connected && !connecting) {
      void join();
    }
  }, [authLoading, user?.id, roomId, connected, connecting, join]);

  const timerActive = connected && (peers.length > 0 || elapsed > 0);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  // Room ended — redirect
  useEffect(() => {
    if (roomEnded) {
      const base = user?.role === 'recruiter' ? '/recruiter/interviews' : '/interviews';
      setTimeout(() => router.push(base), 2500);
    }
  }, [roomEnded, router, user?.role]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connected) leave();
    };
  }, [connected, leave]);

  const handleScreenShare = useCallback(async () => {
    try {
      if (screenSharing) await stopScreenShare();
      else               await startScreenShare();
    } catch { /* user cancelled — non-fatal */ }
  }, [screenSharing, startScreenShare, stopScreenShare]);

  const handleLeave = () => {
    leave();
    router.push(user?.role === 'recruiter' ? '/recruiter/interviews' : '/interviews');
  };

  const handleEndRoom = () => {
    if (canEndRoom) endRoom();
  };

  // ── Loading states ───────────────────────────────────────────────────────

  if (authLoading || connecting) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38BDF8', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
            {authLoading ? 'Authenticating…' : 'Connecting to interview room…'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 }}>{roomId}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#F87171', fontSize: 15, marginBottom: 16 }}>Authentication required</p>
          <button onClick={() => router.push('/?auth=login')} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#38BDF8', color: '#001018', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (rtcError && connectionState === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#F87171', fontSize: 18, margin: '0 0 8px' }}>Cannot Join Room</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>{rtcError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => void join()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#38BDF8', color: '#001018', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Retry
            </button>
            <button onClick={handleLeave} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roomEnded) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏁</div>
          <h2 style={{ color: '#F1F5F9', fontSize: 18, margin: '0 0 8px' }}>Interview Complete</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 6px' }}>
            Duration: <strong style={{ color: '#38BDF8' }}>{formatTime(elapsed)}</strong>
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: 0 }}>Redirecting…</p>
        </div>
      </div>
    );
  }

  // ── Main room UI ─────────────────────────────────────────────────────────

  const allParticipants = [
    { userId: user.id, stream: localStream, name: user.full_name ?? 'You', isSelf: true, micOn, camOn },
    ...peers.map(p => ({ userId: p.userId, stream: p.stream, name: p.name ?? 'Participant', isSelf: false, micOn: p.micOn, camOn: p.camOn })),
  ];

  const gridCols = allParticipants.length === 1 ? 1 : allParticipants.length <= 4 ? 2 : 3;

  return (
    <div style={{
      display: 'flex', height: '100vh', background: '#030712',
      fontFamily: "'Sora', sans-serif", color: '#E2E8F0', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Top bar ── */}
        <div style={{
          padding: '10px 16px', background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          {/* Room info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10B981' : '#FBBF24', boxShadow: connected ? '0 0 6px #10B981' : 'none' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                Interview Room
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                {roomId.slice(0, 20)}…
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {peers.length + 1} participant{peers.length !== 0 ? 's' : ''} · {user.role}
            </div>
          </div>

          {/* Timer */}
          {timerActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', animation: 'spin 2s linear infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#F1F5F9' }}>
                {formatTime(elapsed)}
              </span>
            </div>
          )}

          {/* Recruiter: End Room */}
          {canEndRoom && (
            <button
              onClick={() => setEndPrompt(true)}
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#F87171', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🏁 End Room
            </button>
          )}
        </div>

        {/* ── Video grid ── */}
        <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {connected ? (
            <div style={{
              display: 'grid', gap: 10, width: '100%', height: '100%',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridAutoRows: '1fr',
            }}>
              {allParticipants.map(p => (
                <VideoTile
                  key={p.userId}
                  stream={p.stream}
                  name={p.name}
                  isSelf={p.isSelf}
                  micOn={p.micOn}
                  camOn={p.camOn}
                  isActive={false}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38BDF8', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Connecting…</p>
            </div>
          )}

          {/* Waiting for others */}
          {connected && peers.length === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              padding: '20px 32px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>
                Waiting for others to join…
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Share the room link or wait for the other participant
              </p>
            </div>
          )}
        </div>

        {/* ── Controls bar ── */}
        <div style={{
          padding: '14px 20px', background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexShrink: 0,
        }}>
          <ControlBtn
            icon={micOn ? '🎤' : '🔇'}
            label={micOn ? 'Mute' : 'Unmute'}
            active={micOn}
            onClick={toggleMic}
          />
          <ControlBtn
            icon={camOn ? '📷' : '📵'}
            label={camOn ? 'Stop Video' : 'Start Video'}
            active={camOn}
            onClick={toggleCam}
          />
          <ControlBtn
            icon={screenSharing ? '🖥️' : '🖥'}
            label={screenSharing ? 'Stop Share' : 'Share Screen'}
            active={screenSharing}
            onClick={() => void handleScreenShare()}
          />
          <ControlBtn
            icon="💬"
            label="Chat"
            active={chatOpen}
            onClick={() => setChatOpen(p => !p)}
            badge={chatOpen ? 0 : messages.length}
          />

          {/* Spacer */}
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />

          {canEndRoom ? (
            <ControlBtn
              icon="🏁"
              label="End & Feedback"
              danger
              onClick={() => {
                router.push(`/recruiter/interviews/${parsed?.interviewId}/feedback`);
              }}
            />
          ) : null}

          <ControlBtn
            icon="📵"
            label="Leave"
            danger
            onClick={handleLeave}
          />
        </div>
      </div>

      {/* ── Chat panel ── */}
      {chatOpen && (
        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          onClose={() => setChatOpen(false)}
          selfId={user.id}
        />
      )}

      {/* ── End room confirmation ── */}
      {endPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 400, background: '#0D1220',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '1.5rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
              End Interview?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              This will disconnect all participants. You&apos;ll be redirected to submit feedback.
              Duration: <strong style={{ color: '#38BDF8' }}>{formatTime(elapsed)}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEndPrompt(false)} style={{
                flex: 1, padding: '10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
              }}>
                Continue Interview
              </button>
              <button onClick={handleEndRoom} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                End Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRouteParam(
  params: Record<string, string | string[]> | null | undefined,
  key: string,
): string {
  const value = params?.[key];
  return typeof value === 'string' ? value : '';
}

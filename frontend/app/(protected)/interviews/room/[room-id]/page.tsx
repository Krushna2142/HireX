'use client';

/**
 * /interviews/room/[room-id]/page.tsx
 *
 * Production-grade video conferencing room — Google Meet quality.
 *
 * Features:
 *   ✅ Pre-join lobby with camera/mic preview and device selection
 *   ✅ Adaptive video grid (1–6 tiles, responsive layout)
 *   ✅ Pinned/spotlight view for active speaker
 *   ✅ Voice activity detection (speaking ring animation)
 *   ✅ Mic / Camera / Screen share controls
 *   ✅ In-room text chat with unread badge
 *   ✅ Participants panel with live media state
 *   ✅ Connection state machine with error recovery
 *   ✅ Timer + live indicator
 *   ✅ Fully typed throughout
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  useWebRTCRoom,
  type RemotePeer,
  type ChatMessage,
} from '@/hooks/useWebRTCRoom';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  bg:      '#050810',
  panel:   '#0B0E1A',
  surface: '#111827',
  glass:   'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  muted:   'rgba(255,255,255,0.45)',
  faint:   'rgba(255,255,255,0.18)',
  white:   '#F8FAFC',

  green:   '#10B981',
  red:     '#EF4444',
  blue:    '#38BDF8',
  indigo:  '#6366F1',
  purple:  '#8B5CF6',
  amber:   '#F59E0B',
  rose:    '#F43F5E',
} as const;

// ─── useSpeakingDetector ──────────────────────────────────────────────────────
// AudioContext VAD — returns true when avg frequency power exceeds threshold.

function useSpeakingDetector(stream: MediaStream | null, threshold = 20): boolean {
  const [speaking, setSpeaking] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) { setSpeaking(false); return; }
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    let ctx: AudioContext;
    let destroyed = false;

    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return; }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (destroyed) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeaking(avg > threshold);
      rafRef.current = requestAnimationFrame(tick);
    };

    void ctx.resume().then(tick);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      void ctx.close().catch(() => {});
    };
  }, [stream, threshold]);

  return speaking;
}

// ─── useCallTimer ─────────────────────────────────────────────────────────────

function useCallTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) { setSecs(0); return; }
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// ─── useDevices ───────────────────────────────────────────────────────────────

function useDevices() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput'));
      setMics(devices.filter(d => d.kind === 'audioinput'));
      setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
    } catch { /* permissions not yet granted */ }
  }, []);

  useEffect(() => {
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [refresh]);

  return { cameras, microphones, speakers, refresh };
}

// ─── VideoTrack ───────────────────────────────────────────────────────────────
// Pure component that attaches a MediaStream to a <video> element.

function VideoTrack({
  stream,
  muted = false,
  contain = false,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  contain?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={{
        width: '100%',
        height: '100%',
        objectFit: contain ? 'contain' : 'cover',
        background: '#000',
        display: stream ? 'block' : 'none',
      }}
    />
  );
}

// ─── ParticipantTile ──────────────────────────────────────────────────────────

type TileProps = {
  stream: MediaStream | null;
  name: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  isSpotlight?: boolean;
  onClick?: () => void;
};

function ParticipantTile({
  stream, name, role, micOn, camOn, screenSharing,
  isLocal, isSpeaking, isPinned, isSpotlight, onClick,
}: TileProps) {
  const remoteSpeaking = useSpeakingDetector(isLocal ? null : stream);
  const activeSpeaking = isLocal ? (isSpeaking ?? false) : remoteSpeaking;
  const initial = (name || '?').charAt(0).toUpperCase();

  const roleLabel = role === 'recruiter' ? 'Interviewer' : role === 'candidate' ? 'Candidate' : '';
  const roleColor = role === 'recruiter' ? T.blue : T.purple;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: isSpotlight ? 12 : 10,
        overflow: 'hidden',
        background: T.surface,
        cursor: onClick ? 'pointer' : 'default',
        border: activeSpeaking
          ? `2px solid ${T.green}`
          : isPinned
          ? `2px solid ${T.indigo}`
          : `1px solid ${T.border}`,
        boxShadow: activeSpeaking
          ? `0 0 0 3px ${T.green}30, 0 8px 40px rgba(0,0,0,0.6)`
          : '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        aspectRatio: '16/9',
        userSelect: 'none',
      }}
    >
      {/* Avatar fallback */}
      {(!camOn || !stream) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(145deg, #0F1629 0%, #1A1F3A 100%)`,
          gap: 8,
        }}>
          <div style={{
            width: isSpotlight ? 80 : 52,
            height: isSpotlight ? 80 : 52,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple} 0%, ${T.indigo} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isSpotlight ? 30 : 20,
            fontWeight: 700,
            color: '#fff',
            boxShadow: `0 4px 20px ${T.purple}50`,
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <span style={{ fontSize: 12, color: T.muted, maxWidth: 120, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {!micOn && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}40`,
            }}>
              Muted
            </span>
          )}
        </div>
      )}

      {/* Video */}
      <VideoTrack
        stream={stream}
        muted={isLocal}
        contain={screenSharing}
      />

      {/* Speaking ring */}
      {activeSpeaking && (
        <div style={{
          position: 'absolute', inset: -2,
          borderRadius: 'inherit',
          border: `3px solid ${T.green}`,
          animation: 'speakRing 1s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Screen share badge */}
      {screenSharing && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '3px 8px', borderRadius: 20,
          background: T.blue, color: '#001521',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
        }}>
          SCREEN
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 10px 8px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {isLocal ? 'You' : name}
          </span>
          {roleLabel && (
            <span style={{ fontSize: 10, color: roleColor, fontWeight: 500, flexShrink: 0 }}>
              {roleLabel}
            </span>
          )}
        </div>
        {!micOn && (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `${T.red}CC`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, flexShrink: 0,
          }}>
            🔇
          </div>
        )}
      </div>

      {/* Pinned badge */}
      {isPinned && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: '50%',
          background: T.indigo,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
        }}>
          📌
        </div>
      )}
    </div>
  );
}

// ─── VideoGrid ────────────────────────────────────────────────────────────────

type GridParticipant = {
  userId: string;
  stream: MediaStream | null;
  name: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
};

function VideoGrid({
  participants,
  pinnedUserId,
  onPin,
}: {
  participants: GridParticipant[];
  pinnedUserId: string | null;
  onPin: (userId: string) => void;
}) {
  const n = participants.length;

  // Pinned/spotlight layout: pinned tile large, others strip on right
  const pinnedParticipant = pinnedUserId
    ? participants.find(p => p.userId === pinnedUserId)
    : null;
  const others = pinnedParticipant
    ? participants.filter(p => p.userId !== pinnedUserId)
    : [];

  if (pinnedParticipant && n > 1) {
    return (
      <div style={{ display: 'flex', flex: 1, gap: 8, height: '100%' }}>
        {/* Spotlight */}
        <div style={{ flex: 1 }}>
          <ParticipantTile
            {...pinnedParticipant}
            isPinned
            isSpotlight
            onClick={() => onPin(pinnedParticipant.userId)}
          />
        </div>
        {/* Strip */}
        <div style={{
          width: 200, display: 'flex', flexDirection: 'column', gap: 8,
          overflowY: 'auto',
        }}>
          {others.map(p => (
            <ParticipantTile
              key={p.userId}
              {...p}
              onClick={() => onPin(p.userId)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Dynamic grid
  const cols = n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 3;
  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 8,
      alignContent: 'start',
      alignItems: 'stretch',
    }}>
      {participants.map(p => (
        <ParticipantTile
          key={p.userId}
          {...p}
          onClick={() => onPin(p.userId)}
        />
      ))}
    </div>
  );
}

// ─── CtrlButton ───────────────────────────────────────────────────────────────

function CtrlButton({
  icon, label, active, danger, badge, onClick, disabled,
}: {
  icon: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const bg = danger
    ? T.red
    : active === false
    ? `${T.red}25`
    : T.glass;
  const color = danger ? '#fff' : active === false ? T.red : T.white;
  const border = danger ? 'none' : active === false ? `1px solid ${T.red}50` : `1px solid ${T.border}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 4,
        minWidth: danger ? 'auto' : 56,
        height: danger ? 44 : 58,
        padding: danger ? '0 24px' : '0 6px',
        borderRadius: danger ? 999 : 14,
        background: bg, color, border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, transform 0.1s',
        fontFamily: 'inherit',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, color: danger ? 'rgba(255,255,255,0.8)' : T.muted, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {(badge ?? 0) > 0 && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          minWidth: 16, height: 16, borderRadius: 8,
          background: T.purple, color: '#fff',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
        }}>
          {(badge ?? 0) > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

function ChatPanel({
  messages, myUserId, onSend, onClose,
}: {
  messages: ChatMessage[];
  myUserId: string;
  onSend: (m: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: T.panel,
      borderLeft: `1px solid ${T.border}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.white }}>
          Chat
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, fontSize: 20, lineHeight: 1, padding: '0 2px',
        }}>
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: T.faint, textAlign: 'center',
          }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <span style={{ fontSize: 13 }}>No messages yet</span>
          </div>
        ) : messages.map((m, i) => {
          const isMe = m.userId === myUserId;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: isMe ? T.purple : T.blue,
                }}>
                  {isMe ? 'You' : m.name}
                </span>
                <span style={{ fontSize: 10, color: T.faint }}>{fmt(m.timestamp)}</span>
              </div>
              <div style={{
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                background: isMe ? `${T.purple}20` : T.glass,
                border: `1px solid ${isMe ? T.purple + '40' : T.border}`,
                fontSize: 13, color: T.white, lineHeight: 1.55,
                wordBreak: 'break-word',
              }}>
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 8,
        flexShrink: 0,
      }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Message…"
          style={{
            flex: 1, padding: '9px 12px',
            background: T.glass, border: `1px solid ${T.border}`,
            borderRadius: 10, color: T.white, fontSize: 13,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: draft.trim() ? T.purple : T.glass,
            color: draft.trim() ? '#fff' : T.faint,
            fontSize: 16, cursor: draft.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── ParticipantsPanel ────────────────────────────────────────────────────────

function ParticipantsPanel({
  localUser,
  localMicOn,
  localCamOn,
  peers,
  onClose,
}: {
  localUser: { name: string; role?: string };
  localMicOn: boolean;
  localCamOn: boolean;
  peers: RemotePeer[];
  onClose: () => void;
}) {
  const all = [
    { userId: 'local', name: localUser.name, role: localUser.role, micOn: localMicOn, camOn: localCamOn, isLocal: true },
    ...peers.map(p => ({ ...p, isLocal: false })),
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: T.panel,
      borderLeft: `1px solid ${T.border}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.white }}>
          People ({all.length})
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, fontSize: 20, lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {all.map(p => (
          <div key={p.userId} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: T.glass, border: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.purple}, ${T.indigo})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(p.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>
                {p.name} {p.isLocal && (
                  <span style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>(You)</span>
                )}
              </div>
              {p.role && (
                <div style={{
                  fontSize: 11,
                  color: p.role === 'recruiter' ? T.blue : T.purple,
                }}>
                  {p.role === 'recruiter' ? 'Interviewer' : 'Candidate'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 14, opacity: p.micOn ? 1 : 0.25 }}>
                {p.micOn ? '🎙️' : '🔇'}
              </span>
              <span style={{ fontSize: 14, opacity: p.camOn ? 1 : 0.25 }}>
                {p.camOn ? '📹' : '📷'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ConnectionOverlay ────────────────────────────────────────────────────────

function ConnectionOverlay({
  state,
  error,
  onRetry,
}: {
  state: string;
  error: string;
  onRetry: () => void;
}) {
  const isError = state === 'error';
  const isLeft = state === 'left';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,8,16,0.92)',
      backdropFilter: 'blur(8px)',
      gap: 16, zIndex: 50,
    }}>
      {isError ? (
        <>
          <div style={{ fontSize: 40 }}>❌</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>
            Connection Failed
          </div>
          {error && (
            <div style={{
              fontSize: 13, color: '#FCA5A5', maxWidth: 360, textAlign: 'center',
              padding: '10px 14px', borderRadius: 10,
              background: `${T.red}15`, border: `1px solid ${T.red}30`,
            }}>
              {error}
            </div>
          )}
          <button
            onClick={onRetry}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: T.indigo, color: '#fff', fontWeight: 700,
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry Connection
          </button>
        </>
      ) : isLeft ? (
        <>
          <div style={{ fontSize: 40 }}>👋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>
            You left the call
          </div>
        </>
      ) : (
        <>
          <div style={{ position: 'relative', width: 48, height: 48 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `3px solid ${T.border}`,
              borderTopColor: T.indigo,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
          <div style={{ fontSize: 14, color: T.muted }}>
            {state === 'acquiring-media' && 'Setting up camera & microphone…'}
            {state === 'connecting-socket' && 'Connecting to server…'}
            {state === 'joining-room' && 'Joining room…'}
            {state === 'reconnecting' && 'Reconnecting…'}
            {state === 'idle' && 'Initializing…'}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PreJoinLobby ─────────────────────────────────────────────────────────────

function PreJoinLobby({
  roomId,
  userName,
  onJoin,
}: {
  roomId: string;
  userName: string;
  onJoin: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [checking, setChecking] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [permError, setPermError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const { cameras, microphones } = useDevices();
  const [camId, setCamId] = useState('');
  const [micId, setMicId] = useState('');
  const rafRef = useRef<number>(0);

  const startPreview = useCallback(async (camDeviceId?: string, micDeviceId?: string) => {
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    setPermError('');
    setChecking(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camDeviceId ? { deviceId: { exact: camDeviceId } } : true,
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
      });
      previewStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Audio level meter
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 2.5));
        rafRef.current = requestAnimationFrame(tick);
      };
      void ctx.resume().then(tick);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setPermError('Camera/microphone access was denied. Please allow permissions in your browser settings and reload.');
      } else {
        setPermError(`Could not access your camera or microphone: ${e.message}`);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void startPreview();
    return () => {
      cancelAnimationFrame(rafRef.current);
      previewStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startPreview]);

  const toggleMic = () => {
    const next = !micOn;
    previewStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    previewStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = next));
    setCamOn(next);
  };

  const handleJoin = () => {
    cancelAnimationFrame(rafRef.current);
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    previewStreamRef.current = null;
    onJoin();
  };

  const initial = userName.charAt(0).toUpperCase();

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', 'Sora', system-ui, sans-serif",
      color: T.white,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select { background: ${T.surface} !important; color: ${T.white} !important; }
        select option { background: ${T.surface}; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 640,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Branding */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            JobCrawler Interviews
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.white }}>
            Ready to join?
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: T.muted }}>
            Room: <code style={{ color: T.blue, background: `${T.blue}15`, padding: '2px 6px', borderRadius: 4 }}>
              {roomId}
            </code>
          </p>
        </div>

        {/* Preview */}
        <div style={{
          position: 'relative', borderRadius: 14, overflow: 'hidden',
          background: T.surface, aspectRatio: '16/9',
          border: `1px solid ${T.border}`,
        }}>
          {(!camOn || checking) && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(145deg, #0F1629, #1A1F3A)`,
              gap: 10,
            }}>
              {checking ? (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: `3px solid ${T.border}`, borderTopColor: T.indigo,
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${T.purple}, ${T.indigo})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, fontWeight: 700,
                  }}>
                    {initial}
                  </div>
                  <span style={{ fontSize: 13, color: T.muted }}>Camera is off</span>
                </>
              )}
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Quick controls overlay */}
          <div style={{
            position: 'absolute', bottom: 14, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 10,
            zIndex: 3,
          }}>
            {[
              { icon: micOn ? '🎙️' : '🔇', label: micOn ? 'Mute' : 'Unmute', action: toggleMic, off: !micOn },
              { icon: camOn ? '📹' : '📷', label: camOn ? 'Stop camera' : 'Start camera', action: toggleCam, off: !camOn },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                title={btn.label}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: 'none',
                  background: btn.off ? `${T.red}CC` : 'rgba(0,0,0,0.75)',
                  color: '#fff', fontSize: 20,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Mic level meter */}
        {!permError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>Mic level</span>
            <div style={{
              flex: 1, height: 6, borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${micOn ? audioLevel : 0}%`,
                background: audioLevel > 70 ? T.amber : T.green,
                transition: 'width 0.1s, background 0.3s',
              }} />
            </div>
            {!micOn && <span style={{ fontSize: 11, color: T.red, flexShrink: 0 }}>Muted</span>}
          </div>
        )}

        {/* Permission error */}
        {permError && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: `${T.red}15`, border: `1px solid ${T.red}40`,
            fontSize: 13, color: '#FCA5A5', lineHeight: 1.5,
          }}>
            {permError}
          </div>
        )}

        {/* Device selectors */}
        {!permError && (cameras.length > 1 || microphones.length > 1) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {cameras.length > 1 && (
              <div>
                <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 5 }}>
                  Camera
                </label>
                <select
                  value={camId}
                  onChange={e => { setCamId(e.target.value); void startPreview(e.target.value, micId); }}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                    border: `1px solid ${T.border}`, outline: 'none',
                  }}
                >
                  {cameras.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {microphones.length > 1 && (
              <div>
                <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 5 }}>
                  Microphone
                </label>
                <select
                  value={micId}
                  onChange={e => { setMicId(e.target.value); void startPreview(camId, e.target.value); }}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                    border: `1px solid ${T.border}`, outline: 'none',
                  }}
                >
                  {microphones.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Identity card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 12,
          background: T.glass, border: `1px solid ${T.border}`,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple}, ${T.indigo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {micOn ? '🎙️ Mic on' : '🔇 Muted'} · {camOn ? '📹 Camera on' : '📷 Camera off'}
            </div>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={!!permError || checking}
          style={{
            padding: '14px', borderRadius: 12, border: 'none',
            background: permError || checking
              ? T.glass
              : `linear-gradient(135deg, ${T.green} 0%, #059669 100%)`,
            color: permError || checking ? T.muted : '#052E16',
            fontSize: 15, fontWeight: 800,
            cursor: permError || checking ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: permError || checking ? 'none' : `0 4px 20px ${T.green}40`,
            transition: 'all 0.2s',
          }}
        >
          {checking ? 'Setting up…' : 'Join Interview →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: T.faint, margin: 0 }}>
          💡 Use headphones to prevent echo
        </p>
      </div>
    </div>
  );
}

// ─── MeetingRoom ──────────────────────────────────────────────────────────────

type SidePanel = 'chat' | 'participants' | null;

function MeetingRoom({ roomId, user }: {
  roomId: string;
  user: { id: string; full_name?: string; role?: string };
}) {
  const router = useRouter();
  const {
    connectionState, connected, connecting, localStream,
    peers, messages, micOn, camOn, screenSharing, error,
    join, leave, toggleMic, toggleCam,
    startScreenShare, stopScreenShare, sendMessage,
  } = useWebRTCRoom({ roomId, user });

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const lastMsgCount = useRef(0);
  const elapsed = useCallTimer(connected);
  const localSpeaking = useSpeakingDetector(localStream);

  // Track unread chat
  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      if (sidePanel !== 'chat') {
        setChatUnread(n => n + (messages.length - lastMsgCount.current));
      }
    }
    lastMsgCount.current = messages.length;
  }, [messages.length, sidePanel]);

  const openChat = () => {
    setSidePanel(p => p === 'chat' ? null : 'chat');
    setChatUnread(0);
  };

  const openPeople = () => setSidePanel(p => p === 'participants' ? null : 'participants');

  // Auto-join on mount
  useEffect(() => { void join(); }, [join]);

  const handleLeave = useCallback(() => {
    leave();
    router.push('/interviews');
  }, [leave, router]);

  const handlePin = (userId: string) => {
    setPinnedUserId(prev => prev === userId ? null : userId);
  };

  // Assemble grid participants
  const gridParticipants = useMemo<GridParticipant[]>(() => {
    const local: GridParticipant = {
      userId: 'local',
      stream: localStream,
      name: user.full_name ?? 'You',
      role: user.role,
      micOn,
      camOn,
      screenSharing,
      isLocal: true,
      isSpeaking: localSpeaking,
    };
    const remotes: GridParticipant[] = peers.map(p => ({
      userId: p.userId,
      stream: p.stream,
      name: p.name ?? 'Participant',
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
    }));
    return [local, ...remotes];
  }, [localStream, user, micOn, camOn, screenSharing, localSpeaking, peers]);

  const showOverlay = !connected || connectionState === 'error' || connectionState === 'left';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
      background: T.bg,
      fontFamily: "'Inter', 'Sora', system-ui, sans-serif",
      color: T.white,
    }}>
      <style>{`
        @keyframes speakRing {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${T.green}60; }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px ${T.green}00; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder { color: ${T.faint}; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px',
        background: T.panel,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        height: 54,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.blue }}>⬡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>
              Interview Room
            </div>
            <div style={{ fontSize: 10, color: T.faint, fontFamily: 'monospace' }}>
              {roomId}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {connected && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: `${T.green}15`, border: `1px solid ${T.green}35`,
              fontSize: 12, fontWeight: 700, color: T.green,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: T.green, display: 'inline-block',
                animation: 'blink 1.8s ease infinite',
              }} />
              {elapsed}
            </div>
          )}

          {connecting && (
            <div style={{ fontSize: 12, color: T.amber }}>Connecting…</div>
          )}

          <div style={{
            fontSize: 12, color: T.muted,
            padding: '4px 10px', borderRadius: 20,
            background: T.glass, border: `1px solid ${T.border}`,
          }}>
            {gridParticipants.length} {gridParticipants.length === 1 ? 'person' : 'people'}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>

        {/* Connection overlay */}
        {showOverlay && (
          <ConnectionOverlay
            state={connectionState}
            error={error}
            onRetry={() => { void join(); }}
          />
        )}

        {/* Video area */}
        <div style={{
          flex: 1, padding: 10, display: 'flex',
          overflow: 'hidden',
        }}>
          <VideoGrid
            participants={gridParticipants}
            pinnedUserId={pinnedUserId}
            onPin={handlePin}
          />
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {sidePanel === 'chat' && (
              <ChatPanel
                messages={messages}
                myUserId={user.id}
                onSend={sendMessage}
                onClose={() => setSidePanel(null)}
              />
            )}
            {sidePanel === 'participants' && (
              <ParticipantsPanel
                localUser={{ name: user.full_name ?? 'You', role: user.role }}
                localMicOn={micOn}
                localCamOn={camOn}
                peers={peers}
                onClose={() => setSidePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '10px 20px',
        background: T.panel,
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
        height: 78,
      }}>
        <CtrlButton
          icon={micOn ? '🎙️' : '🔇'}
          label={micOn ? 'Mute' : 'Unmute'}
          active={micOn}
          onClick={toggleMic}
        />
        <CtrlButton
          icon={camOn ? '📹' : '📷'}
          label={camOn ? 'Stop video' : 'Start video'}
          active={camOn}
          onClick={toggleCam}
          disabled={screenSharing}
        />
        <CtrlButton
          icon="🖥️"
          label={screenSharing ? 'Stop share' : 'Share screen'}
          active={!screenSharing}
          onClick={screenSharing ? () => { void stopScreenShare(); } : () => { void startScreenShare(); }}
        />

        <div style={{ width: 1, height: 32, background: T.border, margin: '0 4px' }} />

        <CtrlButton
          icon="💬"
          label="Chat"
          active={sidePanel === 'chat'}
          badge={sidePanel !== 'chat' ? chatUnread : 0}
          onClick={openChat}
        />
        <CtrlButton
          icon="👥"
          label="People"
          active={sidePanel === 'participants'}
          onClick={openPeople}
        />

        <div style={{ width: 1, height: 32, background: T.border, margin: '0 4px' }} />

        <CtrlButton
          icon="✕"
          label="Leave"
          danger
          onClick={handleLeave}
        />
      </footer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  const params = useParams();
  const roomId =
    (params?.['room-id'] as string) ??
    (params?.roomId as string) ??
    '';

  const { user } = useAuth();
  const [joined, setJoined] = useState(false);

  if (!user) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: T.bg, color: T.muted,
        fontFamily: "system-ui, sans-serif", fontSize: 14,
        flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div>Please log in to join the interview.</div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: T.bg, color: T.muted,
        fontFamily: "system-ui, sans-serif", fontSize: 14,
      }}>
        Invalid room ID.
      </div>
    );
  }

  if (!joined) {
    return (
      <PreJoinLobby
        roomId={roomId}
        userName={user.full_name ?? user.email ?? 'You'}
        onJoin={() => setJoined(true)}
      />
    );
  }

  return <MeetingRoom roomId={roomId} user={user} />;
}
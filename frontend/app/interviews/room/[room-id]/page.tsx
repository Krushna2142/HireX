'use client';

/**
 * Interview Room — Google Meet-style video conferencing
 *
 * Architecture:
 *  - PreJoinLobby   : camera/mic check before entering
 *  - MeetingRoom    : active call UI (grid + controls + side panels)
 *  - VideoTile      : single participant video with speaking ring, name tag
 *  - ControlsBar    : mic / cam / screen share / chat / participants / leave
 *  - ChatPanel      : socket-backed in-room text chat
 *  - ParticipantsPanel : live list of connected users
 *
 * The room ID is provided by the [room-id] dynamic segment.
 * Route: /interviews/room/jc-<interviewId>-r<roundNumber>
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
import { useWebRTCRoom, type RemotePeer, type ChatMessage } from '@/hooks/useWebRTCRoom';
import { useAuth } from '@/components/providers/AuthProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  bg:          '#07090F',
  surface:     '#0D1120',
  surfaceHigh: '#151C2E',
  border:      'rgba(255,255,255,0.07)',
  muted:       'rgba(255,255,255,0.4)',
  faint:       'rgba(255,255,255,0.18)',
  green:       '#10B981',
  red:         '#EF4444',
  blue:        '#38BDF8',
  purple:      '#7C3AED',
  amber:       '#F59E0B',
  white:       '#F1F5F9',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// useSpeaking — AudioContext-based voice-activity detection
// Returns true when the stream's audio level exceeds the threshold
// ─────────────────────────────────────────────────────────────────────────────

function useSpeaking(stream: MediaStream | null, threshold = 18): boolean {
  const [speaking, setSpeaking] = useState(false);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) { setSpeaking(false); return; }
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    let closed = false;
    let ctx: AudioContext;

    try {
      ctx = new AudioContext();
      ctxRef.current = ctx;
    } catch {
      return; // AudioContext unavailable (e.g. SSR hydration edge)
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const poll = () => {
      if (closed || ctx.state === 'closed') return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeaking(avg > threshold);
      rafRef.current = requestAnimationFrame(poll);
    };

    const start = () => { rafRef.current = requestAnimationFrame(poll); };
    if (ctx.state === 'suspended') void ctx.resume().then(start);
    else start();

    return () => {
      closed = true;
      cancelAnimationFrame(rafRef.current);
      void ctx.close().catch(() => {});
    };
  }, [stream, threshold]);

  return speaking;
}

// ─────────────────────────────────────────────────────────────────────────────
// useElapsedTimer — formats seconds as HH:MM:SS
// ─────────────────────────────────────────────────────────────────────────────

function useElapsedTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoTile — single participant view
// ─────────────────────────────────────────────────────────────────────────────

type VideoTileProps = {
  stream: MediaStream | null;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  onClick?: () => void;
  size?: 'normal' | 'large';
};

function VideoTile({
  stream, name, role, micOn, camOn, screenSharing,
  isLocal, isSpeaking, isPinned, onClick, size = 'normal',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const speaking = useSpeaking(isLocal ? null : stream); // local speaking handled externally
  const activeSpeaking = isLocal ? (isSpeaking ?? false) : speaking;

  // Assign MediaStream to the video element (cannot be done as JSX prop)
  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  const initial = (name ?? '?').charAt(0).toUpperCase();
  const displayRole = role === 'recruiter' ? 'Recruiter' : role === 'candidate' ? 'Candidate' : role ?? '';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: T.surfaceHigh,
        border: activeSpeaking
          ? `2px solid ${T.green}`
          : isPinned
          ? `2px solid ${T.blue}`
          : `1px solid ${T.border}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: activeSpeaking
          ? `0 0 0 4px ${T.green}22, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 4px 24px rgba(0,0,0,0.4)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        aspectRatio: '16/9',
        width: '100%',
        userSelect: 'none',
      }}
    >
      {/* Camera off — avatar placeholder */}
      {!camOn && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: `linear-gradient(135deg, ${T.surfaceHigh}, #0A0E1A)`,
        }}>
          <div style={{
            width: size === 'large' ? 72 : 52,
            height: size === 'large' ? 72 : 52,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple}, #4338CA)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size === 'large' ? 28 : 20,
            fontWeight: 700,
            color: T.white,
            boxShadow: `0 4px 16px ${T.purple}44`,
          }}>
            {initial}
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>{name ?? 'Participant'}</span>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: screenSharing ? 'contain' : 'cover',
          background: '#000',
          display: camOn ? 'block' : 'none',
        }}
      />

      {/* Speaking ring animation */}
      {activeSpeaking && (
        <div style={{
          position: 'absolute', inset: -1,
          borderRadius: 16,
          border: `2px solid ${T.green}`,
          animation: 'speakPulse 1s ease infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Screen share badge */}
      {screenSharing && (
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: T.blue, color: '#00131F',
          fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 20,
        }}>
          SCREEN
        </div>
      )}

      {/* Local badge */}
      {isLocal && (
        <div style={{
          position: 'absolute', top: 10, left: screenSharing ? 80 : 10,
          background: 'rgba(0,0,0,0.6)',
          color: T.muted, fontSize: 10,
          padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(4px)',
        }}>
          You
        </div>
      )}

      {/* Name tag */}
      <div style={{
        position: 'absolute', bottom: 10, left: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        padding: '5px 10px', borderRadius: 8,
        maxWidth: 'calc(100% - 60px)',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: T.white,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name ?? 'Participant'}
        </span>
        {displayRole && (
          <span style={{
            fontSize: 10, color: role === 'recruiter' ? T.blue : T.purple,
            fontWeight: 500,
          }}>
            {displayRole}
          </span>
        )}
      </div>

      {/* Mic muted indicator (top-right) */}
      {!micOn && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 28, height: 28, borderRadius: '50%',
          background: `${T.red}CC`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>
          🔇
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ControlBtn — reusable icon button for the controls bar
// ─────────────────────────────────────────────────────────────────────────────

type ControlBtnProps = {
  label: string;
  icon: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  disabled?: boolean;
  onClick: () => void;
};

function ControlBtn({ label, icon, active, danger, badge, disabled, onClick }: ControlBtnProps) {
  const bg = danger
    ? T.red
    : active === false
    ? `${T.red}22`
    : 'rgba(255,255,255,0.08)';
  const color = danger ? T.white : active === false ? T.red : T.white;
  const border = danger
    ? 'none'
    : active === false
    ? `1px solid ${T.red}44`
    : `1px solid ${T.border}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3,
        width: danger ? 'auto' : 56,
        height: danger ? 44 : 56,
        padding: danger ? '0 20px' : 0,
        borderRadius: danger ? 999 : 16,
        background: bg, color, border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, color: danger ? T.white : T.muted }}>{label}</span>
      {(badge ?? 0) > 0 && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 16, height: 16, borderRadius: '50%',
          background: T.purple, color: T.white,
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {badge! > 9 ? '9+' : badge}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel — in-room text chat
// ─────────────────────────────────────────────────────────────────────────────

function ChatPanel({
  messages, myUserId, onSend, onClose,
}: {
  messages: ChatMessage[];
  myUserId: string;
  onSend: (msg: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: T.surface,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: T.white }}>💬 In-call chat</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, fontSize: 18, lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: T.faint, fontSize: 13, marginTop: 40 }}>
            No messages yet.<br />Say hello!
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.userId === myUserId;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isMe ? T.purple : T.blue }}>
                  {isMe ? 'You' : m.name}
                </span>
                <span style={{ fontSize: 10, color: T.faint }}>{fmtTime(m.timestamp)}</span>
              </div>
              <div style={{
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isMe ? `${T.purple}22` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isMe ? T.purple + '44' : T.border}`,
                fontSize: 13, color: T.white, lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Send a message…"
          style={{
            flex: 1, padding: '9px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.border}`,
            borderRadius: 10, color: T.white,
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          onClick={send}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none',
            background: draft.trim() ? T.purple : 'rgba(255,255,255,0.05)',
            color: draft.trim() ? T.white : T.muted,
            fontSize: 16, cursor: draft.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantsPanel
// ─────────────────────────────────────────────────────────────────────────────

function ParticipantsPanel({
  localUser,
  localMicOn,
  localCamOn,
  peers,
  onClose,
}: {
  localUser: { name?: string; role?: string };
  localMicOn: boolean;
  localCamOn: boolean;
  peers: RemotePeer[];
  onClose: () => void;
}) {
  const all = [
    { userId: 'local', name: localUser.name ?? 'You', role: localUser.role, micOn: localMicOn, camOn: localCamOn, isLocal: true },
    ...peers.map(p => ({ ...p, isLocal: false })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.surface }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: T.white }}>
          👥 Participants ({all.length})
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {all.map(p => (
          <div key={p.userId} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.purple}, #4338CA)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: T.white, flexShrink: 0,
            }}>
              {(p.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>
                {p.name} {p.isLocal && <span style={{ fontSize: 10, color: T.muted }}>(You)</span>}
              </div>
              {p.role && (
                <div style={{ fontSize: 11, color: p.role === 'recruiter' ? T.blue : T.purple }}>
                  {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 14, opacity: p.micOn ? 1 : 0.3 }} title={p.micOn ? 'Mic on' : 'Muted'}>
                {p.micOn ? '🎙️' : '🔇'}
              </span>
              <span style={{ fontSize: 14, opacity: p.camOn ? 1 : 0.3 }} title={p.camOn ? 'Cam on' : 'Camera off'}>
                {p.camOn ? '📹' : '📷'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoGrid — dynamic layout based on participant count
// ─────────────────────────────────────────────────────────────────────────────

function getGridColumns(count: number): number {
  if (count === 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 3; // cap at 3 columns; tiles will wrap
}

// ─────────────────────────────────────────────────────────────────────────────
// PreJoinLobby
// ─────────────────────────────────────────────────────────────────────────────

function PreJoinLobby({
  roomId,
  userName,
  onJoin,
}: {
  roomId: string;
  userName: string;
  onJoin: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [checking, setChecking] = useState(false);
  const [ready, setReady] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState('');

  const startPreview = useCallback(async () => {
    try {
      setChecking(true);
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setReady(true);
    } catch (err: unknown) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Camera/microphone access denied. Please allow permissions and try again.'
        : 'Could not access camera or microphone.';
      setError(msg);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void startPreview(); }, [startPreview]);

  // Cleanup preview stream on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const toggleMic = () => {
    const next = !micOn;
    streamRef.current?.getAudioTracks().forEach(t => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    streamRef.current?.getVideoTracks().forEach(t => (t.enabled = next));
    setCamOn(next);
    if (localVideoRef.current) {
      localVideoRef.current.style.opacity = next ? '1' : '0';
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Sora', sans-serif",
      color: T.white,
    }}>
      <div style={{ width: 'min(640px, 100%)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🎥</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Ready to join?</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: T.muted }}>
            Room: <code style={{ color: T.blue }}>{roomId}</code>
          </p>
        </div>

        {/* Camera preview */}
        <div style={{
          position: 'relative', borderRadius: 16, overflow: 'hidden',
          background: T.surfaceHigh, aspectRatio: '16/9',
          border: `1px solid ${T.border}`,
        }}>
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
          />
          {(!ready || !camOn) && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: T.surfaceHigh, flexDirection: 'column', gap: 8,
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.purple}, #4338CA)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700,
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: T.muted }}>
                {!ready ? 'Checking camera…' : 'Camera off'}
              </span>
            </div>
          )}
          {/* Mic/cam toggles over the preview */}
          <div style={{
            position: 'absolute', bottom: 12, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 10,
          }}>
            {[
              { icon: micOn ? '🎙️' : '🔇', label: micOn ? 'Mute' : 'Unmute', onClick: toggleMic, off: !micOn },
              { icon: camOn ? '📹' : '📷', label: camOn ? 'Stop video' : 'Start video', onClick: toggleCam, off: !camOn },
            ].map(btn => (
              <button key={btn.label} onClick={btn.onClick} title={btn.label} style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: btn.off ? `${T.red}CC` : 'rgba(0,0,0,0.7)',
                color: T.white, fontSize: 18, cursor: 'pointer',
                backdropFilter: 'blur(6px)',
              }}>
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: `${T.red}18`, border: `1px solid ${T.red}44`,
            color: '#FCA5A5', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Join info */}
        <div style={{
          padding: '14px 16px', borderRadius: 12,
          background: T.surface, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple}, #4338CA)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 12, color: T.muted }}>
              {micOn ? 'Microphone on' : 'Muted'} · {camOn ? 'Camera on' : 'Camera off'}
            </div>
          </div>
        </div>

        <button
          onClick={onJoin}
          disabled={checking}
          style={{
            padding: '14px', borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${T.green}, #059669)`,
            color: '#052E16', fontSize: 15, fontWeight: 800,
            cursor: checking ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: `0 4px 16px ${T.green}44`,
          }}
        >
          {checking ? 'Setting up…' : 'Join Interview →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: T.faint, margin: 0 }}>
          💡 Use headphones for the best audio quality
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MeetingRoom — active call UI
// ─────────────────────────────────────────────────────────────────────────────

type SidePanel = 'chat' | 'participants' | null;

function MeetingRoom({
  roomId,
  user,
}: {
  roomId: string;
  user: { id: string; full_name?: string; role?: string };
}) {
  const {
    connecting, connected, localStream, peers,
    messages, micOn, camOn, screenSharing, error,
    join, leave, toggleMic, toggleCam,
    startScreenShare, stopScreenShare, sendMessage,
  } = useWebRTCRoom({ roomId, user, enabled: true });

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const router = useRouter();

  const elapsed = useElapsedTimer(connected);
  const localSpeaking = useSpeaking(localStream);

  // Auto-join on mount
  useEffect(() => { void join(); }, [join]);

  // Track unread chat messages
  useEffect(() => {
    if (sidePanel !== 'chat') {
      setUnreadChat(messages.length > 0 ? prev => prev + 1 : 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const openChat = useCallback(() => {
    setSidePanel(p => p === 'chat' ? null : 'chat');
    setUnreadChat(0);
  }, []);

  const handleLeave = useCallback(() => {
    leave();
    router.push('/interviews');
  }, [leave, router]);

  // Build participant list for the grid
  const allParticipants = useMemo(() => {
    return [
      {
        userId: 'local',
        stream: localStream,
        name: user.full_name ?? 'You',
        role: user.role,
        micOn,
        camOn,
        screenSharing,
        isLocal: true,
      },
      ...peers.map(p => ({ ...p, isLocal: false })),
    ];
  }, [localStream, user, micOn, camOn, screenSharing, peers]);

  const cols = getGridColumns(allParticipants.length);

  const hasSidePanel = sidePanel !== null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: T.bg,
      fontFamily: "'Sora', sans-serif", color: T.white,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes speakPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder { color: ${T.faint}; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.blue }}>⬡</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>JobCrawler Interview</div>
            <div style={{ fontSize: 10, color: T.muted }}>Room: {roomId}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Connection state */}
          {connecting && (
            <div style={{ fontSize: 12, color: T.amber }}>Connecting…</div>
          )}
          {!connecting && !connected && (
            <div style={{ fontSize: 12, color: T.red }}>Disconnected</div>
          )}

          {/* Live timer */}
          {connected && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: `${T.green}18`, border: `1px solid ${T.green}44`,
              fontSize: 12, fontWeight: 700, color: T.green,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: T.green,
                animation: 'blink 1.4s ease infinite', display: 'inline-block',
              }} />
              {elapsed}
            </div>
          )}

          <div style={{
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
            fontSize: 12, color: T.muted,
          }}>
            {allParticipants.length} {allParticipants.length === 1 ? 'person' : 'people'}
          </div>
        </div>
      </header>

      {/* ── Body (grid + side panel) ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Video grid */}
        <div style={{
          flex: 1, padding: 12,
          overflow: 'auto',
          display: 'flex', alignItems: 'flex-start',
        }}>
          {connecting && peers.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: T.muted, fontSize: 14,
            }}>
              <div style={{ fontSize: 32 }}>📡</div>
              <div>Connecting to the interview room…</div>
            </div>
          )}

          {error && (
            <div style={{
              margin: 'auto', padding: '16px 20px', borderRadius: 12,
              background: `${T.red}18`, border: `1px solid ${T.red}44`,
              color: '#FCA5A5', fontSize: 13, maxWidth: 400, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {!error && (
            <div style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 10,
              alignContent: 'start',
            }}>
              {allParticipants.map(p => (
                <VideoTile
                  key={p.userId}
                  stream={p.stream}
                  name={p.name}
                  role={p.role}
                  micOn={p.micOn}
                  camOn={p.camOn}
                  screenSharing={p.screenSharing}
                  isLocal={p.isLocal}
                  isSpeaking={p.isLocal ? localSpeaking : undefined}
                  isPinned={pinnedUserId === p.userId}
                  size={allParticipants.length === 1 ? 'large' : 'normal'}
                  onClick={() => setPinnedUserId(prev => prev === p.userId ? null : p.userId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {hasSidePanel && (
          <div style={{
            width: 320, flexShrink: 0,
            borderLeft: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column',
          }}>
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
                localUser={{ name: user.full_name, role: user.role }}
                localMicOn={micOn}
                localCamOn={camOn}
                peers={peers}
                onClose={() => setSidePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <footer style={{
        flexShrink: 0,
        height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10,
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        padding: '0 20px',
      }}>
        <ControlBtn
          label={micOn ? 'Mute' : 'Unmute'}
          icon={micOn ? '🎙️' : '🔇'}
          active={micOn}
          onClick={toggleMic}
        />
        <ControlBtn
          label={camOn ? 'Stop video' : 'Start video'}
          icon={camOn ? '📹' : '📷'}
          active={camOn}
          disabled={screenSharing}
          onClick={toggleCam}
        />
        <ControlBtn
          label={screenSharing ? 'Stop share' : 'Share screen'}
          icon={screenSharing ? '🖥️' : '🖥'}
          active={!screenSharing}
          onClick={screenSharing ? stopScreenShare : startScreenShare}
        />

        <div style={{ width: 1, height: 36, background: T.border, margin: '0 4px' }} />

        <ControlBtn
          label="Chat"
          icon="💬"
          badge={sidePanel !== 'chat' ? unreadChat : 0}
          active={sidePanel === 'chat'}
          onClick={openChat}
        />
        <ControlBtn
          label="People"
          icon="👥"
          active={sidePanel === 'participants'}
          onClick={() => setSidePanel(p => p === 'participants' ? null : 'participants')}
        />

        <div style={{ width: 1, height: 36, background: T.border, margin: '0 4px' }} />

        <ControlBtn
          label="Leave"
          icon="✕"
          danger
          onClick={handleLeave}
        />
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page entry point — switches between PreJoin and Meeting
// ─────────────────────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  const params = useParams();
  // Next.js [room-id] segment → params['room-id']
  const roomId = (params?.['room-id'] as string) ?? (params?.roomId as string) ?? 'room';

  const { user } = useAuth();
  const [joined, setJoined] = useState(false);

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: T.bg, color: T.muted,
        fontFamily: "'Sora', sans-serif", fontSize: 14,
      }}>
        Please log in to join the interview.
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
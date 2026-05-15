'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/interviews/room/[room-id]/page.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useWebRTCRoom } from '@/hooks/useWebRTCRoom';

type RoomParams = Record<string, string | string[]>;

type ChatMessage = {
  userId: string;
  name: string;
  message: string;
  timestamp: string;
};

type Participant = {
  userId: string;
  stream: MediaStream | null;
  name: string;
  isSelf: boolean;
  micOn: boolean;
  camOn: boolean;
};

type ParsedRoom = {
  interviewId: string;
  roundNumber: number;
};

const C = {
  bg: '#030712',
  panel: '#0D1220',
  panel2: '#0B0F1C',
  border: 'rgba(255,255,255,0.08)',
  strongBorder: 'rgba(56,189,248,0.35)',
  text: '#F1F5F9',
  muted: 'rgba(255,255,255,0.55)',
  faint: 'rgba(255,255,255,0.32)',
  sky: '#38BDF8',
  green: '#10B981',
  purple: '#8B5CF6',
  red: '#F87171',
  yellow: '#FBBF24',
};

function safeString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function normalizeRole(role?: string | null) {
  const value = safeString(role).toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker') return 'candidate';
  if (value === 'recruiter') return 'recruiter';
  if (value === 'admin') return 'admin';
  if (value === 'super_admin') return 'super_admin';

  return value;
}

function getUserName(user: any) {
  return (
    safeString(user?.full_name) ||
    safeString(user?.fullName) ||
    safeString(user?.name) ||
    safeString(user?.email) ||
    'User'
  );
}

function getRouteParam(params: RoomParams | null | undefined, key: string): string {
  const direct = params?.[key];

  if (typeof direct === 'string') return direct;
  if (Array.isArray(direct)) return direct[0] ?? '';

  const fallbackKeys = ['room-id', 'roomId', 'id'];
  for (const fallbackKey of fallbackKeys) {
    const value = params?.[fallbackKey];

    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0] ?? '';
  }

  return '';
}

function parseRoomId(roomId: string): ParsedRoom | null {
  const clean = roomId.trim();
  const match = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(clean);

  if (!match) return null;

  return {
    interviewId: match[1],
    roundNumber: Number(match[2]),
  };
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function initialsFromName(name: string) {
  return name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function VideoTile({
  stream,
  name,
  isSelf,
  micOn,
  camOn,
  isActive,
}: {
  stream: MediaStream | null;
  name: string;
  isSelf: boolean;
  micOn: boolean;
  camOn: boolean;
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = initialsFromName(name);

  return (
    <div
      style={{
        ...videoTileStyle,
        border: isActive ? `2px solid ${C.sky}` : `1px solid ${C.border}`,
        boxShadow: isActive ? '0 0 24px rgba(56,189,248,0.24)' : 'none',
      }}
    >
      {stream && camOn ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isSelf}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isSelf ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        <div style={avatarEmptyStyle}>
          <div style={avatarCircleStyle}>{initials || '?'}</div>
          {!camOn && <span style={cameraOffTextStyle}>Camera off</span>}
        </div>
      )}

      <div style={nameBadgeStyle}>
        <span style={nameBadgeTextStyle}>
          {name}
          {isSelf ? ' (You)' : ''}
        </span>
        {!micOn && <span style={{ fontSize: 12 }}>🔇</span>}
      </div>

      {isSelf && <div style={selfBadgeStyle}>YOU</div>}
    </div>
  );
}

function ChatPanel({
  messages,
  onSend,
  onClose,
  selfId,
}: {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  onClose: () => void;
  selfId: string;
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;

    onSend(text);
    setDraft('');
  };

  return (
    <aside style={chatPanelStyle}>
      <div style={chatHeaderStyle}>
        <span style={chatHeaderTitleStyle}>💬 Chat</span>
        <button type="button" onClick={onClose} style={plainIconButtonStyle}>
          ✕
        </button>
      </div>

      <div style={chatMessagesStyle}>
        {messages.length === 0 && (
          <p style={emptyChatTextStyle}>No messages yet</p>
        )}

        {messages.map((message, index) => {
          const isSelf = message.userId === selfId;

          return (
            <div
              key={`${message.userId}-${message.timestamp}-${index}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isSelf ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={chatSenderStyle}>{isSelf ? 'You' : message.name}</span>

              <div
                style={{
                  ...chatBubbleStyle,
                  borderRadius: isSelf
                    ? '12px 12px 4px 12px'
                    : '12px 12px 12px 4px',
                  background: isSelf
                    ? 'rgba(124,58,237,0.25)'
                    : 'rgba(255,255,255,0.08)',
                  border: isSelf
                    ? '1px solid rgba(124,58,237,0.35)'
                    : `1px solid ${C.border}`,
                }}
              >
                {message.message}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div style={chatInputWrapStyle}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Type a message..."
          style={chatInputStyle}
        />

        <button
          type="button"
          onClick={send}
          disabled={!draft.trim()}
          style={{
            ...sendButtonStyle,
            background: draft.trim() ? C.sky : 'rgba(255,255,255,0.06)',
            color: draft.trim() ? '#001018' : 'rgba(255,255,255,0.25)',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          →
        </button>
      </div>
    </aside>
  );
}

function ControlBtn({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
  disabled = false,
  badge,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <div style={controlWrapStyle}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          ...controlButtonStyle,
          background: danger
            ? 'rgba(239,68,68,0.90)'
            : active
              ? 'rgba(56,189,248,0.20)'
              : 'rgba(255,255,255,0.10)',
          color: danger ? '#FFFFFF' : active ? C.sky : '#E2E8F0',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {icon}

        {badge !== undefined && badge > 0 && (
          <div style={controlBadgeStyle}>{badge > 9 ? '9+' : badge}</div>
        )}
      </button>

      <span style={controlLabelStyle}>{label}</span>
    </div>
  );
}

export default function InterviewRoomPage() {
  const params = useParams<RoomParams>();
  const router = useRouter();

  const roomId = getRouteParam(params, 'room-id');
  const parsed = useMemo(() => parseRoomId(roomId), [roomId]);
  const isValidRoom = Boolean(parsed);

  const { user, loading: authLoading } = useAuth();

  const [chatOpen, setChatOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [endPrompt, setEndPrompt] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectingToFeedbackRef = useRef(false);

  const normalizedRole = normalizeRole(user?.role);
  const isRecruiter = normalizedRole === 'recruiter';

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
    user: user
      ? {
          id: user.id,
          full_name: getUserName(user),
          role: safeString(user.role, normalizedRole),
        }
      : null,
  });

  const canControlRoom = Boolean(canEndRoom || isRecruiter);

  useEffect(() => {
    if (
      !authLoading &&
      user?.id &&
      isValidRoom &&
      roomId &&
      !connected &&
      !connecting
    ) {
      void join();
    }
  }, [
    authLoading,
    user?.id,
    isValidRoom,
    roomId,
    connected,
    connecting,
    join,
  ]);

  const timerActive = connected && (peers.length > 0 || elapsed > 0);

  useEffect(() => {
    if (!timerActive) return;

    timerRef.current = setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  useEffect(() => {
    if (!roomEnded) return;
    if (redirectingToFeedbackRef.current) return;

    const base = isRecruiter ? '/recruiter/interviews' : '/interviews';

    const timeout = window.setTimeout(() => {
      router.push(base);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [roomEnded, router, isRecruiter]);

  useEffect(() => {
    return () => {
      if (connected) {
        leave();
      }
    };
  }, [connected, leave]);

  const handleScreenShare = useCallback(async () => {
    try {
      if (screenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch {
      // User cancelled screen share or browser blocked it.
    }
  }, [screenSharing, startScreenShare, stopScreenShare]);

  const backPath = isRecruiter ? '/recruiter/interviews' : '/interviews';

  const handleLeave = () => {
    leave();
    router.push(backPath);
  };

  const feedbackPath = parsed?.interviewId
    ? `/recruiter/interviews/${parsed.interviewId}/feedback`
    : '/recruiter/interviews';

  const handleEndAndFeedback = async () => {
    setEndPrompt(false);

    if (!canControlRoom) return;

    redirectingToFeedbackRef.current = true;

    try {
      if (canEndRoom) {
        await Promise.resolve(endRoom());
      }
    } catch {
      // Even if room-end socket fails, recruiter should still be able to submit feedback.
    } finally {
      router.push(feedbackPath);
    }
  };

  if (authLoading || connecting) {
    return (
      <FullScreenState
        title={authLoading ? 'Authenticating...' : 'Connecting to interview room...'}
        subtitle={roomId || 'Preparing room'}
        spinner
      />
    );
  }

  if (!user) {
    return (
      <FullScreenState title="Authentication required" subtitle="Please sign in to join this interview room.">
        <button
          type="button"
          onClick={() => router.push('/?auth=login')}
          style={statePrimaryButtonStyle}
        >
          Sign In
        </button>
      </FullScreenState>
    );
  }

  if (!isValidRoom) {
    return (
      <FullScreenState
        title="Invalid interview room"
        subtitle="This room link is not valid. Please open the latest interview link from your Interviews page."
      >
        <button type="button" onClick={() => router.push(backPath)} style={statePrimaryButtonStyle}>
          Back to Interviews
        </button>
      </FullScreenState>
    );
  }

  if (rtcError && connectionState === 'error') {
    return (
      <FullScreenState title="Cannot join room" subtitle={rtcError}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void join()} style={statePrimaryButtonStyle}>
            Retry
          </button>

          <button type="button" onClick={handleLeave} style={stateSecondaryButtonStyle}>
            Leave
          </button>
        </div>
      </FullScreenState>
    );
  }

  if (roomEnded) {
    return (
      <FullScreenState
        title="Interview complete"
        subtitle={`Duration: ${formatTime(elapsed)}. Redirecting...`}
        icon="🏁"
      />
    );
  }

  const localParticipant: Participant = {
    userId: user.id,
    stream: localStream,
    name: getUserName(user),
    isSelf: true,
    micOn,
    camOn,
  };

  const remoteParticipants: Participant[] = peers.map((peer: any) => ({
    userId: peer.userId,
    stream: peer.stream,
    name: safeString(peer.name, 'Participant'),
    isSelf: false,
    micOn: Boolean(peer.micOn),
    camOn: Boolean(peer.camOn),
  }));

  const allParticipants = [localParticipant, ...remoteParticipants];

  const gridCols =
    allParticipants.length === 1 ? 1 : allParticipants.length <= 4 ? 2 : 3;

  return (
    <div style={roomPageStyle}>
      <style>
        {`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulseDot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.55; transform: scale(0.85); }
          }
        `}
      </style>

      <main style={roomMainStyle}>
        <header style={topBarStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={topRoomLineStyle}>
              <div
                style={{
                  ...statusDotStyle,
                  background: connected ? C.green : C.yellow,
                  boxShadow: connected ? `0 0 8px ${C.green}` : 'none',
                }}
              />

              <span style={topTitleStyle}>Interview Room</span>

              <span style={roomIdStyle}>
                {roomId.length > 28 ? `${roomId.slice(0, 28)}...` : roomId}
              </span>
            </div>

            <div style={topSubTextStyle}>
              {allParticipants.length} participant
              {allParticipants.length !== 1 ? 's' : ''} · {normalizedRole || 'user'} · Round{' '}
              {parsed?.roundNumber ?? '-'}
            </div>
          </div>

          {timerActive && (
            <div style={timerStyle}>
              <div style={timerDotStyle} />
              <span>{formatTime(elapsed)}</span>
            </div>
          )}

          {canControlRoom && (
            <button
              type="button"
              onClick={() => setEndPrompt(true)}
              style={endTopButtonStyle}
            >
              🏁 End & Feedback
            </button>
          )}
        </header>

        <section style={videoSectionStyle}>
          {connected ? (
            <div
              style={{
                ...videoGridStyle,
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              }}
            >
              {allParticipants.map((participant) => (
                <VideoTile
                  key={participant.userId}
                  stream={participant.stream}
                  name={participant.name}
                  isSelf={participant.isSelf}
                  micOn={participant.micOn}
                  camOn={participant.camOn}
                  isActive={false}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={loaderStyle} />
              <p style={mutedTextStyle}>Connecting...</p>
            </div>
          )}

          {connected && peers.length === 0 && (
            <div style={waitingOverlayStyle}>
              <p style={waitingTitleStyle}>Waiting for other participant...</p>
              <p style={waitingSubStyle}>
                Keep this tab open. The interview will start when both sides join.
              </p>
            </div>
          )}
        </section>

        <footer style={controlsBarStyle}>
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
            onClick={() => setChatOpen((current) => !current)}
            badge={chatOpen ? 0 : messages.length}
          />

          <div style={controlsDividerStyle} />

          {canControlRoom && (
            <ControlBtn
              icon="🏁"
              label="End & Feedback"
              danger
              onClick={() => setEndPrompt(true)}
            />
          )}

          <ControlBtn icon="📵" label="Leave" danger onClick={handleLeave} />
        </footer>
      </main>

      {chatOpen && (
        <ChatPanel
          messages={messages as ChatMessage[]}
          onSend={sendMessage}
          onClose={() => setChatOpen(false)}
          selfId={user.id}
        />
      )}

      {endPrompt && (
        <div style={modalOverlayStyle}>
          <div style={endModalStyle}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>

            <h3 style={endModalTitleStyle}>End interview and give feedback?</h3>

            <p style={endModalTextStyle}>
              This will end the live room for all participants. After ending,
              you will be redirected to the feedback form.
              <br />
              Duration:{' '}
              <strong style={{ color: C.sky }}>{formatTime(elapsed)}</strong>
            </p>

            <div style={modalActionRowStyle}>
              <button
                type="button"
                onClick={() => setEndPrompt(false)}
                style={stateSecondaryButtonStyle}
              >
                Continue Interview
              </button>

              <button
                type="button"
                onClick={() => void handleEndAndFeedback()}
                style={modalDangerButtonStyle}
              >
                End & Open Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FullScreenState({
  title,
  subtitle,
  icon,
  spinner,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  spinner?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <main style={statePageStyle}>
      <div style={stateBoxStyle}>
        {spinner ? <div style={loaderStyle} /> : <div style={stateIconStyle}>{icon ?? '⚠️'}</div>}

        <h1 style={stateTitleStyle}>{title}</h1>

        {subtitle && <p style={stateSubtitleStyle}>{subtitle}</p>}

        {children && <div style={{ marginTop: 18 }}>{children}</div>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

const roomPageStyle: CSSProperties = {
  display: 'flex',
  height: '100vh',
  background: C.bg,
  fontFamily: "'Sora', sans-serif",
  color: '#E2E8F0',
  overflow: 'hidden',
};

const roomMainStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const topBarStyle: CSSProperties = {
  padding: '10px 16px',
  background: 'rgba(0,0,0,0.42)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  borderBottom: `1px solid ${C.border}`,
  flexShrink: 0,
};

const topRoomLineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
};

const statusDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
};

const topTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: C.text,
};

const roomIdStyle: CSSProperties = {
  fontSize: 11,
  color: C.faint,
  fontFamily: 'monospace',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const topSubTextStyle: CSSProperties = {
  fontSize: 11,
  color: C.faint,
  marginTop: 2,
};

const timerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '6px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid ${C.border}`,
  fontSize: 14,
  fontWeight: 900,
  fontFamily: 'monospace',
  color: C.text,
};

const timerDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: C.red,
  animation: 'pulseDot 1.4s ease-in-out infinite',
};

const endTopButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  background: 'rgba(239,68,68,0.14)',
  border: '1px solid rgba(239,68,68,0.32)',
  color: C.red,
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const videoSectionStyle: CSSProperties = {
  flex: 1,
  padding: 12,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const videoGridStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  width: '100%',
  height: '100%',
  gridAutoRows: '1fr',
};

const videoTileStyle: CSSProperties = {
  position: 'relative',
  borderRadius: 14,
  overflow: 'hidden',
  background: C.panel2,
  aspectRatio: '16/9',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const avatarEmptyStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 8,
};

const avatarCircleStyle: CSSProperties = {
  width: 66,
  height: 66,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  fontWeight: 900,
  color: '#FFFFFF',
};

const cameraOffTextStyle: CSSProperties = {
  fontSize: 11,
  color: C.faint,
};

const nameBadgeStyle: CSSProperties = {
  position: 'absolute',
  bottom: 8,
  left: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(0,0,0,0.68)',
  borderRadius: 9,
  padding: '5px 10px',
  backdropFilter: 'blur(5px)',
};

const nameBadgeTextStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#FFFFFF',
};

const selfBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  background: 'rgba(56,189,248,0.20)',
  border: '1px solid rgba(56,189,248,0.42)',
  borderRadius: 7,
  padding: '3px 8px',
  fontSize: 10,
  color: C.sky,
  fontWeight: 900,
};

const waitingOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0,0,0,0.72)',
  backdropFilter: 'blur(10px)',
  padding: '22px 34px',
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  textAlign: 'center',
  pointerEvents: 'none',
};

const waitingTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 15,
  fontWeight: 800,
  color: C.text,
};

const waitingSubStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: C.muted,
};

const controlsBarStyle: CSSProperties = {
  padding: '14px 20px',
  background: 'rgba(0,0,0,0.64)',
  backdropFilter: 'blur(14px)',
  borderTop: `1px solid ${C.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  flexShrink: 0,
};

const controlWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const controlButtonStyle: CSSProperties = {
  position: 'relative',
  width: 50,
  height: 50,
  borderRadius: 14,
  border: 'none',
  fontSize: 20,
  transition: 'all 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const controlBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: -5,
  right: -5,
  width: 19,
  height: 19,
  borderRadius: '50%',
  background: C.red,
  border: `2px solid ${C.bg}`,
  fontSize: 10,
  color: '#FFFFFF',
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const controlLabelStyle: CSSProperties = {
  fontSize: 10,
  color: C.faint,
};

const controlsDividerStyle: CSSProperties = {
  width: 1,
  height: 42,
  background: 'rgba(255,255,255,0.10)',
};

const chatPanelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: 320,
  height: '100%',
  background: C.panel,
  borderLeft: `1px solid ${C.border}`,
};

const chatHeaderStyle: CSSProperties = {
  padding: '12px 14px',
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
};

const chatHeaderTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: C.text,
};

const plainIconButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: C.muted,
  fontSize: 18,
};

const chatMessagesStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const emptyChatTextStyle: CSSProperties = {
  fontSize: 12,
  color: C.faint,
  textAlign: 'center',
  marginTop: 20,
};

const chatSenderStyle: CSSProperties = {
  fontSize: 10,
  color: C.faint,
  marginBottom: 3,
};

const chatBubbleStyle: CSSProperties = {
  maxWidth: '85%',
  padding: '8px 12px',
  fontSize: 13,
  color: C.text,
  wordBreak: 'break-word',
  lineHeight: 1.5,
};

const chatInputWrapStyle: CSSProperties = {
  padding: '10px 12px',
  borderTop: `1px solid ${C.border}`,
  display: 'flex',
  gap: 8,
};

const chatInputStyle: CSSProperties = {
  flex: 1,
  padding: '9px 12px',
  borderRadius: 9,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: C.text,
  fontSize: 13,
  outline: 'none',
};

const sendButtonStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 9,
  border: 'none',
  fontSize: 14,
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0,0,0,0.82)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const endModalStyle: CSSProperties = {
  width: 'min(430px, 100%)',
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: '1.6rem',
  textAlign: 'center',
  boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
};

const endModalTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 17,
  fontWeight: 900,
  color: C.text,
};

const endModalTextStyle: CSSProperties = {
  margin: '0 0 22px',
  fontSize: 13,
  color: C.muted,
  lineHeight: 1.65,
};

const modalActionRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
};

const modalDangerButtonStyle: CSSProperties = {
  flex: 1,
  padding: '11px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #DC2626, #EF4444)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const loaderStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: '3px solid rgba(56,189,248,0.20)',
  borderTopColor: C.sky,
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto 16px',
};

const mutedTextStyle: CSSProperties = {
  color: C.muted,
  fontSize: 14,
  margin: 0,
};

const statePageStyle: CSSProperties = {
  minHeight: '100vh',
  background: C.bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Sora', sans-serif",
  padding: 20,
};

const stateBoxStyle: CSSProperties = {
  textAlign: 'center',
  maxWidth: 460,
};

const stateIconStyle: CSSProperties = {
  fontSize: 48,
  marginBottom: 16,
};

const stateTitleStyle: CSSProperties = {
  color: C.text,
  fontSize: 20,
  fontWeight: 900,
  margin: '0 0 8px',
};

const stateSubtitleStyle: CSSProperties = {
  color: C.muted,
  fontSize: 14,
  margin: 0,
  lineHeight: 1.65,
};

const statePrimaryButtonStyle: CSSProperties = {
  padding: '11px 24px',
  borderRadius: 10,
  border: 'none',
  background: C.sky,
  color: '#001018',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const stateSecondaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: '11px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: C.muted,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};
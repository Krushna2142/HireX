'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Bot,
  Camera,
  CameraOff,
  DoorOpen,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useWebRTCRoom } from '@/hooks/useWebRTCRoom';
import VideoTile from '@/components/interviews/VideoTile';

type HireXInterviewRoomProps = {
  roomId: string;
};

type PanelMode = 'none' | 'chat' | 'ai' | 'details';

function safeString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function getUserName(user: any) {
  return safeString(user?.full_name ?? user?.fullName ?? user?.name ?? user?.email, 'HireX User');
}

function getUserRole(user: any) {
  return safeString(user?.role, 'candidate');
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function HireXInterviewRoom({ roomId }: HireXInterviewRoomProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [joined, setJoined] = useState(false);
  const [panel, setPanel] = useState<PanelMode>('none');
  const [seconds, setSeconds] = useState(0);
  const [permissionHint, setPermissionHint] = useState('');

  const room = useWebRTCRoom({
    roomId,
    user: user
      ? {
          id: safeString(user.id),
          full_name: getUserName(user),
          role: getUserRole(user),
        }
      : null,
  });

  const {
    connectionState,
    connecting,
    connected,
    localStream,
    peers,
    micOn,
    camOn,
    screenSharing,
    error,
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    endRoom,
    canEndRoom,
  } = room;

  const userRole = getUserRole(user);
  const isRecruiter = userRole === 'recruiter';

  const remotePeers = useMemo(() => peers ?? [], [peers]);

  useEffect(() => {
    if (!joined) return;

    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [joined]);

  async function handleJoin() {
    setPermissionHint('');

    try {
      await join();
      setJoined(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to join interview room.';
      setPermissionHint(message);
    }
  }

  function handleLeave() {
    leave();
    router.back();
  }

  function handleEndRoom() {
    if (canEndRoom) {
      endRoom();
    }

    handleLeave();
  }

  const statusColor = connected
    ? '#34D399'
    : connecting
      ? '#FBBF24'
      : error
        ? '#F87171'
        : '#94A3B8';

  if (!user) {
    return (
      <div style={centerScreenStyle}>
        <Loader2 className="animate-spin" />
        <p>Loading interview session...</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div style={lobbyPageStyle}>
        <div style={lobbyCardStyle}>
          <div style={lobbyBrandStyle}>
            <div style={logoStyle}>HX</div>

            <div>
              <p style={eyebrowStyle}>HireX Interview Lobby</p>
              <h1 style={lobbyTitleStyle}>Ready to join your interview?</h1>
              <p style={mutedTextStyle}>
                Allow camera and microphone permissions. The room opens in a
                full-screen custom HireX interface.
              </p>
            </div>
          </div>

          <div style={deviceChecklistStyle}>
            <div style={checkItemStyle}>
              <Camera size={18} />
              <span>Camera permission required</span>
            </div>

            <div style={checkItemStyle}>
              <Mic size={18} />
              <span>Microphone permission required</span>
            </div>

            <div style={checkItemStyle}>
              <ShieldCheck size={18} />
              <span>Secure room ID: {roomId.slice(0, 42)}</span>
            </div>
          </div>

          {(permissionHint || error) && (
            <div style={errorBoxStyle}>
              {permissionHint || error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={connecting}
            style={{
              ...joinButtonStyle,
              opacity: connecting ? 0.7 : 1,
              cursor: connecting ? 'not-allowed' : 'pointer',
            }}
          >
            {connecting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <DoorOpen size={18} />
                Join Interview Room
              </>
            )}
          </button>

          <p style={tinyTextStyle}>
            Tip: On mobile, keep browser permission allowed for camera and mic.
            Use Chrome for best testing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={roomPageStyle}>
      <header style={topbarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={smallLogoStyle}>HX</div>

          <div style={{ minWidth: 0 }}>
            <h1 style={roomTitleStyle}>HireX Interview Room</h1>
            <p style={roomSubStyle}>
              {remotePeers.length + 1} participant
              {remotePeers.length + 1 === 1 ? '' : 's'} · {userRole} · Round session
            </p>
          </div>
        </div>

        <div style={topRightStyle}>
          <span style={{ ...statusPillStyle, borderColor: `${statusColor}55`, color: statusColor }}>
            <span style={{ ...statusDotStyle, background: statusColor }} />
            {connectionState}
          </span>

          <span style={timerPillStyle}>{formatDuration(seconds)}</span>
        </div>
      </header>

      {error && (
        <div style={floatingErrorStyle}>
          {error}
        </div>
      )}

      <main
        style={{
          ...roomMainStyle,
          gridTemplateColumns:
            panel === 'none'
              ? '1fr'
              : 'minmax(0, 1fr) minmax(300px, 360px)',
        }}
      >
        <section style={videoStageStyle}>
          <div
            style={{
              ...videoGridStyle,
              gridTemplateColumns:
                remotePeers.length === 0
                  ? 'minmax(0, 1fr)'
                  : 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            }}
          >
            <VideoTile
              stream={localStream}
              name={getUserName(user)}
              label="Local participant"
              muted
              mirror
              isLocal
              micOn={micOn}
              camOn={camOn}
              isSpeaking={false}
            />

            {remotePeers.map((peer: any) => (
              <VideoTile
                key={peer.userId ?? peer.id}
                stream={peer.stream ?? null}
                name={safeString(peer.name ?? peer.full_name ?? peer.email, 'Remote participant')}
                label={safeString(peer.role, 'participant')}
                muted={false}
                mirror={false}
                micOn={peer.micOn !== false}
                camOn={peer.camOn !== false}
                isLocal={false}
                isSpeaking={false}
              />
            ))}
          </div>
        </section>

        {panel !== 'none' && (
          <aside style={sidePanelStyle}>
            <div style={panelHeaderStyle}>
              <strong>
                {panel === 'chat' && 'Room Chat'}
                {panel === 'ai' && 'AI Assistant'}
                {panel === 'details' && 'Interview Details'}
              </strong>

              <button type="button" onClick={() => setPanel('none')} style={miniButtonStyle}>
                Close
              </button>
            </div>

            {panel === 'chat' && (
              <ChatBox onSend={(message) => sendMessage(message)} />
            )}

            {panel === 'ai' && (
              <div style={emptyPanelTextStyle}>
                <Bot size={26} />
                <h3>AI assistant placeholder</h3>
                <p>
                  Next step: connect Python AI service here for suggested
                  questions, resume summary, ATS gaps, and follow-up prompts.
                </p>
              </div>
            )}

            {panel === 'details' && (
              <div style={detailsPanelStyle}>
                <InfoRow label="Room ID" value={roomId} />
                <InfoRow label="Role" value={userRole} />
                <InfoRow label="Participants" value={String(remotePeers.length + 1)} />
                <InfoRow label="Mic" value={micOn ? 'On' : 'Off'} />
                <InfoRow label="Camera" value={camOn ? 'On' : 'Off'} />
              </div>
            )}
          </aside>
        )}
      </main>

      <footer style={controlBarWrapStyle}>
        <div style={controlBarStyle}>
          <button
            type="button"
            onClick={toggleMic}
            style={{
              ...controlButtonStyle,
              background: micOn ? 'rgba(15,23,42,0.94)' : 'rgba(248,113,113,0.22)',
              borderColor: micOn ? 'rgba(255,255,255,0.12)' : 'rgba(248,113,113,0.45)',
            }}
            title={micOn ? 'Turn microphone off' : 'Turn microphone on'}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            type="button"
            onClick={toggleCam}
            style={{
              ...controlButtonStyle,
              background: camOn ? 'rgba(15,23,42,0.94)' : 'rgba(248,113,113,0.22)',
              borderColor: camOn ? 'rgba(255,255,255,0.12)' : 'rgba(248,113,113,0.45)',
            }}
            title={camOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {camOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (screenSharing) void stopScreenShare();
              else void startScreenShare();
            }}
            style={controlButtonStyle}
            title="Screen share"
          >
            <MonitorUp size={20} />
          </button>

          <button
            type="button"
            onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')}
            style={controlButtonStyle}
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>

          {isRecruiter && (
            <button
              type="button"
              onClick={() => setPanel(panel === 'ai' ? 'none' : 'ai')}
              style={controlButtonStyle}
              title="AI assistant"
            >
              <Bot size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setPanel(panel === 'details' ? 'none' : 'details')}
            style={controlButtonStyle}
            title="Room details"
          >
            <Users size={20} />
          </button>

          <button
            type="button"
            onClick={() => void handleJoin()}
            style={controlButtonStyle}
            title="Reconnect"
          >
            <RefreshCcw size={19} />
          </button>

          <button
            type="button"
            onClick={canEndRoom ? handleEndRoom : handleLeave}
            style={leaveButtonStyle}
            title="Leave"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function ChatBox({ onSend }: { onSend: (message: string) => void }) {
  const [message, setMessage] = useState('');

  function submit() {
    const clean = message.trim();
    if (!clean) return;

    onSend(clean);
    setMessage('');
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={emptyPanelTextStyle}>
        <MessageSquare size={26} />
        <h3>Chat ready</h3>
        <p>Messages will sync when backend socket chat events are enabled.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder="Type message..."
          style={chatInputStyle}
        />

        <button type="button" onClick={submit} style={sendButtonStyle}>
          Send
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const roomPageStyle: CSSProperties = {
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at 10% 10%, rgba(56,189,248,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(167,139,250,0.14), transparent 28%), #020617',
  color: '#F8FAFC',
  display: 'grid',
  gridTemplateRows: '72px 1fr 96px',
};

const topbarStyle: CSSProperties = {
  height: 72,
  padding: '0 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(2,6,23,0.72)',
  backdropFilter: 'blur(18px)',
};

const smallLogoStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #38BDF8, #A78BFA, #F472B6)',
  color: '#020617',
  fontWeight: 950,
};

const roomTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 950,
  letterSpacing: '-0.03em',
};

const roomSubStyle: CSSProperties = {
  margin: '3px 0 0',
  color: 'rgba(226,232,240,0.58)',
  fontSize: 12,
};

const topRightStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const statusPillStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 999,
  padding: '7px 10px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 11,
  fontWeight: 850,
  background: 'rgba(15,23,42,0.72)',
};

const statusDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
};

const timerPillStyle: CSSProperties = {
  border: '1px solid rgba(248,113,113,0.28)',
  background: 'rgba(248,113,113,0.10)',
  color: '#FCA5A5',
  borderRadius: 999,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 900,
  fontFamily: 'monospace',
};

const roomMainStyle: CSSProperties = {
  minHeight: 0,
  display: 'grid',
  gap: 14,
  padding: 14,
};

const videoStageStyle: CSSProperties = {
  minHeight: 0,
  display: 'grid',
};

const videoGridStyle: CSSProperties = {
  minHeight: 0,
  display: 'grid',
  gap: 14,
  alignItems: 'stretch',
};

const sidePanelStyle: CSSProperties = {
  minHeight: 0,
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(15,23,42,0.92)',
  backdropFilter: 'blur(18px)',
  padding: 16,
  overflowY: 'auto',
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
};

const controlBarWrapStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  padding: 16,
  borderTop: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(2,6,23,0.72)',
  backdropFilter: 'blur(18px)',
};

const controlBarStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const controlButtonStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(15,23,42,0.94)',
  color: '#F8FAFC',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
};

const leaveButtonStyle: CSSProperties = {
  ...controlButtonStyle,
  background: 'rgba(239,68,68,0.95)',
  borderColor: 'rgba(239,68,68,0.95)',
};

const miniButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)',
  color: '#F8FAFC',
  borderRadius: 10,
  padding: '7px 10px',
  cursor: 'pointer',
};

const floatingErrorStyle: CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: 86,
  transform: 'translateX(-50%)',
  zIndex: 30,
  maxWidth: 720,
  padding: '10px 14px',
  borderRadius: 14,
  border: '1px solid rgba(248,113,113,0.35)',
  background: 'rgba(127,29,29,0.92)',
  color: '#FECACA',
  fontSize: 12,
  fontWeight: 800,
};

const lobbyPageStyle: CSSProperties = {
  minHeight: '100vh',
  width: '100vw',
  display: 'grid',
  placeItems: 'center',
  padding: 18,
  background:
    'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.16), transparent 30%), radial-gradient(circle at 80% 10%, rgba(244,114,182,0.13), transparent 30%), #020617',
  color: '#F8FAFC',
};

const lobbyCardStyle: CSSProperties = {
  width: 'min(760px, 100%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 28,
  padding: 24,
  background: 'rgba(15,23,42,0.82)',
  boxShadow: '0 30px 100px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(20px)',
};

const lobbyBrandStyle: CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'flex-start',
  marginBottom: 22,
};

const logoStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 20,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #38BDF8, #A78BFA, #F472B6)',
  color: '#020617',
  fontWeight: 950,
  fontSize: 22,
  flexShrink: 0,
};

const eyebrowStyle: CSSProperties = {
  margin: '0 0 5px',
  color: '#A78BFA',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 12,
  fontWeight: 950,
};

const lobbyTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 950,
  letterSpacing: '-0.05em',
};

const mutedTextStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'rgba(226,232,240,0.68)',
  fontSize: 14,
  lineHeight: 1.7,
};

const deviceChecklistStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  margin: '20px 0',
};

const checkItemStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 16,
  padding: '12px 14px',
  color: 'rgba(226,232,240,0.78)',
};

const joinButtonStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 18,
  padding: '14px 18px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #38BDF8, #A78BFA, #F472B6)',
  color: '#020617',
  fontWeight: 950,
  fontSize: 15,
};

const tinyTextStyle: CSSProperties = {
  margin: '14px 0 0',
  color: 'rgba(226,232,240,0.45)',
  fontSize: 12,
  textAlign: 'center',
};

const errorBoxStyle: CSSProperties = {
  border: '1px solid rgba(248,113,113,0.32)',
  background: 'rgba(248,113,113,0.10)',
  color: '#FECACA',
  borderRadius: 16,
  padding: 12,
  fontSize: 13,
  marginBottom: 14,
};

const centerScreenStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  gap: 10,
  background: '#020617',
  color: '#F8FAFC',
};

const emptyPanelTextStyle: CSSProperties = {
  minHeight: 220,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  color: 'rgba(226,232,240,0.62)',
  gap: 8,
};

const detailsPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
};

const infoRowStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 14,
  padding: '10px 12px',
  display: 'grid',
  gap: 4,
};

const chatInputStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(2,6,23,0.65)',
  color: '#F8FAFC',
  borderRadius: 12,
  padding: '11px 12px',
  outline: 'none',
};

const sendButtonStyle: CSSProperties = {
  border: 'none',
  background: '#38BDF8',
  color: '#020617',
  borderRadius: 12,
  padding: '0 14px',
  fontWeight: 900,
  cursor: 'pointer',
};
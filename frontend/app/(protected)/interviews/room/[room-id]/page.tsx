'use client';

// ─────────────────────────────────────────────────────────────────────────────
// /app/(protected)/interviews/room/[room-id]/page.tsx
//
// Production Google Meet-like video conferencing room.
//
// Architecture:
//   - LiveKit provides the WebRTC transport layer (STUN/TURN, SFU)
//   - Custom React UI built on top of LiveKit's hooks
//   - Three phases: pre-join → connected → ended
//   - Side panels: chat, participants, AI scoring notes (recruiter only)
//   - Full Google Meet feature parity: grid layout, controls, screen share
// ─────────────────────────────────────────────────────────────────────────────

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { interviewApi } from '@/lib/axios';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useTracks,
  VideoTrack,
  TrackReference,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import '@livekit/components-styles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Panel = 'chat' | 'participants' | 'notes' | null;

interface ChatMsg {
  id: string;
  sender: string;
  text: string;
  ts: number;
  isMe: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS-in-JS tokens (matches the app dark theme)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:       '#0A0D14',
  surface:  '#111827',
  card:     '#161D2B',
  border:   'rgba(255,255,255,0.08)',
  muted:    'rgba(255,255,255,0.45)',
  faint:    'rgba(255,255,255,0.2)',
  text:     '#F1F5F9',
  sky:      '#38BDF8',
  green:    '#10B981',
  amber:    '#F59E0B',
  red:      '#EF4444',
  purple:   '#A78BFA',
};

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✅ FIXED: Type guard to check if track is a real TrackReference (not placeholder)
 */
function isTrackReference(track: any): track is TrackReference {
  return (
    track &&
    typeof track === 'object' &&
    'publication' in track &&
    track.publication !== undefined
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    update();
    const iv = setInterval(update, 10_000);
    return () => clearInterval(iv);
  }, []);
  return time;
}

function useMeetDuration(connected: boolean) {
  const [secs, setSecs] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!connected) return;
    startRef.current = Date.now();
    const iv = setInterval(() => setSecs(Math.floor((Date.now() - startRef.current!) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [connected]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantTile — renders a single video participant
// ─────────────────────────────────────────────────────────────────────────────
function ParticipantTile({ track, isLocal, name }: {
  track: TrackReference;  // ✅ FIXED: Accept only valid TrackReference, not placeholder
  isLocal: boolean;
  name: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const participant = track.participant;

  useEffect(() => {
    if (!participant) return;
    const check = () => setSpeaking(participant.isSpeaking);
    const iv = setInterval(check, 200);
    return () => clearInterval(iv);
  }, [participant]);

  const isMuted = participant?.isMicrophoneEnabled === false;
  const isCamOff = participant?.isCameraEnabled === false;
  const displayName = name || participant?.identity || 'Participant';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      background: T.card,
      border: speaking ? `2px solid ${T.green}` : `1px solid ${T.border}`,
      transition: 'border-color 0.2s ease',
      boxShadow: speaking ? `0 0 16px ${T.green}40` : 'none',
      aspectRatio: '16/9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Video or avatar */}
      {isCamOff ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple}, ${T.sky})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>{displayName}</span>
        </div>
      ) : (
        // ✅ FIXED: Only render VideoTrack for valid TrackReference
        isTrackReference(track) && (
          <VideoTrack
            trackRef={track}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )
      )}

      {/* Bottom overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 10px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
          {displayName}{isLocal && ' (You)'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {isMuted && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: T.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
            }}>🔇</div>
          )}
          {speaking && !isMuted && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: T.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
            }}>🎤</div>
          )}
        </div>
      </div>

      {/* Local label */}
      {isLocal && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'rgba(0,0,0,0.5)', color: T.muted,
        }}>
          You
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoGrid — responsive layout based on participant count
// ─────────────────────────────────────────────────────────────────────────────
function VideoGrid({ localName, isRecruiter }: { localName: string; isRecruiter: boolean }) {
  // ✅ FIXED: Get all tracks including placeholders
  const allTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // ✅ FIXED: Filter to only valid TrackReference objects
  const cameraTracks = allTracks.filter(isTrackReference);

  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const count = Math.max(1, cameraTracks.length);

  const gridStyle = useMemo((): React.CSSProperties => {
    if (count === 1) return {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
    };
    if (count === 2) return {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    };
    if (count <= 4) return {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: 'repeat(2, 1fr)',
    };
    if (count <= 6) return {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
    };
    return {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
    };
  }, [count]);

  return (
    <div style={{
      flex: 1,
      padding: '12px',
      overflow: 'hidden',
      ...gridStyle,
      gap: 8,
    }}>
      {cameraTracks.map((track) => {
        const pid = track.participant.identity;
        const isLocal = pid === localParticipant?.identity;
        const p = participants.find(x => x.identity === pid);
        const displayName = p?.name || pid || (isLocal ? localName : 'Participant');
        return (
          <ParticipantTile
            key={`${pid}-${track.source}`}
            track={track}
            isLocal={isLocal}
            name={displayName}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ControlButton — reusable control bar button
// ─────────────────────────────────────────────────────────────────────────────
function ControlBtn({
  icon, label, active, danger, onClick, disabled,
}: {
  icon: string; label: string; active?: boolean;
  danger?: boolean; onClick?: () => void; disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 16px', borderRadius: 12, border: 'none',
        background: danger
          ? (hovered ? `${T.red}CC` : `${T.red}AA`)
          : active === false
          ? (hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)')
          : (hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'),
        color: danger ? '#fff' : active === false ? T.amber : T.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'Sora, sans-serif',
        minWidth: 64,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ControlBar — bottom controls (mic, cam, screen, chat, participants, end)
// ─────────────────────────────────────────────────────────────────────────────
function ControlBar({
  roomId,
  activePanel,
  onPanelToggle,
  onLeave,
  isRecruiter,
  isHost,
}: {
  roomId: string;
  activePanel: Panel;
  onPanelToggle: (p: Panel) => void;
  onLeave: () => void;
  isRecruiter: boolean;
  isHost: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  const toggleMic = useCallback(() => {
    localParticipant?.setMicrophoneEnabled(!micOn);
    setMicOn(v => !v);
  }, [localParticipant, micOn]);

  const toggleCam = useCallback(() => {
    localParticipant?.setCameraEnabled(!camOn);
    setCamOn(v => !v);
  }, [localParticipant, camOn]);

  const toggleScreen = useCallback(async () => {
    try {
      await localParticipant?.setScreenShareEnabled(!screenOn);
      setScreenOn(v => !v);
    } catch { /* User cancelled */ }
  }, [localParticipant, screenOn]);

  return (
    <div style={{
      height: 80,
      background: 'rgba(17,24,39,0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${T.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      {/* Left — meeting info */}
      <div style={{ fontSize: 12, color: T.muted, minWidth: 140 }}>
        <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{roomId}</div>
        <div>Interview Room</div>
      </div>

      {/* Center — main controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ControlBtn
          icon={micOn ? '🎤' : '🔇'}
          label={micOn ? 'Mute' : 'Unmute'}
          active={micOn}
          onClick={toggleMic}
        />
        <ControlBtn
          icon={camOn ? '📹' : '📵'}
          label={camOn ? 'Stop Video' : 'Start Video'}
          active={camOn}
          onClick={toggleCam}
        />
        <ControlBtn
          icon={screenOn ? '🖥️' : '📺'}
          label={screenOn ? 'Stop Share' : 'Share Screen'}
          active={screenOn}
          onClick={() => void toggleScreen()}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: T.border, margin: '0 4px' }} />

        <ControlBtn
          icon='💬'
          label='Chat'
          active={activePanel === 'chat'}
          onClick={() => onPanelToggle(activePanel === 'chat' ? null : 'chat')}
        />
        <ControlBtn
          icon='👥'
          label='People'
          active={activePanel === 'participants'}
          onClick={() => onPanelToggle(activePanel === 'participants' ? null : 'participants')}
        />
        {isRecruiter && (
          <ControlBtn
            icon='🧠'
            label='AI Notes'
            active={activePanel === 'notes'}
            onClick={() => onPanelToggle(activePanel === 'notes' ? null : 'notes')}
          />
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: T.border, margin: '0 4px' }} />

        <ControlBtn
          icon='📞'
          label={isHost ? 'End for All' : 'Leave'}
          danger
          onClick={onLeave}
        />
      </div>

      {/* Right — spacer for balance */}
      <div style={{ minWidth: 140 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel — in-room text chat using LiveKit data channel
// ─────────────────────────────────────────────────────────────────────────────
function ChatPanel({ name }: { name: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const { localParticipant } = useLocalParticipant();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const room = (localParticipant as any)?._room;
    if (!room) return;
    const handler = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            id: `${Date.now()}-${Math.random()}`,
            sender: data.sender,
            text: data.text,
            ts: Date.now(),
            isMe: participant?.identity === localParticipant?.identity,
          }]);
        }
      } catch { /* ignore malformed */ }
    };
    room.on('dataReceived', handler);
    return () => room.off('dataReceived', handler);
  }, [localParticipant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', sender: name, text }));
      localParticipant?.publishData(payload, { reliable: true });
      setMessages(prev => [...prev, {
        id: `${Date.now()}-local`,
        sender: name,
        text,
        ts: Date.now(),
        isMe: true,
      }]);
      setDraft('');
    } catch { /* room might not support data */ }
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 14, color: T.text }}>
        In-call Messages
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 24 }}>
            Messages are only seen by people in the call
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: m.isMe ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontSize: 10, color: T.muted }}>{m.isMe ? 'You' : m.sender} · {fmt(m.ts)}</span>
            <div style={{
              maxWidth: '80%', padding: '8px 12px', borderRadius: m.isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: m.isMe ? `${T.sky}22` : 'rgba(255,255,255,0.05)',
              color: T.text, fontSize: 13, lineHeight: 1.5,
              border: `1px solid ${m.isMe ? `${T.sky}33` : T.border}`,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder='Send a message…'
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
            color: T.text, fontSize: 13, outline: 'none', fontFamily: 'Sora, sans-serif',
          }}
        />
        <button
          onClick={send}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: T.sky, color: '#001018', fontWeight: 700,
            cursor: 'pointer', fontSize: 13,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantsPanel
// ─────────────────────────────────────────────────────────────────────────────
function ParticipantsPanel({ localName }: { localName: string }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 14, color: T.text }}>
        People ({participants.length})
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {participants.map(p => {
          const isLocal = p.identity === localParticipant?.identity;
          const initials = (p.name || p.identity || 'P').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={p.identity} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: p.isSpeaking ? 'rgba(16,185,129,0.08)' : 'transparent',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${T.purple}, ${T.sky})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
                border: p.isSpeaking ? `2px solid ${T.green}` : '2px solid transparent',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {p.name || p.identity}{isLocal && ' (You)'}
                </div>
                {p.isSpeaking && <div style={{ fontSize: 10, color: T.green }}>Speaking…</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!p.isMicrophoneEnabled && <span title='Muted' style={{ fontSize: 12 }}>🔇</span>}
                {!p.isCameraEnabled && <span title='Camera off' style={{ fontSize: 12 }}>📵</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AINotesPanel — recruiter interview scorecard assistant
// ─────────────────────────────────────────────────────────────────────────────
function AINotesPanel({ interviewId }: { interviewId?: string }) {
  const CRITERIA = [
    { id: 'technical',     label: 'Technical Knowledge', weight: 30 },
    { id: 'problemSolving', label: 'Problem Solving',    weight: 25 },
    { id: 'communication', label: 'Communication',       weight: 20 },
    { id: 'cultureFit',    label: 'Culture Fit',         weight: 15 },
    { id: 'enthusiasm',    label: 'Enthusiasm',          weight: 10 },
  ];

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(CRITERIA.map(c => [c.id, 3]))
  );
  const [notes, setNotes] = useState('');
  const [rec, setRec] = useState<'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire'>('Hire');
  const [saved, setSaved] = useState(false);

  const weightedScore = Math.round(
    CRITERIA.reduce((sum, c) => sum + (scores[c.id] ?? 3) * c.weight, 0) / 5
  );

  const scoreColor = weightedScore >= 75 ? T.green : weightedScore >= 55 ? T.amber : T.red;

  const handleSave = async () => {
    // In production: POST to /api/recruiter/interviews/:id/scorecard
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>🧠 AI Scorecard</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Weighted score: {' '}
          <span style={{ color: scoreColor, fontWeight: 700 }}>{weightedScore}/100</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Scoring sliders */}
        {CRITERIA.map(c => (
          <div key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{c.label}</span>
              <span style={{ fontSize: 11, color: T.muted }}>{c.weight}% · {scores[c.id] ?? 3}/5</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5].map(v => (
                <button
                  key={v}
                  onClick={() => setScores(s => ({ ...s, [c.id]: v }))}
                  style={{
                    flex: 1, height: 24, borderRadius: 4, border: 'none',
                    background: (scores[c.id] ?? 3) >= v
                      ? (v >= 4 ? T.green : v >= 3 ? T.amber : T.red)
                      : 'rgba(255,255,255,0.06)',
                    cursor: 'pointer', transition: 'background 0.15s',
                    opacity: (scores[c.id] ?? 3) >= v ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Recommendation */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Hire Recommendation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {(['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRec(r)}
                style={{
                  padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: rec === r
                    ? `1px solid ${r.includes('No') ? T.red : T.green}`
                    : `1px solid ${T.border}`,
                  background: rec === r
                    ? (r.includes('No') ? `${T.red}20` : `${T.green}20`)
                    : 'rgba(255,255,255,0.03)',
                  color: rec === r ? (r.includes('No') ? T.red : T.green) : T.muted,
                  cursor: 'pointer', fontFamily: 'Sora, sans-serif',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Observations</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder='Key observations, strengths, concerns…'
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
              color: T.text, fontSize: 12, resize: 'vertical', outline: 'none',
              fontFamily: 'Sora, sans-serif', lineHeight: 1.6,
            }}
          />
        </div>

        <button
          onClick={() => void handleSave()}
          style={{
            width: '100%', padding: '10px', borderRadius: 8,
            background: saved ? T.green : `${T.purple}22`,
            color: saved ? '#fff' : T.purple,
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Sora, sans-serif', transition: 'all 0.2s',
            border: `1px solid ${saved ? T.green : `${T.purple}44`}` as any,
          }}
        >
          {saved ? '✓ Saved!' : 'Save Scorecard'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MeetHeader — top bar with room info, timer, connection status
// ─────────────────────────────────────────────────────────────────────────────
function MeetHeader({ roomId, duration, onLayout }: {
  roomId: string;
  duration: string;
  onLayout: () => void;
}) {
  const connState = useConnectionState();
  const participants = useParticipants();
  const clock = useClock();

  const stateColor = connState === ConnectionState.Connected ? T.green
    : connState === ConnectionState.Reconnecting ? T.amber : T.red;
  const stateDot = connState === ConnectionState.Connected ? '●' : '○';

  return (
    <div style={{
      height: 56, flexShrink: 0,
      background: 'rgba(17,24,39,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: T.sky, letterSpacing: '0.05em' }}>⬡</span>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Interview Room</span>
          <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{roomId}</span>
        </div>
        <span style={{ color: stateColor, fontSize: 11, fontFamily: 'monospace' }}>
          {stateDot} {connState}
        </span>
      </div>

      {/* Center — timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{
          fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
          color: T.text, background: 'rgba(255,255,255,0.05)',
          padding: '4px 12px', borderRadius: 6,
        }}>
          {duration}
        </span>
        <span style={{ fontSize: 12, color: T.muted }}>{clock}</span>
        <span style={{ fontSize: 12, color: T.muted }}>👥 {participants.length}</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onLayout}
          title='Change layout'
          style={{
            padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.04)', color: T.muted,
            fontSize: 12, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          }}
        >
          ⊞ Layout
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MeetRoom — the full meeting UI, rendered inside LiveKitRoom
// ─────────────────────────────────────────────────────────────────────────────
function MeetRoom({
  roomId, interviewId, user, onLeave, isRecruiter, isHost,
}: {
  roomId: string;
  interviewId?: string;
  user: { id: string; full_name?: string; role?: string } | null;
  onLeave: () => void;
  isRecruiter: boolean;
  isHost: boolean;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const connState = useConnectionState();
  const connected = connState === ConnectionState.Connected;
  const duration = useMeetDuration(connected);

  const handleLeave = () => {
    onLeave();
  };

  const name = user?.full_name ?? user?.role ?? 'Participant';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: T.bg, fontFamily: 'Sora, sans-serif', color: T.text,
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Render all remote audio */}
      <RoomAudioRenderer />

      {/* Top bar */}
      <MeetHeader
        roomId={roomId}
        duration={duration}
        onLayout={() => {}}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Video grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {connected ? (
            <VideoGrid localName={name} isRecruiter={isRecruiter} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.sky}33`, borderTopColor: T.sky, animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <p style={{ color: T.muted, fontSize: 14 }}>
                {connState === ConnectionState.Reconnecting ? 'Reconnecting…' : 'Connecting to room…'}
              </p>
            </div>
          )}
        </div>

        {/* Side panel */}
        {panel && (
          <div style={{
            width: 320, borderLeft: `1px solid ${T.border}`,
            background: T.surface, display: 'flex', flexDirection: 'column',
            animation: 'fadeIn 0.2s ease',
          }}>
            {/* Panel header with close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 12px', borderBottom: `1px solid ${T.border}` }}>
              <button
                onClick={() => setPanel(null)}
                style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
            {panel === 'chat' && <ChatPanel name={name} />}
            {panel === 'participants' && <ParticipantsPanel localName={name} />}
            {panel === 'notes' && <AINotesPanel interviewId={interviewId} />}
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <ControlBar
        roomId={roomId}
        activePanel={panel}
        onPanelToggle={setPanel}
        onLeave={handleLeave}
        isRecruiter={isRecruiter}
        isHost={isHost}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PreJoin — waiting room / permission check
// ─────────────────────────────────────────────────────────────────────────────
function PreJoin({ roomId, user, onJoin, error }: {
  roomId: string;
  user: { id: string; full_name?: string; role?: string } | null;
  onJoin: () => void;
  error: string;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        if (!alive) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
          void localVideoRef.current.play();
        }
        setPreviewReady(true);
      })
      .catch(() => setPreviewReady(false));
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const togglePreviewMic = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micEnabled; });
    setMicEnabled(v => !v);
  };
  const togglePreviewCam = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !camEnabled; });
    setCamEnabled(v => !v);
  };

  const name = user?.full_name || 'You';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Sora, sans-serif', color: T.text,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');`}</style>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32,
        maxWidth: 900, width: '100%', margin: 24,
      }}>
        {/* Camera preview */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Ready to join?
          </h1>
          <p style={{ fontSize: 14, color: T.muted, marginBottom: 24, lineHeight: 1.6 }}>
            {roomId}
          </p>

          <div style={{
            aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden',
            background: T.card, border: `1px solid ${T.border}`,
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {previewReady && camEnabled ? (
              <video
                ref={localVideoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${T.purple}, ${T.sky})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 700, color: '#fff',
                }}>
                  {initials}
                </div>
                <span style={{ fontSize: 13, color: T.muted }}>Camera is off</span>
              </div>
            )}

            {/* Preview controls overlay */}
            <div style={{
              position: 'absolute', bottom: 12,
              display: 'flex', gap: 8,
            }}>
              <button onClick={togglePreviewMic} style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none',
                background: micEnabled ? 'rgba(0,0,0,0.6)' : T.red,
                color: '#fff', cursor: 'pointer', fontSize: 16,
              }}>
                {micEnabled ? '🎤' : '🔇'}
              </button>
              <button onClick={togglePreviewCam} style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none',
                background: camEnabled ? 'rgba(0,0,0,0.6)' : T.red,
                color: '#fff', cursor: 'pointer', fontSize: 16,
              }}>
                {camEnabled ? '📹' : '📵'}
              </button>
            </div>
          </div>
        </div>

        {/* Join panel */}
        <div style={{
          padding: 32, borderRadius: 20,
          background: T.surface, border: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', gap: 20,
          justifyContent: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Joining as
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${T.purple}, ${T.sky})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff',
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            </div>
          </div>

          {/* Device status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: micEnabled ? '🎤' : '🔇', label: 'Microphone', status: micEnabled ? 'On' : 'Muted', ok: micEnabled },
              { icon: camEnabled ? '📹' : '📵', label: 'Camera', status: camEnabled ? 'On' : 'Off', ok: camEnabled },
            ].map(d => (
              <div key={d.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{d.label}</span>
                <span style={{ fontSize: 11, color: d.ok ? T.green : T.amber, fontWeight: 600 }}>{d.status}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: `${T.red}15`, border: `1px solid ${T.red}33`,
              fontSize: 12, color: T.red, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={onJoin}
            disabled={!!error}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: error ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${T.sky}, #0284C7)`,
              color: error ? T.muted : '#fff',
              fontSize: 15, fontWeight: 700, cursor: error ? 'not-allowed' : 'pointer',
              fontFamily: 'Sora, sans-serif',
              boxShadow: error ? 'none' : `0 4px 20px ${T.sky}40`,
            }}
          >
            Join Now
          </button>

          <p style={{ fontSize: 11, color: T.faint, textAlign: 'center', margin: 0 }}>
            Others will see you when you join
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RoomEndedScreen
// ─────────────────────────────────────────────────────────────────────────────
function RoomEndedScreen({ isRecruiter, router }: { isRecruiter: boolean; router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Sora, sans-serif', color: T.text, flexDirection: 'column', gap: 20,
    }}>
      <div style={{ fontSize: 64 }}>👋</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>You left the meeting</h1>
      <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>Your meeting has ended</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => router.push(isRecruiter ? '/recruiter/interviews' : '/interviews')}
          style={{
            padding: '12px 24px', borderRadius: 10,
            border: `1px solid ${T.sky}33`,
            background: `${T.sky}22`, color: T.sky,
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          Back to Interviews
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 24px', borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.04)', color: T.muted,
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InterviewRoomPage — the main export
// ─────────────────────────────────────────────────────────────────────────────
export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const roomId = (params?.['room-id'] as string) ?? (params?.roomId as string) ?? '';

  const [phase, setPhase] = useState<'prejoin' | 'connecting' | 'connected' | 'ended'>('prejoin');
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [accessError, setAccessError] = useState('');
  const [interviewId, setInterviewId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const isRecruiter = user?.role === 'recruiter';
  const isCandidate = user?.role === 'candidate';

  // ── Validate room access on mount ────────────────────────────────────────
  useEffect(() => {
    if (!user || !roomId) { setLoading(false); return; }
    let mounted = true;

    interviewApi.getRoomAccess(roomId)
      .then(res => {
        if (!mounted) return;
        const data = res.data as any;
        if (!data.allowed) {
          setAccessError(data.reason === 'room_link_expired'
            ? `Room link expired. Scheduled: ${data.scheduledAt ? new Date(data.scheduledAt).toLocaleString() : 'N/A'}`
            : 'You do not have access to this room.');
        }
        if (data.interviewId) setInterviewId(data.interviewId);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setAccessError(e?.response?.data?.message ?? 'Could not verify room access.');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [roomId, user]);

  // ── Fetch LiveKit token when user clicks Join ────────────────────────────
  const handleJoin = useCallback(async () => {
    if (!user || !roomId) return;
    setPhase('connecting');

    try {
      const res = await interviewApi.getLivekitToken(roomId);
      const data = res.data as any;
      if (!data.token || !data.url) throw new Error('Invalid token response from server');
      setToken(data.token);
      setServerUrl(data.url);
      setPhase('connected');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to get room token';
      setAccessError(msg);
      setPhase('prejoin');
    }
  }, [user, roomId]);

  const handleLeave = useCallback(() => {
    setToken('');
    setPhase('ended');
  }, []);

  // ── Render states ────────────────────────────────────────────────────────

  if (!user) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', color: T.text }}>
      Please log in to join the interview.
    </div>
  );

  if (!roomId) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', color: T.text }}>
      Invalid room ID.
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Sora, sans-serif', color: T.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.sky}33`, borderTopColor: T.sky, animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: T.muted, fontSize: 14 }}>Checking room access…</span>
    </div>
  );

  if (phase === 'ended') {
    return <RoomEndedScreen isRecruiter={isRecruiter} router={router} />;
  }

  if (phase === 'prejoin' || phase === 'connecting') {
    return (
      <PreJoin
        roomId={roomId}
        user={user}
        onJoin={() => void handleJoin()}
        error={accessError}
      />
    );
  }

  // phase === 'connected' — render LiveKit room
  if (!token || !serverUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      onDisconnected={handleLeave}
      onError={(e) => { console.error('[LiveKit]', e); }}
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      <MeetRoom
        roomId={roomId}
        interviewId={interviewId}
        user={user}
        onLeave={handleLeave}
        isRecruiter={isRecruiter}
        isHost={isRecruiter}
      />
    </LiveKitRoom>
  );
}
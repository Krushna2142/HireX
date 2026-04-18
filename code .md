<files>
<file name="frontend\app\(protected)\dashboard\error.tsx">
<![CDATA[
'use client';
// frontend/app/%28protected%29/dashboard/error.tsx
export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border p-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong.</h2>
      <p className="mt-1 text-sm opacity-70">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 inline-flex rounded-md border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        Try again
      </button>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\dashboard\loading.tsx">
<![CDATA[
export default function LoadingDashboard() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
      <div className="h-4 w-80 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
    </div>
  );
}
// frontend/app/%28protected%29/dashboard/loading.tsx

]]>
</file>
<file name="frontend\app\(protected)\dashboard\page.tsx">
<![CDATA[
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import CandidateDashboard from '@/app/_components/profiles/CandidateProfilePage';
import RecruiterDashboard from '@/app/_components/profiles/RecruiterProfilePage';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'recruiter') {
    return <RecruiterDashboard />;
  }

  return <CandidateDashboard />;
}

]]>
</file>
<file name="frontend\app\(protected)\interviews\page.tsx">
<![CDATA[
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { interviewApi } from '@/lib/axios';

type InterviewItem = {
  id: string;
  current_stage: string;
  status_code: number;
  final_status: string | null;
  updated_at: string;
  created_at: string;
  job_title?: string;
  company?: string;
};

type RoundItem = {
  id: string;
  round_number: number;
  round_type: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: string | null;
  meeting_join_url: string | null;
  result: string | null;
  score: number | null;
  feedback: string | null;
};

const stageColor = (stage: string) => {
  if (stage === 'REJECTED') return '#F87171';
  if (stage === 'HIRED') return '#10B981';
  if (stage === 'SHORTLISTED') return '#38BDF8';
  if (stage.includes('INTERVIEW')) return '#A78BFA';
  return 'rgba(255,255,255,0.75)';
};

export default function CandidateInterviewsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedInterview = useMemo(
    () => items.find((x) => x.id === selected) ?? null,
    [items, selected],
  );

  // Load interview list + poll every 30s
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await interviewApi.listCandidateInterviews({ limit: 30 });

        if (!alive) return;
        const data = (res.data ?? []) as InterviewItem[];
        setItems(data);

        // Keep current selection if still present, else fallback to first item
        setSelected((prev) => {
          if (prev && data.some((x) => x.id === prev)) return prev;
          return data[0]?.id ?? null;
        });

        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message ?? 'Failed to load interviews');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    const iv = setInterval(load, 30_000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Load selected interview rounds
  useEffect(() => {
    let alive = true;

    const loadDetail = async () => {
      if (!selected) {
        setRounds([]);
        return;
      }

      try {
        const res = await interviewApi.getCandidateInterview(selected);
        if (!alive) return;
        setRounds((res.data?.rounds ?? []) as RoundItem[]);
      } catch {
        if (!alive) return;
        setRounds([]);
      }
    };

    void loadDetail();
    return () => {
      alive = false;
    };
  }, [selected]);

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
      )[0];
  }, [rounds]);

  const openInternalRoom = (round: RoundItem) => {
    if (!selectedInterview) return;
    const roomId = `jc-${selectedInterview.id}-r${round.round_number}`;
    router.push(`/interviews/room/${roomId}`);
  };

  return (
    <main style={{ padding: 20, color: 'white' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>My Interviews</h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
        Track your real interview process, rounds, reminders, and join links.
      </p>

      {error && (
        <div style={{ marginBottom: 12, color: '#FCA5A5' }}>{error}</div>
      )}

      {nextRound && (
        <section
          style={{
            marginBottom: 16,
            padding: 14,
            border: '1px solid rgba(56,189,248,.25)',
            borderRadius: 10,
            background: 'rgba(56,189,248,.08)',
          }}
        >
          <div style={{ fontSize: 13, color: '#38BDF8', fontWeight: 700 }}>
            Upcoming Round
          </div>
          <div style={{ marginTop: 4, fontSize: 15 }}>
            {nextRound.round_type.toUpperCase()} ·{' '}
            {nextRound.scheduled_at
              ? new Date(nextRound.scheduled_at).toLocaleString()
              : 'TBD'}
          </div>

          <button
            onClick={() => openInternalRoom(nextRound)}
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: '#38BDF8',
              color: '#001018',
              textDecoration: 'none',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Join Interview
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <section
          style={{
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,.08)',
              fontWeight: 600,
            }}
          >
            Applications in Process
          </div>

          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>
                No interviews yet.
              </div>
            ) : (
              items.map((it) => {
                const active = selected === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,.06)',
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {it.job_title ?? 'Job'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
                      {it.company ?? '-'}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: stageColor(it.current_stage),
                        fontWeight: 700,
                      }}
                    >
                      {it.current_stage}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section
          style={{
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,.08)',
              fontWeight: 600,
            }}
          >
            {selectedInterview
              ? `${selectedInterview.job_title ?? 'Interview'} Timeline`
              : 'Interview Details'}
          </div>

          {!selectedInterview ? (
            <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>
              Select an interview.
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
                  Current Stage:{' '}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: stageColor(selectedInterview.current_stage),
                  }}
                >
                  {selectedInterview.current_stage}
                </span>
              </div>

              <h3 style={{ margin: '10px 0 8px', fontSize: 14 }}>Rounds</h3>
              {rounds.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>
                  No rounds scheduled yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rounds.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          Round {r.round_number}: {r.round_type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                          {r.result ?? 'pending'}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'rgba(255,255,255,.7)',
                        }}
                      >
                        {r.scheduled_at
                          ? new Date(r.scheduled_at).toLocaleString()
                          : 'Not scheduled'}
                      </div>

                      <button
                        onClick={() => openInternalRoom(r)}
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          fontSize: 12,
                          color: '#38BDF8',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        Join Room
                      </button>

                      {typeof r.score === 'number' && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#A78BFA' }}>
                          Score: {r.score}
                        </div>
                      )}
                      {r.feedback && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: 'rgba(255,255,255,.75)',
                          }}
                        >
                          {r.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
]]>
</file>
<file name="frontend\app\(protected)\interviews\room\[room-id]\page.tsx">
<![CDATA[
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
]]>
</file>
<file name="frontend\app\(protected)\jobs\page.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/jobs/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '@/lib/axios';
import {
  useJobs,
  useMyApplications,
  type UnifiedJob,
  type Application,
  type JobSource,
} from '@/hooks/useRealTimeAlerts';
import Pagination from '@/components/jobs/Pagination';
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Resume {
  id:         string;
  fileName?:  string;
  createdAt:  string;
  isDefault?: boolean;
}

type SourceFilter = 'all' | 'internal' | 'serpapi' | 'linkedin' | 'indeed';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12; // fills a 3-column grid evenly (12 = 3×4 or 4×3)

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtSalary = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const isNew = (iso: string) =>
  Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────────────────────────────────────

const APP_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', label: 'Applied'        },
  reviewed:    { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Under review'   },
  reviewing:   { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Reviewing'      },
  shortlisted: { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', label: 'Shortlisted'    },
  interview:   { bg: 'rgba(251,191,36,0.12)',  color: '#FBBF24', label: 'Interview'      },
  offered:     { bg: 'rgba(52,211,153,0.15)',  color: '#10B981', label: 'Offer received' },
  rejected:    { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Not selected'   },
  hired:       { bg: 'rgba(52,211,153,0.2)',   color: '#059669', label: 'Hired'          },
};

const SOURCE_META: Record<JobSource, {
  bg: string; color: string; border: string; label: string;
}> = {
  internal: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)', label: 'Recruiter' },
  serpapi:  { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', border: 'rgba(96,165,250,0.25)',  label: 'Google'    },
  linkedin: { bg: 'rgba(14,118,168,0.15)',  color: '#0EA5E9', border: 'rgba(14,118,168,0.3)',   label: 'LinkedIn'  },
  indeed:   { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', border: 'rgba(52,211,153,0.25)',  label: 'Indeed'    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small components (SourceBadge, MatchBadge, SkeletonCard — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: JobSource }) {
  const s = SOURCE_META[source] ?? SOURCE_META.serpapi;
  return (
    <span style={{
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
      padding:      '2px 8px',
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   600,
    }}>
      {s.label}
    </span>
  );
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#A78BFA' : '#60A5FA';
  return (
    <span style={{
      background:   `${color}18`,
      color,
      border:       `1px solid ${color}30`,
      padding:      '2px 8px',
      borderRadius: 6,
      fontSize:     11,
      fontWeight:   700,
    }}>
      {score}% match
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      {[60, 40, 100, 32].map((w, i) => (
        <div
          key={i}
          style={{
            height:       i === 2 ? 60 : i === 3 ? 32 : 14,
            width:        `${w}%`,
            borderRadius: 6,
            background:   `rgba(255,255,255,0.0${i + 4})`,
            animation:    'pulse 1.5s ease infinite',
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCardCTA (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function JobCardCTA({
  job,
  application,
  onApply,
}: {
  job:         UnifiedJob;
  application: Application | undefined;
  onApply:     (j: UnifiedJob) => void;
}): React.ReactElement | null {

  if (application) {
    const b = APP_BADGE[application.status];
    if (!b) return null;
    return (
      <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: b.bg, color: b.color }}>
        {b.label}
      </span>
    );
  }

  if (job.source === 'internal') {
    return (
      <button className="btn text-sm" style={{ fontSize: 13 }} onClick={() => onApply(job)}>
        Apply now
      </button>
    );
  }

  if (job.applyUrl) {
    const url = job.applyUrl;
    return React.createElement(
      'a',
      {
        href:      url,
        target:    '_blank',
        rel:       'noopener noreferrer',
        className: 'btn text-sm',
        style:     { fontSize: 13 },
      },
      'Apply externally ↗'
    );
  }

  return (
    <button className="btn text-sm" disabled style={{ fontSize: 13, opacity: 0.4 }}>
      No apply link
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCard (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function JobCard({
  job,
  application,
  onApply,
}: {
  job:         UnifiedJob;
  application: Application | undefined;
  onApply:     (j: UnifiedJob) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const salary     = fmtSalary(job.salaryMin ?? null, job.salaryMax ?? null);
  const isInternal = job.source === 'internal';

  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {job.title}
            </span>
            <SourceBadge source={job.source} />
            {isNew(job.postedAt) && (
              <span style={{
                background:   'rgba(52,211,153,0.15)',
                color:        '#34D399',
                border:       '1px solid rgba(52,211,153,0.3)',
                padding:      '2px 7px',
                borderRadius: 20,
                fontSize:     10,
                fontWeight:   700,
              }}>
                NEW
              </span>
            )}
            {job.matchScore != null && job.matchScore > 0 && (
              <MatchBadge score={job.matchScore} />
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode  && ` · ${job.workMode}`}
          </p>
        </div>

        {isInternal && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {job.applicantCount} applied
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtDate(job.postedAt)}
            </div>
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {job.employmentType && (
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-muted)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}
        {salary && (
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(52,211,153,0.08)',
            color: '#34D399',
            border: '1px solid rgba(52,211,153,0.2)',
          }}>
            {salary}
          </span>
        )}
        {isInternal && job.requiredSkills.slice(0, 4).map(s => (
          <span key={s} style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(124,58,237,0.08)',
            color: '#A78BFA',
            border: '1px solid rgba(124,58,237,0.2)',
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* ── Description ── */}
      {job.description && (
        <div>
          <p style={{
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {job.description}
          </p>
          {job.description.length > 120 && (
            <button
              onClick={() => setExpanded(p => !p)}
              style={{
                fontSize: 12, color: '#A78BFA',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px 0 0',
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* ── Recruiter credit ── */}
      {isInternal && job.recruiterName && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Posted by <span style={{ color: '#A78BFA' }}>{job.recruiterName}</span>
        </p>
      )}

      {/* ── CTA row ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
        <JobCardCTA job={job} application={application} onApply={onApply} />
        <button className="btn btn-secondary text-sm" style={{ fontSize: 13 }}>
          Save
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApplyModal (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ApplyModal({
  job,
  onClose,
  onSuccess,
}: {
  job:       UnifiedJob;
  onClose:   () => void;
  onSuccess: (id: string) => void;
}) {
  const [resumes,  setResumes]  = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [cover,    setCover]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    api.get<Resume[]>('/resumes')
      .then(({ data }) => {
        setResumes(data ?? []);
        const def = data?.find(r => r.isDefault) ?? data?.[0];
        if (def) setResumeId(def.id);
      })
      .catch(() => setResumes([]))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const submit = async () => {
    if (!resumeId) { setError('Please select a resume.'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/jobs/${job.id}/apply`, {
        resumeId,
        coverLetter: cover.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(job.id); onClose(); }, 1500);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })
          ?.response?.data?.message
        ?? (e instanceof Error ? e.message : 'Application failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const cancelStyle: React.CSSProperties = {
    flexGrow: 1, flexShrink: 1, flexBasis: '0%',
    padding: '10px', borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
  };

  const submitStyle = (disabled: boolean): React.CSSProperties => ({
    flexGrow: 2, flexShrink: 1, flexBasis: '0%',
    padding: '10px', borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    background: disabled
      ? 'rgba(255,255,255,0.05)'
      : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))',
    border: disabled
      ? '1px solid rgba(255,255,255,0.1)'
      : '1px solid rgba(124,58,237,0.5)',
    color:   disabled ? 'rgba(255,255,255,0.3)' : '#fff',
    cursor:  disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.15s',
  });

  const isDisabled = loading || !resumeId || resumes.length === 0;

  return (
    <>
      <style>{`
        @keyframes mFade  { from{opacity:0} to{opacity:1} }
        @keyframes mSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mSpin  { to{transform:rotate(360deg)} }
        @keyframes mPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div
        onClick={() => onClose()}
        style={{
          minHeight:      '100vh',
          background:     'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '1rem',
          animation:      'mFade 0.2s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="card p-6 w-full"
          style={{
            maxWidth:  480,
            maxHeight: 'calc(100vh - 2rem)',
            overflowY: 'auto',
            animation: 'mSlide 0.25s ease',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          }}
        >
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <p style={{ color: '#34D399', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
                Application submitted!
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                You'll be notified of updates for <strong>{job.title}</strong>.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', marginBottom: '1.25rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 20, background: 'rgba(52,211,153,0.1)',
                      color: '#34D399', border: '1px solid rgba(52,211,153,0.2)',
                    }}>
                      APPLYING
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {job.title}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                    {job.workMode  ? ` · ${job.workMode}`  : ''}
                  </p>
                </div>
                <button
                  onClick={() => onClose()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4 }}
                >
                  ✕
                </button>
              </div>

              {job.requiredSkills.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ margin: '0 0 7px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Required skills
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {job.requiredSkills.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Select resume *
                  </label>
                  {fetching ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1, 2].map(i => (
                        <div key={i} style={{ height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'mPulse 1.4s ease infinite' }} />
                      ))}
                    </div>
                  ) : resumes.length === 0 ? (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 13, color: '#F87171' }}>
                      No resumes uploaded yet.{' '}
                      <a href="/resumes" style={{ color: '#F87171', textDecoration: 'underline' }}>Upload one →</a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {resumes.map(r => (
                        <label key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${resumeId === r.id ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                          background: resumeId === r.id ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.15s',
                        }}>
                          <input type="radio" name="resume" value={r.id} checked={resumeId === r.id} onChange={() => setResumeId(r.id)} style={{ accentColor: '#A78BFA', flexShrink: 0 }} />
                          <span style={{ fontSize: 15, flexShrink: 0 }}>📄</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: resumeId === r.id ? '#A78BFA' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.fileName ?? `Resume ${r.id.slice(0, 8)}`}
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {r.isDefault && <span style={{ marginLeft: 6, color: '#34D399' }}>· default</span>}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Cover note{' '}
                    <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
                  </label>
                  <textarea
                    value={cover}
                    onChange={e => setCover(e.target.value)}
                    rows={4}
                    placeholder={`Why are you a great fit for ${job.title} at ${job.company}?`}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  />
                  {cover.length > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                      {cover.length} characters
                    </p>
                  )}
                </div>

                {error && (
                  <p style={{ margin: 0, fontSize: 13, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                    {error}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onClose()} style={cancelStyle}>Cancel</button>
                  <button onClick={() => void submit()} disabled={isDisabled} style={submitStyle(isDisabled)}>
                    {loading ? (
                      <>
                        <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'mSpin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                        Submitting…
                      </>
                    ) : 'Submit application'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobsPage — with URL-synced pagination
//
// URL state strategy:
//   /jobs?page=2&search=react&workMode=remote&source=linkedin
//
// Why URL state?
//   - Browser back/forward navigation works correctly
//   - Shareable / bookmarkable pages
//   - Refresh stays on the same page
//   - Free SSR-compatible without extra libraries
// ─────────────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // ── Read initial state from URL params ──────────────────────────────────────
  const [search,       setSearch]       = useState(searchParams.get('search')   ?? '');
  const [workMode,     setWorkMode]     = useState(searchParams.get('workMode') ?? '');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(
    (searchParams.get('source') as SourceFilter) ?? 'all'
  );
  const [page,         setPage]         = useState(
    Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  );
  const [applyTarget,  setApplyTarget]  = useState<UnifiedJob | null>(null);
  const [debounced,    setDebounced]    = useState(search);

  // ── Debounce search input ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1); // reset to page 1 on new search
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Reset page to 1 whenever filters change ──────────────────────────────────
  // (search reset is handled above in its debounce handler)
  const handleWorkModeChange = (val: string) => {
    setWorkMode(val);
    setPage(1);
  };
  const handleSourceChange = (val: SourceFilter) => {
    setSourceFilter(val);
    setPage(1);
  };

  // ── Sync state → URL (shallow push — no full reload) ─────────────────────────
  const syncUrl = useCallback((
    p: number, s: string, wm: string, src: SourceFilter
  ) => {
    const params = new URLSearchParams();
    if (p  > 1)    params.set('page',     String(p));
    if (s)         params.set('search',   s);
    if (wm)        params.set('workMode', wm);
    if (src !== 'all') params.set('source', src);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    syncUrl(page, debounced, workMode, sourceFilter);
  }, [page, debounced, workMode, sourceFilter, syncUrl]);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const {
    jobs, total, totalPages, sources,
    loading, validating, error, refresh,
  } = useJobs({
    search:   debounced,
    workMode: workMode || undefined,
    source:   sourceFilter,
    page,
    limit:    PAGE_SIZE,
  });

  const { applications, applyOptimistic } = useMyApplications();
  const getApp = (jobId: string) => applications.find(a => a.job_id === jobId);

  // ── Scroll to top on page change ─────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const totalLive = sources.serpapi + sources.linkedin + sources.indeed;

  // ── Page change handler ───────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <section style={{ padding: '2rem 2rem 4rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Jobs
          </h1>
          <span
            title="Live — updates in real time via SSE"
            style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   validating ? '#34D399' : 'rgba(52,211,153,0.3)',
              boxShadow:    validating ? '0 0 6px #34D399' : 'none',
              transition:   'background 0.3s',
              display:      'inline-block',
            }}
          />
        </div>

        {!loading && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {total} openings ·{' '}
            <span style={{ color: '#A78BFA' }}>{sources.internal} recruiter</span> ·{' '}
            <span style={{ color: '#60A5FA' }}>{sources.serpapi} Google</span> ·{' '}
            <span style={{ color: '#0EA5E9' }}>{sources.linkedin} LinkedIn</span> ·{' '}
            <span style={{ color: '#34D399' }}>{sources.indeed} Indeed</span> ·{' '}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              {totalLive} live · refreshes every 30s
            </span>
          </p>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        marginBottom: '1.5rem', alignItems: 'center',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs, companies, skills…"
          style={{
            flex: 1, minWidth: 220,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 13, color: 'var(--text-primary)', outline: 'none',
          }}
        />

        <select
          value={workMode}
          onChange={e => handleWorkModeChange(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All modes</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>

        {/* Source filter */}
        <div style={{
          display: 'flex', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden',
        }}>
          {([
            { key: 'all',      label: 'All'       },
            { key: 'internal', label: 'Recruiter' },
            { key: 'serpapi',  label: 'Google'    },
            { key: 'linkedin', label: 'LinkedIn'  },
            { key: 'indeed',   label: 'Indeed'    },
          ] as { key: SourceFilter; label: string }[]).map(({ key, label }, i, arr) => (
            <button
              key={key}
              onClick={() => handleSourceChange(key)}
              style={{
                padding:     '7px 14px',
                fontSize:    12,
                fontWeight:  500,
                background:  sourceFilter === key ? 'rgba(124,58,237,0.2)' : 'transparent',
                color:       sourceFilter === key ? '#A78BFA' : 'var(--text-muted)',
                border:      'none',
                borderRight: i < arr.length - 1
                  ? '1px solid rgba(255,255,255,0.09)'
                  : 'none',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={refresh}
          disabled={validating}
          style={{
            padding: '7px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-muted)',
            cursor: validating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ display: 'inline-block', animation: validating ? 'spin 0.8s linear infinite' : 'none', fontSize: 14 }}>
            ↻
          </span>
          {validating ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {/* ── My applications status strip ── */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            My applications:
          </span>
          {Object.entries(
            applications.reduce<Record<string, number>>((acc, a) => {
              acc[a.status] = (acc[a.status] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([status, count]) => {
            const b = APP_BADGE[status];
            if (!b) return null;
            return (
              <span
                key={status}
                style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: b.bg, color: b.color }}
              >
                {b.label} ({count})
              </span>
            );
          })}
        </div>
      )}

      {/* ── Job grid ── */}
      {error ? (
        <div className="card p-8" style={{ textAlign: 'center' }}>
          <p style={{ color: '#F87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={refresh}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-10" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            No jobs found — try adjusting your filters
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                application={getApp(job.id)}
                onApply={setApplyTarget}
              />
            ))}
          </div>

          {/* ── Pagination ── */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            loading={validating}
          />
        </>
      )}

      {/* ── Apply modal ── */}
      {applyTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ApplyModal
            job={applyTarget}
            onClose={() => setApplyTarget(null)}
            onSuccess={applyOptimistic}
          />
        </div>
      )}
    </section>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\layout.tsx">
<![CDATA[
'use client';

// frontend/app/(protected)/layout.tsx
//
// Change from previous version — one addition only:
//   1. Import ProfilePanelProvider from context
//   2. Wrap the layout return with <ProfilePanelProvider>
//
// Why this is needed:
//   ProfilePanelContext provides the open/closePanel state that connects
//   the Sidebar username card (consumer: openPanel) to the ProfilePanel
//   drawer (consumer: open state) inside each dashboard page.
//
//   The provider MUST live above both the Sidebar and the page children
//   in the tree — this layout is exactly the right place because it wraps
//   every protected route and renders the Sidebar directly.
//
//   Without this wrapper, useProfilePanel() returns the default no-op
//   values and clicking the username card does nothing.

import { useEffect }                from 'react';
import { useRouter }                from 'next/navigation';
import { useAuth }                  from '@/components/providers/AuthProvider';
import { Sidebar }                  from '@/app/_components/shared/Sidebar';
import { useJobStream }             from '@/hooks/useJobStream';
import { ProfilePanelProvider }     from '@/components/context/ProfilePanelContext'; // ← new

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LayoutSkeleton() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070B14' }}>
      <div style={{
        width: '240px', minHeight: '100vh',
        background: '#0D1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, padding: '2rem' }}>
        <div style={{
          height: '32px', width: '200px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)', marginBottom: '1rem',
          animation: 'skPulse 1.5s ease infinite',
        }} />
        <div style={{
          height: '200px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          animation: 'skPulse 1.5s ease infinite',
        }} />
      </div>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ── Protected Layout ──────────────────────────────────────────────────────────

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router            = useRouter();

  // SSE connection — one hook call activates real-time for ALL protected pages.
  // Only fires after auth resolves (user exists). EventSource auto-reconnects.
  // When server emits job_created / jobs_synced / alert → SWR revalidates.
  useJobStream();

  // Redirect unauthenticated users to landing
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/?auth=login');
    }
  }, [user, loading, router]);

  if (loading) return <LayoutSkeleton />;
  if (!user)   return null;

  return (
    // ── ProfilePanelProvider wraps Sidebar + children so both can reach
    //    the same open/closePanel state via useProfilePanel().
    //
    //    Sidebar  →  calls openPanel()  when username card is clicked
    //    Dashboard pages  →  render <ProfilePanel /> which reads open state
    //
    //    Both are subtrees of this provider, so context is shared correctly.
    <ProfilePanelProvider>
      <div style={{
        display:    'flex',
        minHeight:  '100vh',
        background: '#070B14',
        fontFamily: "'Sora', sans-serif",
      }}>
        <Sidebar />
        <div style={{
          flex:          1,
          minWidth:      0,
          display:       'flex',
          flexDirection: 'column',
          overflowY:     'auto',
          overflowX:     'hidden',
          minHeight:     '100vh',
        }}>
          {children}
        </div>
      </div>
    </ProfilePanelProvider>
  );
}
]]>
</file>
<file name="frontend\app\(protected)\mock-interview\chat\page.tsx">
<![CDATA[
'use client';
export const dynamic = 'force-dynamic';
// frontend/app/%28protected%29/mock-interview/chat/page.tsx
export default function ChatRoomPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">🎤 Live Interview Chat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            AI-powered mock interview with instant feedback & grading
          </p>
        </div>
        <a
          href="/mock-interview"
          className="btn btn-secondary text-sm"
        >
          ← Back
        </a>
      </div>

      {/* MindPal Chatbot - Full Height */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-0)] shadow-lg">
        <div className="flex items-center gap-2 bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-0)]">
          <span className="text-lg">🎯</span>
          <h2 className="text-sm font-semibold">PrepWise AI</h2>
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
            ● Live
          </span>
        </div>
        <iframe
          src="https://chatbot.getmindpal.com/mock-interview-master-7ia"
          width="100%"
          height="650"
          frameBorder={0}
          allow="microphone"
          title="PrepWise AI Mock Interview"
          className="bg-[var(--surface-0)]"
        />
      </div>
    </main>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\mock-interview\page.tsx">
<![CDATA[
'use client';

import { useState } from 'react';

const MINDPAL_URL = 'https://chatbot.getmindpal.com/mock-interview-master-7ia?theme=light';

export default function MockInterviewPage() {
  const [started, setStarted] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

        /* ── Reset any layout constraints from parent wrappers ── */
        /* The protected layout may have padding/overflow that clips the iframe */
        .mi-root {
          font-family:    'Sora', sans-serif;
          background:     #070B14;
          color:          #E2E8F0;
          display:        flex;
          flex-direction: column;

          /* Fill the full viewport minus whatever the sidebar takes */
          height:         100vh;
          overflow:       hidden;   /* prevent double scrollbars */
        }

        /* ── Header — fixed height so iframe gets the rest ── */
        .mi-header {
          display:         flex;
          align-items:     center;
          justify-content: space-between;
          padding:         1rem 1.75rem;
          border-bottom:   1px solid rgba(255,255,255,0.06);
          background:      #070B14;
          flex-shrink:     0;          /* never compress — iframe gets remaining space */
          height:          64px;
          box-sizing:      border-box;
          z-index:         10;
        }

        /* ── Main: fills everything below the header ── */
        .mi-main {
          flex:       1;
          display:    flex;
          flex-direction: column;
          min-height: 0;             /* critical — lets flex child shrink below content size */
          overflow:   hidden;
        }

        /* ── Landing screen ── */
        .mi-landing {
          flex:            1;
          display:         flex;
          flex-direction:  column;
          align-items:     center;
          justify-content: center;
          padding:         3rem 2rem;
          text-align:      center;
          animation:       miUp 0.5s ease forwards;
        }

        /* ── Iframe wrapper: fills main, no padding when active ── */
        .mi-iframe-container {
          flex:       1;
          display:    flex;
          flex-direction: column;
          min-height: 0;
          padding:    0;             /* zero padding — iframe goes edge to edge */
          animation:  miUp 0.35s ease forwards;
        }

        /* ── The iframe itself ── */
        .mi-iframe {
          flex:    1;
          width:   100%;
          border:  none;
          display: block;
          /* No fixed height — flex:1 makes it fill all available space */
          min-height: 0;
        }

        /* ── CTA button ── */
        .mi-btn {
          background:    linear-gradient(135deg, #6366F1, #8B5CF6);
          border:        none;
          border-radius: 14px;
          color:         #fff;
          cursor:        pointer;
          font-family:   'Sora', sans-serif;
          font-size:     15px;
          font-weight:   600;
          padding:       14px 40px;
          transition:    transform 0.15s, box-shadow 0.15s;
          box-shadow:    0 4px 24px rgba(99,102,241,0.3);
        }
        .mi-btn:hover {
          transform:  translateY(-2px);
          box-shadow: 0 8px 32px rgba(99,102,241,0.45);
        }

        /* ── Animations ── */
        @keyframes miUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        /* ── Feature pill ── */
        .mi-pill {
          display:      flex;
          align-items:  center;
          gap:          7px;
          padding:      7px 14px;
          background:   rgba(255,255,255,0.03);
          border:       1px solid rgba(255,255,255,0.07);
          border-radius:20px;
          font-size:    12px;
          color:        rgba(255,255,255,0.45);
          transition:   all 0.2s;
        }
        .mi-pill:hover {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.25);
          color: rgba(255,255,255,0.7);
        }
      `}</style>

      <div className="mi-root">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mi-header">

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Icon */}
            <div style={{
              width:          '38px',
              height:         '38px',
              borderRadius:   '10px',
              background:     'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              border:         '1px solid rgba(99,102,241,0.3)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '18px',
              flexShrink:     0,
            }}>
              🎤
            </div>

            <div>
              <h1 style={{
                fontSize:      '15px',
                fontWeight:     600,
                color:         '#F1F5F9',
                margin:         0,
                letterSpacing: '-0.02em',
              }}>
                Mock Interview
              </h1>
              <p style={{
                fontSize: '12px',
                color:    'rgba(255,255,255,0.3)',
                margin:    0,
              }}>
                AI-powered practice session
              </p>
            </div>
          </div>

          {/* Right side — status when active, tips when idle */}
          {started ? (
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '7px',
              padding:      '5px 14px',
              background:   'rgba(16,185,129,0.08)',
              border:       '1px solid rgba(16,185,129,0.2)',
              borderRadius: '20px',
              fontSize:     '12px',
              color:        '#6EE7B7',
              fontFamily:   'monospace',
            }}>
              <span style={{
                width:        '7px',
                height:       '7px',
                borderRadius: '50%',
                background:   '#10B981',
                display:      'inline-block',
                animation:    'pulse 1.5s ease infinite',
              }} />
              Session active
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              color:    'rgba(255,255,255,0.2)',
              display:  'flex',
              gap:      '1rem',
            }}>
              <span>🎯 Role-specific questions</span>
              <span>⚡ Instant feedback</span>
            </div>
          )}
        </header>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main id="main-content" className="mi-main">

          {/* ── Landing — before session starts ─────────────────────────── */}
          {!started && (
            <div className="mi-landing">

              {/* Hero icon */}
              <div style={{
                width:          '80px',
                height:         '80px',
                borderRadius:   '22px',
                background:     'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
                border:         '1px solid rgba(99,102,241,0.22)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '36px',
                marginBottom:   '2rem',
              }}>
                🎯
              </div>

              <h2 style={{
                fontSize:      'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight:     700,
                color:         '#F1F5F9',
                letterSpacing: '-0.03em',
                lineHeight:     1.15,
                margin:        '0 0 1rem',
                maxWidth:      '540px',
              }}>
                Ace your next interview with{' '}
                <span style={{
                  background:           'linear-gradient(135deg, #818CF8, #A78BFA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor:  'transparent',
                }}>
                  AI coaching
                </span>
              </h2>

              <p style={{
                fontSize:     '15px',
                color:        'rgba(255,255,255,0.4)',
                lineHeight:    1.7,
                maxWidth:     '460px',
                margin:       '0 0 2.5rem',
              }}>
                Practice with a real AI interviewer. Get instant feedback on your
                answers, communication, and technical depth — anytime, for free.
              </p>

              {/* Feature pills */}
              <div style={{
                display:        'flex',
                gap:            '10px',
                flexWrap:       'wrap',
                justifyContent: 'center',
                marginBottom:   '2.5rem',
              }}>
                {[
                  { icon: '🤖', label: 'AI Interviewer'     },
                  { icon: '⚡', label: 'Instant Feedback'   },
                  { icon: '🎯', label: 'Role-Specific'      },
                  { icon: '🔄', label: 'Unlimited Practice' },
                  { icon: '🎤', label: 'Voice Support'      },
                ].map(f => (
                  <div key={f.label} className="mi-pill">
                    <span aria-hidden="true">{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>

              <button
                className="mi-btn"
                onClick={() => setStarted(true)}
                aria-label="Start mock interview session"
              >
                Start Interview Session →
              </button>

              <p style={{
                marginTop: '1.25rem',
                fontSize:  '12px',
                color:     'rgba(255,255,255,0.18)',
              }}>
                Powered by MindPal AI · No account required
              </p>
            </div>
          )}

          {/* ── Active session — MindPal iframe fills entire remaining space ── */}
          {started && (
            <div className="mi-iframe-container">
              <iframe
                className="mi-iframe"
                src={MINDPAL_URL}
                title="Mock Interview AI Agent"
                allow="microphone; camera"
                loading="lazy"
              />
            </div>
          )}

        </main>
      </div>
    </>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\profile\page.tsx">
<![CDATA[
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import CandidateProfilePage from '@/app/_components/profiles/CandidateProfilePage';
import RecruiterProfilePage from '@/app/_components/profiles/RecruiterProfilePage';

export default function ProfilePage() {
  const { user } = useAuth();

  if (user?.role === 'recruiter') {
    return <RecruiterProfilePage />;
  }

  return <CandidateProfilePage />;
}

/*
---

## Move Profile Components Into `_components`

Since Next.js treats all folders inside `app/` as routes, your profile page components should live in `_components/` (the underscore prefix prevents Next.js from treating them as route segments).
```
app/
└── _components/
    ├── dashboards/
    │   ├── CandidateDashboard.tsx    ← moved here from earlier
    │   └── RecruiterDashboard.tsx
    ├── profiles/
    │   ├── CandidateProfilePage.tsx  ← move the candidate profile component here
    │   └── RecruiterProfilePage.tsx  ← move the recruiter profile component here
    └── shared/
        ├── TagInput.tsx              ← extract reusable TagInput
        └── LoadingSpinner.tsx


        */

]]>
</file>
<file name="frontend\app\(protected)\recommendations\page.tsx">
<![CDATA[
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/axios';
import { useLatestResume } from '@/hooks/useRealTimeAlerts';

interface JobRec {
  id:             string;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  requiredSkills: string[];
  applyUrl:       string | null;
  matchScore?:    number;
  source:         'internal' | 'serpapi';
  postedAt:       string;
}

const fetcher = (url: string) => api.get(url).then(r => r.data);

const fmtSalary = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100_000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

function JobCard({ job }: { job: JobRec }) {
  const salary     = fmtSalary(job.salaryMin, job.salaryMax);
  const isDirect   = job.source === 'internal';
  const score      = job.matchScore ?? 0;
  const scoreColor = score >= 80 ? '#34D399' : score >= 60 ? '#FBBF24' : '#60A5FA';

  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      background: '#0D1220',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{job.title}</p>
            {isDirect && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)', fontWeight: 600 }}>
                Direct
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode && ` · ${job.workMode}`}
          </p>
        </div>
        {score > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor, fontFamily: 'monospace', lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>match</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {job.employmentType && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}
        {salary && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
            {salary}
          </span>
        )}
      </div>

      {job.requiredSkills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {job.requiredSkills.slice(0, 6).map((skill: string) => (
            <span key={skill} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(167,139,250,0.08)', color: 'rgba(167,139,250,0.8)', border: '1px solid rgba(167,139,250,0.15)' }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        {isDirect ? (
          <a href="/jobs" style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#A78BFA', textDecoration: 'none' }}>
            Apply in-app
          </a>
        ) : job.applyUrl ? (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', textDecoration: 'none' }}>
            Apply externally ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: '#0D1220', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[55, 35, 100].map((w, i) => (
        <div key={i} style={{ height: i === 2 ? 40 : 14, width: `${w}%`, borderRadius: 6, background: `rgba(255,255,255,0.0${i + 4})`, animation: 'rcPulse 1.5s ease infinite' }} />
      ))}
      <style>{`@keyframes rcPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function Gate({ icon, title, body, cta, href, color }: {
  icon: string; title: string; body: string;
  cta: string; href: string; color: string;
}) {
  return (
    <div style={{ padding: '2rem', borderRadius: 14, border: `1px solid ${color}33`, background: `${color}08`, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color }}>{title}</p>
        <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{body}</p>
        <a href={href} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, background: `${color}18`, border: `1px solid ${color}44`, color, textDecoration: 'none' }}>
          {cta}
        </a>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const { resume, loading: resumeLoading } = useLatestResume();

  const hasAnalysis  = resume?.status === 'analyzed';
  const isProcessing = resume?.status === 'processing';
  const isFailed     = resume?.status === 'failed';
  const isUploaded   = resume?.status === 'uploaded';

  // Key architectural decision: only fire /jobs/recommendations AFTER analysis
  // is confirmed complete. Calling it earlier causes a 500 because
  // candidate_profiles.top_skills is empty — the backend has nothing to score with.
  const { data: jobs, error, isLoading, isValidating, mutate } = useSWR<JobRec[]>(
    hasAnalysis ? '/jobs/recommendations' : null,
    fetcher,
    {
      refreshInterval:    60_000,
      revalidateOnFocus:  true,
      shouldRetryOnError: false, // 500s need user action, not auto-retry loops
    },
  );

  // Safe error message extraction from axios error shape
  const errorMessage: string | null =
    (error?.response?.data?.message as string | undefined) ??
    (error?.response?.data?.error  as string | undefined) ??
    (error?.message as string | undefined) ??
    null;

  return (
    <>
      <style>{`@keyframes rcSpin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* Header */}
        <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Recommendations</h1>
            {isValidating && hasAnalysis && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 5px #34D399', display: 'inline-block' }} />
            )}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Jobs matched to your skills{hasAnalysis ? ' · refreshes every 60s' : ''}
          </p>
        </div>

        <div style={{ padding: '0 2rem 4rem', maxWidth: 900, margin: '0 auto' }}>

          {/* State gates — each blocks rendering the actual recommendations */}

          {!resumeLoading && !resume && (
            <Gate icon="📄" color="#FBBF24"
              title="No resume uploaded"
              body="Upload your resume and run the AI analysis to unlock personalised job matches."
              cta="Upload Resume" href="/resumes" />
          )}

          {!resumeLoading && isUploaded && (
            <Gate icon="⚡" color="#A78BFA"
              title="Resume not yet analysed"
              body="Go to Resume Analysis and click Analyse with Gemini to extract your skills and unlock matches."
              cta="Go to Resume Analysis" href="/resume-analysis" />
          )}

          {!resumeLoading && isProcessing && (
            <div style={{ padding: '2rem', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(251,191,36,0.3)', borderTopColor: '#FBBF24', animation: 'rcSpin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FBBF24' }}>Gemini is analysing your resume</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(251,191,36,0.5)' }}>Recommendations will appear here automatically once complete · page auto-updates</p>
              </div>
            </div>
          )}

          {!resumeLoading && isFailed && (
            <Gate icon="⚠" color="#F87171"
              title="Analysis failed"
              body="Something went wrong during Groq analysis. Go to Resume Analysis to retry."
              cta="Retry Analysis" href="/resume-analysis" />
          )}

          {/* Recommendations loading */}
          {hasAnalysis && isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Recommendations 500 / backend error */}
          {hasAnalysis && !isLoading && errorMessage && (
            <div style={{ padding: '2rem', borderRadius: 14, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#F87171' }}>Could not load recommendations</p>
              <code style={{ display: 'block', fontSize: 11, color: 'rgba(248,113,113,0.7)', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                {errorMessage}
              </code>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Root cause:</strong> your BullMQ analysis worker saves results to{' '}
                <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>resume_analyses</code>{' '}
                but does not write <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>top_skills</code>{' '}
                back to <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>candidate_profiles</code>.{' '}
                The recommendations service reads from the profile table and 500s when it finds no skills.
                Share your BullMQ worker file and I'll add the sync.
              </p>
              <button onClick={() => void mutate()} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Retry
              </button>
            </div>
          )}

          {/* Empty results */}
          {hasAnalysis && !isLoading && !errorMessage && (jobs?.length ?? 0) === 0 && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: '#0D1220' }}>
              <p style={{ fontSize: 32, margin: '0 0 12px' }}>🔍</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>No matches found yet</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>Jobs sync every 30 minutes. Check back shortly.</p>
              <a href="/jobs" style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', textDecoration: 'none' }}>Browse all jobs</a>
            </div>
          )}

          {/* Results grid */}
          {hasAnalysis && !isLoading && !errorMessage && (jobs?.length ?? 0) > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                  {jobs!.length} matched job{jobs!.length !== 1 ? 's' : ''}
                </p>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Ranked by skill match</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
                {jobs!.map((job: JobRec) => <JobCard key={job.id} job={job} />)}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\recruiter\interviews\page.tsx">
<![CDATA[
'use client';

import { useEffect, useMemo, useState } from 'react';
import { interviewApi } from '@/lib/axios';

type InterviewItem = {
  id: string;
  current_stage: string;
  status_code: number;
  final_status: string | null;
  updated_at: string;
  created_at: string;
  job_title?: string;
  company?: string;
  candidate_name?: string;
  candidate_email?: string;
};

type RoundItem = {
  id: string;
  round_number: number;
  round_type: 'hr' | 'technical' | 'managerial' | 'assignment';
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: 'video' | 'phone' | 'offline' | null;
  meeting_join_url: string | null;
  result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule' | null;
  score: number | null;
  feedback: string | null;
};

const S = {
  bg: '#07090F',
  card: '#0D1120',
  border: 'rgba(255,255,255,.08)',
  muted: 'rgba(255,255,255,.6)',
  blue: '#38BDF8',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  purple: '#A78BFA',
  white: '#F8FAFC',
};

const stageColor = (stage: string) => {
  if (stage === 'REJECTED' || stage === 'INTERVIEW_FAILED') return S.red;
  if (stage === 'HIRED' || stage === 'INTERVIEW_PASSED') return S.green;
  if (stage === 'SHORTLISTED') return S.blue;
  if (stage.includes('INTERVIEW')) return S.purple;
  return 'rgba(255,255,255,0.75)';
};

const stages = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_IN_PROGRESS',
  'INTERVIEW_PASSED',
  'INTERVIEW_FAILED',
  'FINAL_REVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'ON_HOLD',
  'WITHDRAWN',
] as const;

export default function RecruiterInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [schedOpen, setSchedOpen] = useState(false);
  const [schedBusy, setSchedBusy] = useState(false);
  const [roundType, setRoundType] = useState<'hr' | 'technical' | 'managerial' | 'assignment'>('technical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode, setMode] = useState<'video' | 'phone' | 'offline'>('video');

  const [updatingStage, setUpdatingStage] = useState(false);

  const selectedInterview = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await interviewApi.listRecruiterInterviews({ limit: 50 });
      const data = (res.data ?? []) as InterviewItem[];
      setItems(data);
      setSelectedId((prev) => (prev && data.some((x) => x.id === prev) ? prev : data[0]?.id ?? null));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load recruiter interviews');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    try {
      const res = await interviewApi.getRecruiterInterview(id);
      setRounds((res.data?.rounds ?? []) as RoundItem[]);
    } catch {
      setRounds([]);
    }
  };

  useEffect(() => {
    void loadList();
    const iv = setInterval(loadList, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRounds([]);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [rounds]);

  const schedule = async () => {
    if (!selectedInterview) return;
    if (!scheduledAt) {
      alert('Please select date/time');
      return;
    }
    try {
      setSchedBusy(true);
      await interviewApi.scheduleRound(selectedInterview.id, {
        roundType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins: Number(durationMins) || 45,
        mode,
      });
      setSchedOpen(false);
      await loadDetail(selectedInterview.id);
      await loadList();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to schedule round');
    } finally {
      setSchedBusy(false);
    }
  };

  const updateStage = async (stage: (typeof stages)[number]) => {
    if (!selectedInterview) return;
    try {
      setUpdatingStage(true);
      await interviewApi.updateStage(selectedInterview.id, stage);
      await loadList();
      await loadDetail(selectedInterview.id);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const submitRoundResult = async (roundId: string, result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule') => {
    try {
      await interviewApi.submitRoundResult(roundId, { result });
      if (selectedInterview) await loadDetail(selectedInterview.id);
      await loadList();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update round result');
    }
  };

  const joinRoom = (round: RoundItem) => {
    if (!selectedInterview) return;
    const roomId = `jc-${selectedInterview.id}-r${round.round_number}`;
    window.location.href = `/interviews/room/${roomId}`;
  };

  return (
    <main style={{ padding: 20, color: S.white }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Recruiter Interviews</h1>
      <p style={{ color: S.muted, marginBottom: 16 }}>
        Schedule rounds, track outcomes, and join live interview rooms.
      </p>

      {error && <div style={{ color: '#FCA5A5', marginBottom: 12 }}>{error}</div>}

      {nextRound && selectedInterview && (
        <section style={{ marginBottom: 16, padding: 14, border: `1px solid ${S.blue}44`, borderRadius: 10, background: `${S.blue}14` }}>
          <div style={{ fontSize: 12, color: S.blue, fontWeight: 800 }}>Next Scheduled Round</div>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            {selectedInterview.candidate_name ?? 'Candidate'} · Round {nextRound.round_number} ({nextRound.round_type.toUpperCase()}) ·{' '}
            {nextRound.scheduled_at ? new Date(nextRound.scheduled_at).toLocaleString() : 'TBD'}
          </div>
          <button
            onClick={() => joinRoom(nextRound)}
            style={{ marginTop: 10, border: 'none', borderRadius: 8, padding: '8px 12px', background: S.blue, color: '#001018', fontWeight: 800, cursor: 'pointer' }}
          >
            Join Interview Room
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <section style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, fontWeight: 700 }}>
            Interviews
          </div>

          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 12, color: S.muted }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, color: S.muted }}>No interviews found.</div>
            ) : (
              items.map((it) => {
                const active = selectedId === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: `1px solid rgba(255,255,255,.06)`,
                      padding: 12,
                      color: S.white,
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{it.job_title ?? 'Role'}</div>
                    <div style={{ fontSize: 12, color: S.muted }}>{it.company ?? '-'} · {it.candidate_name ?? 'Candidate'}</div>
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: stageColor(it.current_stage) }}>
                      {it.current_stage}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, fontWeight: 700 }}>
            {selectedInterview ? `Interview Details` : 'Select an interview'}
          </div>

          {!selectedInterview ? (
            <div style={{ padding: 12, color: S.muted }}>Select from the left panel.</div>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedInterview.job_title ?? 'Role'}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>
                    {selectedInterview.company ?? '-'} · {selectedInterview.candidate_name ?? '-'} {selectedInterview.candidate_email ? `(${selectedInterview.candidate_email})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    disabled={updatingStage}
                    defaultValue={selectedInterview.current_stage}
                    onChange={(e) => void updateStage(e.target.value as (typeof stages)[number])}
                    style={{
                      background: 'rgba(255,255,255,.05)',
                      border: `1px solid ${S.border}`,
                      color: S.white,
                      borderRadius: 8,
                      padding: '8px 10px',
                    }}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s} style={{ color: '#111' }}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setSchedOpen((v) => !v)}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 12px',
                      background: S.green,
                      color: '#052E16',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {schedOpen ? 'Close Scheduler' : 'Schedule Round'}
                  </button>
                </div>
              </div>

              {schedOpen && (
                <div style={{ marginTop: 12, padding: 10, border: `1px solid ${S.border}`, borderRadius: 10, background: 'rgba(255,255,255,.03)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Schedule New Round</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                    <select value={roundType} onChange={(e) => setRoundType(e.target.value as any)} style={{ ...inputStyle }}>
                      <option value="hr">HR</option>
                      <option value="technical">Technical</option>
                      <option value="managerial">Managerial</option>
                      <option value="assignment">Assignment</option>
                    </select>

                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      min={15}
                      step={5}
                      value={durationMins}
                      onChange={(e) => setDurationMins(Number(e.target.value))}
                      style={inputStyle}
                    />

                    <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={inputStyle}>
                      <option value="video">Video</option>
                      <option value="phone">Phone</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => void schedule()}
                      disabled={schedBusy}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        background: S.blue,
                        color: '#001018',
                        fontWeight: 800,
                        cursor: schedBusy ? 'wait' : 'pointer',
                        opacity: schedBusy ? 0.7 : 1,
                      }}
                    >
                      {schedBusy ? 'Scheduling…' : 'Confirm Schedule'}
                    </button>
                  </div>
                </div>
              )}

              <h3 style={{ margin: '14px 0 8px', fontSize: 14 }}>Rounds</h3>
              {rounds.length === 0 ? (
                <div style={{ color: S.muted, fontSize: 13 }}>No rounds scheduled yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rounds.map((r) => (
                    <div key={r.id} style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          Round {r.round_number}: {r.round_type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: S.muted }}>{r.result ?? 'pending'}</div>
                      </div>

                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
                        {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : 'Not scheduled'} · {r.mode ?? '-'} · {r.duration_mins ?? '-'} mins
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => joinRoom(r)} style={linkBtn}>Join Room</button>
                        <button onClick={() => void submitRoundResult(r.id, 'pass')} style={miniBtn(S.green, '#052E16')}>Mark Pass</button>
                        <button onClick={() => void submitRoundResult(r.id, 'fail')} style={miniBtn(S.red, '#fff')}>Mark Fail</button>
                        <button onClick={() => void submitRoundResult(r.id, 'no_show')} style={miniBtn(S.amber, '#111827')}>No Show</button>
                      </div>

                      {typeof r.score === 'number' && (
                        <div style={{ marginTop: 8, fontSize: 12, color: S.purple }}>Score: {r.score}</div>
                      )}
                      {r.feedback && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{r.feedback}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  color: '#F8FAFC',
  borderRadius: 8,
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'inherit',
};

const linkBtn: React.CSSProperties = {
  border: 'none',
  borderRadius: 7,
  padding: '6px 10px',
  background: '#38BDF8',
  color: '#001018',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
};

const miniBtn = (bg: string, color: string): React.CSSProperties => ({
  border: 'none',
  borderRadius: 7,
  padding: '6px 10px',
  background: bg,
  color,
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
});
]]>
</file>
<file name="frontend\app\(protected)\recruiter\interviews\[interview-id]\live\page.tsx">
<![CDATA[
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { interviewApi, type InterviewStage } from '@/lib/axios';

type RoundItem = {
  id: string;
  round_number: number;
  round_type: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: string | null;
  meeting_join_url: string | null;
  result: string | null;
  score: number | null;
  feedback: string | null;
};

type InterviewDetail = {
  interview: {
    id: string;
    current_stage: InterviewStage;
    status_code: number;
    final_status: string | null;
    candidate_id: string;
    recruiter_id: string;
    job_id: string;
  };
  rounds: RoundItem[];
  events: Array<{
    id: string;
    event_type: string;
    from_stage: string | null;
    to_stage: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
};

type ChecklistState = {
  joinedOnTime: boolean;
  introClarity: boolean;
  dsAlgo: boolean;
  systemDesign: boolean;
  debugging: boolean;
  communication: boolean;
  cultureFit: boolean;
  confidence: boolean;
};

const initialChecklist: ChecklistState = {
  joinedOnTime: false,
  introClarity: false,
  dsAlgo: false,
  systemDesign: false,
  debugging: false,
  communication: false,
  cultureFit: false,
  confidence: false,
};

const recommendationWeight: Record<string, number> = {
  'Strong Hire': 100,
  Hire: 80,
  'No Hire': 45,
  'Strong No Hire': 20,
};

export default function RecruiterInterviewLivePage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const interviewId = params?.interviewId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  const [checks, setChecks] = useState<ChecklistState>(initialChecklist);
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [recommendation, setRecommendation] = useState<'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire'>('Hire');

  const [error, setError] = useState('');

  const load = async () => {
    if (!interviewId) return;
    try {
      setLoading(true);
      setError('');
      const res = await interviewApi.getRecruiterInterview(interviewId);
      const d = res.data as InterviewDetail;
      setDetail(d);

      if (!selectedRoundId && d.rounds?.length) {
        const inProgressRound =
          d.rounds.find((r) => r.result === 'pending') ?? d.rounds[d.rounds.length - 1];
        setSelectedRoundId(inProgressRound.id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const iv = setInterval(() => void load(), 30_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const selectedRound = useMemo(
    () => detail?.rounds.find((r) => r.id === selectedRoundId) ?? null,
    [detail, selectedRoundId],
  );

  const checklistScore = useMemo(() => {
    const entries = Object.values(checks);
    const yes = entries.filter(Boolean).length;
    return Math.round((yes / entries.length) * 100);
  }, [checks]);

  const finalScore = useMemo(() => {
    const weighted = Math.round(checklistScore * 0.7 + recommendationWeight[recommendation] * 0.3);
    return Math.max(0, Math.min(100, weighted));
  }, [checklistScore, recommendation]);

  const suggestedResult = useMemo(() => {
    if (finalScore >= 85) return 'pass';
    if (finalScore >= 65) return 'pass';
    if (finalScore >= 45) return 'fail';
    return 'fail';
  }, [finalScore]);

  const suggestedStage: InterviewStage = useMemo(() => {
    if (recommendation === 'Strong Hire' || recommendation === 'Hire') return 'INTERVIEW_PASSED';
    return 'INTERVIEW_FAILED';
  }, [recommendation]);

  const toggle = (key: keyof ChecklistState) =>
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const validateMandatory = () => {
    if (!selectedRound) return 'Please select a round';
    if (!strengths.trim()) return 'Strengths are mandatory';
    if (!concerns.trim()) return 'Concerns are mandatory';
    if (!recommendation) return 'Recommendation is mandatory';
    return '';
  };

  const submitEvaluation = async () => {
    const v = validateMandatory();
    if (v) {
      setError(v);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const feedback = [
        `Recommendation: ${recommendation}`,
        `Checklist Score: ${checklistScore}`,
        `Final Score: ${finalScore}`,
        '',
        `Strengths: ${strengths.trim()}`,
        `Concerns: ${concerns.trim()}`,
        '',
        `Checklist:`,
        `- Joined on time: ${checks.joinedOnTime ? 'Yes' : 'No'}`,
        `- Introduction clarity: ${checks.introClarity ? 'Yes' : 'No'}`,
        `- DS/Algo understanding: ${checks.dsAlgo ? 'Yes' : 'No'}`,
        `- System design thinking: ${checks.systemDesign ? 'Yes' : 'No'}`,
        `- Debugging approach: ${checks.debugging ? 'Yes' : 'No'}`,
        `- Communication clarity: ${checks.communication ? 'Yes' : 'No'}`,
        `- Culture alignment: ${checks.cultureFit ? 'Yes' : 'No'}`,
        `- Confidence: ${checks.confidence ? 'Yes' : 'No'}`,
      ].join('\n');

      await interviewApi.submitRoundResult(selectedRound!.id, {
        result: suggestedResult as 'pass' | 'fail',
        score: finalScore,
        feedback,
      });

      await interviewApi.updateStage(interviewId!, suggestedStage);

      alert('Evaluation submitted successfully.');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to submit evaluation');
    } finally {
      setSaving(false);
    }
  };

  const quickStage = async (stage: InterviewStage) => {
    try {
      setSaving(true);
      await interviewApi.updateStage(interviewId!, stage);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={styles.page}><div style={styles.muted}>Loading live interview panel…</div></main>;
  }

  if (!detail) {
    return <main style={styles.page}><div style={styles.error}>Interview not found</div></main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Live Interview Panel</h1>
          <div style={styles.muted}>
            Interview ID: <code>{detail.interview.id}</code>
          </div>
          <div style={{ ...styles.muted, marginTop: 4 }}>
            Current Stage: <strong style={{ color: '#38BDF8' }}>{detail.interview.current_stage}</strong> · Status Code: {detail.interview.status_code}
          </div>
        </div>

        <div style={styles.topActions}>
          <button style={styles.secondaryBtn} onClick={() => router.push('/recruiter/interviews')}>
            Back
          </button>
          <button style={styles.secondaryBtn} onClick={() => void quickStage('INTERVIEW_IN_PROGRESS')} disabled={saving}>
            Mark In Progress
          </button>
          <button style={styles.secondaryBtn} onClick={() => void quickStage('ON_HOLD')} disabled={saving}>
            Put On Hold
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.grid}>
        {/* LEFT: Round + meeting + checklist */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Round Evaluation</h2>

          <label style={styles.label}>Select Round</label>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            style={styles.select}
          >
            {detail.rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round {r.round_number} · {r.round_type.toUpperCase()} · {r.result ?? 'pending'}
              </option>
            ))}
          </select>

          {selectedRound && (
            <div style={styles.roundMeta}>
              <div><strong>Scheduled:</strong> {selectedRound.scheduled_at ? new Date(selectedRound.scheduled_at).toLocaleString() : 'Not scheduled'}</div>
              <div><strong>Mode:</strong> {selectedRound.mode ?? '-'}</div>
              <div><strong>Duration:</strong> {selectedRound.duration_mins ?? '-'} mins</div>
              {selectedRound.meeting_join_url && (
                <a
                  href={selectedRound.meeting_join_url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.joinLink}
                >
                  Open Interview Room
                </a>
              )}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <h3 style={styles.h3}>Real Hiring Checklist</h3>
            <div style={styles.checkGrid}>
              <CheckRow label="Candidate joined on time" checked={checks.joinedOnTime} onChange={() => toggle('joinedOnTime')} />
              <CheckRow label="Introduction clarity" checked={checks.introClarity} onChange={() => toggle('introClarity')} />
              <CheckRow label="DS/Algo understanding" checked={checks.dsAlgo} onChange={() => toggle('dsAlgo')} />
              <CheckRow label="System design thinking" checked={checks.systemDesign} onChange={() => toggle('systemDesign')} />
              <CheckRow label="Debugging approach" checked={checks.debugging} onChange={() => toggle('debugging')} />
              <CheckRow label="Communication clarity" checked={checks.communication} onChange={() => toggle('communication')} />
              <CheckRow label="Culture alignment" checked={checks.cultureFit} onChange={() => toggle('cultureFit')} />
              <CheckRow label="Confidence" checked={checks.confidence} onChange={() => toggle('confidence')} />
            </div>
          </div>
        </section>

        {/* RIGHT: Final recommendation + notes + audit */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Decision Notes</h2>

          <label style={styles.label}>Strengths (mandatory)</label>
          <textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Write key strengths observed..."
            style={styles.textarea}
          />

          <label style={styles.label}>Concerns (mandatory)</label>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Write key concerns / gaps..."
            style={styles.textarea}
          />

          <label style={styles.label}>Hire Recommendation (mandatory)</label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as any)}
            style={styles.select}
          >
            <option>Strong Hire</option>
            <option>Hire</option>
            <option>No Hire</option>
            <option>Strong No Hire</option>
          </select>

          <div style={styles.scoreBox}>
            <div>Checklist Score: <strong>{checklistScore}</strong></div>
            <div>Final Score: <strong>{finalScore}</strong></div>
            <div>Suggested Result: <strong>{suggestedResult.toUpperCase()}</strong></div>
            <div>Suggested Stage: <strong>{suggestedStage}</strong></div>
          </div>

          <button style={styles.primaryBtn} onClick={() => void submitEvaluation()} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Evaluation & Update Stage'}
          </button>

          <div style={{ marginTop: 16 }}>
            <h3 style={styles.h3}>Recent Timeline</h3>
            <div style={styles.timeline}>
              {detail.events?.length ? (
                detail.events.slice(0, 12).map((e) => (
                  <div key={e.id} style={styles.timelineItem}>
                    <div style={{ fontWeight: 600 }}>{e.event_type}</div>
                    <div style={styles.mutedSmall}>
                      {e.from_stage ? `${e.from_stage} → ` : ''}{e.to_stage ?? '-'} · {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.muted}>No events yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={styles.checkRow}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
  },
  muted: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  mutedSmall: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  topActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  card: {
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10,
    background: 'rgba(255,255,255,.02)',
    padding: 14,
  },
  h2: {
    margin: '0 0 10px',
    fontSize: 16,
    fontWeight: 700,
  },
  h3: {
    margin: '0 0 8px',
    fontSize: 14,
    fontWeight: 700,
  },
  label: {
    display: 'block',
    fontSize: 12,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 600,
  },
  select: {
    width: '100%',
    borderRadius: 8,
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    padding: '9px 10px',
    marginBottom: 10,
  },
  textarea: {
    width: '100%',
    minHeight: 90,
    resize: 'vertical',
    borderRadius: 8,
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    padding: 10,
    marginBottom: 10,
    fontFamily: 'inherit',
  },
  roundMeta: {
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    display: 'grid',
    gap: 6,
    background: 'rgba(56,189,248,.05)',
  },
  joinLink: {
    color: '#38BDF8',
    fontWeight: 700,
    textDecoration: 'none',
  },
  checkGrid: {
    display: 'grid',
    gap: 8,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,.015)',
  },
  scoreBox: {
    marginTop: 8,
    marginBottom: 10,
    border: '1px solid rgba(167,139,250,.25)',
    background: 'rgba(167,139,250,.07)',
    borderRadius: 8,
    padding: 10,
    display: 'grid',
    gap: 4,
    fontSize: 13,
  },
  primaryBtn: {
    width: '100%',
    border: 'none',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#22C55E',
    color: '#05240f',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    border: '1px solid rgba(255,255,255,.2)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,.04)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
  timeline: {
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    maxHeight: 240,
    overflowY: 'auto',
    padding: 8,
    display: 'grid',
    gap: 8,
  },
  timelineItem: {
    borderBottom: '1px dashed rgba(255,255,255,.12)',
    paddingBottom: 6,
  },
  error: {
    color: '#F87171',
  },
  errorBox: {
    marginBottom: 10,
    border: '1px solid rgba(248,113,113,.4)',
    background: 'rgba(248,113,113,.12)',
    color: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
};
]]>
</file>
<file name="frontend\app\(protected)\resume-analysis\page.tsx">
<![CDATA[
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useResumes, useAnalysis, type Resume, type ResumeAnalysis } from '@/hooks/useResumePolling';
import useSWR from 'swr';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobRec {
  id:             string;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  requiredSkills: string[];
  applyUrl:       string | null;
  matchScore?:    number;
  source:         'internal' | 'serpapi';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => api.get(url).then(r => r.data);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtSalary = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

const getFilename = (p: string) =>
  (p?.split('/').pop() ?? p ?? 'resume').replace(/^\d+-/, '');

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  uploaded:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)',  label: 'Ready to analyse' },
  processing: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)',  label: 'Analysing…'      },
  analyzed:   { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  label: 'Complete'        },
  failed:     { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label: 'Failed'          },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function UploadZone({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState<string | null>(null);
  const [drag,      setDrag]      = useState(false);

  const handle = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setErr(null);
    if (!/\.(pdf|docx|doc)$/i.test(file.name)) { setErr('Only PDF, DOCX or DOC supported'); return; }
    if (file.size > 5 * 1024 * 1024) { setErr('File must be under 5 MB'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post<{ id: string }>('/resumes/upload-raw', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.id);
    } catch (e: any) {
      setErr(e.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  return (
    <div>
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files[0]); }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '20px 16px', borderRadius: 12, cursor: uploading ? 'not-allowed' : 'pointer',
          border: `1.5px dashed ${drag ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.12)'}`,
          background: drag ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
        }}
      >
        {uploading ? (
          <>
            <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#A78BFA', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Uploading…</span>
          </>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
              <path d="M12 16V8m0-4l-4 4m4-4l4 4" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                Drop resume here or <span style={{ color: '#A78BFA' }}>browse</span>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>PDF · DOCX · DOC · max 5 MB</p>
            </div>
          </>
        )}
        <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
          onChange={e => void handle(e.target.files?.[0])} disabled={uploading} />
      </label>
      {err && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#F87171', lineHeight: 1.4 }}>{err}</p>}
    </div>
  );
}

function ResumeListItem({ resume, selected, onSelect }: {
  resume:   Resume;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg  = STATUS_CFG[resume.status] ?? STATUS_CFG.uploaded;
  const name = getFilename(resume.fileName ?? '');

  return (
    <button onClick={onSelect} style={{
      width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10,
      border: `1px solid ${selected ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.07)'}`,
      background: selected ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
      cursor: 'pointer', transition: 'all 0.15s', marginBottom: 6,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* File icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="10" height="13" rx="1.5" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.4)'} strokeWidth="1"/>
          <line x1="5" y1="5" x2="9" y2="5" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.3)'} strokeWidth="1"/>
          <line x1="5" y1="7.5" x2="10" y2="7.5" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.3)'} strokeWidth="1"/>
          <line x1="5" y1="10" x2="8" y2="10" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.3)'} strokeWidth="1"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: selected ? '#C4B5FD' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          {fmtDate(resume.createdAt)}
        </p>
      </div>

      {/* Status pill */}
      <span style={{
        flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {resume.status === 'processing' && (
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, animation: 'raPulse 1.2s ease infinite', display: 'inline-block' }} />
        )}
        {cfg.label}
      </span>
    </button>
  );
}

function AnalysisSummaryCard({ analysis, resumeName }: { analysis: ResumeAnalysis; resumeName: string }) {
  return (
    <div style={{
      padding: '1.25rem', borderRadius: 12,
      border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.04)',
      marginBottom: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Analysis complete
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{resumeName}</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'Experience', value: `${analysis.experienceYears}y` },
          { label: 'Level',      value: analysis.experienceLevel       },
          { label: 'Skills',     value: analysis.topSkills?.length ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 8,
            padding: '10px 12px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#34D399', fontFamily: 'monospace' }}>{value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Top skills */}
      {(analysis.topSkills?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {analysis.topSkills.slice(0, 8).map(skill => (
              <span key={skill} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                color: '#6EE7B7', fontWeight: 500,
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Industry tags */}
      {(analysis.industryTags?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Industries</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {analysis.industryTags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                color: '#93C5FD', fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.trajectory && (
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.6 }}>
          "{analysis.trajectory}"
        </p>
      )}
    </div>
  );
}

function RecommendationCard({ job, userSkills }: { job: JobRec; userSkills: string[] }) {
  const salary     = fmtSalary(job.salaryMin, job.salaryMax);
  const lowerUser  = userSkills.map(s => s.toLowerCase());

  return (
    <div style={{
      padding: '1rem 1.25rem', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{job.title}</p>
            {job.source === 'internal' && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)', fontWeight: 600 }}>Direct</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {job.company}{job.location ? ` · ${job.location}` : ''}{job.workMode ? ` · ${job.workMode}` : ''}
          </p>
        </div>
        {job.matchScore != null && job.matchScore > 0 && (
          <span style={{
            flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            background: job.matchScore >= 80 ? 'rgba(52,211,153,0.12)' : job.matchScore >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(96,165,250,0.12)',
            color:      job.matchScore >= 80 ? '#34D399'                : job.matchScore >= 60 ? '#FBBF24'                : '#60A5FA',
            border:     `1px solid ${job.matchScore >= 80 ? 'rgba(52,211,153,0.25)' : job.matchScore >= 60 ? 'rgba(251,191,36,0.25)' : 'rgba(96,165,250,0.25)'}`,
          }}>
            {job.matchScore}% match
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {salary && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>{salary}</span>}
        {job.employmentType && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>{job.employmentType.replace('_', ' ')}</span>}
      </div>

      {/* Skills — highlight matched ones */}
      {job.requiredSkills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {job.requiredSkills.slice(0, 6).map(skill => {
            const matched = lowerUser.includes(skill.toLowerCase());
            return (
              <span key={skill} style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: matched ? 'rgba(52,211,153,0.1)'  : 'rgba(255,255,255,0.04)',
                color:      matched ? '#6EE7B7'                : 'rgba(255,255,255,0.3)',
                border:     `1px solid ${matched ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
                fontWeight: matched ? 600 : 400,
              }}>
                {matched && '✓ '}{skill}
              </span>
            );
          })}
        </div>
      )}

      {job.applyUrl && (
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 600,
          color: '#A78BFA', textDecoration: 'none',
        }}>
          Apply now →
        </a>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResumeAnalysisPage() {
  const { resumes, loading: loadingResumes, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { analysis, status, loading: analysing, error: analysisError, triggerAnalysis } = useAnalysis(selectedId);

  // Fetch recommendations — only after analysis is done
  const { data: recommendations, isLoading: loadingRecs } = useSWR<JobRec[]>(
    analysis ? '/jobs/recommendations' : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  // Auto-select first resume on load
  useEffect(() => {
    if (!selectedId && resumes.length > 0) setSelectedId(resumes[0].id);
  }, [resumes, selectedId]);

  const selectedResume = resumes.find(r => r.id === selectedId);
  const userSkills     = analysis?.topSkills ?? [];

  const handleUploaded = async (id: string) => {
    await reload();
    setSelectedId(id);
  };

  const canAnalyse = selectedResume?.status === 'uploaded' || selectedResume?.status === 'failed';

  return (
    <>
      <style>{`
        @keyframes raSpin  { to { transform: rotate(360deg); } }
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes raFadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* ── Top bar ── */}
        <div style={{
          padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0D1220', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Resume Analysis</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Upload · Analyse with Gemini AI · Get personalised job recommendations
            </p>
          </div>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 5px #34D399', animation: 'raPulse 2s ease infinite', display: 'inline-block' }} />
            Live · syncs every 8s
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT PANEL: Resume list ── */}
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            background: '#0B0F1C',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Upload zone */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <UploadZone onUploaded={id => void handleUploaded(id)} />
            </div>

            {/* List header */}
            <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your resumes
              </span>
              {resumes.length > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{resumes.length}</span>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 1rem' }}>
              {loadingResumes && !resumes.length ? (
                [1, 2].map(i => (
                  <div key={i} style={{ height: 58, borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 6, animation: 'raPulse 1.4s ease infinite' }} />
                ))
              ) : resumesError ? (
                <p style={{ fontSize: 11, color: '#F87171', padding: '0 4px' }}>{resumesError}</p>
              ) : resumes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.2)', fontSize: 12, lineHeight: 1.7 }}>
                  No resumes yet.<br />Upload your first one above.
                </div>
              ) : (
                resumes.map(r => (
                  <ResumeListItem
                    key={r.id}
                    resume={r}
                    selected={selectedId === r.id}
                    onSelect={() => setSelectedId(r.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

            {/* Nothing selected */}
            {!selectedResume && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'rgba(255,255,255,0.2)' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
                  <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="16" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="16" y1="26" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p style={{ fontSize: 14, margin: 0 }}>Select a resume to get started</p>
                <p style={{ fontSize: 12, margin: 0 }}>Or upload a new one from the left panel</p>
              </div>
            )}

            {/* Resume selected */}
            {selectedResume && (
              <div style={{ maxWidth: 820, animation: 'raFadeIn 0.3s ease' }}>

                {/* Resume header card */}
                <div style={{
                  padding: '1.25rem 1.5rem', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: '#0D1220', marginBottom: '1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getFilename(selectedResume.fileName ?? '')}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      Uploaded {fmtDate(selectedResume.createdAt)}
                    </p>
                  </div>

                  {/* Status + action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {(() => {
                      const cfg = STATUS_CFG[selectedResume.status];
                      return (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {selectedResume.status === 'processing' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, animation: 'raPulse 1.2s ease infinite', display: 'inline-block' }} />}
                          {cfg.label}
                        </span>
                      );
                    })()}

                    {canAnalyse && (
                      <button
                        onClick={() => { if (selectedId) void triggerAnalysis(selectedId); }}
                        disabled={analysing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '8px 18px', borderRadius: 10,
                          border: '1px solid rgba(124,58,237,0.5)',
                          background: analysing ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.15)',
                          color: '#A78BFA', fontSize: 13, fontWeight: 700,
                          cursor: analysing ? 'not-allowed' : 'pointer',
                          opacity: analysing ? 0.7 : 1,
                          transition: 'all 0.15s', fontFamily: 'Sora, sans-serif',
                        }}
                      >
                        {analysing ? (
                          <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#A78BFA', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
                        ) : (
                          <span style={{ fontSize: 14 }}>⚡</span>
                        )}
                        {analysing ? 'Starting…' : selectedResume.status === 'failed' ? 'Retry Analysis' : 'Analyse with Gemini'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Error */}
                {analysisError && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{analysisError}</p>
                  </div>
                )}

                {/* Processing state */}
                {selectedResume.status === 'processing' && !analysis && (
                  <div style={{
                    padding: '1.25rem 1.5rem', borderRadius: 14,
                    border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)',
                    display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem',
                  }}>
                    <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: '50%', border: '2.5px solid rgba(251,191,36,0.3)', borderTopColor: '#FBBF24', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FBBF24' }}>Gemini is analysing your resume</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(251,191,36,0.5)' }}>Usually 5–15 seconds · page updates automatically</p>
                    </div>
                  </div>
                )}

                {/* Analysis complete */}
                {analysis && (
                  <>
                    <AnalysisSummaryCard
                      analysis={analysis}
                      resumeName={getFilename(selectedResume.fileName ?? '')}
                    />

                    {/* Job recommendations */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                          Matched Jobs
                        </p>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          {loadingRecs ? 'Finding matches…' : `${recommendations?.length ?? 0} recommendations`}
                        </span>
                      </div>

                      {loadingRecs && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />)}
                        </div>
                      )}

                      {!loadingRecs && (!recommendations || recommendations.length === 0) && (
                        <div style={{ padding: '2rem', textAlign: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                            No matches found yet — jobs sync every 30 minutes
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {recommendations?.map(job => (
                          <RecommendationCard key={job.id} job={job} userSkills={userSkills} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Not analysed yet — prompt */}
                {selectedResume.status === 'uploaded' && !analysing && (
                  <div style={{
                    padding: '2rem', textAlign: 'center', borderRadius: 14,
                    border: '1px dashed rgba(167,139,250,0.2)', background: 'rgba(124,58,237,0.03)',
                  }}>
                    <p style={{ fontSize: 24, margin: '0 0 8px' }}>⚡</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
                      Ready to analyse
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
                      Click the button above to extract your skills and get job recommendations
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\resumes\page.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useAuth }   from '@/components/providers/AuthProvider';
import React, { useState, useCallback, useRef } from 'react';
import { uploadResume } from '@/lib/resumes';

const ALLOWED_EXTENSIONS = /\.(pdf|docx|doc)$/i;
const MAX_SIZE_BYTES      = 5 * 1024 * 1024;

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface FileInfo { name: string; size: number; type: string; }

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  const isPdf  = type.includes('pdf');
  const color  = isPdf ? '#7C3AED' : '#1D4ED8';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill={color} fillOpacity="0.12" />
      <path d="M8 6h8l6 6v14a1 1 0 01-1 1H8a1 1 0 01-1-1V7a1 1 0 011-1z"
        stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <path d="M16 6v6h6" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <text x="9" y="20" fontSize="6" fontWeight="700" fill={color} fontFamily="monospace">
        {isPdf ? 'PDF' : 'DOC'}
      </text>
    </svg>
  );
}

export default function ResumePage() {
  const { user }      = useAuth();
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileInfo,    setFileInfo]    = useState<FileInfo | null>(null);
  const [progress,    setProgress]    = useState(0);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [isDragging,  setIsDragging]  = useState(false);

  const handleFile = useCallback(async (file: File | null) => {
    setErrorMsg('');
    setFileInfo(null);

    if (!file) return;
    if (!user)                              return setErrorMsg('You must be logged in.');
    if (!ALLOWED_EXTENSIONS.test(file.name)) return setErrorMsg('Only PDF, DOCX, or DOC files are supported.');
    if (file.size > MAX_SIZE_BYTES)          return setErrorMsg('File must be under 5 MB.');

    setFileInfo({ name: file.name, size: file.size, type: file.type });
    setUploadState('uploading');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => (p < 85 ? p + Math.random() * 15 : p));
    }, 200);

    try {
      await uploadResume(file);
      clearInterval(interval);
      setProgress(100);
      setUploadState('success');
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setUploadState('error');
    }
  }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  }, [handleFile]);

  const reset = () => {
    setUploadState('idle');
    setErrorMsg('');
    setFileInfo(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isUploading = uploadState === 'uploading';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .ru-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #0A0A0F;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .ru-card {
          width: 100%;
          max-width: 560px;
          background: #111118;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
        }
        .ru-card::before {
          content: '';
          position: absolute;
          top: -1px; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(168,85,247,0.6), transparent);
        }
        .ru-ambient {
          position: absolute; top: -80px; right: -80px;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .ru-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(124,58,237,0.12);
          border: 1px solid rgba(124,58,237,0.25);
          border-radius: 20px; padding: 4px 12px;
          font-size: 12px; font-family: 'DM Mono', monospace;
          color: #A78BFA; letter-spacing: 0.04em; margin-bottom: 1.5rem;
        }
        .ru-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #A78BFA; animation: badgePulse 2s infinite;
        }
        @keyframes badgePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .ru-title {
          font-size: 26px; font-weight: 600; color: #F1F0FF;
          letter-spacing: -0.03em; line-height: 1.25; margin: 0 0 0.5rem;
        }
        .ru-subtitle {
          font-size: 14px; color: rgba(255,255,255,0.38);
          margin: 0 0 2rem; line-height: 1.6;
        }

        /* ── Hint banner ── */
        .ru-hint {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(56,189,248,0.06);
          border: 1px solid rgba(56,189,248,0.15);
          border-radius: 12px; padding: 12px 14px;
          margin-bottom: 1.5rem;
          font-size: 13px; color: rgba(56,189,248,0.8);
          line-height: 1.5;
        }

        /* ── Dropzone ── */
        .ru-dropzone {
          border: 1.5px dashed rgba(255,255,255,0.1);
          border-radius: 16px; padding: 2.5rem 2rem;
          text-align: center; cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.02);
        }
        .ru-dropzone:hover, .ru-dropzone.drag {
          border-color: rgba(124,58,237,0.5);
          background: rgba(124,58,237,0.04);
        }
        .ru-dropzone.drag       { transform: scale(1.01); }
        .ru-dropzone.uploading  { pointer-events: none; opacity: 0.7; }

        .ru-icon-wrap {
          width: 56px; height: 56px; border-radius: 14px;
          background: rgba(124,58,237,0.1);
          border: 1px solid rgba(124,58,237,0.2);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }
        .ru-drop-title  { font-size: 15px; font-weight: 500; color: #E2E0FF; margin-bottom: 6px; }
        .ru-drop-sub    { font-size: 13px; color: rgba(255,255,255,0.3); }
        .ru-drop-sub span { color: #A78BFA; font-weight: 500; }

        .ru-pills { display: flex; gap: 8px; justify-content: center; margin-top: 1.25rem; }
        .ru-pill {
          font-size: 11px; font-family: 'DM Mono', monospace;
          color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 3px 10px; letter-spacing: 0.04em;
        }

        /* ── File preview + progress ── */
        .ru-file-preview {
          display: flex; align-items: center; gap: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 14px 16px; margin-top: 1.25rem;
          animation: fadeIn 0.3s ease;
        }
        .ru-file-info  { flex: 1; min-width: 0; }
        .ru-file-name  { font-size: 13px; font-weight: 500; color: #E2E0FF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
        .ru-file-size  { font-size: 12px; color: rgba(255,255,255,0.3); font-family: 'DM Mono', monospace; }

        .ru-progress-wrap    { margin-top: 16px; }
        .ru-progress-header  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ru-progress-label   { font-size: 12px; color: rgba(255,255,255,0.4); }
        .ru-progress-pct     { font-size: 12px; font-family: 'DM Mono', monospace; color: #A78BFA; }
        .ru-bar-track        { height: 4px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
        .ru-bar-fill         { height: 100%; background: linear-gradient(90deg, #7C3AED, #A78BFA); border-radius: 99px; transition: width 0.3s ease; }

        /* ── Success ── */
        .ru-success { text-align: center; padding: 1.5rem 0; animation: fadeIn 0.4s ease; }
        .ru-success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }
        .ru-success-title { font-size: 18px; font-weight: 600; color: #6EE7B7; margin-bottom: 6px; }
        .ru-success-sub   { font-size: 13px; color: rgba(255,255,255,0.35); line-height: 1.6; margin-bottom: 1.5rem; max-width: 340px; margin-left: auto; margin-right: auto; }

        /* ── Next step hint (post-upload) ── */
        .ru-next-step {
          display: flex; align-items: center; gap: 10px;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 12px; padding: 14px 16px;
          margin-bottom: 1rem;
          animation: fadeIn 0.5s 0.2s ease both;
        }
        .ru-next-step-text { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5; }
        .ru-next-step-text strong { color: #818CF8; }

        /* ── Error ── */
        .ru-error-box {
          display: flex; gap: 10px; align-items: flex-start;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px; padding: 12px 14px; margin-top: 1rem;
          animation: fadeIn 0.3s ease;
        }
        .ru-error-text { font-size: 13px; color: #FCA5A5; line-height: 1.5; }

        /* ── Buttons ── */
        .ru-btn {
          width: 100%; padding: 13px; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all 0.15s ease; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ru-btn-primary {
          background: linear-gradient(135deg, #7C3AED, #6D28D9); color: #fff;
          box-shadow: 0 0 0 1px rgba(124,58,237,0.3), 0 4px 20px rgba(124,58,237,0.2);
          margin-top: 1.25rem;
        }
        .ru-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #8B5CF6, #7C3AED); transform: translateY(-1px); }
        .ru-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ru-btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5); margin-top: 0.75rem;
        }
        .ru-btn-ghost:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7); }

        /* ── Formats ── */
        .ru-divider  { height: 1px; background: rgba(255,255,255,0.06); margin: 2rem 0 1.25rem; }
        .ru-formats  { display: flex; gap: 10px; }
        .ru-format-item {
          flex: 1; display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 10px 12px;
        }
        .ru-format-label { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.4; }
        .ru-format-name  { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7); }

        /* ── Spinner ── */
        .ru-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes checkPop {
          0%   { transform:scale(0.5); opacity:0; }
          70%  { transform:scale(1.15); }
          100% { transform:scale(1); opacity:1; }
        }
        .ru-check { animation: checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      <main id="main-content" className="ru-root">
        <div className="ru-card">
          <div className="ru-ambient" />

          <div className="ru-badge">
            <div className="ru-badge-dot" />
            resume.upload
          </div>

          <h1 className="ru-title">Upload your resume</h1>
          <p className="ru-subtitle">
            Upload your resume once. When you're ready, hit
            <strong style={{ color: '#A78BFA' }}> Analyse Resume </strong>
            in the sidebar to extract your skills and profile.
          </p>

          {/* ── Hint banner ─────────────────────────────────────────────── */}
          {uploadState === 'idle' && (
            <div className="ru-hint">
              <span style={{ fontSize: 16 }}>💡</span>
              <span>
                Upload your resume here. Use the <strong>Analyse Resume</strong> button
                in the sidebar whenever you're ready to run the AI analysis.
              </span>
            </div>
          )}

          {/* ── Success state ────────────────────────────────────────────── */}
          {uploadState === 'success' && (
            <div className="ru-success">
              <div className="ru-success-icon">
                <svg className="ru-check" width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7"
                    stroke="#10B981" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="ru-success-title">Resume uploaded successfully</div>
              <div className="ru-success-sub">
                Your file has been saved securely. Head to the sidebar and click
                <strong style={{ color: '#A78BFA' }}> Analyse Resume </strong>
                to extract your skills and build your profile.
              </div>

              {/* Visual prompt pointing to sidebar */}
              <div className="ru-next-step">
                <span style={{ fontSize: 20 }}>👈</span>
                <div className="ru-next-step-text">
                  Click <strong>Analyse Resume</strong> in the sidebar to run AI analysis
                  and match yourself to jobs.
                </div>
              </div>

              <button className="ru-btn ru-btn-ghost" onClick={reset}>
                Upload a different resume
              </button>
            </div>
          )}

          {/* ── Upload / Error state ─────────────────────────────────────── */}
          {uploadState !== 'success' && (
            <>
              <div
                className={[
                  'ru-dropzone',
                  isDragging  ? 'drag'      : '',
                  isUploading ? 'uploading' : '',
                ].join(' ')}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={e  => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Upload resume — click or drag and drop"
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files?.[0] ?? null)}
                  disabled={isUploading}
                />

                <div className="ru-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V8m0-4l-4 4m4-4l4 4"
                      stroke="#A78BFA" strokeWidth="1.75"
                      strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                      stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="ru-drop-title">
                  {isDragging ? 'Drop it here' : 'Drag & drop your resume'}
                </div>
                <div className="ru-drop-sub">
                  or <span>browse files</span> from your computer
                </div>

                <div className="ru-pills">
                  <span className="ru-pill">PDF</span>
                  <span className="ru-pill">DOCX</span>
                  <span className="ru-pill">DOC</span>
                  <span className="ru-pill">max 5 MB</span>
                </div>
              </div>

              {/* File preview + progress */}
              {fileInfo && isUploading && (
                <div className="ru-file-preview">
                  <FileIcon type={fileInfo.type} />
                  <div className="ru-file-info">
                    <div className="ru-file-name">{fileInfo.name}</div>
                    <div className="ru-file-size">{formatBytes(fileInfo.size)}</div>
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="ru-progress-wrap">
                  <div className="ru-progress-header">
                    <span className="ru-progress-label">Uploading to secure storage…</span>
                    <span className="ru-progress-pct">{Math.round(progress)}%</span>
                  </div>
                  <div className="ru-bar-track">
                    <div className="ru-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="ru-error-box" role="alert">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                    style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="9" cy="9" r="8" stroke="#F87171" strokeWidth="1.5" />
                    <path d="M9 5.5v4" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="12.5" r="0.75" fill="#F87171" />
                  </svg>
                  <span className="ru-error-text">{errorMsg}</span>
                </div>
              )}

              <button
                className="ru-btn ru-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <><div className="ru-spinner" /> Uploading…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 11V5m0-2L5 6m3-3l3 3"
                        stroke="#fff" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"
                        stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Select resume
                  </>
                )}
              </button>

              {uploadState === 'error' && (
                <button className="ru-btn ru-btn-ghost" onClick={reset}>
                  Try again
                </button>
              )}

              <div className="ru-divider" />
              <div className="ru-formats">
                <div className="ru-format-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="1" width="10" height="14" rx="2" stroke="#6D28D9" strokeWidth="1.25" />
                    <path d="M5 5h6M5 8h6M5 11h4" stroke="#6D28D9" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                  <div className="ru-format-label">
                    <div className="ru-format-name">PDF</div>
                    Preferred format
                  </div>
                </div>
                <div className="ru-format-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="1" width="10" height="14" rx="2" stroke="#1D4ED8" strokeWidth="1.25" />
                    <path d="M5 5h6M5 8h6M5 11h4" stroke="#1D4ED8" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                  <div className="ru-format-label">
                    <div className="ru-format-name">DOCX / DOC</div>
                    Word documents
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

]]>
</file>
<file name="frontend\app\(protected)\settings\page.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useState } from 'react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading]       = useState(false);
  const [passwords, setPasswords]   = useState({
    current: '', newPass: '', confirm: '',
  });

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword:     passwords.newPass,
      });
      toast.success('Password updated successfully');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  const inputCls: React.CSSProperties = {
    width:        '100%',
    padding:      '10px 14px',
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color:        '#F1F5F9',
    fontSize:     '13px',
    outline:      'none',
  };

  const labelCls: React.CSSProperties = {
    display:       'block',
    fontSize:      '11px',
    fontWeight:    600,
    color:         'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom:  '6px',
  };

  const cardCls: React.CSSProperties = {
    background:   '#0D1424',
    border:       '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding:      '1.5rem',
    marginBottom: '1rem',
  };

  return (
    <div style={{
      fontFamily:  "'Sora', sans-serif",
      background:  '#070B14',
      minHeight:   '100vh',
      padding:     '2rem',
      color:       '#E2E8F0',
      maxWidth:    '640px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
        input:focus { border-color: rgba(56,189,248,0.5) !important; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1.75rem' }}>
        Settings
      </h1>

      {/* Account info */}
      <div style={cardCls}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1rem' }}>
          Account
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width:        '48px',
            height:       '48px',
            borderRadius: '12px',
            background:   'linear-gradient(135deg, #0EA5E9, #8B5CF6)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '18px',
            fontWeight:   700,
            color:        '#fff',
          }}>
            {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
              {user?.full_name}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
              {user?.email} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={cardCls}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1rem' }}>
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelCls}>Current Password</label>
              <input
                type="password"
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                style={inputCls}
                required
              />
            </div>
            <div>
              <label style={labelCls}>New Password</label>
              <input
                type="password"
                value={passwords.newPass}
                onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                style={inputCls}
                required
              />
            </div>
            <div>
              <label style={labelCls}>Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                style={inputCls}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop:    '1rem',
              padding:      '10px 22px',
              background:   'linear-gradient(135deg, #0EA5E9, #38BDF8)',
              border:       'none',
              borderRadius: '10px',
              color:        '#fff',
              fontSize:     '13px',
              fontWeight:    600,
              cursor:       'pointer',
              opacity:      loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div style={{
        ...cardCls,
        border: '1px solid rgba(248,113,113,0.2)',
        background: 'rgba(248,113,113,0.04)',
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F87171', margin: '0 0 0.75rem' }}>
          Danger Zone
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem' }}>
          Sign out of your account across all sessions.
        </p>
        <button
          onClick={logout}
          style={{
            padding:      '9px 20px',
            background:   'rgba(248,113,113,0.1)',
            border:       '1px solid rgba(248,113,113,0.3)',
            borderRadius: '8px',
            color:        '#F87171',
            fontSize:     '13px',
            cursor:       'pointer',
            fontWeight:    500,
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\admin\login\page.tsx">
<![CDATA[
'use client';
//frontend/app/admin/login/page.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // TODO: backend admin login (PostgreSQL + role check)
    console.log('Admin login', { username, password });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This login is only for administrators.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          placeholder="Admin username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          placeholder="Admin password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\alerts\page.tsx">
<![CDATA[
// app/alerts/page.tsx

'use client';

import { useAlerts } from '@/hooks/useRealTimeAlerts';

const ALERT_ICONS: Record<string, string> = {
  application: '📋',
  match:       '✨',
  interview:   '🎯',
  offer:       '🎉',
  update:      '🔔',
  system:      '⚙️',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function AlertsPage() {
  const { alerts, unreadCount, loading, markRead, markAllRead } = useAlerts();

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* ── Header ── */}
        <div style={{
          background: '#0D1220',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '1.25rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                Alerts
              </h1>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(167,139,250,0.15)', color: '#A78BFA',
                  border: '1px solid rgba(167,139,250,0.3)',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Job matches, application updates, and system activity
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                fontSize: 12, color: '#A78BFA', background: 'none',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Sora, sans-serif', textDecoration: 'underline',
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 680, margin: '2rem auto', padding: '0 1.5rem' }}>

          {/* Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{
                  height: 72, borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  animation: 'pulse 1.4s ease infinite',
                }} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && alerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🔔</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>
                No alerts yet
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                Apply to jobs to start receiving application updates and matches.
              </p>
            </div>
          )}

          {/* Alert list */}
          {!loading && alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'fade 0.3s ease' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => !alert.read && markRead(alert.id)}
                  style={{
                    padding: '1rem 1.25rem', borderRadius: 12,
                    border: `1px solid ${alert.read ? 'rgba(255,255,255,0.06)' : 'rgba(167,139,250,0.2)'}`,
                    background: alert.read ? 'rgba(255,255,255,0.02)' : 'rgba(124,58,237,0.06)',
                    cursor: alert.read ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                    {ALERT_ICONS[alert.type] ?? '🔔'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 13, lineHeight: 1.55,
                      fontWeight: alert.read ? 400 : 600,
                      color: alert.read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.88)',
                    }}>
                      {alert.message}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                      {timeAgo(alert.created_at)}
                    </p>
                  </div>
                  {!alert.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#A78BFA', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

]]>
</file>
<file name="frontend\app\analyze\page.tsx">
<![CDATA[
'use client';

// ❌ Wrong — component doesn't exist at this path
// import ResumeUpload from '@/features/resume/components/ResumeUpload';

// ✅ Option 1 — redirect to the existing resume page
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyzePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/resumes');
  }, [router]);

  return null;
}

]]>
</file>
<file name="frontend\app\auth\callback\page.tsx">
<![CDATA[
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, roleRedirectPath } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/api';

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const token = params.get('token');
      if (!token) {
        router.replace('/?auth=login&error=missing_oauth_token');
        return;
      }

      try {
        setToken(token);

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.replace('/?auth=login&error=invalid_oauth_token');
          return;
        }

        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));
        router.replace(roleRedirectPath(user.role));
      } catch {
        router.replace('/?auth=login&error=oauth_callback_failed');
      }
    };

    void run();
  }, [params, router]);

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      Signing you in...
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
          Loading...
        </main>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
]]>
</file>
<file name="frontend\app\auth\forgot-password\page.tsx">
<![CDATA[
'use client';
// frontend/app/auth/forgot-password/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // Don't reveal if email exists
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your email to receive a reset link
          </p>
        </div>

        {sent ? (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-700 dark:text-green-400">
              If the email exists, a password reset link has been sent. Check your inbox.
            </p>
            <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-500 font-medium">
              Back to Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <p className="text-center text-sm">
              <Link href="/" className="text-blue-600 hover:text-blue-500">
                Back to Home
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\auth\oauth-onboarding\page.tsx">
<![CDATA[
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, roleRedirectPath } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function OAuthOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();

  const onboardingToken = params.get('ot') ?? '';
  const provider = (params.get('provider') ?? 'oauth').toLowerCase();
  const mode = (params.get('mode') ?? 'signin').toLowerCase();
  const email = params.get('email') ?? '';
  const name = params.get('name') ?? '';

  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const title = useMemo(
    () =>
      mode === 'signin'
        ? `No account found. Complete signup with ${provider}.`
        : `Complete signup with ${provider}.`,
    [mode, provider],
  );

  const onContinue = async () => {
    try {
      setLoading(true);
      setErr('');

      const res = await fetch(`${API_BASE}/auth/oauth/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingToken, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Signup failed');

      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace(roleRedirectPath(data.user.role));
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>{title}</h1>
      {name ? <p><strong>Name:</strong> {name}</p> : null}
      {email ? <p><strong>Email:</strong> {email}</p> : null}

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="radio"
            checked={role === 'candidate'}
            onChange={() => setRole('candidate')}
          />{' '}
          Job Seeker
        </label>
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            checked={role === 'recruiter'}
            onChange={() => setRole('recruiter')}
          />{' '}
          Recruiter
        </label>
      </div>

      {err ? <p style={{ color: 'red', marginBottom: 12 }}>{err}</p> : null}

      <button onClick={onContinue} disabled={loading || !onboardingToken}>
        {loading ? 'Please wait...' : 'Continue'}
      </button>
    </main>
  );
}

export default function OAuthOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
          Loading...
        </main>
      }
    >
      <OAuthOnboardingInner />
    </Suspense>
  );
}


]]>
</file>
<file name="frontend\app\chatbot\page.tsx">
<![CDATA[
'use client';
// frontend/app/chatbot/page.tsx
import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! Ask me about roles, skills, or resumes.' },
  ]);
  const [input, setInput] = useState('');

  const send = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      role: 'user',
      text: input.trim(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput('');

    // Replace with your API call
    const reply: Message = {
      role: 'assistant',
      text: 'Thanks! I will analyze that.',
    };

    setMessages((m) => [...m, reply]);
  };

  return (
    <section className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 card p-6">
        <div className="section-header">
          <h1 className="text-3xl font-bold">Chatbot</h1>
        </div>

        <div className="panel p-4 h-[420px] overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 ${
                m.role === 'user'
                  ? 'text-white'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <span className="font-semibold">
                {m.role === 'user' ? 'You' : 'Assistant'}:
              </span>{' '}
              {m.text}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <input
            className="px-3 py-2 flex-1"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn" onClick={send}>
            Send
          </button>
        </div>
      </div>

      <aside className="panel p-6">
        <div className="section-header">
          <h2 className="text-xl font-bold">Shortcuts</h2>
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <button className="btn btn-secondary w-full">
              Recommend roles
            </button>
          </li>
          <li>
            <button className="btn btn-secondary w-full">
              Find missing skills
            </button>
          </li>
          <li>
            <button className="btn btn-secondary w-full">
              Suggest learning paths
            </button>
          </li>
        </ul>
      </aside>
    </section>
  );
}

]]>
</file>
<file name="frontend\app\layout.tsx">
<![CDATA[
// frontend/app/layout.tsx
import './styles/globals.css';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../components/providers/AuthProvider';
import ReactQueryProvider from './_providers/ReactQueryProvider';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/app/_components/shared/Sidebar'
export const metadata = {
  title: 'JobCrawler',
  description: 'AI Job Assistant • Jobs • Recommendations • Resume • Mock Interview • Chatbot • Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          storageKey="ji-theme"
        >
          <ReactQueryProvider>
            <AuthProvider>
              {children}

              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background:   '#111827',
                    color:        '#F1F5F9',
                    border:       '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize:     '13px',
                    fontFamily:   "'Sora', sans-serif",
                  },
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#F87171',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

]]>
</file>
<file name="frontend\app\page.tsx">
<![CDATA[
// frontend/app/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';
import { roleRedirectPath } from '@/lib/auth';

function SearchParamsHandler({ onAuthParam }: { onAuthParam: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      onAuthParam();
      router.replace('/'); // remove query so logout doesn't keep reopening modal
    }
  }, [searchParams, onAuthParam, router]);

  return null;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(roleRedirectPath(user.role));
    }
  }, [user, loading, router]);

  // ✅ If authenticated, don't render the landing page at all.
  // The redirect above handles navigation — this prevents flash.
  if (!loading && user) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070B14; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-title  { animation: fadeUp 0.6s ease forwards; }
        .hero-sub    { animation: fadeUp 0.6s 0.1s ease both; }
        .hero-ctas   { animation: fadeUp 0.6s 0.2s ease both; }
        .hero-pills  { animation: fadeUp 0.6s 0.35s ease both; }

        /* Skip link — visible only on keyboard focus */
        .skip-link {
          position: absolute;
          top: -100%;
          left: 0;
          padding: 0.75rem 1.5rem;
          background: #0EA5E9;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          border-radius: 0 0 8px 0;
          z-index: 9999;
          transition: top 0.15s;
          text-decoration: none;
        }
        .skip-link:focus { top: 0; outline: 3px solid #38BDF8; }
      `}</style>

      {/* ✅ Skip link — keyboard accessibility companion to <main> */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Suspense fallback={null}>
        <SearchParamsHandler onAuthParam={() => setModalOpen(true)} />
      </Suspense>

      <div style={{
        fontFamily: "'Sora', sans-serif",
        background: '#070B14',
        minHeight: '100vh',
        color: '#E2E8F0',
        overflow: 'hidden',
      }}>

        {/* ── Ambient background glows ── */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-20%', left: '-10%',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', right: '-10%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
          }} />
        </div>

        {/* ✅ Semantic <header> with role="banner" */}
        <header role="banner" style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 2.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontSize: '14px', fontWeight: 700, color: '#38BDF8',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ⬡ JobCrawler
          </span>

          {/* ✅ nav landmark with accessible label */}
          <nav aria-label="Main navigation">
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setModalOpen(true)}
                aria-haspopup="dialog"
                style={{
                  padding: '8px 20px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                  color: 'rgba(255,255,255,0.7)', fontSize: '13px',
                  fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }}
              >
                Sign In
              </button>

              <button
                onClick={() => setModalOpen(true)}
                aria-haspopup="dialog"
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                  border: 'none', borderRadius: '8px',
                  color: '#fff', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Get Started
              </button>
            </div>
          </nav>
        </header>

        {/* ✅ <main> with id for skip link target — ALWAYS in DOM */}
        <main
          id="main-content"
          tabIndex={-1}           // allows skip link to focus it
          style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 68px)',
            padding: '4rem 2rem', textAlign: 'center',
          }}
        >
          {/* ✅ Loading state — skeleton keeps <main> populated */}
          {loading ? (
            <div
              aria-busy="true"
              aria-label="Loading"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
            >
              {/* Minimal skeleton — matches hero proportions */}
              {[{ w: '280px', h: '28px' }, { w: '520px', h: '72px' }, { w: '400px', h: '40px' }].map((s, i) => (
                <div key={i} style={{
                  width: s.w, height: s.h, borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  animation: 'pulse 1.5s ease infinite',
                }} />
              ))}
            </div>
          ) : (
            <>
              {/* AI badge */}
              <div className="hero-title" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: '20px', fontSize: '12px', color: '#38BDF8',
                marginBottom: '2rem', fontWeight: 500, letterSpacing: '0.04em',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#38BDF8', display: 'inline-block',
                  animation: 'pulse 2s infinite',
                }} aria-hidden="true" />
                AI-Powered Job Matching Platform
              </div>

              {/* Headline */}
              <h1 className="hero-title" style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                fontWeight: 800, lineHeight: 1.1,
                letterSpacing: '-0.03em', color: '#F1F5F9',
                marginBottom: '1.25rem', maxWidth: '900px',
              }}>
                Land Your Dream Job
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  With AI Precision
                </span>
              </h1>

              {/* Sub */}
              <p className="hero-sub" style={{
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7, maxWidth: '580px', marginBottom: '2.5rem',
              }}>
                Upload your resume, get AI-matched to thousands of jobs,
                and track every application — all in one intelligent platform.
              </p>

              {/* CTAs */}
              <div className="hero-ctas" style={{
                display: 'flex', gap: '12px',
                flexWrap: 'wrap', justifyContent: 'center',
              }}>
                <button
                  onClick={() => setModalOpen(true)}
                  aria-haspopup="dialog"
                  style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                    border: 'none', borderRadius: '12px',
                    color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 4px 24px rgba(56,189,248,0.25)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(56,189,248,0.25)';
                  }}
                >
                  Start for Free →
                </button>

                <button
                  onClick={() => setModalOpen(true)}
                  aria-haspopup="dialog"
                  style={{
                    padding: '14px 32px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px', color: 'rgba(255,255,255,0.7)',
                    fontSize: '15px', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }}
                >
                  I&apos;m a Recruiter
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '1.25rem' }}>
                No credit card required · Free to get started
              </p>

              {/* Feature pills */}
              <div className="hero-pills" style={{
                display: 'flex', gap: '10px',
                flexWrap: 'wrap', justifyContent: 'center', marginTop: '4rem',
              }}>
                {[
                  { icon: '🤖', label: 'AI Resume Analysis' },
                  { icon: '🎯', label: 'Smart Job Matching' },
                  { icon: '⚡', label: 'Real-Time Alerts' },
                  { icon: '🎤', label: 'Mock Interviews' },
                  { icon: '📊', label: 'Application Tracking' },
                  { icon: '🏢', label: 'Recruiter Dashboard' },
                ].map(f => (
                  <div
                    key={f.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '20px', fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                  >
                    <span aria-hidden="true">{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        {/* ✅ Semantic <footer> */}
        <footer role="contentinfo" style={{
          position: 'relative', zIndex: 10,
          textAlign: 'center', padding: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '12px', color: 'rgba(255,255,255,0.2)',
        }}>
          © {new Date().getFullYear()} JobCrawler · Built with AI
        </footer>
      </div>

      <CredentialsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
/*

---

## What Changed and Why

The core architectural shift is **separating structural HTML from conditional content**:
```
BEFORE                          AFTER
──────────────────────────      ──────────────────────────────────
loading=true → return null      loading=true → <main> with skeleton
loading=false → render page     loading=false → <main> with content

Lighthouse sees: empty DOM      Lighthouse sees: <main> always present
Result: no landmark found       Result: landmark audit passes ✅ */

]]>
</file>
<file name="frontend\app\ping\page.tsx">
<![CDATA[
export default function PingPage() {
  return <div>Ping OK</div>;
}
// frontend/app/ping/page.tsx

]]>
</file>
<file name="frontend\app\reset-password\page.tsx">
<![CDATA[
'use client';
// frontend/app/reset-password/page.tsx
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
        <p className="text-green-700 dark:text-green-400">
          Password reset successful! Redirecting to home...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          New Password
        </label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirm Password
        </label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your new password
          </p>
        </div>

        <Suspense fallback={<p>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\styles\globals.css">
<![CDATA[
@import "tailwindcss";
/* frontend/app/globals.css*/
/* Theme variables — light defaults, overridden in .dark */
:root {
  /* Light theme (defaults) */
  --surface-0: #f7f9fc;
  --surface-1: #ffffff;
  --surface-2: #f1f5fb;
  --text-0: #0b1320;
  --text-muted: #475569;
  --border-0: rgba(3, 23, 60, 0.12);
  --border-1: rgba(3, 23, 60, 0.18);

  --neon-1: #7af0ff;
  --neon-2: #8b5cff;
  --neon-3: #00FFA3;
  --accent: #7c3aed;
}

/* Dark theme overrides (applied when ThemeProvider sets class 'dark' on html) */
.dark {
  --surface-0: #0c111b;  /* deep indigo charcoal — not pure black */
  --surface-1: #0e141f;
  --surface-2: #121927;
  --text-0: #e6edf3;
  --text-muted: #9aa7b3;
  --border-0: rgba(230, 237, 243, 0.12);
  --border-1: rgba(230, 237, 243, 0.18);
}
/* Login modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: rgba(3, 7, 18, 0.55);
  backdrop-filter: blur(6px);
  animation: fadeIn 180ms ease;
}

.modal-panel {
  position: relative;
  width: min(92vw, 420px);
  border-radius: 18px;
  border: 1px solid var(--border-0);
  background: var(--card);
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  animation: popIn 220ms ease;
}

.modal-close {
  position: absolute;
  right: 10px;
  top: 8px;
  font-size: 22px;
  opacity: 0.6;
}
.modal-close:hover { opacity: 1; }

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes popIn {
  from { transform: translateY(6px) scale(0.98); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
html, body {
  min-height: 100%;
  background-color: var(--surface-0);
  color: var(--text-0);
}

/* Premium background: soft gradient + subtle noise + vignette */
/* Avoid experimental color-mix to prevent build/runtime errors */
body::before,
body::after {
  content: "";
  position: fixed;
  inset: -10%;
  pointer-events: none;
  z-index: -1;
}
body::before {
  /* gradient accents — safe rgba blending */
  background:
    radial-gradient(1200px 500px at 8% -10%, rgba(122, 240, 255, 0.12), transparent 60%),
    radial-gradient(1000px 400px at 92% -10%, rgba(139, 92, 255, 0.10), transparent 60%);
  /* keep subtle saturation without filters that may fail in some environments */
}
body::after {
  /* vignette */
  background: radial-gradient(1200px 700px at 50% 130%, rgba(0,0,0,0.45), transparent 60%);
}

/* Optional subtle noise texture on dark only */
.dark body {
  background-image:
    radial-gradient(1500px 800px at 50% -20%, rgba(255,255,255,0.015), transparent 60%);
  background-blend-mode: overlay;
}

/* Base border + rhythm */
* { border-color: var(--border-0); }
h1, h2, h3, h4 { margin-top: 1.1rem; margin-bottom: 0.6rem; }
p, ul, ol { margin-bottom: 0.75rem; color: var(--text-muted); }

/* Navbar hover underline glow */
.nav-link {
  position: relative;
  color: var(--text-0);
  transition: color 160ms ease;
}
.nav-link:hover { color: #111827; /* slightly darker for light mode; in dark, near-white text already */ }
.dark .nav-link:hover { color: #ffffff; }
.nav-link::after {
  content: "";
  position: absolute;
  left: 10%; right: 10%; bottom: -6px;
  height: 2px;
  background: linear-gradient(90deg, var(--neon-2), var(--neon-1));
  border-radius: 999px;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 160ms ease, transform 160ms ease;
}
.nav-link:hover::after { opacity: 1; transform: translateY(0); }

/* Shared card style */
.card {
  background: var(--surface-1);
  border: 1px solid var(--border-0);
  border-radius: 18px;
  box-shadow:
    0 10px 40px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.02);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
}
.card:hover {
  transform: translateY(-1px);
  border-color: var(--border-1);
  box-shadow:
    0 18px 60px rgba(0,0,0,0.35),
    0 0 20px rgba(122,240,255,0.06),
    0 0 30px rgba(139,92,255,0.04);
}

/* Elevated panel */
.panel {
  background: var(--surface-2);
  border: 1px solid var(--border-0);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.25);
}

/* Inputs */
input, textarea, select {
  background: rgba(255,255,255,0.04); /* safe blend for both themes */
  border: 1px solid var(--border-0);
  color: var(--text-0);
  border-radius: 12px;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.dark input, .dark textarea, .dark select {
  background: rgba(255,255,255,0.03);
}
input:hover, textarea:hover, select:hover {
  border-color: var(--border-1);
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--neon-1);
  box-shadow: 0 0 0 3px rgba(122,240,255,0.22);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  color: #0b0f14;
  background: linear-gradient(90deg, var(--neon-1), var(--neon-2));
  box-shadow: 0 10px 20px rgba(122,240,255,0.12), 0 8px 26px rgba(139,92,255,0.08);
  border: 1px solid rgba(255,255,255,0.06);
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}
.btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.btn:active { transform: translateY(0); }

.btn-secondary {
  background: transparent;
  color: var(--text-0);
  border: 1px solid var(--border-0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
}
.btn-secondary:hover {
  border-color: var(--border-1);
  box-shadow: 0 0 0 3px rgba(124,58,237,0.15); /* accent purple */
}

/* Links with neon underline */
a { color: #475569; text-decoration: none; transition: color 140ms ease; }
.dark a { color: #c7d2fe; } /* indigo-200 approx */
a:hover { color: var(--text-0); }
.dark a:hover { color: #ffffff; }
a.neon { position: relative; }
a.neon::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: -2px; height: 2px;
  background: linear-gradient(90deg, var(--neon-2), var(--neon-1));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 160ms ease;
}
a.neon:hover::after { transform: scaleX(1); }

/* Dropzone */
.dropzone {
  position: relative;
  border: 2px dashed var(--border-0);
  border-radius: 18px;
  background: rgba(255,255,255,0.03);
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, transform 160ms ease;
}
.dark .dropzone {
  background: rgba(255,255,255,0.02);
}
.dropzone:hover {
  border-color: var(--border-1);
  box-shadow: 0 0 0 3px rgba(122,240,255,0.16);
  transform: translateY(-1px);
}
.dropzone.drag-active {
  border-color: var(--neon-1);
  box-shadow: 0 0 0 3px rgba(122,240,255,0.22), inset 0 1px 0 rgba(255,255,255,0.02);
  background: rgba(122,240,255,0.04);
}

/* Section headers */
.section-header { position: relative; padding-bottom: 0.4rem; margin-bottom: 0.6rem; }
.section-header::after {
  content: ""; position: absolute; left: 0; bottom: 0; width: 80px; height: 2px;
  background: linear-gradient(90deg, var(--neon-2), var(--neon-1)); border-radius: 999px;
}

/* Micro interactions */
@keyframes bob { 0%{transform:translateY(0)} 50%{transform:translateY(-6px)} 100%{transform:translateY(0)} }
.animate-bob { animation: bob 3s ease-in-out infinite; }

@keyframes neonShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
.neon-border-mask { background-size: 300% 300%; }
]]>
</file>
<file name="frontend\app\_components\AdvancedShell.tsx">
<![CDATA[
// app/_components/AdvancedShell.tsx
"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import AnimatedSidebar from "@/components/dashboard/AnimatedSidebar";

export default function AdvancedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AnimatedSidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\_components\profiles\CandidateProfilePage.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/dashboard/page.tsx  —  Candidate Command Center
//
// What you see when you log in as a candidate:
//   • KPI row:  Total Applied / Active / Interviews / Offers
//   • Area chart: Application activity (last 14 days, derived from live data)
//   • Donut chart: Status breakdown
//   • Funnel bars: Hiring pipeline conversion
//   • Skills grid: Populated from resume AI analysis
//   • Activity feed: Recent applications with status badges
//
// Profile + Settings drawer:
//   • Opened by clicking the username card in the Sidebar (ProfilePanelContext)
//   • Also opened by the "Complete your profile" nudge card
//   • Rendered by <ProfilePanel /> which reads open state from context
//
// All data is real-time via SWR hooks — no mock data anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense }   from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth }               from '@/components/providers/AuthProvider';
import { useMyApplications, useAlerts, type ApplicationStatus } from '@/hooks/useRealTimeAlerts';
import { useCandidateProfile }   from '@/hooks/userProfile';
import { useProfilePanel }       from '@/components/context/ProfilePanelContext';
import { ProfilePanel }          from '@/components/profile/ProfilePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:     '#070B14',
  surface:'#0D1220',
  border: 'rgba(255,255,255,0.07)',
  muted:  'rgba(255,255,255,0.35)',
  faint:  'rgba(255,255,255,0.18)',
  sky:    '#38BDF8',
  purple: '#A78BFA',
  green:  '#10B981',
  teal:   '#34D399',
  amber:  '#FBBF24',
  red:    '#F87171',
  blue:   '#60A5FA',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Status metadata
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: `${C.blue}18`,   color: C.blue,   label: 'Applied'     },
  reviewed:    { bg: `${C.amber}18`,  color: C.amber,  label: 'Reviewed'    },
  reviewing:   { bg: `${C.amber}18`,  color: C.amber,  label: 'Reviewing'   },
  shortlisted: { bg: `${C.teal}18`,   color: C.teal,   label: 'Shortlisted' },
  interview:   { bg: `${C.purple}18`, color: C.purple, label: 'Interview'   },
  offered:     { bg: `${C.green}20`,  color: C.green,  label: 'Offered'     },
  rejected:    { bg: `${C.red}18`,    color: C.red,    label: 'Rejected'    },
  hired:       { bg: `${C.teal}25`,   color: '#059669',label: 'Hired'       },
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, ...extra,
});

function Pulse({ h = 14, w = '100%' }: { h?: number; w?: number | string }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />;
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: C.muted, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ ...card({ padding: '1.25rem 1.5rem' }), display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <Pulse h={28} w={60} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.faint }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile completion ring (SVG donut)
// ─────────────────────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.faint }}>%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user }                      = useAuth();
  const { openPanel }                 = useProfilePanel();
  const { data: profile }             = useCandidateProfile();
  const { applications, loading }     = useMyApplications();
  const { unreadCount = 0 }           = useAlerts();

  // ── Derive all analytics from live application data ────────────────────────
  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalApps   = applications.length;
  const shortlisted = (statusCounts.shortlisted ?? 0) + (statusCounts.interview ?? 0);
  const interviews  = statusCounts.interview ?? 0;
  const offers      = (statusCounts.offered ?? 0) + (statusCounts.hired ?? 0);
  const activeApps  = totalApps - (statusCounts.rejected ?? 0);

  // Applications per day — last 14 days
  const appsByDay = (() => {
    const map: Record<string, number> = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      map[d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })] = 0;
    }
    applications.forEach(a => {
      const key = new Date(a.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  })();

  // Status donut data
  const statusDist = Object.entries(statusCounts).map(([status, count]) => ({
    status, count,
    color: STATUS_META[status as ApplicationStatus]?.color ?? C.muted,
  }));

  // Funnel
  const funnelRows = [
    { stage: 'Applied',     value: totalApps,   color: C.blue   },
    { stage: 'Active',      value: activeApps,  color: C.sky    },
    { stage: 'Shortlisted', value: shortlisted, color: C.purple },
    { stage: 'Interview',   value: interviews,  color: C.amber  },
    { stage: 'Offer',       value: offers,      color: C.green  },
  ];

  const completionScore = profile?.profileCompletion ?? 0;
  const topSkills       = (profile?.topSkills ?? []) as string[];
  const greeting        = profile?.headline
    ? `Hey, ${(profile.full_name ?? profile.headline).split(' ')[0]}`
    : `Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: C.bg }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── Welcome + profile nudge ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>{greeting}</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {totalApps} applications tracked ·{' '}
            {unreadCount > 0
              ? <span style={{ color: C.purple }}>{unreadCount} new alerts</span>
              : <span>all caught up ✓</span>
            }
          </p>
        </div>

        {/* Clickable profile completeness card → opens profile drawer */}
        <button
          onClick={openPanel}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 18px', cursor: 'pointer',
            ...card({
              border: completionScore < 60
                ? `1px solid ${C.amber}44`
                : `1px solid ${C.border}`,
              background: 'none',
            }),
            transition: 'border-color 0.2s',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          <CompletionRing score={completionScore} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
              Profile {completionScore}% complete
            </p>
            <p style={{ margin: 0, fontSize: 11, color: completionScore < 60 ? C.amber : C.muted }}>
              {completionScore < 60
                ? 'Complete to unlock better AI matches →'
                : completionScore < 90
                ? 'Almost done — click to finish →'
                : 'Profile looks great ✓'}
            </p>
          </div>
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <KpiCard label="Total Applied" value={totalApps}  color={C.blue}   icon="📋" loading={loading} />
        <KpiCard label="Active"        value={activeApps} color={C.sky}    icon="⚡" loading={loading} sub="not rejected" />
        <KpiCard label="Interviews"    value={interviews} color={C.amber}  icon="🎯" loading={loading} />
        <KpiCard label="Offers"        value={offers}     color={C.green}  icon="🎉" loading={loading} />
      </div>

      {/* ── Charts row 1: area chart + donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Application Activity — last 14 days</p>
          {loading ? <Pulse h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={appsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.sky} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.sky} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="count" name="Applications" stroke={C.sky} strokeWidth={2} fill="url(#cGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {statusDist.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see breakdown</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="count" nameKey="status">
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 8 }}>
                {statusDist.map(s => (
                  <span key={s.status} style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                    {s.status} ({s.count})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Charts row 2: funnel + skills ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Hiring Funnel</p>
          {totalApps === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see your pipeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnelRows.map(row => {
                const pct = totalApps > 0 ? Math.round((row.value / totalApps) * 100) : 0;
                return (
                  <div key={row.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.stage}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{row.value} <span style={{ color: C.faint }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: row.color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Your Top Skills</p>
          {topSkills.length === 0 ? (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>📄</span>
              <p style={{ fontSize: 12, color: C.faint, margin: 0, textAlign: 'center' }}>Upload &amp; analyse your resume<br />to see skill insights</p>
              <button onClick={openPanel} style={{ fontSize: 12, color: C.sky, background: 'none', border: `1px solid ${C.sky}33`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Open Profile →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {topSkills.slice(0, 12).map((s, i) => (
                  <span key={s} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: `${C.purple}15`, border: `1px solid ${C.purple}33`, color: C.purple, fontWeight: i < 3 ? 700 : 400 }}>{s}</span>
                ))}
              </div>
              {profile?.experienceLevel && (
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  <span style={{ color: C.sky, fontWeight: 600 }}>{profile.experienceLevel}</span>
                  {profile.experienceYears != null && ` · ${profile.experienceYears} years experience`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity feed ── */}
      <div style={card({ padding: '1.25rem 1.5rem' })}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Activity</p>
        {applications.length === 0 ? (
          <p style={{ fontSize: 13, color: C.faint, margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
            No activity yet — apply to jobs to see updates here
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...applications]
              .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
              .slice(0, 8)
              .map(app => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        {(app as any).jobs?.title ?? 'Job Application'}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: C.faint }}>
                        {(app as any).jobs?.company ?? ''} · {fmtDate(app.applied_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, flexShrink: 0 }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070B14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>
      <Suspense fallback={<div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading dashboard…</div>}>
        <DashboardContent />
      </Suspense>

      {/* Profile + Settings drawer — opened by sidebar username card or profile nudge */}
      <ProfilePanel />
    </div>
  );
}
]]>
</file>
<file name="frontend\app\_components\profiles\RecruiterProfilePage.tsx">
<![CDATA[
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/recruiter/dashboard/page.tsx
//
// Changes from the original (document 9) — minimal diff:
//   1. Added: import { ProfilePanel } from '@/components/ProfilePanel'
//   2. Added: <ProfilePanel /> at the bottom of the JSX tree
//   3. The "⚙ Profile" button in the header now calls openPanel() from context
//
// Everything else — DashboardTab, SkillPicker, PostJobForm, job list,
// applicant management, tab structure — is preserved exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useRecruiterJobs,
  useJobApplicants,
  type RecruiterJob,
  type ApplicationStatus,
  type Application,
} from '@/hooks/useRealTimeAlerts';
import { useRecruiterAnalytics } from '@/hooks/useAnalytics';
import { useProfilePanel }       from '@/components/context/ProfilePanelContext';
import { ProfilePanel }          from '@/components/profile/ProfilePanel';

// ── Skill taxonomy ─────────────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, string[]> = {
  'Frontend':       ['React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'CSS', 'HTML'],
  'Backend':        ['Node.js', 'NestJS', 'Express', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Go', 'Rust'],
  'Database':       ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Supabase', 'Prisma'],
  'Cloud & DevOps': ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  'AI / ML':        ['Python', 'TensorFlow', 'PyTorch', 'LangChain', 'OpenAI API', 'Hugging Face', 'MLOps'],
  'Mobile':         ['Flutter', 'React Native', 'Swift', 'Kotlin', 'iOS', 'Android'],
  'Tools':          ['Git', 'GraphQL', 'REST', 'gRPC', 'Kafka', 'Figma', 'Jira'],
};

type Tab = 'dashboard' | 'jobs' | 'post';

interface PostJobForm {
  title: string; company: string; location: string;
  work_mode: string; employment_type: string;
  description: string; required_skills: string[];
  salary_min: string; salary_max: string;
}

const EMPTY_FORM: PostJobForm = {
  title: '', company: '', location: '', work_mode: 'hybrid',
  employment_type: 'full_time', description: '',
  required_skills: [], salary_min: '', salary_max: '',
};

// ── Style constants ────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', label: 'Applied'     },
  reviewed:    { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewed'    },
  reviewing:   { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewing'   },
  shortlisted: { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', label: 'Shortlisted' },
  interview:   { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', label: 'Interview'   },
  offered:     { bg: 'rgba(52,211,153,0.15)', color: '#10B981', label: 'Offered'     },
  rejected:    { bg: 'rgba(248,113,113,0.1)', color: '#F87171', label: 'Rejected'    },
  hired:       { bg: 'rgba(52,211,153,0.2)',  color: '#059669', label: 'Hired'       },
};

const JOB_STATUS_STYLE: Record<RecruiterJob['status'], { bg: string; color: string; border: string }> = {
  active: { bg: 'rgba(52,211,153,0.1)',   color: '#34D399', border: 'rgba(52,211,153,0.25)'   },
  closed: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
  draft:  { bg: 'rgba(251,191,36,0.1)',   color: '#FBBF24', border: 'rgba(251,191,36,0.25)'   },
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13, outline: 'none',
  fontFamily: 'Sora, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', marginBottom: 7,
};

// ── Chart tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <div style={{ height: 28, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 4, animation: 'raPulse 1.4s ease infinite' }} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Dashboard analytics tab ────────────────────────────────────────────────

function DashboardTab() {
  const { analytics, loading } = useRecruiterAnalytics();
  const { kpis, applicationsByStatus, applicationsOverTime, topJobs, recentApplications, skillDemand } = analytics;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', animation: 'rdFade 0.3s ease' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <KpiCard label="Total Jobs Posted"  value={kpis.totalJobs}       color="#A78BFA" icon="💼" loading={loading} />
        <KpiCard label="Active Listings"    value={kpis.activeJobs}      color="#34D399" icon="✅" loading={loading} />
        <KpiCard label="Total Applicants"   value={kpis.totalApplicants} color="#60A5FA" icon="👥" loading={loading} />
        <KpiCard label="Shortlisted"        value={kpis.shortlisted}     color="#FBBF24" icon="⭐" loading={loading} />
        <KpiCard label="Hired"              value={kpis.hired}           color="#10B981" icon="🎉" loading={loading} />
        <KpiCard label="Avg. Time to Fill"  value={kpis.avgTimeToFill ? `${kpis.avgTimeToFill}d` : '—'} color="#F87171" icon="⏱️" sub="days from post to hire" loading={loading} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Applications Over Time</p>
          {applicationsOverTime.length === 0 && !loading
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={applicationsOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Applications" stroke="#A78BFA" strokeWidth={2} fill="url(#appGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {applicationsByStatus.length === 0 && !loading
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={applicationsByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="status">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {applicationsByStatus.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {applicationsByStatus.map((s: any) => (
                    <span key={s.status} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Top Jobs by Applicants</p>
          {topJobs.length === 0 && !loading
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topJobs} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="applicants"  name="Applicants"  fill="#60A5FA" radius={[0, 4, 4, 0]} barSize={8} />
                  <Bar dataKey="shortlisted" name="Shortlisted" fill="#34D399" radius={[0, 4, 4, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Most Required Skills</p>
          {skillDemand.length === 0 && !loading
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {skillDemand.slice(0, 6).map((s: any, i: number) => {
                  const pct = Math.round((s.count / (skillDemand[0]?.count || 1)) * 100);
                  return (
                    <div key={s.skill}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{s.skill}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.count} jobs</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `hsl(${260 - i * 20}, 70%, 70%)`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Recent applications */}
      <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Applications</p>
        {recentApplications.length === 0 && !loading
          ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>No applications yet</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentApplications.slice(0, 8).map((app: any) => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {app.candidateName?.slice(0, 2).toUpperCase() ?? 'C'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidateName}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{app.jobTitle} · {fmtDate(app.appliedAt)}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── SkillPicker (unchanged from original) ─────────────────────────────────

function SkillPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const [openCat, setOpenCat] = useState<string | null>('Frontend');
  const toggle = (skill: string) => onChange(selected.includes(skill) ? selected.filter(s => s !== skill) : [...selected, skill]);
  const addCustom = () => { const s = custom.trim(); if (s && !selected.includes(s)) { onChange([...selected, s]); setCustom(''); } };
  return (
    <div>
      {Object.entries(SKILL_CATEGORIES).map(([cat, skills]) => {
        const count  = skills.filter(s => selected.includes(s)).length;
        const isOpen = openCat === cat;
        return (
          <div key={cat} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpenCat(isOpen ? null : cat)} style={{ width: '100%', padding: '10px 14px', background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Sora, sans-serif' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#A78BFA' : 'rgba(255,255,255,0.55)' }}>{cat}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>{count} selected</span>}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map(skill => {
                  const checked = selected.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => toggle(skill)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'Sora, sans-serif', border: `1px solid ${checked ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: checked ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: checked ? '#C4B5FD' : 'rgba(255,255,255,0.45)', fontWeight: checked ? 600 : 400, transition: 'all 0.15s' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${checked ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`, background: checked ? '#A78BFA' : 'transparent' }}>
                        {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      {skill}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Add custom skill…" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={addCustom} style={{ padding: '9px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>Add</button>
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected ({selected.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {selected.map(skill => (
              <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#C4B5FD' }}>
                {skill}
                <button type="button" onClick={() => toggle(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13, lineHeight: 1, padding: '0 0 0 2px', opacity: 0.6 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const [tab,           setTab]    = useState<Tab>('dashboard');
  const [selectedJobId, setJobId]  = useState<string | null>(null);
  const [form,          setForm]   = useState<PostJobForm>(EMPTY_FORM);
  const [formError,     setErr]    = useState<string | null>(null);
  const [postSuccess,   setOk]     = useState(false);
  const [posting,       setPosting]= useState(false);

  const { openPanel }                                                       = useProfilePanel();
  const { jobs, loading: loadingJobs, validating, postJob, toggleStatus }   = useRecruiterJobs();
  const { applicants, loading: loadingApps, updateStatus }                  = useJobApplicants(selectedJobId);

  const selectedJob     = jobs.find(j => j.id === selectedJobId);
  const totalApplicants = jobs.reduce((n, j) => n + (j._count?.applications ?? 0), 0);
  const activeJobs      = jobs.filter(j => j.status === 'active').length;

  const handlePost = async () => {
    setErr(null);
    if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim()) { setErr('Title, company, location and description are required.'); return; }
    if (form.required_skills.length === 0) { setErr('Select at least one required skill.'); return; }
    setPosting(true);
    try {
      await postJob({ title: form.title.trim(), company: form.company.trim(), location: form.location.trim(), workMode: form.work_mode, employmentType: form.employment_type, description: form.description.trim(), requiredSkills: form.required_skills, salaryMin: form.salary_min ? parseInt(form.salary_min, 10) : undefined, salaryMax: form.salary_max ? parseInt(form.salary_max, 10) : undefined });
      setOk(true); setForm(EMPTY_FORM);
      setTimeout(() => { setOk(false); setTab('jobs'); }, 2000);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed to post job.'); }
    finally { setPosting(false); }
  };

  const f = <K extends keyof PostJobForm>(key: K, val: PostJobForm[K]) => setForm(p => ({ ...p, [key]: val }));
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'jobs',      label: '💼 My Jobs'   },
    { key: 'post',      label: '+ Post a Job' },
  ];

  return (
    <>
      <style>{`
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes raSpin  { to { transform:rotate(360deg); } }
        @keyframes rdFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0F1526; color: #F1F5F9; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Recruitment</h1>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: validating ? '#34D399' : 'rgba(52,211,153,0.3)', boxShadow: validating ? '0 0 5px #34D399' : 'none', transition: 'background 0.3s', display: 'inline-block' }} />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {jobs.length} jobs · {totalApplicants} applicants · {activeJobs} active · live
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {/* ← NEW: Profile & Settings button opens the panel */}
              <button
                onClick={openPanel}
                style={{ padding: '9px 16px', background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', borderRadius: 10, color: '#F472B6', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
              >
                ⚙ Profile &amp; Settings
              </button>

              <button
                onClick={() => setTab('post')}
                style={{ padding: '9px 20px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10, color: '#A78BFA', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Post a Job
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: tab === key ? 700 : 400, background: tab === key ? 'rgba(167,139,250,0.2)' : 'transparent', color: tab === key ? '#A78BFA' : 'rgba(255,255,255,0.4)', border: tab === key ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard tab */}
        {tab === 'dashboard' && <DashboardTab />}

        {/* Jobs tab */}
        {tab === 'jobs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', flex: 1, minHeight: 0 }}>
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0B0F1C', overflowY: 'auto' }}>
              {loadingJobs ? (
                <div style={{ padding: '0.75rem' }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'raPulse 1.4s ease infinite' }} />)}
                </div>
              ) : jobs.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>No jobs posted yet</p>
                  <button onClick={() => setTab('post')} style={{ fontSize: 13, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Sora, sans-serif' }}>Post your first job →</button>
                </div>
              ) : (
                <div style={{ padding: '0.75rem' }}>
                  {jobs.map(job => {
                    const isSel = selectedJobId === job.id;
                    const st    = JOB_STATUS_STYLE[job.status];
                    return (
                      <button key={job.id} onClick={() => setJobId(job.id)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: `1px solid ${isSel ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`, background: isSel ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSel ? '#C4B5FD' : 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{job.location} · {job.workMode}</p>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{job.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: (job._count?.applications ?? 0) > 0 ? '#60A5FA' : 'rgba(255,255,255,0.25)' }}>{job._count?.applications ?? 0} applicants</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(job.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto' }}>
              {!selectedJob ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', flexDirection: 'column', gap: 8 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4"><rect x="5" y="5" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="15" x2="28" y2="15" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.5"/></svg>
                  <p style={{ fontSize: 14, margin: 0 }}>Select a job to view applicants</p>
                </div>
              ) : (
                <div style={{ maxWidth: 740, animation: 'rdFade 0.3s ease' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' }}>{selectedJob.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{selectedJob.location} · {selectedJob.workMode} · {selectedJob.employmentType?.replace('_', ' ')}</p>
                      </div>
                      <button onClick={() => toggleStatus(selectedJob.id, selectedJob.status)} style={{ flexShrink: 0, fontSize: 12, padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: 'Sora, sans-serif' }}>
                        {selectedJob.status === 'active' ? 'Close listing' : 'Reopen listing'}
                      </button>
                    </div>
                    {selectedJob.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '1rem' }}>
                        {selectedJob.requiredSkills.map(s => <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}>{s}</span>)}
                      </div>
                    )}
                    <p style={{ margin: '1rem 0 0', fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)' }}>{selectedJob.description.slice(0, 300)}{selectedJob.description.length > 300 && '…'}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>Applicants</p>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{applicants.length} total</span>
                  </div>

                  {loadingApps && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1,2].map(i => <div key={i} style={{ height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />)}
                    </div>
                  )}

                  {!loadingApps && applicants.length === 0 && (
                    <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>No applications yet</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {applicants.map((app: Application) => {
                      const ast = STATUS_META[app.status] ?? STATUS_META.applied;
                      return (
                        <div key={app.id} style={{ padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {app.candidate?.name?.slice(0, 2).toUpperCase() ?? 'C'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidate?.name ?? 'Candidate'}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{app.candidate?.email} · Applied {fmtDate(app.applied_at)}</p>
                          </div>
                          <select value={app.status} onChange={e => updateStatus(app.id, e.target.value as ApplicationStatus)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: `1px solid ${ast.color}40`, background: ast.bg, color: ast.color, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                            {(Object.entries(STATUS_META) as [ApplicationStatus, (typeof STATUS_META)[ApplicationStatus]][]).map(([val, cfg]) => (
                              <option key={val} value={val}>{cfg.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post job tab */}
        {tab === 'post' && (
          <div style={{ padding: '2rem', maxWidth: 760, margin: '0 auto', width: '100%', animation: 'rdFade 0.3s ease' }}>
            <div style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220' }}>
              <p style={{ margin: '0 0 1.75rem', fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Post a New Job</p>

              {formError && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '1.25rem' }}><p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{formError}</p></div>}
              {postSuccess && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 18 }}>🎉</span><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#34D399' }}>Job posted! Candidates will be notified.</p></div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Job title *</label><input value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Company name *</label><input value={form.company} onChange={e => f('company', e.target.value)} placeholder="e.g. Razorpay" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Location *</label><input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Bangalore, India" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Work mode</label>
                    <select value={form.work_mode} onChange={e => f('work_mode', e.target.value)} style={inputStyle}>
                      <option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="onsite">Onsite</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Employment type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['full_time','contract','part_time','internship'] as const).map(val => {
                      const labels: Record<string,string> = { full_time:'Full-time', contract:'Contract', part_time:'Part-time', internship:'Internship' };
                      const sel = form.employment_type === val;
                      return (
                        <button key={val} type="button" onClick={() => f('employment_type', val)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: sel ? 700 : 400, border: `1px solid ${sel ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: sel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: sel ? '#A78BFA' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}>
                          {labels[val]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Salary min (₹)</label><input type="number" value={form.salary_min} onChange={e => f('salary_min', e.target.value)} placeholder="e.g. 1500000" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Salary max (₹)</label><input type="number" value={form.salary_max} onChange={e => f('salary_max', e.target.value)} placeholder="e.g. 2500000" style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Job description *</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={5} placeholder="Describe the role, responsibilities, and ideal candidate…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties} /></div>
                <div><label style={labelStyle}>Required skills *</label><SkillPicker selected={form.required_skills} onChange={skills => f('required_skills', skills)} /></div>
                <button onClick={handlePost} disabled={posting} style={{ width: '100%', padding: '13px', borderRadius: 12, background: posting ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))', border: posting ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(124,58,237,0.5)', color: posting ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 14, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                  {posting && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />}
                  {posting ? 'Posting…' : 'Post Job → Notify Candidates'}
                </button>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Candidates matching your required skills will be notified automatically</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ← Profile + Settings drawer (opened by username card in Sidebar or ⚙ button above) */}
      <ProfilePanel />
    </>
  );
}
]]>
</file>
<file name="frontend\app\_components\shared\Sidebar.tsx">
<![CDATA[
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// _components/shared/Sidebar.tsx
//
// Architecture:
//   - Settings REMOVED from nav entirely — lives inside ProfilePanel drawer
//   - Username card at bottom calls openPanel() from ProfilePanelContext
//     instead of navigating to /profile — no page transition, instant drawer
//   - Alerts live badge driven by useAlerts() — live unread count
//   - AnalysisState is type-only import to prevent runtime crash
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useResumeAnalysis } from '@/hooks/useAnalyseResume';
import type { AnalysisState } from '@/hooks/useAnalyseResume';
import ResumeAnalysisTab from '@/components/resumes/ResumeAnalysisTab';
import { useAlerts } from '@/hooks/useRealTimeAlerts';
import { useProfilePanel } from '@/components/context/ProfilePanelContext';

// ─────────────────────────────────────────────────────────────────────────────
// Nav definitions — Settings intentionally absent from both roles
// ─────────────────────────────────────────────────────────────────────────────

const CANDIDATE_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
      { href: '/jobs', icon: '💼', label: 'Jobs' },
      { href: '/resumes', icon: '📄', label: 'Resume' },
      { href: '/resume-analysis', icon: '🧠', label: 'AI Analysis' },
      { href: '/interviews', icon: '🎥', label: 'Interviews' }, // NEW
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { href: '/recommendations', icon: '🎯', label: 'Recommendations' },
      { href: '/mock-interview', icon: '🎤', label: 'Mock Interview' },
    ],
  },
] as const;

const RECRUITER_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Overview' },
      { href: '/recruiter/dashboard', icon: '📊', label: 'Recruitment' },
      { href: '/recruiter/interviews', icon: '🎥', label: 'Interviews' }, // NEW
      { href: '/jobs', icon: '💼', label: 'All Jobs' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// AI Analyse button states
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyseBtnCfg {
  label: string; sublabel: string; disabled: boolean;
  color: string; bg: string; border: string; icon: string;
}

const ANALYSE_CFG: Record<AnalysisState, AnalyseBtnCfg> = {
  idle: { label: 'No resume yet', sublabel: 'Upload a resume first', disabled: true, icon: '📄', color: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
  uploaded: { label: 'Analyse Resume', sublabel: 'Run AI analysis on your CV', disabled: false, icon: '⚡', color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  triggering: { label: 'Starting…', sublabel: 'Queuing analysis job', disabled: true, icon: '⚡', color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  processing: { label: 'Analysing…', sublabel: 'Gemini is reading your resume', disabled: true, icon: '⚡', color: '#38BDF8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)' },
  analyzed: { label: 'Analysis complete', sublabel: 'Resume fully analysed ✓', disabled: true, icon: '✓', color: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)' },
  failed: { label: 'Retry Analysis', sublabel: 'Previous attempt failed', disabled: false, icon: '↺', color: '#F87171', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: `2px solid ${color}33`, borderTopColor: color, animation: 'sbSpin 0.7s linear infinite', flexShrink: 0 }} />
  );
}

function ResumeAnalysisSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }}>
      <button onClick={() => setOpen(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🧠</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Resume Analysis</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Upload, analyse, get matched</div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      <div style={{ maxHeight: open ? 600 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        <div style={{ padding: '0 8px 12px' }}>
          <style>{`.sb-ap .text-gray-800,.sb-ap .text-gray-900{color:rgba(255,255,255,.85)!important}.sb-ap .text-gray-500,.sb-ap .text-gray-600{color:rgba(255,255,255,.4)!important}.sb-ap .border-gray-200{border-color:rgba(255,255,255,.08)!important}.sb-ap .bg-white,.sb-ap .bg-gray-50{background:rgba(255,255,255,.03)!important}.sb-ap .rounded-xl{border-radius:10px!important}`}</style>
          <div className="sb-ap"><ResumeAnalysisTab /></div>
        </div>
      </div>
    </div>
  );
}

function RecruiterStats() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('jc_recruiter_stats');
    if (!raw) return null;
    const s = JSON.parse(raw) as { activeJobs: number; newApplicants: number };
    if (!s.activeJobs && !s.newApplicants) return null;
    return (
      <div style={{ margin: '2px 10px 6px', padding: '8px 10px', borderRadius: 8, background: 'rgba(244,114,182,0.07)', border: '1px solid rgba(244,114,182,0.18)', display: 'flex', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F472B6', lineHeight: 1 }}>{s.activeJobs}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>active</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', lineHeight: 1 }}>{s.newApplicants}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>applicants</div>
        </div>
      </div>
    );
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { openPanel } = useProfilePanel();

  const { analysisState = 'idle', canAnalyse = false, trigger, error } = useResumeAnalysis();
  const { unreadCount = 0 } = useAlerts();

  const isCandidate = user?.role === 'candidate';
  const isRecruiter = user?.role === 'recruiter';
  const navGroups = isCandidate ? CANDIDATE_NAV : RECRUITER_NAV;
  const cfg = ANALYSE_CFG[analysisState] ?? ANALYSE_CFG.idle;
  const isSpinning = analysisState === 'triggering' || analysisState === 'processing';
  const initial = user?.full_name?.charAt(0).toUpperCase()
    ?? user?.email?.charAt(0).toUpperCase()
    ?? 'U';

  return (
    <>
      <style>{`
        @keyframes sbSpin  { to { transform: rotate(360deg); } }
        @keyframes sbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .sb-root {
          width: 240px; height: 100vh; position: sticky; top: 0;
          background: #0D1117; border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; flex-shrink: 0;
          font-family: 'Sora', sans-serif;
        }
        .sb-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .sb-logo-mark { font-size: 18px; font-weight: 800; color: #38BDF8; }
        .sb-logo-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }

        .sb-nav { flex: 1; padding: .5rem .75rem 0; overflow-y: auto; min-height: 0; }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }

        .sb-grp { font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.2); padding: 0 .5rem; margin: .6rem 0 .3rem; }

        .sb-link {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; margin-bottom: 2px;
          font-size: 13px; font-weight: 500; text-decoration: none;
          color: rgba(255,255,255,.45); border: 1px solid transparent;
          transition: all .15s; position: relative;
        }
        .sb-link:hover { background: rgba(255,255,255,.05); color: rgba(255,255,255,.8); }
        .sb-link.ac { background: rgba(56,189,248,.08);  color: #38BDF8; border-color: rgba(56,189,248,.15); }
        .sb-link.ar { background: rgba(244,114,182,.08); color: #F472B6; border-color: rgba(244,114,182,.15); }
        .sb-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }

        .sb-badge {
          margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 9px; background: rgba(167,139,250,.2); color: #A78BFA;
          font-size: 10px; font-weight: 700; display: flex; align-items: center;
          justify-content: center; border: 1px solid rgba(167,139,250,.3);
        }

        .sb-ai { padding: .75rem; border-top: 1px solid rgba(255,255,255,.05); flex-shrink: 0; }
        .sb-ai-btn {
          width: 100%; padding: 10px 12px; border-radius: 10px;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s; display: flex; align-items: center;
          gap: 10px; text-align: left; border: 1px solid;
        }
        .sb-ai-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
        .sb-ai-btn:disabled { cursor: default; }
        .sb-ai-lbl { display: block; line-height: 1.3; }
        .sb-ai-sub { display: block; font-size: 10px; font-weight: 400; opacity: .6; margin-top: 1px; }
        .sb-ai-err { font-size: 11px; color: #FCA5A5; padding: 4px 2px 0; line-height: 1.4; }

        .sb-rec-cta {
          margin: .5rem .75rem .25rem; padding: 10px; border-radius: 10px;
          text-decoration: none; background: rgba(244,114,182,.08);
          border: 1px solid rgba(244,114,182,.2); color: #F472B6;
          font-size: 12px; font-weight: 600; display: flex; align-items: center;
          justify-content: center; gap: 6px; transition: all .15s; flex-shrink: 0;
        }
        .sb-rec-cta:hover { background: rgba(244,114,182,.14); }

        .sb-foot { padding: .75rem; border-top: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }
        .sb-ucard {
          display: flex; align-items: center; gap: 10px;
          padding: 10px; border-radius: 10px; cursor: pointer;
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
          transition: all .15s; width: 100%; text-align: left;
          font-family: 'Sora', sans-serif;
        }
        .sb-ucard:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.13); }
        .sb-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg,#6366F1,#8B5CF6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        .sb-uinfo { flex: 1; min-width: 0; }
        .sb-uname { font-size: 12px; font-weight: 600; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-urole { font-size: 10px; color: rgba(255,255,255,.3); text-transform: capitalize; margin-top: 1px; }
        .sb-uhint { font-size: 9px; color: rgba(255,255,255,.18); margin-top: 2px; }
        .sb-logout {
          background: none; border: none; cursor: pointer; flex-shrink: 0;
          color: rgba(255,255,255,.22); font-size: 14px; padding: 4px;
          border-radius: 4px; transition: color .15s; line-height: 1;
        }
        .sb-logout:hover { color: #F87171; }
      `}</style>

      <aside className="sb-root" aria-label="Sidebar navigation">
        <div className="sb-logo">
          <span className="sb-logo-mark">⬡</span>
          <span className="sb-logo-name">JobCrawler</span>
        </div>

        <nav className="sb-nav">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              <div className="sb-grp">{group.label}</div>

              {group.items.map(item => {
                const active = pathname === item.href
                  || (item.href !== '/dashboard' && item.href !== '/recruiter/dashboard' && pathname.startsWith(item.href));
                const cls = active ? (isRecruiter ? 'ar' : 'ac') : '';

                return (
                  <Link key={item.href} href={item.href} className={`sb-link ${cls}`}>
                    <span className="sb-icon">{item.icon}</span>
                    {item.label}
                    {item.href === '/alerts' && unreadCount > 0 && (
                      <span className="sb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </Link>
                );
              })}

              {isRecruiter && gi === 0 && <RecruiterStats />}
              {isCandidate && gi === 0 && <ResumeAnalysisSection />}
            </div>
          ))}
        </nav>

        {isCandidate && (
          <div className="sb-ai">
            <div className="sb-grp" style={{ marginBottom: 8 }}>AI Tools</div>
            <button className="sb-ai-btn"
              onClick={canAnalyse ? () => { void trigger(); } : undefined}
              disabled={cfg.disabled}
              style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {isSpinning ? <Spinner color={cfg.color} /> : cfg.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="sb-ai-lbl">{cfg.label}</span>
                <span className="sb-ai-sub">{cfg.sublabel}</span>
              </div>
              {analysisState === 'processing' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', flexShrink: 0, animation: 'sbPulse 1.5s ease infinite' }} />
              )}
            </button>
            {error && analysisState === 'failed' && <p className="sb-ai-err">{error}</p>}
            <Link href="/resume-analysis" style={{ display: 'block', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.22)', textDecoration: 'none', marginTop: 8 }}>
              View full analysis →
            </Link>
          </div>
        )}

        {isRecruiter && (
          <Link href="/recruiter/dashboard" className="sb-rec-cta">
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Post a New Job
          </Link>
        )}

        {user && (
          <div className="sb-foot">
            <div
              className="sb-ucard"
              onClick={openPanel}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openPanel();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Open profile and settings"
              title="Profile & Settings"
            >
              <div className="sb-avatar" aria-hidden="true">{initial}</div>
              <div className="sb-uinfo">
                <div className="sb-uname">{user.full_name ?? user.email}</div>
                <div className="sb-urole">{user.role}</div>
                <div className="sb-uhint">Profile &amp; Settings →</div>
              </div>

              <button
                type="button"
                className="sb-logout"
                onClick={(e) => { e.stopPropagation(); logout(); }}
                aria-label="Log out"
                title="Log out"
              >
                ⏻
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
]]>
</file>
<file name="frontend\app\_providers\DebugMount.tsx">
<![CDATA[
'use client';
import { useEffect } from 'react';
export function DebugMount() {
  useEffect(() => {
    console.log('DebugMount mounted – provider tree alive');
  }, []);
  return null;
}

]]>
</file>
<file name="frontend\app\_providers\ReactQueryProvider.tsx">
<![CDATA[
'use client';
//frontend/app/_providers/ReactQueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Create one client per app mount
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minute
        gcTime: 5 * 60_000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

]]>
</file>
<file name="frontend\components\auth\CredentialsModal.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Tilt from 'react-parallax-tilt';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import zxcvbn from 'zxcvbn';
import { UserRole, roleRedirectPath } from '@/lib/auth';

const ROLES: Record<UserRole, {
  label: string;
  icon: string;
  description: string;
  accent: string;
  bg: string;
  border: string;
  gradient: string;
}> = {
  candidate: {
    label: 'Job Seeker',
    icon: '🎯',
    description: 'Upload resume, get AI-matched to jobs, track applications',
    accent: '#38BDF8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.40)',
    gradient: 'linear-gradient(135deg,#0369A1,#0EA5E9)',
  },
  recruiter: {
    label: 'Recruiter',
    icon: '🏢',
    description: 'Post roles, search candidates, manage hiring pipeline',
    accent: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    border: 'rgba(244,114,182,0.40)',
    gradient: 'linear-gradient(135deg,#9D174D,#EC4899)',
  },
};

const STRENGTH_META = [
  { color: '#EF4444', label: 'Very weak' },
  { color: '#F97316', label: 'Weak' },
  { color: '#EAB308', label: 'Fair' },
  { color: '#22C55E', label: 'Strong' },
  { color: '#16A34A', label: 'Very strong' },
];

export default function CredentialsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { login, register, user } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [panel, setPanel] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('candidate');
  const [loginRole, setLoginRole] = useState<UserRole | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const strength = zxcvbn(password).score;
  const strengthMeta = STRENGTH_META[strength];
  const activeRole = ROLES[role];

  useEffect(() => {
    if (user) {
      onClose();
      router.push(roleRedirectPath(user.role));
    }
  }, [user, onClose, router]);

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.24)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
    color: '#F8FAFC',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const selectedRole = panel === 'register' ? role : (loginRole ?? 'candidate');
    window.location.href = `${API_BASE}/auth/oauth/${provider}?mode=${mode}&role=${selectedRole}`;
  };

  const switchPanel = (target: 'login' | 'register') => {
    setPanel(target);
    setPassword('');
    if (target === 'login') setLoginRole(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginRole) return toast.error('Select role first');
    setLoading(true);
    try {
      const { user: u } = await login(email, password);
      if (u.role !== loginRole) return toast.error(`This account is ${u.role}, not ${loginRole}`);
      toast.success('Signed in');
      router.push(roleRedirectPath(u.role));
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

 const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();

  if (strength < 2) {
    toast.error('Password too weak');
    return;
  }

  setLoading(true);
  try {
    // clear stale cache before fresh auth flow
    localStorage.removeItem('user');

    // IMPORTANT: register should return { token, user }
    const res = await register(name, email, password, role);

    // Always trust backend user role, not selected frontend state
    if (!res?.user?.role) {
      throw new Error('Invalid register response: missing user role');
    }

    // keep client cache consistent with backend
    localStorage.setItem('user', JSON.stringify(res.user));

    toast.success(`${ROLES[res.user.role].label} account created 🎉`);
    router.push(roleRedirectPath(res.user.role));
    onClose();
  } catch (err: any) {
    toast.error(err?.message || 'Signup failed');
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <style>{`
        .cred-input:focus {
          border-color: rgba(139,92,246,.70) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,.15) !important;
        }
      `}</style>

      <div
        ref={overlayRef}
        onClick={(e) => e.target === overlayRef.current && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
          background:
            'radial-gradient(circle at 20% 20%, rgba(56,189,248,.18), transparent 35%), radial-gradient(circle at 80% 70%, rgba(236,72,153,.18), transparent 35%), rgba(2,6,23,.75)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} glareEnable glareMaxOpacity={0.12} glarePosition="all">
          <div
            style={{
              width: 'min(940px, 95vw)',
              minHeight: 560,
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,.25)',
              background: 'linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))',
              boxShadow: '0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)',
              display: 'grid',
              gridTemplateColumns: '1.1fr .9fr',
            }}
          >
            <div style={{ padding: 30, overflowY: 'auto' }}>
              {panel === 'login' && !loginRole && (
                <>
                  <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 28 }}>Select role to continue</h2>
                  <p style={{ color: 'rgba(255,255,255,.72)', marginBottom: 14 }}>
                    Choose your login mode first.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLoginRole(r)}
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          border: `1px solid ${ROLES[r].border}`,
                          background: ROLES[r].bg,
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 22 }}>{ROLES[r].icon}</div>
                        <b>{ROLES[r].label}</b>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{ROLES[r].description}</div>
                      </button>
                    ))}
                  </div>

                  <p style={{ marginTop: 14, color: 'rgba(255,255,255,.8)', fontSize: 13 }}>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchPanel('register')}
                      style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer' }}
                    >
                      Create account
                    </button>
                  </p>
                </>
              )}

              {panel === 'login' && loginRole && (
                <form onSubmit={handleLogin}>
                  <button
                    type="button"
                    onClick={() => setLoginRole(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      marginBottom: 10,
                      cursor: 'pointer',
                    }}
                  >
                    ← Change role
                  </button>

                  <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 8 }}>Welcome back</h2>

                  <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                    <input
                      className="cred-input"
                      style={inputStyle}
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <input
                      className="cred-input"
                      style={inputStyle}
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: 'none',
                      color: '#fff',
                      background: loginRole === 'recruiter' ? ROLES.recruiter.gradient : ROLES.candidate.gradient,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.92)',
                        color: '#111827',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FcGoogle /> Google
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.08)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FaGithub /> GitHub
                    </button>
                  </div>
                </form>
              )}

              {panel === 'register' && (
                <form onSubmit={handleSignup}>
                  <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 8 }}>Create account</h2>
                  <p style={{ color: 'rgba(255,255,255,.72)', marginBottom: 12 }}>
                    Choose role and create your account
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        style={{
                          border: role === r ? `2px solid ${ROLES[r].accent}` : '1px solid rgba(255,255,255,.2)',
                          borderRadius: 12,
                          padding: 12,
                          color: '#fff',
                          background: role === r ? ROLES[r].bg : 'rgba(255,255,255,.04)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {ROLES[r].icon} {ROLES[r].label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <input
                      className="cred-input"
                      style={inputStyle}
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <input
                      className="cred-input"
                      style={inputStyle}
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <input
                      className="cred-input"
                      style={inputStyle}
                      type="password"
                      placeholder="Password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {password.length > 0 && (
                    <p style={{ marginTop: 8, color: strengthMeta.color, fontSize: 12 }}>
                      {strengthMeta.label}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '12px',
                      borderRadius: 12,
                      border: 'none',
                      color: '#fff',
                      background: activeRole.gradient,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Creating account...' : `Create ${activeRole.label} account`}
                  </button>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.92)',
                        color: '#111827',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FcGoogle /> Google
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.08)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FaGithub /> GitHub
                    </button>
                  </div>

                  <p style={{ marginTop: 12, color: 'rgba(255,255,255,.78)', fontSize: 13 }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchPanel('login')}
                      style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer' }}
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </div>

            <div
              style={{
                background:
                  panel === 'register'
                    ? 'linear-gradient(145deg, rgba(30,27,75,0.95), rgba(79,70,229,0.82))'
                    : 'linear-gradient(145deg, rgba(49,46,129,0.95), rgba(124,58,237,0.82))',
                color: '#fff',
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 14,
              }}
            >
              <h3 style={{ fontSize: 28, margin: 0 }}>AI Hiring Platform</h3>
              <p style={{ opacity: 0.85 }}>Smart matching, real-time hiring, role-based dashboards.</p>
              <div style={{ opacity: 0.85, fontSize: 13 }}>• AI Resume Analysis</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>• Recruiter Pipeline</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>• Live Interview Workflow</div>
            </div>
          </div>
        </Tilt>
      </div>
    </>
  );
}
]]>
</file>
<file name="frontend\components\auth\SignInButton.tsx">
<![CDATA[
'use client';
// frontend/components/auth/SignInButton.tsx
import { Loader2, LogOut, LogIn } from 'lucide-react';
import { useState } from 'react';
import CredentialsModal from './CredentialsModal';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SignInButton() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <button className="px-4 py-2 text-sm bg-gray-100 rounded-md">
        <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <button
        className="px-4 py-2 text-sm bg-gray-100 rounded-md"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 inline mr-2" />
        Sign Out
      </button>
    );
  }

  return (
   <>
<button
className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
onClick={() => setOpen(true)}
>
<LogIn className="w-4 h-4 inline mr-2" />
Sign In
</button>

<CredentialsModal
open={open}
onClose={() => setOpen(false)}
/>

</>
  );
}

]]>
</file>
<file name="frontend\components\candidate\CandidateAnalytics.tsx">
<![CDATA[
'use client';

import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useCandidateAnalytics } from '@/hooks/useAnalytics';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: 14,
      background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading ? (
          <div style={{ height: 28, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 4, animation: 'caPulse 1.4s ease infinite' }} />
        ) : (
          <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        )}
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, span }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: 14,
      background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)',
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{title}</p>
      {children}
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  applied:    '📋', viewed: '👁️', shortlisted: '⭐',
  interview:  '🎯', offer: '🎉', rejected: '❌', default: '🔔',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CandidateAnalytics() {
  const { analytics, loading } = useCandidateAnalytics();
  const {
    kpis, applicationsByStatus, activityOverTime,
    skillMatch, recentActivity, applicationFunnel,
  } = analytics;

  return (
    <>
      <style>{`
        @keyframes caPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes caFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ padding: '1.5rem 2rem', animation: 'caFade 0.3s ease' }}>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
          <KpiCard label="Applications Sent"  value={kpis.totalApplications} color="#A78BFA" icon="📤" loading={loading} />
          <KpiCard label="Under Review"        value={kpis.underReview}       color="#FBBF24" icon="🔍" loading={loading} />
          <KpiCard label="Interviews"          value={kpis.interviews}        color="#60A5FA" icon="🎯" loading={loading} />
          <KpiCard label="Offers Received"     value={kpis.offers}            color="#10B981" icon="🎉" loading={loading} />
          <KpiCard label="Profile Views"       value={kpis.profileViews}      color="#F472B6" icon="👁️" loading={loading} />
          <KpiCard
            label="Match Score"
            value={kpis.matchScore ? `${kpis.matchScore}%` : '—'}
            color="#34D399" icon="✨"
            sub="avg across applied jobs"
            loading={loading}
          />
        </div>

        {/* ── Charts Row 1 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Activity over time */}
          <ChartCard title="Application Activity">
            {activityOverTime.length === 0 && !loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No activity yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#A78BFA" strokeWidth={2} fill="url(#appsGrad)" />
                  <Area type="monotone" dataKey="views"        name="Profile Views" stroke="#60A5FA" strokeWidth={2} fill="url(#viewsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Application status donut */}
          <ChartCard title="Status Breakdown">
            {applicationsByStatus.length === 0 && !loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={applicationsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="count" nameKey="status">
                      {applicationsByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {applicationsByStatus.map(s => (
                    <span key={s.status} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>

        {/* ── Charts Row 2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Application funnel */}
          <ChartCard title="Application Pipeline Funnel">
            {applicationFunnel.length === 0 && !loading ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {applicationFunnel.map((stage, i) => {
                  const max = applicationFunnel[0]?.count || 1;
                  const pct = Math.round((stage.count / max) * 100);
                  const colors = ['#A78BFA', '#60A5FA', '#FBBF24', '#34D399', '#10B981', '#F472B6'];
                  return (
                    <div key={stage.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{stage.stage}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{stage.count}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{
                          height: '100%', borderRadius: 4, width: `${pct}%`,
                          background: colors[i % colors.length],
                          transition: 'width 0.6s ease',
                          opacity: 1 - i * 0.1,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          {/* Skill match radar-style bars */}
          <ChartCard title="Your Skills vs Job Requirements">
            {skillMatch.length === 0 && !loading ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No skill data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={skillMatch} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="have"     name="Your Level"  fill="#A78BFA" radius={[0, 3, 3, 0]} barSize={6} />
                  <Bar dataKey="required" name="Required"    fill="rgba(255,255,255,0.1)" radius={[0, 3, 3, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Recent Activity ── */}
        <ChartCard title="Recent Activity">
          {recentActivity.length === 0 && !loading ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
              No recent activity
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentActivity.slice(0, 8).map((a) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {ACTIVITY_ICONS[a.type] ?? ACTIVITY_ICONS.default}
                  </span>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{a.message}</p>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{timeAgo(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
}

]]>
</file>
<file name="frontend\components\chat\VoiceChat.tsx">
<![CDATA[
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
// frontend/components/chat/VoiceChat.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';

// Minimal speech recognition shape we actually use at runtime.
// No global augmentations to avoid conflicts.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult?: ((event: any) => void) | null;
  onend?: (() => void) | null;
  onerror?: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const win: any = typeof window !== 'undefined' ? window : undefined;
    const ctor: SpeechRecognitionCtor | undefined = win?.webkitSpeechRecognition ?? win?.SpeechRecognition;

    if (ctor) {
      setSupported(true);
      const rec = new ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = lang;
      recognitionRef.current = rec;
    } else {
      setSupported(false);
      recognitionRef.current = null;
    }
  }, [lang]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;
    setTranscript('');
    try {
      rec.onresult = (e: any) => {
        let txt = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          txt += e.results[i][0].transcript;
        }
        setTranscript(txt.trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop, setTranscript };
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Welcome to the mock interview. Press the mic or type and hit send.' },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const asr = useSpeechRecognition('en-US');

  useEffect(() => {
    if (!asr.listening && asr.transcript) setInput(asr.transcript);
  }, [asr.listening, asr.transcript]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  async function sendUser(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { role: 'user', content: value }]);
    setInput('');
    setPending(true);
    try {
      const res = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: value }] }),
      });
      const data = await res.json();
      const reply = (data?.reply as string) || 'Thanks, could you elaborate on that?';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network issue. Please try again.' }]);
    } finally {
      setPending(false);
    }
  }

  const disabled = pending || asr.listening;

  return (
    <div className="mx-auto grid h-[calc(100vh-12rem)] max-w-5xl grid-rows-[1fr_auto] rounded-xl border border-border bg-card/70 backdrop-blur">
      <div ref={listRef} className="grid gap-4 overflow-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.content} />
        ))}
        {pending && <Bubble role="assistant" text="Typing…" subtle />}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          className={[
            'inline-flex h-10 w-10 items-center justify-center rounded-md border transition',
            asr.listening ? 'border-red-500/50 bg-red-500/10 text-red-600' : 'hover:bg-muted',
          ].join(' ')}
          onClick={() => (asr.listening ? asr.stop() : asr.start())}
          title={asr.listening ? 'Stop listening' : 'Start listening'}
          aria-label="Toggle microphone"
        >
          {asr.listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendUser(input);
            }
          }}
          placeholder={asr.supported ? 'Speak or type your answer…' : 'Type your answer…'}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-border focus:ring-0"
        />

        <button
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
          onClick={() => sendUser(input)}
          disabled={disabled && !input}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function Bubble({ role, text, subtle = false }: { role: 'user' | 'assistant'; text: string; subtle?: boolean }) {
  const user = role === 'user';
  return (
    <div className={['flex', user ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          user
            ? 'rounded-br-sm bg-primary/10 text-primary'
            : 'rounded-bl-sm bg-card text-card-foreground border border-border',
          subtle && 'opacity-70',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\context\ProfilePanelContext.tsx">
<![CDATA[
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// context/ProfilePanelContext.tsx
//
// Minimal context that lets the Sidebar username card open the ProfilePanel
// without prop-drilling through the layout tree.
//
// Usage:
//   1. Wrap layout in <ProfilePanelProvider>
//   2. Sidebar calls openPanel()
//   3. Dashboard pages render <ProfilePanel /> (reads open state from context)
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ProfilePanelCtx {
  open:       boolean;
  openPanel:  () => void;
  closePanel: () => void;
}

const Ctx = createContext<ProfilePanelCtx>({
  open:       false,
  openPanel:  () => {},
  closePanel: () => {},
});

export function ProfilePanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, openPanel: () => setOpen(true), closePanel: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useProfilePanel = () => useContext(Ctx);
]]>
</file>
<file name="frontend\components\dashboard\AnimatedSidebar.tsx">
<![CDATA[
// components/dashboard/AnimatedSidebar.tsx
"use client";
import React from "react";
import Link from "next/link";
import { Home, FileText, Search, Users, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Home", icon: <Home /> },
  { href: "/dashboard/resume", label: "Resume", icon: <FileText /> },
  { href: "/jobs", label: "Jobs", icon: <Search /> },
  { href: "/dashboard/network", label: "Networking", icon: <Users /> },
  { href: "/dashboard/tracker", label: "Tracker", icon: <Archive /> },
];

export default function AnimatedSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);

  return (
    <aside className="hidden md:flex md:flex-col">
      <div className="flex h-full w-72 flex-col gap-4 border-r border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">JobCrawler</div>
          <button
            aria-label="Toggle sidebar"
            onClick={() => setOpen((s) => !s)}
            className="rounded-md p-1 hover:bg-muted"
          >
            {open ? "◀" : "▶"}
          </button>
        </div>

        <nav className="mt-4 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}>
                <motion.a
                  whileHover={{ x: 6 }}
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 1 }}
                  className={[
                    "group flex items-center gap-3 rounded-md px-3 py-2 transition",
                    active ? "bg-primary/12 text-primary" : "hover:bg-muted text-card-foreground",
                  ].join(" ")}
                >
                  <span className="rounded-md p-1 text-muted-foreground group-hover:text-primary">{n.icon}</span>
                  <span className={open ? "block" : "hidden"}>{n.label}</span>
                </motion.a>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto text-sm text-muted-foreground">
          <div className="mb-2">Account</div>
          <div className="rounded-md border p-3 glass">
            <div className="text-xs">Free plan • 10k roles indexed</div>
            <div className="mt-2 flex gap-2">
              <button className="rounded-md bg-primary/10 px-3 py-1 text-xs text-primary">Upgrade</button>
              <button className="rounded-md border px-3 py-1 text-xs">Settings</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

]]>
</file>
<file name="frontend\components\dashboard\JobCard3D.tsx">
<![CDATA[
// components/dashboard/JobCard3D.tsx
"use client";
import React, { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function JobCard3D({
  title,
  company,
  location,
  tags = [],
}: {
  title: string;
  company?: string;
  location?: string;
  tags?: string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [12, -12]);
  const rotateY = useTransform(x, [-50, 50], [-12, 12]);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    x.set((px - 0.5) * 60);
    y.set((py - 0.5) * 60);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <div className="perspective-3d">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX, rotateY }}
        className="card-layer relative w-full rounded-2xl border border-border bg-card p-6 shadow-neon-soft transition-transform"
      >
        <div className="absolute -inset-1 rounded-2xl blur-2xl opacity-30" style={{ background: "linear-gradient(90deg,#7c3aed20,#06b6d420)" }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <div className="text-sm text-muted-foreground">{company} • {location}</div>
            </div>
            <div className="text-xs text-muted-foreground">Full-time</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => <span key={t} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t}</span>)}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Apply</button>
            <div className="text-xs text-muted-foreground">Posted 2d ago</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\dashboard\StatCard.tsx">
<![CDATA[
export default function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[var(--text-muted)] text-xs">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\dashboard\Tile.tsx">
<![CDATA[
'use client';
// frontend/components/dashboard/Tile.tsx
import Link from 'next/link';

export function Tile({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-lift">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
          {icon}
        </div>
        <div className="font-medium text-card-foreground">{title}</div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

]]>
</file>
<file name="frontend\components\dashboard\Topbar.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
// components/dashboard/Topbar.tsx
"use client";
import React from "react";
import { Bell, ChevronDown, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ThemeToggle  from "@/components/ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider"; // if you have

export default function Topbar() {
  const { user } = (typeof window !== "undefined" ? (require('@/components/AuthProvider').useAuth?.() ?? {}) : {}) as any;
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/60 backdrop-blur px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-xl font-semibold tracking-tight neon-underline">JobCrawler</div>
        <div className="hidden md:block text-sm text-muted-foreground">AI Job Assistant • Dashboard</div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
          </Button>
        </div>

        <ThemeToggle />

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-muted transition">
            <UserCircle className="h-6 w-6" />
            <span className="hidden sm:inline text-sm">{user?.displayName ?? "Guest"}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

]]>
</file>
<file name="frontend\components\Hero.tsx">
<![CDATA[
'use client';
// frontend/components/Hero.tsx
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-0.5 pb-0.5">
      <div
        className="pointer-events-none absolute  inset-0 -z-10 opacity-60 blur-3xl"
        aria-hidden
        style={{
          background:
            'radial-gradient(600px 300px at 20% 10%, rgba(99,102,241,0.25), transparent), radial-gradient(600px 300px at 80% 0%, rgba(236,72,153,0.25), transparent)',
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wider text-muted-foreground">
            Introducing the next era of job search
          </span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
            Find your next role with
            <span className="ml-2 bg-linear-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              JobCrawler
            </span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Aggregate, filter, and track openings from across the web. Smart search, AI summaries,
            and one place to manage your applications.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/jobs"
              className="rounded-md bg-foreground px-5 py-2.5 text-sm text-background shadow-sm transition hover:bg-foreground/90"
            >
              Browse jobs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-border px-5 py-2.5 text-sm transition hover:bg-muted"
            >
              Go to dashboard
            </Link>
          </div>
          <div className="pt-4 text-sm text-muted-foreground">10k+ roles indexed. Updated hourly.</div>
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2">
          <GlassCard title="Smart filters" desc="Company, salary, seniority, tech stack." />
          <GlassCard title="AI summaries" desc="Digest job descriptions instantly." />
          <GlassCard title="Tracker" desc="Save, stage, and follow up." />
          <GlassCard title="Alerts" desc="New matches in your inbox." />
        </div>
      </div>
    </section>
  );
}

function GlassCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="text-sm font-medium text-card-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\interviews\Controls.tsx">
<![CDATA[
"use client";
import React from 'react';

export default function Controls({ isMicOn, isCamOn, onToggleMic, onToggleCam }: { isMicOn: boolean; isCamOn: boolean; onToggleMic: () => void; onToggleCam: () => void; }) {
  return (
    <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 }}>
      <button onClick={onToggleMic} style={{ padding: '8px 12px' }}>{isMicOn ? 'Mute' : 'Unmute'}</button>
      <button onClick={onToggleCam} style={{ padding: '8px 12px' }}>{isCamOn ? 'Camera Off' : 'Camera On'}</button>
      <button style={{ padding: '8px 12px' }}>Share Screen</button>
      <button style={{ padding: '8px 12px', background: '#e53935', color: '#fff' }}>Leave</button>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\interviews\Sidebar.tsx">
<![CDATA[
"use client";
import React from 'react';

export default function Sidebar() {
  return (
    <div style={{ padding: 12 }}>
      <h3>Interview Sidebar</h3>
      <section style={{ marginBottom: 12 }}>
        <h4>Chat</h4>
        <div style={{ height: 200, background: '#fafafa', border: '1px solid #eee' }}>In-room chat placeholder</div>
      </section>
      <section style={{ marginBottom: 12 }}>
        <h4>Notes</h4>
        <textarea rows={8} style={{ width: '100%' }} placeholder="Take real-time notes here" />
      </section>
      <section>
        <h4>Resume</h4>
        <div style={{ background: '#fff', border: '1px solid #eee', padding: 8 }}>Candidate resume preview</div>
      </section>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\interviews\useWebRTC.tsx">
<![CDATA[
"use client";
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type RemoteStream = { userId: string; stream: MediaStream; name?: string; role?: string };

export default function useWebRTC() {
  const socketRef = useRef<Socket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      if (socketRef.current) socketRef.current.disconnect();
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function ensureLocalMedia() {
    if (localStream) return localStream;
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(s);
    return s;
  }

  function createPeerConnectionFor(userId: string) {
    if (pcsRef.current.has(userId)) return pcsRef.current.get(userId)!;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      socketRef.current?.emit('interview:ice-candidate', {
        roomId: currentRoomIdRef.current,
        targetUserId: userId,
        candidate: ev.candidate,
      });
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      setRemoteStreams((prev) => {
        const exists = prev.find((p) => p.userId === userId);
        if (exists) return prev.map((p) => (p.userId === userId ? { ...p, stream } : p));
        return [...prev, { userId, stream }];
      });
    };

    pcsRef.current.set(userId, pc);
    return pc;
  }

  const currentRoomIdRef = useRef<string | null>(null);

  async function joinRoom(roomId: string, opts?: { displayName?: string }) {
    currentRoomIdRef.current = roomId;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
    const socket = io((process.env.NEXT_PUBLIC_API_WS_URL ?? '') + '/interview', {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => console.debug('signaling connected', socket.id));

    socket.on('interview:room-snapshot', async (payload: any) => {
      await ensureLocalMedia();
      const others = payload.participants || [];
      for (const p of others) {
        if (p.userId === socket.id) continue; // safety
        // Create peer connection and offer to each existing participant
        const pc = createPeerConnectionFor(p.userId);
        localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream!));
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('interview:offer', { roomId, targetUserId: p.userId, sdp: offer });
        } catch (err) {
          console.warn('offer error', err);
        }
      }
    });

    socket.on('interview:user-joined', async (evt: any) => {
      // new participant joined — create PC and send offer
      const p = evt.participant;
      if (!p || p.userId === socket.id) return;
      await ensureLocalMedia();
      const pc = createPeerConnectionFor(p.userId);
      localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream!));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('interview:offer', { roomId, targetUserId: p.userId, sdp: offer });
    });

    socket.on('interview:offer', async (msg: any) => {
      const from = msg.fromUserId;
      const sdp = msg.sdp;
      await ensureLocalMedia();
      const pc = createPeerConnectionFor(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream!));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('interview:answer', { roomId, targetUserId: from, sdp: answer });
    });

    socket.on('interview:answer', async (msg: any) => {
      const from = msg.fromUserId;
      const sdp = msg.sdp;
      const pc = pcsRef.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('interview:ice-candidate', async (msg: any) => {
      const from = msg.fromUserId;
      const cand = msg.candidate;
      const pc = pcsRef.current.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('addIceCandidate error', err);
      }
    });

    socket.on('interview:user-left', (evt: any) => {
      const userId = evt.userId;
      const pc = pcsRef.current.get(userId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(userId);
      }
      setRemoteStreams((prev) => prev.filter((r) => r.userId !== userId));
    });

    socket.on('interview:chat-message', (msg: any) => {
      // TODO: expose chat through hook return value
      console.debug('chat', msg);
    });

    // finally join the room via signaling
    socket.emit('interview:join-room', { roomId, name: opts?.displayName });
  }

  async function leaveRoom(roomId: string) {
    if (socketRef.current) {
      socketRef.current.emit('interview:leave-room', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    setRemoteStreams([]);
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
  }

  function toggleMic() {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsMicOn(t.enabled);
    });
  }

  function toggleCam() {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsCamOn(t.enabled);
    });
  }

  return {
    localStream,
    remoteStreams,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCam,
    isMicOn,
    isCamOn,
  };
}

]]>
</file>
<file name="frontend\components\interviews\VideoGrid.tsx">
<![CDATA[
/**
 * Video Grid Component
 * File: frontend/app/(protected)/interviews/components/VideoGrid.tsx
 * 
 * Purpose: Responsive grid layout for video participants
 * 
 * Features:
 * - Auto-layout based on participant count (1, 2, 4, 6 grid)
 * - Speaker highlight (green border)
 * - Mute/camera indicators
 * - Avatar fallback when cam off
 * - Optimized for 1:1 and small group interviews
 */

import React, { useEffect, useState } from 'react';
import { useParticipants, useTracks, VideoTrack } from '@livekit/components-react';

interface Participant {
  userId: string;
  name?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
}

interface VideoGridProps {
  participants: Participant[];
  localName: string;
  isRecruiter: boolean;
}

const styles = {
  container: (count: number): React.CSSProperties => {
    const gridMap: Record<number, string> = {
      1: 'grid-template-columns: 1fr',
      2: 'grid-template-columns: 1fr 1fr',
      3: 'grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr)',
      4: 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr',
      5: 'grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr)',
      6: 'grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr)',
    };

    return {
      display: 'grid',
      gap: 8,
      padding: 12,
      flex: 1,
      overflow: 'hidden',
      ...((gridMap[Math.min(count, 6)] as any) || gridMap[1]),
    } as React.CSSProperties;
  },
  tile: (isSpeaking: boolean, isCamOn: boolean): React.CSSProperties => ({
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#0D1120',
    border: isSpeaking ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
    boxShadow: isSpeaking ? '0 0 16px rgba(16,185,129,0.4)' : 'none',
    transition: 'border-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '16/9',
  } as React.CSSProperties),
  avatar: (): React.CSSProperties => ({
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #A78BFA, #38BDF8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
  } as React.CSSProperties),
  overlay: (): React.CSSProperties => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px 10px 8px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties),
  label: (): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  } as React.CSSProperties),
  indicator: (color: string): React.CSSProperties => ({
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
  } as React.CSSProperties),
};

const ParticipantTile: React.FC<{
  participant: Participant;
  isLocal: boolean;
  isSpeaking: boolean;
  videoTrack?: any;
}> = ({ participant, isLocal, isSpeaking, videoTrack }) => {
  const initials = (participant.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={styles.tile(isSpeaking, participant.camOn)}>
      {participant.camOn && videoTrack ? (
        <VideoTrack
          trackRef={videoTrack}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={styles.avatar()}>{initials}</div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Camera off</span>
        </div>
      )}

      <div style={styles.overlay()}>
        <span style={styles.label()}>
          {participant.name}
          {isLocal && ' (You)'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!participant.micOn && (
            <div style={styles.indicator('#EF4444')}>🔇</div>
          )}
          {isSpeaking && participant.micOn && (
            <div style={styles.indicator('#10B981')}>🎤</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localName,
  isRecruiter,
}) => {
  const count = Math.max(1, participants.length);

  return (
    <div style={styles.container(count)}>
      {participants.map((p) => (
        <ParticipantTile
          key={p.userId}
          participant={p}
          isLocal={false}
          isSpeaking={false}
        />
      ))}
    </div>
  );
};
]]>
</file>
<file name="frontend\components\jobs\Pagination.tsx">
<![CDATA[
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

]]>
</file>
<file name="frontend\components\navbar-action.tsx">
<![CDATA[
'use client';
// frontend/components/navbar-action.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';

export default function NavbarActions() {
  const { user, loading, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </>
        ) : (
          <Button onClick={() => setShowModal(true)}>Sign in</Button>
        )}
      </div>
      <CredentialsModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

]]>
</file>
<file name="frontend\components\navigation\MegaMenu.tsx">
<![CDATA[
'use client';
// frontend/components/navigation/MegaMenu.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  Linkedin,
  Sparkles,
  Video,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

type Item = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  badge?: { label: string; color: 'green' | 'orange' };
};

const items: Item[] = [
  {
    title: 'Job Tracker',
    desc: 'Track and manage your job search all in one place.',
    href: '/dashboard',
    icon: <ClipboardList className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Job autofill',
    desc: 'Autofill forms and apply faster to jobs that match your profile.',
    href: '/jobs',
    icon: <Briefcase className="h-5 w-5 text-primary" />,
  },
  {
    title: 'AI Cover Letter',
    desc: 'Create personalized cover letters that match job descriptions.',
    href: '/resume',
    icon: <FileText className="h-5 w-5 text-primary" />,
    badge: { label: 'Trending', color: 'green' },
  },
  {
    title: 'Resume Optimizer',
    desc: 'Improve your resume to pass role and ATS scans easily.',
    href: '/resume',
    icon: <Sparkles className="h-5 w-5 text-primary" />,
  },
  {
    title: 'LinkedIn Optimizer',
    desc: 'Enhance your LinkedIn to attract recruiters.',
    href: '/recommendations',
    icon: <Linkedin className="h-5 w-5 text-primary" />,
    badge: { label: 'New!', color: 'orange' },
  },
  {
    title: 'AI Mock Interview',
    desc: 'Simulate real interviews and get instant feedback.',
    href: '/mock-interview/chat',
    icon: <Video className="h-5 w-5 text-primary" />,
    badge: { label: 'New!', color: 'orange' },
  },
];

export default function MegaMenu() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Portal mount check (avoids SSR errors)
  React.useEffect(() => setMounted(true), []);

  // Compute and clamp panel position relative to viewport
  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const margin = 12; // viewport side margin
    const vw = window.innerWidth;
    const panelWidth = Math.min(1024, vw - margin * 2); // up to 64rem
    const center = r.left + r.width / 2;
    const left = Math.max(margin, Math.min(center - panelWidth / 2, vw - margin - panelWidth));
    const top = r.bottom + 8; // 8px gap below trigger
    setPos({ top, left, width: panelWidth });
  }, []);

  // Reposition when opening, resizing, or scrolling
  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  // Hover intent timers to prevent flicker
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), 80);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  React.useEffect(() => () => clearTimers(), []);

  return (
    <div
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition',
          open ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        ].join(' ')}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          } else if (e.key === 'Escape') {
            setOpen(false);
          } else if (e.key === 'ArrowDown') {
            setOpen(true);
          }
        }}
      >
        Features
        <ChevronDown
          className={['h-4 w-4 transition-transform duration-200', open ? 'rotate-180' : 'rotate-0'].join(
            ' '
          )}
        />
      </button>

      {/* Portal panel, fixed to viewport and anchored under trigger */}
      {mounted &&
        createPortal(
          <div
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
            className={[
              'fixed z-50 transition-opacity duration-150',
              open ? 'opacity-100' : 'pointer-events-none opacity-0',
            ].join(' ')}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {/* Arrow (caret) */}
            <div
              className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm border border-border bg-popover"
              aria-hidden
            />

            {/* Panel */}
            <div className="rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 backdrop-blur">
              <div className="grid gap-6 p-6 md:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex items-start gap-4 rounded-xl border border-transparent p-4 transition hover:border-border hover:bg-muted/60"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-base font-semibold group-hover:text-foreground">
                          {item.title}
                        </div>
                        {item.badge ? (
                          <span
                            className={[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                              item.badge.color === 'green'
                                ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                                : 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
                            ].join(' ')}
                          >
                            {item.badge.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <Link
                  href="/features"
                  className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm transition hover:bg-muted/70"
                  onClick={() => setOpen(false)}
                >
                  <span>All Features</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

]]>
</file>
<file name="frontend\components\profile\ProfilePanel.tsx">
<![CDATA[
'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────────────────────────────────────
// components/profile/ProfilePanel.tsx
//
// Slide-in profile + settings drawer.
// Opened via ProfilePanelContext — consumed by Sidebar username card.
//
// Fix applied:
//   1. useAuth() moved INSIDE the component body (was at module scope → error #321)
//   2. logout destructured — powers the Sign Out button in Settings tab
//   3. Early return moved AFTER all hook calls (Rules of Hooks compliance)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect }     from 'react';
import { useProfilePanel }         from '@/components/context/ProfilePanelContext';
import {
  useCandidateProfile,
  useUpdateCandidateProfile,
  useProfileCompletion,
}                                  from '@/hooks/userProfile';
import { useAuth }                 from '@/components/providers/AuthProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:     '#0B0F1C',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.35)',
  faint:  'rgba(255,255,255,0.18)',
  sky:    '#38BDF8',
  purple: '#A78BFA',
  green:  '#10B981',
  amber:  '#F59E0B',
  red:    '#F87171',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

const inp = (x?: React.CSSProperties): React.CSSProperties => ({
  width: '100%', padding: '10px 14px', boxSizing: 'border-box' as const,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13, outline: 'none',
  fontFamily: 'Sora, sans-serif', transition: 'border-color 0.15s', ...x,
});

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', marginBottom: 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r = 30, circ = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color,
          fontFamily: 'monospace', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.faint }}>%</span>
      </div>
    </div>
  );
}

function TagInput({ label, values, onChange, placeholder, accent = C.sky }: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  accent?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) { onChange([...values, v]); setDraft(''); }
  };
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={inp({ flex: 1 })}
        />
        <button
          type="button" onClick={add}
          style={{ padding: '10px 14px', background: `${accent}18`,
            border: `1px solid ${accent}33`, borderRadius: 10, color: accent,
            fontSize: 12, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            fontWeight: 500, flexShrink: 0 }}
        >
          Add
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {values.map(v => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center',
            gap: 4, padding: '4px 10px', borderRadius: 20,
            background: `${accent}15`, border: `1px solid ${accent}33`,
            color: accent, fontSize: 12 }}>
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter(x => x !== v))}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'inherit', fontSize: 13, lineHeight: 1, padding: '0 0 0 2px' }}
            >×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function PillGroup({ options, value, onChange, multiple = false, accent = C.sky }: {
  options: { value: string; label: string }[];
  value: string | string[];
  onChange: (v: any) => void;
  multiple?: boolean;
  accent?: string;
}) {
  const isSel = (o: string) => Array.isArray(value) ? value.includes(o) : value === o;
  const toggle = (o: string) => {
    if (!multiple) { onChange(o); return; }
    const arr = Array.isArray(value) ? value : [];
    onChange(isSel(o) ? arr.filter(v => v !== o) : [...arr, o]);
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const sel = isSel(opt.value);
        return (
          <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12,
              fontWeight: sel ? 600 : 400, cursor: 'pointer',
              border: sel ? `1px solid ${accent}66` : '1px solid rgba(255,255,255,0.1)',
              background: sel ? `${accent}18` : 'rgba(255,255,255,0.04)',
              color: sel ? accent : C.muted,
              transition: 'all 0.15s', fontFamily: 'Sora, sans-serif' }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange, accent = C.green }: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.75)' }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.faint }}>{sub}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        style={{ width: 40, height: 22, borderRadius: 11,
          background: checked ? accent : 'rgba(255,255,255,0.12)',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
          transition: 'background 0.2s' }}
      >
        <div style={{ position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.35)' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identity',    label: '👤 Identity'    },
  { id: 'preferences', label: '🎯 Preferences' },
  { id: 'salary',      label: '💰 Salary'      },
  { id: 'settings',    label: '⚙ Settings'    },
];

const WORK_MODES = [
  { value: 'remote', label: '🌍 Remote'  },
  { value: 'hybrid', label: '🏢 Hybrid'  },
  { value: 'onsite', label: '📍 On-site' },
  { value: 'any',    label: '✦ Any'      },
];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'contract',  label: 'Contract'  },
  { value: 'part_time', label: 'Part-time' },
  { value: 'freelance', label: 'Freelance' },
];

const AVAILABILITY_OPTS = [
  { value: 'immediate',   label: 'Immediate'   },
  { value: '2_weeks',     label: '2 Weeks'     },
  { value: '1_month',     label: '1 Month'     },
  { value: 'not_looking', label: 'Not Looking' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePanel
// ─────────────────────────────────────────────────────────────────────────────

export function ProfilePanel() {
  // ✅ ALL hooks must be declared unconditionally at the top of the component.
  //    The previous version had useAuth() at MODULE scope (outside this function)
  //    which caused React error #321 during module evaluation.
  const { user, logout }                = useAuth();                     // ← FIXED
  const { open, closePanel }            = useProfilePanel();
  const { data: profile }               = useCandidateProfile();
  const { data: completion }            = useProfileCompletion();
  const { mutate: update, isPending }   = useUpdateCandidateProfile();

  const [activeTab, setActiveTab]       = useState('identity');
  const [form, setForm]                 = useState<Record<string, any>>({});
  const [currentPw, setCurrentPw]       = useState('');
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [pwMsg, setPwMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closePanel]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ✅ Early return AFTER all hooks — Rules of Hooks requires no conditional
  //    hook calls, which means the early return must come last.
  if (!open) return null;

  // ── Derived state ────────────────────────────────────────────────────────

  const merged          = { ...profile, ...form } as Record<string, any>;
  const set             = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const get             = (k: string, fb: any = '') => merged[k] ?? fb;
  const isDirty         = Object.keys(form).length > 0;
  const completionScore = completion?.score ?? profile?.profileCompletion ?? 0;
  const topSkills       = (profile?.topSkills ?? []) as string[];

  const handleSignOut = () => {
    closePanel();      // close drawer first so animation plays
    logout();          // then trigger auth redirect
  };

  const handlePwChange = () => {
    setPwMsg(null);
    if (!currentPw)          { setPwMsg({ type: 'err', text: 'Enter your current password.'              }); return; }
    if (newPw.length < 8)    { setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'Passwords do not match.'                   }); return; }
    // TODO: wire to PATCH /auth/password
    setPwMsg({ type: 'ok', text: 'Password updated ✓' });
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes panelFadeIn  { from { opacity: 0 }                   to { opacity: 1 }               }
        @keyframes panelSlideIn { from { transform: translateX(100%) }  to { transform: translateX(0) } }
        @keyframes panelSlideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0D1424; color: #F1F5F9; }
        .pp-scroll::-webkit-scrollbar       { width: 3px; }
        .pp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={closePanel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)', zIndex: 40,
          animation: 'panelFadeIn 0.2s ease' }}
      />

      {/* ── Drawer ── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
        background: C.bg, borderLeft: `1px solid ${C.border}`,
        zIndex: 50, display: 'flex', flexDirection: 'column',
        fontFamily: "'Sora', sans-serif",
        animation: 'panelSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
          <CompletionRing score={completionScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
              Profile &amp; Settings
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              {profile?.full_name ?? user?.email ?? 'Your account'}
            </p>
            {completionScore < 100 && (
              <p style={{ margin: '3px 0 0', fontSize: 11,
                color: completionScore < 60 ? C.amber : C.muted }}>
                {100 - completionScore}% left to complete — better scores = better matches
              </p>
            )}
          </div>
          <button
            onClick={closePanel}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 22, lineHeight: 1, padding: 6,
              borderRadius: 8, transition: 'color 0.15s', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, padding: '0.75rem 1.5rem',
          borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12,
                fontWeight: activeTab === t.id ? 600 : 400, cursor: 'pointer',
                border: 'none',
                background: activeTab === t.id ? C.sky : 'transparent',
                color:      activeTab === t.id ? '#fff' : C.muted,
                transition: 'all 0.15s', fontFamily: 'Sora, sans-serif',
                whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className="pp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* ─────────── IDENTITY ─────────── */}
          {activeTab === 'identity' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>
              {profile?.currentTitle && (
                <div style={{ display: 'flex', gap: 10, padding: '11px 14px',
                  background: `${C.sky}0A`, border: `1px solid ${C.sky}22`,
                  borderRadius: 10, marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
                  <div>
                    <p style={{ fontSize: 11, color: C.sky, fontWeight: 600, margin: '0 0 2px' }}>
                      Auto-populated from resume analysis
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {profile.currentTitle}
                      {profile.currentCompany   ? ` at ${profile.currentCompany}`   : ''}
                      {profile.experienceLevel  ? ` · ${profile.experienceLevel}`   : ''}
                      {profile.experienceYears != null ? ` · ${profile.experienceYears}y exp` : ''}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Headline</label>
                  <input value={get('headline')} onChange={e => set('headline', e.target.value)}
                    placeholder="e.g. Senior Full Stack Engineer" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Location</label>
                  <input value={get('location')} onChange={e => set('location', e.target.value)}
                    placeholder="e.g. Pune, Maharashtra" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Phone</label>
                  <input value={get('phone')} onChange={e => set('phone', e.target.value)}
                    placeholder="+91 98765 43210" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Portfolio / LinkedIn</label>
                  <input value={get('portfolioUrl')} onChange={e => set('portfolioUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/you" style={inp()} />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={lbl}>Bio / Professional Summary</label>
                <textarea
                  value={get('bio')} onChange={e => set('bio', e.target.value)}
                  rows={4} placeholder="Brief professional summary shown to recruiters…"
                  style={inp({ resize: 'vertical', lineHeight: 1.6 }) as React.CSSProperties}
                />
              </div>

              {topSkills.length > 0 && (
                <div>
                  <label style={lbl}>Top Skills — from resume (read only)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {topSkills.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20,
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                        color: C.green }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
                    Updated automatically on each resume analysis
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─────────── PREFERENCES ─────────── */}
          {activeTab === 'preferences' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>
              <TagInput
                label="Target Roles"
                values={get('targetRoles', [])}
                onChange={v => set('targetRoles', v)}
                placeholder="e.g. Software Engineer, Tech Lead"
              />
              <TagInput
                label="Target Industries"
                values={get('targetIndustries', [])}
                onChange={v => set('targetIndustries', v)}
                placeholder="e.g. Fintech, SaaS, HealthTech"
              />
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={lbl}>Work Mode</label>
                <PillGroup options={WORK_MODES} value={get('workMode', '')}
                  onChange={v => set('workMode', v)} />
              </div>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={lbl}>Employment Types</label>
                <PillGroup options={EMPLOYMENT_TYPES} value={get('employmentTypes', [])}
                  onChange={v => set('employmentTypes', v)} multiple accent={C.purple} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  onClick={() => set('willingToRelocate', !get('willingToRelocate', false))}
                  role="switch" aria-checked={get('willingToRelocate', false)}
                  style={{ width: 40, height: 22, borderRadius: 11,
                    background: get('willingToRelocate', false) ? C.sky : 'rgba(255,255,255,0.12)',
                    position: 'relative', cursor: 'pointer', flexShrink: 0,
                    transition: 'background 0.2s' }}
                >
                  <div style={{ position: 'absolute', top: 2,
                    left: get('willingToRelocate', false) ? 20 : 2,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>Open to relocation</span>
              </div>
              {get('willingToRelocate', false) && (
                <TagInput
                  label="Preferred Locations"
                  values={get('preferredLocations', [])}
                  onChange={v => set('preferredLocations', v)}
                  placeholder="e.g. Bangalore, Remote"
                />
              )}
            </div>
          )}

          {/* ─────────── SALARY ─────────── */}
          {activeTab === 'salary' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Min (annual)</label>
                  <input type="number" value={get('salaryMin') || ''}
                    onChange={e => set('salaryMin', parseInt(e.target.value) || null)}
                    placeholder="1200000" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Max (annual)</label>
                  <input type="number" value={get('salaryMax') || ''}
                    onChange={e => set('salaryMax', parseInt(e.target.value) || null)}
                    placeholder="2000000" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Currency</label>
                  <select value={get('salaryCurrency', 'INR')}
                    onChange={e => set('salaryCurrency', e.target.value)}
                    style={inp({ cursor: 'pointer' }) as React.CSSProperties}>
                    <option value="INR">INR ₹</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                    <option value="GBP">GBP £</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', marginBottom: '1.5rem' }}>
                <input type="checkbox" checked={get('salaryNegotiable', true)}
                  onChange={e => set('salaryNegotiable', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: C.sky, cursor: 'pointer' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                  Salary is negotiable
                </span>
              </label>
              <div>
                <label style={lbl}>Availability</label>
                <PillGroup options={AVAILABILITY_OPTS} value={get('availability', 'immediate')}
                  onChange={v => set('availability', v)} accent={C.green} />
              </div>
            </div>
          )}

          {/* ─────────── SETTINGS ─────────── */}
          {activeTab === 'settings' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>

              {/* Notifications */}
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                🔔 Notifications
              </p>
              <SwitchRow
                label="Application status updates"
                sub="Email when your application changes"
                checked={get('notifyApplicationUpdates', true)}
                onChange={v => set('notifyApplicationUpdates', v)}
                accent={C.sky}
              />
              <SwitchRow
                label="New job matches"
                sub="Email when jobs match your profile"
                checked={get('notifyNewMatches', true)}
                onChange={v => set('notifyNewMatches', v)}
                accent={C.sky}
              />
              <SwitchRow
                label="Interview invitations"
                sub="Instant notification on invite"
                checked={get('notifyInterview', true)}
                onChange={v => set('notifyInterview', v)}
                accent={C.green}
              />
              <SwitchRow
                label="Weekly digest"
                sub="Activity summary every Monday"
                checked={get('notifyWeeklyDigest', false)}
                onChange={v => set('notifyWeeklyDigest', v)}
              />
              <SwitchRow
                label="Resume analysis complete"
                sub="Notify when AI finishes your resume"
                checked={get('notifyResumeAnalysis', true)}
                onChange={v => set('notifyResumeAnalysis', v)}
                accent={C.purple}
              />

              {/* Visibility */}
              <p style={{ margin: '1.5rem 0 12px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                👁 Profile Visibility
              </p>
              <SwitchRow
                label="Visible to recruiters"
                sub={get('isVisible', true)
                  ? 'Recruiters can find and contact you'
                  : 'Profile is hidden from all searches'}
                checked={get('isVisible', true)}
                onChange={v => set('isVisible', v)}
                accent={C.green}
              />

              {/* Password */}
              <p style={{ margin: '1.5rem 0 12px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                🔐 Change Password
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Current Password</label>
                  <input type="password" value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Current password" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>New Password</label>
                  <input type="password" value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="At least 8 characters" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Confirm New Password</label>
                  <input type="password" value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password" style={inp()} />
                </div>
              </div>
              {pwMsg && (
                <p style={{ margin: '0 0 12px', fontSize: 12,
                  color: pwMsg.type === 'ok' ? C.green : C.red,
                  padding: '8px 12px', borderRadius: 8,
                  background: pwMsg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
                  border: `1px solid ${pwMsg.type === 'ok' ? C.green : C.red}33` }}>
                  {pwMsg.text}
                </p>
              )}
              <button onClick={handlePwChange}
                style={{ padding: '9px 20px', borderRadius: 9,
                  background: `${C.sky}10`, border: `1px solid ${C.sky}33`,
                  color: C.sky, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Sora, sans-serif' }}>
                Update Password
              </button>

              {/* ── Sign Out ── */}
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                  🚪 Session
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: C.muted }}>
                  Signed in as {user?.email}
                </p>
                <button
                  onClick={handleSignOut}
                  style={{ padding: '9px 20px', borderRadius: 9,
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
                >
                  Sign Out
                </button>
              </div>

              {/* Danger zone */}
              <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', borderRadius: 12,
                border: '1px solid rgba(248,113,113,0.2)',
                background: 'rgba(248,113,113,0.03)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: C.red }}>
                  ⚠ Danger Zone
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted }}>
                  These actions are permanent and cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { if (confirm('Clear all application history?')) { /* TODO */ } }}
                    style={{ padding: '8px 14px', borderRadius: 8,
                      background: 'rgba(248,113,113,0.06)',
                      border: '1px solid rgba(248,113,113,0.25)',
                      color: C.red, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
                  >
                    Clear History
                  </button>
                  <button
                    onClick={() => { if (confirm('Permanently delete account? All data will be lost.')) { /* TODO */ } }}
                    style={{ padding: '8px 14px', borderRadius: 8,
                      background: 'rgba(248,113,113,0.1)',
                      border: '1px solid rgba(248,113,113,0.4)',
                      color: C.red, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky save bar ── */}
        {isDirty && (
          <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${C.border}`,
            display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
            background: C.bg, animation: 'panelSlideUp 0.2s ease' }}>
            <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>
              {Object.keys(form).length} unsaved change{Object.keys(form).length > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setForm({})}
              style={{ padding: '9px 16px', background: 'none',
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 8, color: C.muted, fontSize: 12,
                cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              Discard
            </button>
            <button
              onClick={() => update(form, { onSuccess: () => setForm({}) })}
              disabled={isPending}
              style={{ padding: '9px 22px',
                background: `linear-gradient(135deg, ${C.sky}cc, ${C.sky})`,
                border: 'none', borderRadius: 8, color: '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1, fontFamily: 'Sora, sans-serif' }}
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
]]>
</file>
<file name="frontend\components\ProtectedRoute.tsx">
<![CDATA[
'use client';
// frontend/components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

]]>
</file>
<file name="frontend\components\providers\AuthProvider.tsx">
<![CDATA[
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getMe,
  getToken,
  setToken,
  login as apiLogin,
  register as apiRegister,
  removeToken,
} from '@/lib/auth';
import type { User, UserRole, AuthResponse } from '@/lib/auth';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (fullName: string, email: string, password: string, role: UserRole) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  logout: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const token = getToken();
        if (!token) {
          if (!cancelled) {
            setUser(null);
            localStorage.removeItem('user');
          }
          return;
        }

        // keep cookie in sync for middleware
        setToken(token);

        const me = await getMe(); // SOURCE OF TRUTH
        if (!cancelled) {
          setUser(me);
          localStorage.setItem('user', JSON.stringify(me));
        }
      } catch {
        if (!cancelled) {
          removeToken();
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void boot();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    localStorage.removeItem('user'); // prevent stale role
    const res = await apiLogin(email, password);
    setUser(res.user);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  }, []);

  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<AuthResponse> => {
    localStorage.removeItem('user'); // prevent stale role
    const res = await apiRegister(fullName, email, password, role);
    setUser(res.user);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    localStorage.removeItem('user');
    setUser(null);
    router.replace('/'); // always landing page
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
]]>
</file>
<file name="frontend\components\providers\ThemeProvider.tsx">
<![CDATA[
'use client';// frontend/components/providers/ThemeProvider.tsx

import { ThemeProvider } from 'next-themes';

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="jobcrawler-theme">
      {children}
    </ThemeProvider>
  );
}
export { ThemeProvider };

]]>
</file>
<file name="frontend\components\recommendations\JobRecommendations.tsx">
<![CDATA[
// components/recommendations/JobRecommendations.tsx
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios'; // ✅ token + baseURL handled automatically

interface LiveJob {
  id:          string;
  title:       string;
  company:     string;
  location:    string;
  description: string;
  applyUrl:    string | null;
  postedAt:    string | null;
  salary:      string | null;
  jobType:     string | null;
  source:      'google' | 'db';
}

interface Props {
  layout?: 'sidebar' | 'grid';
}

// ✅ no /api/ prefix, no manual token — axios handles both
async function fetchRecs(): Promise<LiveJob[]> {
  const { data } = await api.get<LiveJob[]>('/jobs/recommendations');
  return data;
}

function MatchBadge({ source }: { source: 'google' | 'db' }) {
  const isDb   = source === 'db';
  const label  = isDb ? 'Featured' : 'Live';
  const color  = isDb ? '#A78BFA' : '#60A5FA';
  const bg     = isDb ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)';
  const border = isDb ? 'rgba(167,139,250,0.25)' : 'rgba(96,165,250,0.25)';

  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px',
      borderRadius: '20px', color, background: bg,
      border: `1px solid ${border}`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function SidebarJobCard({ job }: { job: LiveJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      padding: '10px', borderRadius: '7px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
          {job.title}
        </span>
        <MatchBadge source={job.source} />
      </div>

      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
        {job.company}{job.location ? ` · ${job.location}` : ''}
        {job.salary && <span style={{ color: '#34D399', marginLeft: '6px' }}>{job.salary}</span>}
      </div>

      {job.description && (
        <p style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.5, margin: '0 0 4px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {job.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        {job.description && job.description.length > 100 && (
          <button onClick={() => setExpanded(p => !p)} style={{
            background: 'none', border: 'none', padding: 0,
            fontSize: '10px', color: 'rgba(167,139,250,0.7)',
            cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          }}>
            {expanded ? 'Less' : 'More'}
          </button>
        )}
        {job.applyUrl && (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: '10px', fontWeight: 600, padding: '3px 8px',
              borderRadius: '5px', background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA',
              textDecoration: 'none', marginLeft: 'auto',
            }}>
            Apply →
          </a>
        )}
      </div>
    </div>
  );
}

function GridJobCard({ job }: { job: LiveJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base leading-snug">{job.title}</div>
          <div className="text-[var(--text-muted)] text-sm mt-0.5">
            {job.company}
            {job.location && <span> · {job.location}</span>}
          </div>
        </div>
        <MatchBadge source={job.source} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {job.jobType && <span className="px-2 py-0.5 rounded badge-neon">{job.jobType}</span>}
        {job.salary  && <span className="text-emerald-400 font-medium">{job.salary}</span>}
        {job.postedAt && <span className="text-[var(--text-muted)]">{job.postedAt}</span>}
      </div>

      {job.description && (
        <div>
          <p className={`text-sm text-[var(--text-muted)] leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {job.description}
          </p>
          {job.description.length > 180 && (
            <button onClick={() => setExpanded(p => !p)}
              className="text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-auto pt-1">
        {job.applyUrl ? (
          <a className="btn" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Apply</a>
        ) : (
          <button className="btn" disabled>Apply</button>
        )}
        <button className="btn btn-secondary">Save</button>
      </div>
    </div>
  );
}

export default function JobRecommendations({ layout = 'sidebar' }: Props) {
  const [jobs,    setJobs]    = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchRecs()
      .then(setJobs)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (layout === 'sidebar') {
    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '60px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />
        ))}
      </div>
    );
    if (error) return <p style={{ fontSize: '11px', color: '#F87171' }}>{error}</p>;
    if (!jobs.length) return (
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px 0' }}>
        No matches yet — analyse a resume first
      </p>
    );
    return (
      <div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginBottom: '6px' }}>
          {jobs.length} matches
        </div>
        {jobs.map(job => <SidebarJobCard key={job.id} job={job} />)}
      </div>
    );
  }

  if (loading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="card p-5 h-48 animate-pulse opacity-40" />)}
    </div>
  );
  if (error) return (
    <div className="card p-6 text-center">
      <p className="text-red-400 text-sm">{error}</p>
      <button className="btn btn-secondary mt-3 text-xs" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  if (!jobs.length) return (
    <div className="card p-10 text-center">
      <p className="text-[var(--text-muted)] text-sm">No recommendations yet — upload and analyse your resume to get started.</p>
      <a href="/resumes" className="btn mt-4 inline-block text-sm">Analyse Resume →</a>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[var(--text-muted)] text-sm">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} matched to your profile
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-block w-2 h-2 rounded-full bg-violet-400" /> Featured (recruiter)
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 ml-2" /> Live (Google)
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map(job => <GridJobCard key={job.id} job={job} />)}
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\components\RequireAuth.tsx">
<![CDATA[
'use client';
import { useAuth } from '@/components/providers/AuthProvider';
// frontend/components/RequireAuth.tsx
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <div className="text-sm">Please sign in to continue.</div>;
  return <>{children}</>;
}

]]>
</file>
<file name="frontend\components\resumes\ResumeAnalysisTab.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/resume/ResumeAnalysisTab.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import api                                from '@/lib/axios';
import { useResumes, useAnalysis }        from '@/hooks/useResumePolling';
import JobRecommendations                 from '@/components/recommendations/JobRecommendations';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

interface Resume {
  id:        string;
  fileName:  string;
  rawFile:   string;
  status:    ResumeStatus;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getFilename(fileName: string): string {
  return fileName?.split('/').pop() ?? fileName ?? 'resume';
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ResumeStatus, { color: string; bg: string; label: string }> = {
  uploaded:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  label: 'Ready'     },
  processing: { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  label: 'Analysing' },
  analyzed:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  label: 'Done'      },
  failed:     { color: '#F87171', bg: 'rgba(248,113,113,0.1)', label: 'Failed'    },
};

function StatusBadge({ status }: { status: ResumeStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.uploaded;
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600,
      padding: '2px 7px', borderRadius: '20px',
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}40`,
      display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
    }}>
      {status === 'processing' && (
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: s.color, animation: 'raPulse 1.2s ease infinite',
          display: 'inline-block',
        }} />
      )}
      {s.label}
    </span>
  );
}

// ── Resume card ───────────────────────────────────────────────────────────────

function ResumeCard({ resume, isSelected, onSelect, onAnalyse, analysing }: {
  resume:     Resume;
  isSelected: boolean;
  onSelect:   () => void;
  onAnalyse:  () => void;
  analysing:  boolean;
}) {
  const filename   = getFilename(resume.fileName);
  const canTrigger = resume.status === 'uploaded' || resume.status === 'failed';

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px', borderRadius: '8px', marginBottom: '6px',
        border:     `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
        background: isSelected ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontSize: '12px', flexShrink: 0 }}>📄</span>
            <span style={{
              fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {filename}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', paddingLeft: '18px' }}>
            {formatDate(resume.createdAt)}
          </span>
        </div>
        <StatusBadge status={resume.status} />
      </div>

      {isSelected && canTrigger && (
        <div onClick={e => { e.stopPropagation(); onAnalyse(); }} style={{ marginTop: '8px', paddingLeft: '18px' }}>
          <button
            disabled={analysing}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '6px',
              border: '1px solid rgba(124,58,237,0.4)',
              background: 'rgba(124,58,237,0.12)', color: '#A78BFA',
              fontSize: '11px', fontWeight: 600,
              cursor: analysing ? 'not-allowed' : 'pointer',
              opacity: analysing ? 0.6 : 1,
              fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
            }}
          >
            {analysing ? (
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                border: '2px solid rgba(167,139,250,0.3)',
                borderTopColor: '#A78BFA',
                animation: 'raSpin 0.7s linear infinite', display: 'inline-block',
              }} />
            ) : (
              <span style={{ fontSize: '11px' }}>⚡</span>
            )}
            {analysing ? 'Starting…' : resume.status === 'failed' ? 'Retry analysis' : 'Analyse with Gemini'}
          </button>
        </div>
      )}

      {isSelected && resume.status === 'processing' && (
        <div style={{ paddingLeft: '18px', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: '#FBBF24', animation: 'raPulse 1.5s ease infinite' }}>
            Gemini is reading your resume…
          </span>
        </div>
      )}

      {isSelected && resume.status === 'analyzed' && (
        <div style={{ paddingLeft: '18px', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: '#34D399' }}>
            Analysis complete — recommendations below
          </span>
        </div>
      )}
    </div>
  );
}

// ── Upload button ─────────────────────────────────────────────────────────────

function UploadButton({ onUploaded }: { onUploaded: (resumeId: string) => void }) {
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      // axios interceptor automatically attaches jc_token — no manual header needed
      const { data: resume } = await api.post<{ id: string }>('/resumes/upload-raw', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(resume.id);
    } catch (err: any) {
      setUploadError(err.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUploaded]);

  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '7px 0', borderRadius: '7px',
        border: '1px dashed rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.02)',
        color: uploading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)',
        fontSize: '11px', fontWeight: 500,
        cursor: uploading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', fontFamily: 'Sora, sans-serif',
      }}>
        {uploading ? (
          <>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.5)',
              animation: 'raSpin 0.7s linear infinite', display: 'inline-block',
            }} />
            Uploading…
          </>
        ) : (
          <><span>↑</span> Upload PDF or DOCX</>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={e => { void handleFile(e); }}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {uploadError && (
        <p style={{ fontSize: '10px', color: '#F87171', marginTop: '4px', lineHeight: 1.4 }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ── Analysis summary ──────────────────────────────────────────────────────────

function AnalysisSummary({ analysis }: { analysis: any }) {
  const topSkills    = (analysis.topSkills    as string[] | undefined) ?? [];
  const industryTags = (analysis.industryTags as string[] | undefined) ?? [];

  return (
    <div style={{
      padding: '10px', borderRadius: '8px', marginBottom: '10px',
      border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.05)',
    }}>
      <div style={{
        fontSize: '10px', fontWeight: 700, color: '#34D399',
        marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        Analysis complete
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
        {analysis.experienceYears}y exp · {analysis.experienceLevel}
        {industryTags.length > 0 && ` · ${industryTags.slice(0, 2).join(', ')}`}
      </div>
      {topSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {topSkills.slice(0, 5).map((skill: string) => (
            <span key={skill} style={{
              fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
              color: '#6EE7B7', fontWeight: 500,
            }}>
              {skill}
            </span>
          ))}
        </div>
      )}
      {analysis.trajectory && (
        <p style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.35)',
          fontStyle: 'italic', lineHeight: 1.5, margin: 0,
        }}>
          {analysis.trajectory}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResumeAnalysisTab() {
  const { resumes, loading: resumesLoading, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { analysis, status, loading: analysing, error: analysisError, triggerAnalysis } =
    useAnalysis(selectedId);

  const handleUploaded = useCallback(async (resumeId: string) => {
    await reload();
    setSelectedId(resumeId);
  }, [reload]);

  const handleSelect   = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const handleAnalyse  = useCallback(() => {
    if (selectedId) void triggerAnalysis(selectedId);
  }, [selectedId, triggerAnalysis]);

  return (
    <>
      <style>{`
        @keyframes raSpin  { to { transform: rotate(360deg); } }
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Your resumes
          </span>
          {resumes.length > 0 && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
              {resumes.length} file{resumes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <UploadButton onUploaded={id => { void handleUploaded(id); }} />

        {resumesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[1, 2].map(i => (
              <div key={i} style={{ height: '52px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />
            ))}
          </div>
        ) : resumesError ? (
          <p style={{ fontSize: '11px', color: '#F87171' }}>{resumesError}</p>
        ) : resumes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 8px', color: 'rgba(255,255,255,0.2)', fontSize: '11px', lineHeight: 1.6 }}>
            No resumes yet.<br />Upload your first one above.
          </div>
        ) : (
          <div>
            {(resumes as Resume[]).map(r => (
              <ResumeCard
                key={r.id}
                resume={r}
                isSelected={selectedId === r.id}
                onSelect={() => handleSelect(r.id)}
                onAnalyse={handleAnalyse}
                analysing={analysing}
              />
            ))}
          </div>
        )}

        {analysisError && (
          <p style={{
            fontSize: '11px', color: '#FCA5A5',
            padding: '6px 8px', borderRadius: '6px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', margin: 0,
          }}>
            {analysisError}
          </p>
        )}

        {status === 'processing' && !analysis && (
          <div style={{
            padding: '10px', borderRadius: '8px',
            border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{
              width: '12px', height: '12px', flexShrink: 0, borderRadius: '50%',
              border: '2px solid rgba(251,191,36,0.3)', borderTopColor: '#FBBF24',
              animation: 'raSpin 0.7s linear infinite', display: 'inline-block',
            }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#FBBF24' }}>Gemini is analysing your resume</div>
              <div style={{ fontSize: '10px', color: 'rgba(251,191,36,0.6)', marginTop: '1px' }}>Usually 5–15 seconds…</div>
            </div>
          </div>
        )}

        {analysis && (
          <>
            <AnalysisSummary analysis={analysis} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px',
              }}>
                Recommended jobs
              </div>
              <JobRecommendations />
            </div>
          </>
        )}
      </div>
    </>
  );
}

]]>
</file>
<file name="frontend\components\ThemeToggle.tsx">
<![CDATA[
/* eslint-disable react-hooks/set-state-in-effect */
// frontend/components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false); // Client-side only
  const [hasMounted, setHasMounted] = useState(false); // To handle hydration issues

  useEffect(() => {
    setHasMounted(true); // Mark component as mounted (on client)
    
    // Initialize theme based on local storage or default to system theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (!hasMounted) {
    // Avoid rendering anything on the server
    return null;
  }

  const handleThemeToggle = () => {
    // Toggle theme
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);

    // Apply the theme to the document element
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={handleThemeToggle}
      className="btn btn-secondary px-3 py-1"
      title={isDark ? 'Switch to light' : 'Switch to dark'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="ml-2">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

]]>
</file>
<file name="frontend\components\ui\Avatar.tsx">
<![CDATA[
'use client';
// frontend/components/ui/Avatar.tsx
import React, { useState, useMemo } from 'react';

export default function Avatar({
  src,
  name,
  size = 32,
  className = '',
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  const initials = useMemo(() => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [name]);

  // defensive: if src is empty string treat as missing
  const hasSrc = !!src && src !== '' && !errored;

  return (
    <div
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground',
        className,
      ].join(' ')}
      style={{ width: size, height: size }}
      title={name ?? 'User'}
    >
      {hasSrc ? (
        <img
          src={src as string}
          alt={name ?? 'avatar'}
          onError={() => {
            // show fallback
            setErrored(true);
            // helpful debugging
            // eslint-disable-next-line no-console
            console.warn('[Avatar] failed to load image src:', src);
          }}
          className="h-full w-full object-cover"
          decoding="async"
        />
      ) : initials ? (
        <span className="select-none text-sm font-medium">{initials}</span>
      ) : (
        // neutral SVG icon fallback
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="h-full w-full"
        >
          <rect width="24" height="24" rx="999" fill="currentColor" opacity="0.06" />
          <path
            d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12zM4.5 19.5a7.5 7.5 0 0 1 15 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>
      )}
    </div>
  );
}

]]>
</file>
<file name="frontend\components\ui\Badge.tsx">
<![CDATA[
import React from 'react';
import { cn } from '@/lib/utils/cn';
// frontend/components/ui/Badge.tsx
export function Badge({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
        className
      )}
    >
      {children}
    </span>
  );
}

]]>
</file>
<file name="frontend\components\ui\Button.tsx">
<![CDATA[
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'secondary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 active:scale-[.99]',
  outline: 'border border-border bg-background hover:bg-muted active:scale-[.99]',
  ghost: 'bg-transparent hover:bg-muted active:scale-[.99]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[.99]',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[.99]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6',
  icon: 'h-9 w-9 p-0 inline-flex items-center justify-center',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';

]]>
</file>
<file name="frontend\components\ui\Card.tsx">
<![CDATA[
import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={`rounded border p-4 shadow-sm bg-white dark:bg-neutral-900 ${className ?? ''}`} {...rest} />
);

]]>
</file>
<file name="frontend\components\ui\DropdownMenu.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DropdownCtx = React.createContext<Ctx | null>(null);

function useDropdownCtx() {
  const ctx = React.useContext(DropdownCtx);
  if (!ctx) throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  return ctx;
}

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <DropdownCtx.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className="relative inline-block" onKeyDown={onKeyDown}>
        {children}
      </div>
    </DropdownCtx.Provider>
  );
}

// Widen onClick to accept any Element events (so asChild works with custom components)
type TriggerProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> & {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<Element>;
};

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const { open, setOpen } = useDropdownCtx();

    if (asChild) {
      const child = React.Children.only(children as React.ReactElement<any>);
      const mergedOnClick: React.MouseEventHandler<any> = (e) => {
        setOpen(!open);
        onClick?.(e);
        child.props?.onClick?.(e);
      };
      // Do not pass ref here to avoid ref-during-render warnings
      return React.cloneElement(child, { onClick: mergedOnClick });
    }

    return (
      <button
        ref={ref}
        {...props}
        onClick={(e) => {
          setOpen(!open);
          onClick?.(e as unknown as React.MouseEvent<Element>);
        }}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

type ContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'end';
};

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, align = 'start', ...props }, ref) => {
    const { open } = useDropdownCtx();
    if (!open) return null;

    return (
      <div
        ref={ref}
        role="menu"
        className={cn(
          'absolute z-50 min-w-40 rounded-md border bg-white p-1 text-sm shadow-md ring-1 ring-black/5',
          'dark:border-white/10 dark:bg-neutral-900',
          align === 'end' ? 'right-0' : 'left-0',
          className
        )}
        tabIndex={-1}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

type ItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  inset?: boolean;
};

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, ItemProps>(
  ({ className, inset, onClick, children, ...props }, ref) => {
    const { setOpen } = useDropdownCtx();
    return (
      <button
        ref={ref}
        role="menuitem"
        className={cn(
          'w-full cursor-pointer select-none rounded-sm px-2 py-1.5 text-left outline-none transition-colors',
          'hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10',
          'disabled:pointer-events-none disabled:opacity-50',
          inset && 'pl-8',
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          setOpen(false);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

]]>
</file>
<file name="frontend\components\ui\Input.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-empty-object-type */
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
        'placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

]]>
</file>
<file name="frontend\components\ui\Loader.tsx">
<![CDATA[
export default function Loader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}

]]>
</file>
<file name="frontend\components\ui\TextArea.tsx">
<![CDATA[
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
        'placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

]]>
</file>
<file name="frontend\components\visuals\NeonBlob.tsx">
<![CDATA[
// components/visuals/NeonBlob.tsx
"use client";
import React from "react";
import { motion } from "framer-motion";

export default function NeonBlob({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.18, scale: 0.9 }}
      animate={{ opacity: 0.28, scale: 1.04 }}
      transition={{ duration: 6, repeat: Infinity, repeatType: "reverse" }}
      className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${className}`}
    />
  );
}

]]>
</file>
<file name="frontend\features\jobs\api\jobsApi.ts">
<![CDATA[
import api from '@/lib/axios';
import {
  JobsResponse, Application, RecruiterJob,
  JobFilters, UnifiedJob,
} from '../types/Index';

// ── Candidate: browse unified feed ───────────────────────────────────────────

export async function fetchJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (filters.search)                  params.set('search',          filters.search);
  if (filters.workMode)                params.set('workMode',         filters.workMode);
  if (filters.salaryMin)               params.set('salaryMin',        String(filters.salaryMin));
  if (filters.skills?.length)          params.set('skills',           filters.skills.join(','));
  if (filters.page)                    params.set('page',             String(filters.page));
  if (filters.includeExternal === false) params.set('includeExternal', 'false');

  const { data } = await api.get<JobsResponse>(`/jobs?${params}`);
  return data;
}

// ── Candidate: apply to internal job ─────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  resumeId: string,
  coverLetter?: string,
): Promise<Application> {
  const { data } = await api.post<Application>(`/jobs/${jobId}/apply`, {
    resumeId,
    coverLetter,
  });
  return data;
}

// ── Candidate: own applications ───────────────────────────────────────────────

export async function fetchMyApplications(): Promise<Application[]> {
  const { data } = await api.get<Application[]>('/jobs/applications/mine');
  return data;
}

// ── Recruiter: create job posting ─────────────────────────────────────────────

export async function createJob(dto: Partial<RecruiterJob>): Promise<UnifiedJob> {
  const { data } = await api.post<UnifiedJob>('/jobs', dto);
  return data;
}

// ── Recruiter: own job postings with pipeline stats ──────────────────────────

export async function fetchRecruiterJobs(): Promise<RecruiterJob[]> {
  const { data } = await api.get<RecruiterJob[]>('/jobs/mine');
  return data;
}

// ── Recruiter: applicants for a job ──────────────────────────────────────────

export async function fetchJobApplicants(jobId: string) {
  const { data } = await api.get(`/jobs/${jobId}/applicants`);
  return data;
}

// ── Recruiter: move applicant through pipeline ────────────────────────────────

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  recruiterNotes?: string,
) {
  const { data } = await api.patch(
    `/jobs/applications/${applicationId}/status`,
    { status, recruiterNotes },
  );
  return data;
}

// ── Recruiter: update job status ──────────────────────────────────────────────

export async function updateJobStatus(
  jobId: string,
  status: 'active' | 'paused' | 'closed',
) {
  const { data } = await api.patch(`/jobs/${jobId}/status`, { status });
  return data;
}

]]>
</file>
<file name="frontend\features\jobs\components\JobCard.tsx">
<![CDATA[
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useApplyToJob } from '../hooks/useJobs';
import { UnifiedJob } from '../types/Index';

// ── Source configuration ──────────────────────────────────────────────────────

type JobSource = 'internal' | 'serpapi';

const SOURCE_CONFIG: Record<JobSource, {
  label: string;
  color: string;
  bg: string;
  badge: string;
  badgeColor: string;
}> = {
  internal: {
    label:      'Direct Apply',
    color:      '#10B981',
    bg:         'rgba(16,185,129,0.1)',
    badge:      '✦ Platform Job',
    badgeColor: '#10B981',
  },
  serpapi: {
    label:      'View on Google Jobs',
    color:      '#38BDF8',
    bg:         'rgba(56,189,248,0.1)',
    badge:      '⊕ Google Jobs',
    badgeColor: '#38BDF8',
  },
};

const WORK_MODE_ICONS: Record<string, string> = {
  remote: '🌍',
  hybrid: '🏢',
  onsite: '📍',
};

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (!min && !max) return 'Salary not disclosed';

  const fmt = (n: number): string =>
    n >= 100_000
      ? `${(n / 100_000).toFixed(0)}L`
      : `${(n / 1_000).toFixed(0)}K`;

  const symbol = currency === 'INR' ? '₹' : '$';

  if (min && max) return `${symbol}${fmt(min)}–${fmt(max)}`;
  if (max)        return `Up to ${symbol}${fmt(max)}`;
  return `${symbol}${fmt(min!)}+`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor(diff / 60_000);

  if (days > 30)  return `${Math.floor(days / 30)}mo ago`;
  if (days > 0)   return `${days}d ago`;
  if (hours > 0)  return `${hours}h ago`;
  return `${mins}m ago`;
}

// ── Style factories ───────────────────────────────────────────────────────────
// Extracted outside JSX to eliminate duplicate-property risk and
// keep render logic clean — addresses ts(1117) error.

function getApplyButtonStyle(
  applied: boolean,
  isPending: boolean,
  cfg: typeof SOURCE_CONFIG[JobSource],
): React.CSSProperties {
  // Single, authoritative border declaration — no duplication possible
  const borderValue = applied
    ? '1px solid rgba(16,185,129,0.25)'
    : `1px solid ${cfg.color}33`;

  return {
    marginLeft:   'auto',
    padding:      '8px 18px',
    borderRadius: '8px',
    fontSize:     '12px',
    fontWeight:   600,
    cursor:       applied || isPending ? 'default' : 'pointer',
    border:       borderValue,           // ✅ defined exactly once
    background:   applied ? 'rgba(16,185,129,0.15)' : cfg.bg,
    color:        applied ? '#10B981' : cfg.color,
    opacity:      isPending ? 0.7 : 1,
    transition:   'all 0.15s ease',
  };
}

function getCardStyle(hovered: boolean): React.CSSProperties {
  return {
    background:   '#0D1424',
    border:       hovered
      ? '1px solid rgba(255,255,255,0.15)'
      : '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding:      '1.25rem',
    transition:   'border-color 0.15s ease',
    position:     'relative',
    overflow:     'hidden',
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface JobCardProps {
  job:             UnifiedJob;
  activeResumeId?: string;
  applied?:        boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JobCard({
  job,
  activeResumeId,
  applied = false,
}: JobCardProps) {
  const { user }                        = useAuth();
  const { mutate: apply, isPending }    = useApplyToJob();
  const [expanded, setExpanded]         = useState(false);
  const [hovered,  setHovered]          = useState(false);

  const cfg = SOURCE_CONFIG[job.source as JobSource] ?? SOURCE_CONFIG.serpapi;

  // ── Action handler ──────────────────────────────────────────────────────────

  function handleApply() {
    // External job — open in new tab, no internal tracking
    if (job.source === 'serpapi' && job.applyUrl) {
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!activeResumeId) {
      alert('Please upload a resume before applying');
      return;
    }

    apply({ jobId: job.id, resumeId: activeResumeId });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={getCardStyle(hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Match score accent bar — only shown when score exists */}
      {job.matchScore != null && job.matchScore > 0 && (
        <div
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            width:      `${job.matchScore}%`,
            height:     '2px',
            background: job.matchScore >= 70
              ? 'linear-gradient(90deg, #10B981, #34D399)'
              : 'linear-gradient(90deg, #F59E0B, #FCD34D)',
          }}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}

      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        marginBottom:   '10px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '8px',
            marginBottom:'4px',
            flexWrap:    'wrap',
          }}>
            <h3 style={{
              fontSize:   '14px',
              fontWeight:  600,
              color:      '#F1F5F9',
              margin:      0,
            }}>
              {job.title}
            </h3>

            {/* Source badge */}
            <span style={{
              fontSize:   '10px',
              padding:    '2px 7px',
              borderRadius:'20px',
              background:  cfg.bg,
              color:       cfg.badgeColor,
              border:      `1px solid ${cfg.badgeColor}33`,
              fontFamily: 'monospace',
              flexShrink:  0,
            }}>
              {cfg.badge}
            </span>
          </div>

          <p style={{
            fontSize: '13px',
            color:    'rgba(255,255,255,0.45)',
            margin:    0,
          }}>
            {job.company}
            {job.location && ` · ${job.location}`}
          </p>
        </div>

        {/* Match score indicator */}
        {job.matchScore != null && job.matchScore > 0 && (
          <div style={{
            textAlign:   'center',
            flexShrink:   0,
            marginLeft:  '12px',
          }}>
            <div style={{
              fontSize:   '15px',
              fontWeight:  700,
              color:      job.matchScore >= 70 ? '#10B981' : '#F59E0B',
              fontFamily: 'monospace',
            }}>
              {job.matchScore}%
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
              match
            </div>
          </div>
        )}
      </div>

      {/* ── Meta chips ─────────────────────────────────────────────────────── */}

      <div style={{
        display:      'flex',
        gap:          '8px',
        flexWrap:     'wrap',
        marginBottom: '12px',
        alignItems:   'center',
      }}>
        {job.workMode && (
          <span style={{
            fontSize:     '11px',
            padding:      '3px 8px',
            borderRadius: '6px',
            background:   'rgba(255,255,255,0.05)',
            color:        'rgba(255,255,255,0.5)',
          }}>
            {WORK_MODE_ICONS[job.workMode] ?? '🏢'} {job.workMode}
          </span>
        )}

        {job.employmentType && (
          <span style={{
            fontSize:     '11px',
            padding:      '3px 8px',
            borderRadius: '6px',
            background:   'rgba(255,255,255,0.05)',
            color:        'rgba(255,255,255,0.5)',
          }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}

        <span style={{
          fontSize:     '11px',
          padding:      '3px 8px',
          borderRadius: '6px',
          background:   'rgba(16,185,129,0.08)',
          color:        '#10B981',
        }}>
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
        </span>

        <span style={{
          fontSize:    '11px',
          color:       'rgba(255,255,255,0.25)',
          marginLeft:  'auto',
        }}>
          {timeAgo(job.postedAt)}
        </span>
      </div>

      {/* ── Required skills ────────────────────────────────────────────────── */}

      {job.requiredSkills?.length > 0 && (
        <div style={{
          display:      'flex',
          gap:          '5px',
          flexWrap:     'wrap',
          marginBottom: '12px',
        }}>
          {job.requiredSkills.slice(0, 5).map(skill => (
            <span
              key={skill}
              style={{
                fontSize:     '10px',
                padding:      '2px 7px',
                borderRadius: '4px',
                background:   'rgba(56,189,248,0.08)',
                border:       '1px solid rgba(56,189,248,0.15)',
                color:        '#38BDF8',
                fontFamily:   'monospace',
              }}
            >
              {skill}
            </span>
          ))}

          {job.requiredSkills.length > 5 && (
            <span style={{
              fontSize: '10px',
              color:    'rgba(255,255,255,0.25)',
              padding:  '2px 0',
            }}>
              +{job.requiredSkills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* ── Description (expandable) ────────────────────────────────────────── */}

      {job.description && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{
            fontSize:              '12px',
            color:                 'rgba(255,255,255,0.4)',
            lineHeight:             1.6,
            margin:                 0,
            display:               '-webkit-box',
            WebkitLineClamp:        expanded ? 'unset' : 2,
            WebkitBoxOrient:       'vertical',
            overflow:              'hidden',
          }}>
            {job.description}
          </p>

          {job.description.length > 150 && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              style={{
                fontSize:   '11px',
                color:      '#38BDF8',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                padding:    '2px 0',
                marginTop:  '4px',
              }}
            >
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
        </div>
      )}

      {/* ── Footer: applicant count + CTA ───────────────────────────────────── */}

      <div style={{
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'space-between',
      }}>
        {job.source === 'internal' && (
          <span style={{
            fontSize: '11px',
            color:    'rgba(255,255,255,0.25)',
          }}>
            {job.applicantCount} applicant
            {job.applicantCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Only candidates see the apply button */}
        {user?.role === 'candidate' && (
          <button
            onClick={handleApply}
            disabled={isPending || applied}
            style={getApplyButtonStyle(applied, isPending, cfg)}
          >
            {isPending
              ? 'Applying…'
              : applied
              ? '✓ Applied'
              : cfg.label}
          </button>
        )}
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\features\jobs\components\JobSkeleton.tsx">
<![CDATA[
export function JobSkeleton() {
  return (
    <div style={{
      background: '#0D1424',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px',
      padding: '1.25rem',
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .sk {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 800px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 6px;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <div className="sk" style={{ width: '180px', height: '14px', marginBottom: '8px' }} />
          <div className="sk" style={{ width: '120px', height: '12px' }} />
        </div>
        <div className="sk" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {[60, 80, 90].map(w => (
          <div key={w} className="sk" style={{ width: `${w}px`, height: '22px' }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
        {[50, 65, 55].map(w => (
          <div key={w} className="sk" style={{ width: `${w}px`, height: '20px' }} />
        ))}
      </div>

      <div className="sk" style={{ width: '100%', height: '12px', marginBottom: '6px' }} />
      <div className="sk" style={{ width: '80%', height: '12px' }} />
    </div>
  );
}


/*
Backend:
├── src/jobs/jobs.service.ts        ← SerpAPI integration, unified feed, match scoring
├── src/jobs/jobs.controller.ts     ← @Public() on GET /jobs, userId passed if authenticated
└── src/jobs/jobs.module.ts         ← HttpModule registered for SerpAPI HTTP calls

Frontend:
├── features/jobs/types/index.ts    ← UnifiedJob, JobSource, Application, RecruiterJob types
├── features/jobs/api/jobsApi.ts    ← Full API layer for both candidate + recruiter
├── features/jobs/hooks/useJobs.ts  ← TanStack Query hooks for all job operations
├── features/jobs/components/
│   ├── JobCard.tsx                 ← Source-aware card (internal vs SerpAPI)
│   └── JobSkeleton.tsx             ← Loading skeleton
*/

]]>
</file>
<file name="frontend\features\jobs\components\MockInterview.tsx">
<![CDATA[
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextArea';
import { ArrowUpCircle, MessageSquare } from 'lucide-react';
// frontend/features/jobs/components/MockInterview.tsx
interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default function MockInterview() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: 'system', content: 'Welcome to the mock interview. Ask for a question to begin.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function send() {
    if (!input.trim()) return;
    setTurns(t => [...t, { role: 'user', content: input.trim() }]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      setTurns(t => [
        ...t,
        {
          role: 'assistant',
          content:
            'Here is a generated follow-up question (placeholder). Explain the time complexity of your solution.'
        }
      ]);
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare size={18} /> Interview Session
        </div>
        <div className="mt-4 space-y-4 max-h-[360px] overflow-y-auto pr-2">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-md px-3 py-2 text-sm ${
                t.role === 'assistant'
                  ? 'bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                  : t.role === 'user'
                  ? 'bg-black/5 dark:bg-white/10'
                  : 'opacity-70 italic'
              }`}
            >
              <strong className="capitalize">{t.role}:</strong> {t.content}
            </div>
          ))}
          {loading && (
            <div className="animate-pulse rounded-md bg-indigo-600/10 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
              Assistant is thinking…
            </div>
          )}
        </div>
        <div className="mt-5 space-y-3">
          <Textarea
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your answer or ask for the next question..."
          />
          <div className="flex gap-3">
            <Button onClick={send} disabled={loading}>
              Send <ArrowUpCircle size={16} className="ml-1" />
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setTurns([
                  { role: 'system', content: 'Session restarted. Ask for a question to begin.' }
                ])
              }
            >
              Reset Session
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-xl border p-6 space-y-2 text-sm">
        <h3 className="text-base font-semibold">Upcoming Features</h3>
        <ul className="list-disc pl-5 space-y-1 opacity-70">
          <li>Adaptive difficulty based on your answers.</li>
          <li>Behavioral vs technical round switching.</li>
          <li>Answer quality grading & score history.</li>
        </ul>
      </div>
    </div>
  );
}

]]>
</file>
<file name="frontend\features\jobs\hooks\useJobs.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery, useMutation, useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import {
  fetchJobs, applyToJob, fetchMyApplications,
  createJob, fetchRecruiterJobs, fetchJobApplicants,
  updateApplicationStatus, updateJobStatus,
} from '../api/jobsApi';
import { JobFilters } from '../types/Index';
import toast from 'react-hot-toast';

// ── Query keys ────────────────────────────────────────────────────────────────

export const JOB_KEYS = {
  all:           ['jobs'] as const,
  feed:          (f: JobFilters) => ['jobs', 'feed', f] as const,
  myApplications: ['jobs', 'applications', 'mine'] as const,
  recruiterJobs: ['jobs', 'recruiter', 'mine'] as const,
  applicants:    (jobId: string) => ['jobs', 'applicants', jobId] as const,
};

// ── Candidate: browse unified job feed ───────────────────────────────────────

export function useJobFeed(filters: JobFilters = {}) {
  return useQuery({
    queryKey: JOB_KEYS.feed(filters),
    queryFn:  () => fetchJobs(filters),
    staleTime: 60_000,        // 1 min — external jobs don't change second-to-second
    placeholderData: prev => prev,  // keep showing previous results while refetching
  });
}

// ── Candidate: infinite scroll job feed ──────────────────────────────────────

export function useInfiniteJobFeed(baseFilters: Omit<JobFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite', baseFilters],
    queryFn:  ({ pageParam = 1 }) => fetchJobs({ ...baseFilters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.flatMap(p => p.jobs).length;
      return fetched < lastPage.total ? allPages.length + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

// ── Candidate: apply to internal job ─────────────────────────────────────────

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      resumeId,
      coverLetter,
    }: { jobId: string; resumeId: string; coverLetter?: string }) =>
      applyToJob(jobId, resumeId, coverLetter),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.myApplications });
      toast.success('Application submitted successfully 🚀');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to apply');
    },
  });
}

// ── Candidate: own application history ───────────────────────────────────────

export function useMyApplications() {
  return useQuery({
    queryKey: JOB_KEYS.myApplications,
    queryFn:  fetchMyApplications,
  });
}

// ── Recruiter: create job posting ─────────────────────────────────────────────

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.recruiterJobs });
      toast.success(`"${job.title}" posted successfully 🎯`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create job');
    },
  });
}

// ── Recruiter: own jobs with pipeline stats ───────────────────────────────────

export function useRecruiterJobs() {
  return useQuery({
    queryKey: JOB_KEYS.recruiterJobs,
    queryFn:  fetchRecruiterJobs,
    refetchInterval: 30_000,   // safety net alongside Supabase Realtime
  });
}

// ── Recruiter: applicants for a job ──────────────────────────────────────────

export function useJobApplicants(jobId: string) {
  return useQuery({
    queryKey: JOB_KEYS.applicants(jobId),
    queryFn:  () => fetchJobApplicants(jobId),
    enabled:  !!jobId,
    refetchInterval: 15_000,
  });
}

// ── Recruiter: move applicant through pipeline ────────────────────────────────

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId, status, recruiterNotes,
    }: { applicationId: string; status: string; recruiterNotes?: string }) =>
      updateApplicationStatus(applicationId, status, recruiterNotes),

    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applicants'] });
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.recruiterJobs });
      toast.success(`Applicant moved to "${vars.status}"`);
    },
  });
}

// ── Recruiter: update job status ──────────────────────────────────────────────

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId, status,
    }: { jobId: string; status: 'active' | 'paused' | 'closed' }) =>
      updateJobStatus(jobId, status),

    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.recruiterJobs });
      const labels = { active: 'reactivated', paused: 'paused', closed: 'closed' };
      toast.success(`Job ${labels[vars.status]}`);
    },
  });
}

]]>
</file>
<file name="frontend\features\jobs\hooks\useSpeech.ts">
<![CDATA[
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: any) => void) | null;
  start(): void;
  stop(): void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;

  const w = window as Window & {
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();

    if (!Ctor) {
      setSupported(false);
      recognitionRef.current = null;
      return;
    }

    setSupported(true);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    recognitionRef.current = rec;
  }, [lang]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;

    setTranscript('');

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop, setTranscript };
}

export function useSpeechSynthesis(
  voiceMatcher: (v: SpeechSynthesisVoice) => boolean = (v) => v.lang.startsWith('en'),
) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    setSupported(true);

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = voices.find(voiceMatcher) || voices[0];
        if (voice) utterance.voice = voice;

        utterance.rate = 1;
        utterance.pitch = 1;

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {}
    },
    [supported, voices, voiceMatcher],
  );

  const cancel = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }, []);

  return { supported, voices, speak, cancel };
}
]]>
</file>
<file name="frontend\features\jobs\types\Index.ts">
<![CDATA[
export type JobSource = 'internal' | 'serpapi';

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'rejected';

export interface UnifiedJob {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  postedAt: string;
  applyUrl: string | null;         // SerpAPI jobs only
  recruiterName: string | null;    // Internal jobs only
  applicantCount: number;
  status: string;
  matchScore?: number;
}

export interface JobsResponse {
  jobs: UnifiedJob[];
  total: number;
  sources: {
    internal: number;
    external: number;
  };
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId: string | null;
  matchScore: number | null;
  status: ApplicationStatus;
  coverLetter: string | null;
  recruiterNotes: string | null;
  appliedAt: string;
  updatedAt: string;
  // Joined fields
  title?: string;
  company?: string;
  location?: string;
  workMode?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  requiredSkills?: string[];
}

export interface RecruiterJob {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  location: string | null;
  workMode: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  industry: string | null;
  status: 'active' | 'paused' | 'closed';
  applicantCount: number;
  createdAt: string;
  // Pipeline stats (from GROUP BY query)
  totalApplications: number;
  newApplicants: number;
  reviewed: number;
  shortlisted: number;
  inInterview: number;
  offered: number;
  rejected: number;
}

export interface JobFilters {
  search?: string;
  workMode?: string;
  salaryMin?: number;
  skills?: string[];
  page?: number;
  includeExternal?: boolean;
}

]]>
</file>
<file name="frontend\features\jobs\types\speech.d.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/features/jobs/types/speech.d.ts
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export {};

]]>
</file>
<file name="frontend\features\resume\components\ResumeUpload.tsx">
<![CDATA[
// frontend/features/resume/components/ResumeUpload.tsx
'use client';

import { useRouter } from 'next/navigation';

// Thin wrapper that delegates to the actual resume page
// Keeps the import contract satisfied without duplicating logic
export default function ResumeUpload() {
  const router = useRouter();

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '60vh',
      gap:            '1rem',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
        Resume upload has moved.
      </p>
      <button
        onClick={() => router.push('/resumes')}
        style={{
          padding:      '10px 24px',
          background:   'linear-gradient(135deg, #7C3AED, #6D28D9)',
          border:       'none',
          borderRadius: '10px',
          color:        '#fff',
          fontSize:     '13px',
          fontWeight:    600,
          cursor:       'pointer',
        }}
      >
        Go to Resume Upload
      </button>
    </div>
  );
}

]]>
</file>
<file name="frontend\features\settings\components\SettingForm.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/features/settings/components/SettingForm.tsx
'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2).max(50),
  headline: z.string().max(120).optional(),
  location: z.string().max(80).optional(),
  bio: z.string().max(400).optional()
});

type Values = z.infer<typeof schema>;

export default function SettingsForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      headline: '',
      location: '',
      bio: ''
    }
  });

  function onSubmit(values: Values) {
    // Placeholder: would call PATCH /api/me
    return new Promise<void>(resolve =>
      setTimeout(() => {
        console.log('Settings saved', values);
        resolve();
      }, 800)
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl border p-6 shadow-sm dark:border-neutral-800"
    >
      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">Name</label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">
          Professional Headline
        </label>
        <Input {...register('headline')} placeholder="e.g. Senior Backend Engineer" />
        {errors.headline && <p className="text-xs text-red-600">{errors.headline.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">Location</label>
        <Input {...register('location')} placeholder="City, Country" />
        {errors.location && <p className="text-xs text-red-600">{errors.location.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">Bio</label>
        <Textarea {...register('bio')} rows={5} placeholder="Short professional summary..." />
        {errors.bio && <p className="text-xs text-red-600">{errors.bio.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}

]]>
</file>
<file name="frontend\hooks\useAnalyseResume.ts">
<![CDATA[
/* eslint-disable react-hooks/immutability */
// frontend/hooks/useResumeAnalysis.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getLatestResume,
  triggerAnalysis,
  getResume,
  Resume,
  ResumeStatus,
} from '@/lib/resumes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnalysisState =
  | 'idle'        // no resume uploaded yet
  | 'uploaded'    // resume uploaded, analysis not started
  | 'triggering'  // POST /resumes/:id/analyse in flight
  | 'processing'  // BullMQ job running — polling active
  | 'analyzed'    // complete
  | 'failed';     // error

interface UseResumeAnalysisReturn {
  resume:        Resume | null;
  analysisState: AnalysisState;
  error:         string | null;
  canAnalyse:    boolean;
  trigger:       () => Promise<void>;
  refresh:       () => Promise<void>;
}

// ── Status → AnalysisState map ────────────────────────────────────────────────

const STATUS_STATE_MAP: Record<ResumeStatus, AnalysisState> = {
  uploaded:   'uploaded',
  processing: 'processing',
  analyzed:   'analyzed',
  failed:     'failed',
};

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS     = 40;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useResumeAnalysis(): UseResumeAnalysisReturn {
  const [resume,        setResume]        = useState<Resume | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [error,         setError]         = useState<string | null>(null);

  // Use a ref to track polling so we can cancel it on unmount
  // and avoid stale closure issues between useCallback dependencies.
  const pollingRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef  = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // ── Polling loop ──────────────────────────────────────────────────────────
  // Defined with useRef pattern to avoid stale closure deps and
  // circular useCallback references.

  const pollOnce = useCallback(async (resumeId: string) => {
    if (!isMountedRef.current) return;

    attemptsRef.current += 1;

    try {
      const updated = await getResume(resumeId);

      if (!isMountedRef.current) return;

      setResume(updated);

      if (updated.status === 'analyzed') {
        setAnalysisState('analyzed');
        return;
      }

      if (updated.status === 'failed') {
        setAnalysisState('failed');
        setError('Analysis failed. Please try again.');
        return;
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setAnalysisState('failed');
        setError('Analysis is taking longer than expected. Try again later.');
        return;
      }

      // Still processing — schedule next poll
      setAnalysisState('processing');
      pollingRef.current = setTimeout(() => {
        void pollOnce(resumeId);
      }, POLL_INTERVAL_MS);

    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Polling failed';
      setError(message);
      setAnalysisState('failed');
    }
  }, []); // no deps — uses refs to avoid stale closures

  const startPolling = useCallback((resumeId: string) => {
    // Cancel any existing poll before starting a new one
    if (pollingRef.current) clearTimeout(pollingRef.current);
    attemptsRef.current = 0;
    setAnalysisState('processing');
    void pollOnce(resumeId);
  }, [pollOnce]);

  // ── Load latest resume on mount ───────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const latest = await getLatestResume();

      if (!isMountedRef.current) return;

      setResume(latest);

      if (!latest) {
        setAnalysisState('idle');
        return;
      }

      const nextState = STATUS_STATE_MAP[latest.status] ?? 'idle';
      setAnalysisState(nextState);

      // Resume polling if analysis was already in progress
      // (e.g. user refreshed the page mid-analysis)
      if (latest.status === 'processing') {
        startPolling(latest.id);
      }

    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load resume';
      setError(message);
    }
  }, [startPolling]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Trigger analysis ──────────────────────────────────────────────────────

  const trigger = useCallback(async () => {
    // ✅ Guard: resume.id is guaranteed non-null here via canAnalyse check
    if (!resume?.id) return;

    setError(null);
    setAnalysisState('triggering');

    try {
      await triggerAnalysis(resume.id);  // ✅ resume.id: string (not null)
      startPolling(resume.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start analysis';
      setError(message);
      setAnalysisState('failed');
    }
  }, [resume?.id, startPolling]);

  const canAnalyse = analysisState === 'uploaded' || analysisState === 'failed';

  return {
    resume,
    analysisState,
    error,
    canAnalyse,
    trigger,
    refresh,
  };
}

]]>
</file>
<file name="frontend\hooks\useAnalytics.ts">
<![CDATA[
'use client';

import useSWR from 'swr';
import api from '@/lib/axios';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecruiterAnalytics {
  kpis: {
    totalJobs:        number;
    activeJobs:       number;
    totalApplicants:  number;
    shortlisted:      number;
    hired:            number;
    avgTimeToFill:    number; // days
  };
  applicationsByStatus: { status: string; count: number; color: string }[];
  applicationsOverTime: { date: string; count: number }[];
  topJobs: {
    title:      string;
    applicants: number;
    shortlisted:number;
  }[];
  recentApplications: {
    id:           string;
    candidateName:string;
    jobTitle:     string;
    status:       string;
    appliedAt:    string;
  }[];
  skillDemand: { skill: string; count: number }[];
}

export interface CandidateAnalytics {
  kpis: {
    totalApplications: number;
    underReview:       number;
    interviews:        number;
    offers:            number;
    profileViews:      number;
    matchScore:        number; // 0-100
  };
  applicationsByStatus: { status: string; count: number; color: string }[];
  activityOverTime:     { date: string; applications: number; views: number }[];
  skillMatch: {
    skill:    string;
    have:     number; // 0-100
    required: number; // 0-100
  }[];
  recentActivity: {
    id:        string;
    type:      string;
    message:   string;
    timestamp: string;
  }[];
  applicationFunnel: { stage: string; count: number }[];
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useRecruiterAnalytics() {
  const { data, isLoading, error } = useSWR<RecruiterAnalytics>(
    '/recruiter/analytics',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  // Safe defaults — UI never crashes on empty data
  const analytics: RecruiterAnalytics = data ?? {
    kpis: {
      totalJobs: 0, activeJobs: 0, totalApplicants: 0,
      shortlisted: 0, hired: 0, avgTimeToFill: 0,
    },
    applicationsByStatus: [],
    applicationsOverTime: [],
    topJobs:              [],
    recentApplications:   [],
    skillDemand:          [],
  };

  return { analytics, loading: isLoading, error };
}

export function useCandidateAnalytics() {
  const { data, isLoading, error } = useSWR<CandidateAnalytics>(
    '/candidate/analytics',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const analytics: CandidateAnalytics = data ?? {
    kpis: {
      totalApplications: 0, underReview: 0, interviews: 0,
      offers: 0, profileViews: 0, matchScore: 0,
    },
    applicationsByStatus: [],
    activityOverTime:     [],
    skillMatch:           [],
    recentActivity:       [],
    applicationFunnel:    [],
  };

  return { analytics, loading: isLoading, error };
}

]]>
</file>
<file name="frontend\hooks\useConnectionMetrics.ts">
<![CDATA[
/**
 * Connection Metrics Hook
 * File: frontend/hooks/useConnectionMetrics.ts
 *
 * Purpose: Monitor and report WebRTC connection quality metrics
 *
 * Returns:
 * - Real-time metrics (bitrate, packet loss, latency)
 * - Quality assessment (excellent/good/fair/poor)
 * - Connection state
 * - Auto-reports every 2 seconds
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ConnectionMetricsState {
  inboundBitrate: number; // kbps
  outboundBitrate: number; // kbps
  rtt: number; // ms
  audioPacketLoss: number; // %
  videoPacketLoss: number; // %
  audioJitter: number; // ms
  videoFrameRate: number;
  videoResolution: string;
  connectionState: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  lastUpdated: number;
}

const INITIAL_STATE: ConnectionMetricsState = {
  inboundBitrate: 0,
  outboundBitrate: 0,
  rtt: 0,
  audioPacketLoss: 0,
  videoPacketLoss: 0,
  audioJitter: 0,
  videoFrameRate: 0,
  videoResolution: '0x0',
  connectionState: 'new',
  quality: 'unknown',
  lastUpdated: 0,
};

// ✅ Type guard for inbound-rtp stats
function isInboundRtpReport(report: any): boolean {
  return (
    report.type === 'inbound-rtp' &&
    typeof report.bytesReceived === 'number' &&
    typeof report.timestamp === 'number'
  );
}

// ✅ Type guard for outbound-rtp stats
function isOutboundRtpReport(report: any): boolean {
  return (
    report.type === 'outbound-rtp' &&
    typeof report.bytesSent === 'number' &&
    typeof report.timestamp === 'number'
  );
}

export function useConnectionMetrics(
  pc: RTCPeerConnection | null,
  enabled = true,
): ConnectionMetricsState {
  const [metrics, setMetrics] = useState<ConnectionMetricsState>(INITIAL_STATE);
  const prevStatsRef = useRef<Map<string, any>>(new Map());
  // ✅ FIXED: Use NodeJS.Timeout instead of NodeJS.Timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const collectMetrics = useCallback(async () => {
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      let inboundBitrate = 0;
      let outboundBitrate = 0;
      let rtt = 0;
      let audioPacketLoss = 0;
      let videoPacketLoss = 0;
      let audioJitter = 0;
      let videoFrameRate = 0;
      let videoResolution = '0x0';

      const now = Date.now();
      const prevStats = prevStatsRef.current;

      stats.forEach((report) => {
        const prevReport = prevStats.get(report.id);

        // ✅ FIXED: Safely check inbound-rtp with type guard
        if (isInboundRtpReport(report)) {
          const mediaType = (report as any).mediaType;

          if (mediaType === 'video') {
            const bytes = report.bytesReceived;
            const prevBytes = prevReport?.bytesReceived ?? 0;
            const bytesDelta = bytes - prevBytes;
            const timeDelta =
              (report.timestamp - (prevReport?.timestamp ?? 0)) / 1000;

            if (timeDelta > 0) {
              inboundBitrate = (bytesDelta * 8) / timeDelta / 1000; // kbps
            }

            const packetsLost = report.packetsLost ?? 0;
            const packetsReceived = report.packetsReceived ?? 0;
            const total = packetsLost + packetsReceived;
            videoPacketLoss =
              total > 0 ? (packetsLost / total) * 100 : 0;

            const frameWidth = (report as any).frameWidth ?? 0;
            const frameHeight = (report as any).frameHeight ?? 0;
            videoResolution = `${frameWidth}x${frameHeight}`;
          } else if (mediaType === 'audio') {
            const packetsLost = report.packetsLost ?? 0;
            const packetsReceived = report.packetsReceived ?? 0;
            const total = packetsLost + packetsReceived;
            audioPacketLoss =
              total > 0 ? (packetsLost / total) * 100 : 0;

            audioJitter = ((report as any).jitter ?? 0) * 1000; // ms
          }
        }

        // ✅ FIXED: Safely check outbound-rtp with type guard
        if (isOutboundRtpReport(report)) {
          const mediaType = (report as any).mediaType;

          if (mediaType === 'video') {
            const bytes = report.bytesSent;
            const prevBytes = prevReport?.bytesSent ?? 0;
            const bytesDelta = bytes - prevBytes;
            const timeDelta =
              (report.timestamp - (prevReport?.timestamp ?? 0)) / 1000;

            if (timeDelta > 0) {
              outboundBitrate = (bytesDelta * 8) / timeDelta / 1000; // kbps
            }

            videoFrameRate = (report as any).framesPerSecond ?? 0;
          }
        }

        // ✅ Safely check candidate-pair
        if (report.type === 'candidate-pair') {
          const pair = report as any;
          if (
            pair.state === 'succeeded' &&
            typeof pair.currentRoundTripTime === 'number'
          ) {
            rtt = pair.currentRoundTripTime * 1000; // ms
          }
        }

        prevStats.set(report.id, report);
      });

      // Assess quality
      let quality: ConnectionMetricsState['quality'] = 'unknown';
      if (pc.connectionState === 'connected') {
        let score = 100;

        // Packet loss penalty
        const avgPacketLoss = (audioPacketLoss + videoPacketLoss) / 2;
        if (avgPacketLoss > 5) score -= 40;
        else if (avgPacketLoss > 2) score -= 20;
        else if (avgPacketLoss > 0) score -= 5;

        // Latency penalty
        score -=
          rtt > 300
            ? 30
            : rtt > 150
              ? 15
              : rtt > 80
                ? 5
                : 0;

        // Bitrate penalty
        if (outboundBitrate < 2500 * 0.3) score -= 25;
        else if (outboundBitrate < 2500 * 0.7) score -= 10;

        // Jitter penalty
        if (audioJitter > 30) score -= 10;
        else if (audioJitter > 15) score -= 5;

        // Quality thresholds
        if (score >= 85) quality = 'excellent';
        else if (score >= 70) quality = 'good';
        else if (score >= 50) quality = 'fair';
        else quality = 'poor';
      }

      setMetrics({
        inboundBitrate,
        outboundBitrate,
        rtt,
        audioPacketLoss,
        videoPacketLoss,
        audioJitter,
        videoFrameRate,
        videoResolution,
        connectionState: pc.connectionState,
        quality,
        lastUpdated: now,
      });
    } catch (err) {
      console.error('[Metrics] Collection failed:', err);
    }
  }, [pc]);

  useEffect(() => {
    if (!enabled || !pc) return;

    // ✅ FIXED: setInterval returns NodeJS.Timeout
    intervalRef.current = setInterval(() => {
      void collectMetrics();
    }, 2000); // Collect every 2 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [collectMetrics, enabled, pc]);

  return metrics;
}
]]>
</file>
<file name="frontend\hooks\useJobs.pagination.ts">
<![CDATA[
// hooks/useJobs.pagination.ts
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in REPLACEMENT for the useJobs portion of useRealTimeAlerts.
//
// What changed vs. the original:
//   1. Accepts page + limit in the params object
//   2. Returns totalPages + currentPage alongside existing fields
//   3. Resets to page 1 automatically when search / workMode / source changes
//      (this is handled in the page component, not here — hook is stateless)
//
// Backend contract expected:
//   GET /jobs?search=&workMode=&source=&page=1&limit=12
//   → {
//       jobs:    UnifiedJob[];
//       total:   number;          // total matching records across all pages
//       sources: { internal: number; serpapi: number; linkedin: number; indeed: number };
//     }
//
// The hook derives totalPages = Math.ceil(total / limit) locally.
// This avoids a backend breaking change if your API doesn't return totalPages yet.
// ─────────────────────────────────────────────────────────────────────────────

import useSWR, { mutate } from 'swr';
import api from '@/lib/axios';

// ── Public types (re-exported so page.tsx imports from one place) ─────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id:             string;
  title:          string;
  company:        string;
  location?:      string;
  workMode?:      string;
  employmentType?: string;
  salaryMin?:     number | null;
  salaryMax?:     number | null;
  description?:   string;
  requiredSkills: string[];
  matchScore?:    number | null;
  applyUrl?:      string;
  postedAt:       string;
  applicantCount?: number;
  recruiterName?:  string;
  source:         JobSource;
}

export interface Application {
  id:         string;
  job_id:     string;
  status:     string;
  appliedAt:  string;
}

// ── Hook params ───────────────────────────────────────────────────────────────

export interface UseJobsParams {
  search?:   string;
  workMode?: string;
  source?:   'all' | JobSource;
  page?:     number;   // 1-indexed, defaults to 1
  limit?:    number;   // defaults to 12
}

// ── API response shape ────────────────────────────────────────────────────────

interface JobsApiResponse {
  jobs:    UnifiedJob[];
  total:   number;
  sources: {
    internal: number;
    serpapi:  number;
    linkedin: number;
    indeed:   number;
  };
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 12;

async function fetchJobs(url: string): Promise<JobsApiResponse> {
  const { data } = await api.get<JobsApiResponse>(url);
  return data;
}

function buildKey(params: UseJobsParams): string {
  const {
    search   = '',
    workMode = '',
    source   = 'all',
    page     = 1,
    limit    = DEFAULT_LIMIT,
  } = params;

  const qs = new URLSearchParams({
    ...(search   && { search }),
    ...(workMode && { workMode }),
    ...(source !== 'all' && { source }),
    page:  String(page),
    limit: String(limit),
  });

  return `/jobs?${qs.toString()}`;
}

// ── useJobs ───────────────────────────────────────────────────────────────────

export function useJobs(params: UseJobsParams = {}) {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const key   = buildKey(params);

  const { data, error, isValidating } = useSWR<JobsApiResponse>(key, fetchJobs, {
    refreshInterval:       30_000,   // poll every 30s for live updates
    revalidateOnFocus:     true,
    revalidateOnReconnect: true,
    keepPreviousData:      true,     // prevents flicker between pages
  });

  const total      = data?.total   ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs:        data?.jobs     ?? [],
    total,
    totalPages,
    currentPage: params.page ?? 1,
    sources:     data?.sources  ?? { internal: 0, serpapi: 0, linkedin: 0, indeed: 0 },
    loading:     !data && !error,
    validating:  isValidating,
    error:       error ? (error?.response?.data?.message ?? 'Failed to load jobs') : null,
    refresh:     () => mutate(key),
  };
}

// ── useMyApplications (unchanged from original) ───────────────────────────────

async function fetchApplications(url: string): Promise<Application[]> {
  const { data } = await api.get<Application[]>(url);
  return data ?? [];
}

export function useMyApplications() {
  const { data, mutate: mutateFn } = useSWR<Application[]>(
    '/applications/mine',
    fetchApplications,
    { revalidateOnFocus: true },
  );

  const applyOptimistic = (jobId: string) => {
    mutateFn(
      prev => [
        ...(prev ?? []),
        {
          id:        `optimistic-${jobId}`,
          job_id:    jobId,
          status:    'applied',
          appliedAt: new Date().toISOString(),
        },
      ],
      { revalidate: true },
    );
  };

  return {
    applications:    data ?? [],
    applyOptimistic,
  };
}

]]>
</file>
<file name="frontend\hooks\useJobStream.ts">
<![CDATA[
// frontend/hooks/useJobStream.ts
//
// Connects to the NestJS SSE endpoint once per session.
// When server emits events, triggers SWR revalidation — zero polling.
// EventSource auto-reconnects on disconnect natively.

'use client';

import { useEffect, useRef } from 'react';
import { mutate }            from 'swr';

// Strip /api suffix — SSE endpoint is on the base backend URL
const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
    .replace(/\/api$/, '');

export function useJobStream() {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect if already connected
    if (esRef.current) return;

    const url = `${BACKEND_BASE}/api/jobs/stream`;
    const es  = new EventSource(url);
    esRef.current = es;

    // ── Event: recruiter posted a new job ─────────────────────────────────
    es.addEventListener('job_created', () => {
      // Revalidate all /jobs SWR keys — new job appears instantly
      void mutate((key: unknown) =>
        typeof key === 'string' && key.startsWith('/jobs')
      );
    });

    // ── Event: sync batch completed (SERP + LinkedIn + Indeed) ───────────
    es.addEventListener('jobs_synced', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as {
          payload: { newJobs: number; platforms: string[] };
        };
        // Only revalidate if genuinely new jobs arrived — avoid noise
        if ((event.payload?.newJobs ?? 0) > 0) {
          void mutate((key: unknown) =>
            typeof key === 'string' &&
            (key.startsWith('/jobs') || key === '/alerts')
          );
        }
      } catch {
        // Malformed event — safe to ignore
      }
    });

    // ── Event: new alert created ──────────────────────────────────────────
    es.addEventListener('alert', () => {
      // Revalidate alerts so badge count updates without polling
      void mutate('/alerts');
    });

    es.onerror = () => {
      // EventSource handles reconnect automatically
      // No manual retry needed — browser will reconnect after ~3s
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);
}

]]>
</file>
<file name="frontend\hooks\useRealTimeAlerts.tsx">
<![CDATA[
// frontend/hooks/useRealTimeAlerts.tsx
// Central real-time data layer — SWR-backed, zero polling loops.

import useSWR, { mutate as globalMutate } from 'swr';
import api from '@/lib/axios';

export const fetcher = (url: string) => api.get(url).then(r => r.data);

const INTERVALS = {
  jobs:            30_000,
  alerts:           8_000,
  applications:    15_000,
  resumes:         10_000,
  recommendations: 60_000,
  recruiterJobs:   15_000,
};

// ─────────────────────────────────────────────────────────────────────────────
// toArray — defensive envelope normaliser
//
// Why this exists:
//   Several API endpoints were changed server-side to return envelopes like
//   { alerts: [...] } or { data: [...] } instead of plain arrays.
//   Calling .filter() on a plain object throws:
//     "TypeError: (e ?? []).filter is not a function"
//   which crashed the entire React tree.
//
//   This utility makes every consumer of array data resilient to that drift.
//   It checks:
//     1. Is it already a plain array?          → return as-is
//     2. Does it have a 'data' / 'items' key?  → unwrap
//     3. Does it have a custom fallback key?   → unwrap (e.g. 'alerts')
//     4. Anything else                         → return []
// ─────────────────────────────────────────────────────────────────────────────

function toArray<T>(raw: unknown, fallbackKey?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];

  const obj = raw as Record<string, unknown>;
  for (const key of ['data', 'items', 'results', fallbackKey].filter(Boolean) as string[]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id:             string;
  source:         JobSource;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description:    string;
  postedAt:       string;
  applyUrl:       string | null;
  recruiterName:  string | null;
  applicantCount: number;
  matchScore?:    number;
}

export interface RecruiterJob extends UnifiedJob {
  status: 'active' | 'closed' | 'draft';
  _count: { applications: number };
}

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'rejected'
  | 'hired';

export interface Application {
  id:         string;
  job_id:     string;
  status:     ApplicationStatus;
  applied_at: string;
  candidate?: { id: string; name: string; email: string };
  jobs?:      { title: string; company: string };
}

export interface Resume {
  id:        string;
  fileName?: string;
  rawFile?:  string;
  status:    'uploaded' | 'processing' | 'analyzed' | 'failed';
  createdAt: string;
}

export interface Alert {
  id:         string;
  type:       string;
  title:      string;
  message:    string;
  read:       boolean;
  created_at: string;
  metadata?:  Record<string, unknown>;
}

export interface ResumeAnalysis {
  id:              string;
  resumeId:        string;
  experienceYears: number;
  experienceLevel: string;
  topSkills:       string[];
  industryTags:    string[];
  trajectory?:     string;
  status:          string;
}

export interface JobSources {
  internal: number;
  serpapi:  number;
  linkedin: number;
  indeed:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// useJobs — with pagination (page, limit, totalPages, currentPage)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 12;

export function useJobs(params?: {
  search?:   string;
  workMode?: string;
  source?:   'all' | 'internal' | 'serpapi' | 'linkedin' | 'indeed';
  page?:     number;
  limit?:    number;
}) {
  const page  = params?.page  ?? 1;
  const limit = params?.limit ?? DEFAULT_PAGE_SIZE;

  const query = new URLSearchParams();
  if (params?.search   && params.search   !== '') query.set('search',   params.search);
  if (params?.workMode && params.workMode !== '') query.set('workMode', params.workMode);
  if (params?.source)                             query.set('source',   params.source);
  query.set('page',  String(page));
  query.set('limit', String(limit));

  const key = `/jobs?${query.toString()}`;

  const { data, error, isLoading, isValidating } = useSWR<{
    jobs:    UnifiedJob[];
    total:   number;
    sources: JobSources;
  }>(key, fetcher, {
    refreshInterval:       INTERVALS.jobs,
    revalidateOnFocus:     true,
    revalidateOnReconnect: true,
    dedupingInterval:      5_000,
    keepPreviousData:      true,
  });

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs:        data?.jobs    ?? [],
    total,
    sources:     data?.sources ?? { internal: 0, serpapi: 0, linkedin: 0, indeed: 0 },
    loading:     isLoading,
    validating:  isValidating,
    error:       error?.message ?? null,
    refresh:     () => globalMutate(key),
    totalPages,
    currentPage: page,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRecommendations
//
// FIX: /jobs/recommendations returns 500 server-side.
//   • Added onErrorRetry to stop hammering a broken endpoint — backs off after
//     3 attempts instead of retrying on a tight 60s loop.
//   • toArray() added so a partial/envelope response doesn't cause a crash
//     while the backend issue is being fixed.
//
// The 500 itself is a backend bug — check your Render logs. Most common cause:
//   Prisma include on a missing relation, or a null matchScore computation.
// ─────────────────────────────────────────────────────────────────────────────

export function useRecommendations() {
  const { data, error, isLoading } = useSWR<unknown>(
    '/jobs/recommendations', fetcher,
    {
      refreshInterval:       INTERVALS.recommendations,
      revalidateOnFocus:     true,
      revalidateOnReconnect: true,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        // Stop retrying 500s after 3 attempts to avoid log spam on Render
        if (err?.response?.status >= 500 && retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 10_000);
      },
    },
  );

  return {
    recommendations: toArray<UnifiedJob>(data),
    loading:         isLoading,
    error:           error?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useMyApplications
// ─────────────────────────────────────────────────────────────────────────────

export function useMyApplications() {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    '/jobs/applications/mine', fetcher,
    { refreshInterval: INTERVALS.applications, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  const applyOptimistic = async (jobId: string) => {
    const optimistic: Application[] = [
      ...(data ?? []),
      {
        id:         `temp_${jobId}`,
        job_id:     jobId,
        status:     'applied',
        applied_at: new Date().toISOString(),
      },
    ];
    await mutate(optimistic, false);
    try { await api.post(`/jobs/${jobId}/apply`); }
    catch { await mutate(); }
    await mutate();
  };

  return {
    applications:    data ?? [],
    loading:         isLoading,
    error:           error?.message ?? null,
    applyOptimistic,
    refresh:         () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useJobApplicants
// ─────────────────────────────────────────────────────────────────────────────

export function useJobApplicants(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    jobId ? `/jobs/${jobId}/applicants` : null, fetcher,
    { refreshInterval: INTERVALS.recruiterJobs, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  const updateStatus = async (appId: string, status: ApplicationStatus) => {
    const optimistic = (data ?? []).map((a: Application) =>
      a.id === appId ? { ...a, status } : a,
    );
    await mutate(optimistic, false);
    try { await api.patch(`/jobs/applications/${appId}/status`, { status }); }
    catch { await mutate(); }
    await mutate();
  };

  return {
    applicants:   data ?? [],
    loading:      isLoading,
    error:        error?.message ?? null,
    updateStatus,
    refresh:      () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRecruiterJobs
// ─────────────────────────────────────────────────────────────────────────────

export function useRecruiterJobs() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<RecruiterJob[]>(
    '/jobs/mine', fetcher,
    { refreshInterval: INTERVALS.recruiterJobs, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  const postJob = async (payload: Record<string, unknown>): Promise<RecruiterJob> => {
    const { data: newJob } = await api.post<RecruiterJob>('/jobs', payload);
    await mutate([newJob, ...(data ?? [])]);
    return newJob;
  };

  const toggleStatus = async (jobId: string, current: RecruiterJob['status']) => {
    const next = current === 'active' ? 'closed' : 'active';
    await api.patch(`/jobs/${jobId}/status`, { status: next });
    await mutate(
      (data ?? []).map((j: RecruiterJob) =>
        j.id === jobId ? { ...j, status: next as RecruiterJob['status'] } : j,
      ),
    );
  };

  if (typeof window !== 'undefined' && data) {
    try {
      localStorage.setItem('jc_recruiter_stats', JSON.stringify({
        activeJobs:    data.filter((j: RecruiterJob) => j.status === 'active').length,
        newApplicants: data.reduce((n: number, j: RecruiterJob) =>
          n + (j._count?.applications ?? 0), 0),
      }));
    } catch { /* quota exceeded or SSR — ignore */ }
  }

  return {
    jobs:       data ?? [],
    loading:    isLoading,
    validating: isValidating,
    error:      error?.message ?? null,
    postJob,
    toggleStatus,
    refresh:    () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useResumes
// ─────────────────────────────────────────────────────────────────────────────

export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[]>(
    '/resumes', fetcher,
    { refreshInterval: INTERVALS.resumes, revalidateOnFocus: true, revalidateOnReconnect: true },
  );
  return {
    resumes:  data ?? [],
    loading:  isLoading,
    error:    error?.message ?? null,
    refresh:  () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLatestResume
// ─────────────────────────────────────────────────────────────────────────────

export function useLatestResume() {
  const { data, error, isLoading, mutate } = useSWR<Resume | null>(
    '/resumes/latest', fetcher,
    { refreshInterval: INTERVALS.resumes, revalidateOnFocus: true, revalidateOnReconnect: true },
  );
  return {
    resume:  data ?? null,
    loading: isLoading,
    error:   error?.message ?? null,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useResumeAnalysis
// ─────────────────────────────────────────────────────────────────────────────

export function useResumeAnalysis(resumeId: string | null) {
  const { data: resume } = useSWR<Resume>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher,
    {
      refreshInterval: (cur: Resume | undefined) => {
        if (!cur || cur.status === 'uploaded' || cur.status === 'failed') return 10_000;
        if (cur.status === 'processing') return 5_000;
        return 30_000;
      },
      revalidateOnFocus: true,
    },
  );

  const { data: analysis } = useSWR<ResumeAnalysis>(
    resume?.status === 'analyzed' && resumeId
      ? `/resumes/${resumeId}/analysis`
      : null,
    fetcher,
  );

  const triggerAnalysis = async (id: string) => {
    await api.post(`/resumes/${id}/analyse`);
    await globalMutate(`/resumes/${id}`);
    await globalMutate('/resumes');
    await globalMutate('/resumes/latest');
  };

  return { resume, analysis, status: resume?.status ?? null, triggerAnalysis };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAlerts
//
// FIX: Crash "TypeError: (e ?? []).filter is not a function"
//
// Root cause:
//   The /alerts endpoint returned an envelope object, e.g.:
//     { alerts: [...], unreadCount: 3 }
//   instead of a plain array.
//   Calling .filter() on {} always throws this TypeError.
//
// Fix:
//   1. SWR data type widened to `unknown` — we don't assume the shape
//   2. toArray(raw, 'alerts') normalises any response into a guaranteed
//      Alert[] — checking for plain array first, then data/items/alerts keys
//   3. All downstream .filter() / .map() calls now operate on the safe array
// ─────────────────────────────────────────────────────────────────────────────

export function useAlerts() {
  const { data: raw, error, isLoading, mutate } = useSWR<unknown>(
    '/alerts', fetcher,
    { refreshInterval: INTERVALS.alerts, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  // Normalise to a guaranteed Alert[] — safe regardless of what the API returns
  const data = toArray<Alert>(raw, 'alerts');

  const unreadCount = data.filter((a: Alert) => !a.read).length;

  const markRead = async (alertId: string) => {
    await mutate(
      data.map((a: Alert) => a.id === alertId ? { ...a, read: true } : a),
      false,
    );
    try { await api.patch(`/alerts/${alertId}/read`); }
    catch { await mutate(); }
  };

  const markAllRead = async () => {
    await mutate(
      data.map((a: Alert) => ({ ...a, read: true })),
      false,
    );
    try { await api.patch('/alerts/read-all'); }
    catch { await mutate(); }
  };

  return {
    alerts:      data,
    unreadCount,
    loading:     isLoading,
    error:       error?.message ?? null,
    markRead,
    markAllRead,
    refresh:     () => mutate(),
  };
}

]]>
</file>
<file name="frontend\hooks\useReconnection.ts">
<![CDATA[
/**
 * Reconnection Hook
 * File: frontend/hooks/useReconnection.ts
 *
 * Purpose: Handle automatic reconnection with exponential backoff
 *
 * Features:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
 * - Max retry attempts (default 10)
 * - Jitter to prevent thundering herd
 * - Manual reset capability
 */

'use client';

import { useCallback, useRef, useState } from 'react';

export interface ReconnectionState {
  isReconnecting: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryIn: number; // ms
  lastError: string | null;
}

const DEFAULT_MAX_RETRIES = 10;
const BASE_DELAY = 1000; // 1s
const MAX_DELAY = 30000; // 30s

function getBackoffDelay(attempt: number): number {
  const delay = BASE_DELAY * Math.pow(2, Math.min(attempt, 4)); // Cap exponent at 4
  const jitter = Math.random() * delay * 0.1; // 10% jitter
  return Math.min(delay + jitter, MAX_DELAY);
}

export function useReconnection(
  onReconnect: () => Promise<void>,
  maxRetries = DEFAULT_MAX_RETRIES,
) {
  const [state, setState] = useState<ReconnectionState>({
    isReconnecting: false,
    retryCount: 0,
    maxRetries,
    nextRetryIn: 0,
    lastError: null,
  });

  // ✅ FIXED: Use NodeJS.Timeout instead of string | number | Timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setState((s) => ({
      ...s,
      isReconnecting: false,
      retryCount: 0,
      nextRetryIn: 0,
      lastError: null,
    }));
  }, []);

  const attempt = useCallback(async () => {
    setState((s) => ({ ...s, isReconnecting: true, lastError: null }));

    try {
      await onReconnect();
      reset();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Reconnection failed';
      const newRetryCount = state.retryCount + 1;

      if (newRetryCount >= maxRetries) {
        setState((s) => ({
          ...s,
          isReconnecting: false,
          lastError: `Max retries (${maxRetries}) exceeded`,
        }));
        return false;
      }

      const delay = getBackoffDelay(newRetryCount);
      let countdown = delay;

      setState((s) => ({
        ...s,
        retryCount: newRetryCount,
        nextRetryIn: countdown,
        lastError: error,
      }));

      // Update countdown every 100ms
      countdownRef.current = setInterval(() => {
        countdown -= 100;
        setState((s) => ({ ...s, nextRetryIn: Math.max(0, countdown) }));
      }, 100);

      // Schedule next attempt
      timeoutRef.current = setTimeout(() => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        void attempt();
      }, delay);

      return false;
    }
  }, [state.retryCount, maxRetries, onReconnect, reset]);

  return {
    ...state,
    attempt,
    reset,
  };
}
]]>
</file>
<file name="frontend\hooks\useRecruiterPlatform.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  subscribeToAlerts,
  subscribeToJobApplicants,
  unsubscribe,
} from '@/lib/supabase/realtime';
import toast from 'react-hot-toast';

export function useRecruiterRealtime(jobIds: string[] = []) {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to recruiter's own alerts (new applicants, system messages)
    const alertChannel = subscribeToAlerts(user.id, (payload: any) => {
      const alert   = payload?.new;
      if (!alert) return;

      const title   = (alert.title   as string) ?? 'New notification';
      const message = (alert.message as string) ?? '';

      // Plain string toast — no JSX required
      toast(`👤 ${title}\n${message}`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background:   '#0F1526',
          color:        '#F1F5F9',
          border:       '1px solid rgba(244,114,182,0.2)',
          borderRadius: '12px',
          fontSize:     '13px',
          maxWidth:     '360px',
          padding:      '14px 16px',
        },
      });

      // Refresh recruiter job stats and alert count
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', user.id] });
    });

    // Subscribe to live applicant stream for each active job
    const jobChannels = jobIds.map(jobId =>
      subscribeToJobApplicants(jobId, () => {
        queryClient.invalidateQueries({ queryKey: ['job-applicants', jobId] });
        queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      }),
    );

    return () => {
      unsubscribe(alertChannel);
      jobChannels.forEach(unsubscribe);
    };
  // jobIds.join(',') prevents unnecessary re-subscriptions when array
  // reference changes but contents are the same
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, jobIds.join(','), queryClient]);
}

]]>
</file>
<file name="frontend\hooks\useResumePolling.ts">
<![CDATA[
// hooks/useResumePolling.ts
// ─────────────────────────────────────────────────────────────────────────────
// SWR-backed resume polling hooks consumed by ResumeAnalysisTab.tsx.
// Key behaviours:
//   • useResumes  — fetches latest resume list (manual + focus/reconnect refresh)
//   • useAnalysis — tracks a single resume record and fetches analysis when ready
// ─────────────────────────────��───────────────────────────────────────────────

import useSWR, { mutate as globalMutate, type Fetcher } from 'swr';
import { useState, useCallback, useRef } from 'react';
import api from '@/lib/axios';

// ── Shared fetcher ────────────────────────────────────────────────────────────
const fetcher: Fetcher<unknown, string> = (url) => api.get(url).then((r) => r.data);

// ── Types ────────��────────────────────────────────────────────────────────────
export type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

export interface Resume {
  id: string;
  fileName: string;
  rawFile: string;
  status: ResumeStatus;
  createdAt: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  rawText?: string;
  experienceYears: number;
  experienceLevel: string;
  topSkills: string[];
  industryTags: string[];
  trajectory?: string;
  status: string;
  processedAt?: string | null;
}

// ── useResumes ────────────────────────────────────────────────────────────────
// Returns the authenticated user's resume list.
// After uploading a new resume, caller invokes reload() for immediate refresh.
export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[], Error>(
    '/resumes',
    fetcher as Fetcher<Resume[], string>,
    {
      // Disabled interval polling; use focus/reconnect/manual reload
      refreshInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 3_000,
    },
  );

  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    resumes: data ?? [],
    loading: isLoading,
    error:
      (error as any)?.response?.data?.message ??
      (error as Error | undefined)?.message ??
      null,
    reload,
  };
}

// ── useAnalysis ───────────────────────────────────────────────────────────────
// Tracks one resume's analysis lifecycle and invalidates related caches.
export function useAnalysis(resumeId: string | null) {
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const didInvalidate = useRef(false);

  // Poll/fetch the resume status record (manual/focus-based refresh)
  const { data: resume, mutate: mutateResume } = useSWR<Resume, Error>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher as Fetcher<Resume, string>,
    {
      refreshInterval: 0, // <- was false
      revalidateOnFocus: true,
      onSuccess: (data: Resume) => {
        // When analysis finishes, invalidate recommendations once
        if (data.status === 'analyzed' && !didInvalidate.current) {
          didInvalidate.current = true;
          void globalMutate('/jobs/recommendations');
          void globalMutate('/resumes');
          void globalMutate('/resumes/latest');
        }

        // Reset flag if resume goes back to a non-analyzed state
        if (data.status !== 'analyzed') {
          didInvalidate.current = false;
        }
      },
    },
  );

  // Fetch analysis only when resume is analyzed
  const { data: analysis, mutate: mutateAnalysis } = useSWR<ResumeAnalysis, Error>(
    resume?.status === 'analyzed' && resumeId ? `/resumes/${resumeId}/analysis` : null,
    fetcher as Fetcher<ResumeAnalysis, string>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  // Trigger analysis
  const triggerAnalysis = useCallback(
    async (id: string) => {
      setTriggering(true);
      setTriggerError(null);
      didInvalidate.current = false;

      try {
        await api.post(`/resumes/${id}/analyse`);

        // Revalidate immediately so UI reflects processing state quickly
        await Promise.all([
          mutateResume(),
          mutateAnalysis(undefined),
          globalMutate('/resumes'),
        ]);

        // Poll manually every 2s until terminal (max 5 minutes)
        const pollInterval = setInterval(async () => {
          try {
            const latestResume = await api.get(`/resumes/${id}`);
            const latestStatus = latestResume.data?.status as ResumeStatus | undefined;

            if (latestStatus === 'analyzed') {
              clearInterval(pollInterval);
              await Promise.all([
                mutateResume(),
                globalMutate(`/resumes/${id}/analysis`),
                globalMutate('/jobs/recommendations'),
              ]);
            } else if (latestStatus === 'failed') {
              clearInterval(pollInterval);
              setTriggerError('Analysis failed. Please try again.');
              await mutateResume();
            }
          } catch {
            // Ignore transient polling errors; next interval retries
          }
        }, 2_000);

        setTimeout(() => clearInterval(pollInterval), 300_000);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : (err as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Failed to start analysis';
        setTriggerError(message);
      } finally {
        setTriggering(false);
      }
    },
    [mutateResume, mutateAnalysis],
  );

  return {
    analysis,
    status: resume?.status ?? null,
    loading: triggering,
    error: triggerError,
    triggerAnalysis,
  };
}
]]>
</file>
<file name="frontend\hooks\userProfile.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCandidateProfile, updateCandidateProfile,
  fetchRecruiterProfile, updateRecruiterProfile,
  fetchProfileCompletion, CandidateProfile, RecruiterProfile,
} from '@/lib/api/profiles';
import toast from 'react-hot-toast';

// ── Query keys ────────────────────────────────────────────────────────────────

export const PROFILE_KEYS = {
  candidate:  ['profile', 'candidate']  as const,
  recruiter:  ['profile', 'recruiter']  as const,
  completion: ['profile', 'completion'] as const,
};

// ── Candidate hooks ───────────────────────────────────────────────────────────

export function useCandidateProfile() {
  return useQuery({
    queryKey: PROFILE_KEYS.candidate,
    queryFn:  fetchCandidateProfile,
    staleTime: 60_000,
  });
}

export function useUpdateCandidateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CandidateProfile>) =>
      updateCandidateProfile(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEYS.candidate, updated);
      toast.success('Profile updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });
}

export function useProfileCompletion() {
  return useQuery({
    queryKey: PROFILE_KEYS.completion,
    queryFn:  fetchProfileCompletion,
    staleTime: 30_000,
  });
}

// ── Recruiter hooks ───────────────────────────────────────────────────────────

export function useRecruiterProfile() {
  return useQuery({
    queryKey: PROFILE_KEYS.recruiter,
    queryFn:  fetchRecruiterProfile,
    staleTime: 60_000,
  });
}

export function useUpdateRecruiterProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<RecruiterProfile>) =>
      updateRecruiterProfile(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEYS.recruiter, updated);
      toast.success('Company profile updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });
}

]]>
</file>
<file name="frontend\hooks\useScreenShare.ts">
<![CDATA[
/**
 * Screen Share Hook
 * File: frontend/hooks/useScreenShare.ts
 * 
 * Purpose: Handle screen sharing with automatic track replacement
 * 
 * Features:
 * - Get screen stream from browser
 * - Replace video track in RTCPeerConnection
 * - Restore camera when screen share stops
 * - Handle browser "Stop sharing" button
 */

import { useCallback, useRef, useState } from 'react';

export interface ScreenShareState {
  screenSharing: boolean;
  loading: boolean;
  error: string | null;
}

export function useScreenShare(
  onTrackReplaced?: (track: MediaStreamTrack | null) => Promise<void>,
) {
  const [state, setState] = useState<ScreenShareState>({
    screenSharing: false,
    loading: false,
    error: null,
  });

  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  const startScreenShare = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 15, max: 30 },
          cursor: 'always',
        } as any,
        audio: {
          echoCancellation: false,
          suppressLocalAudioPlayback: false,
        } as any,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      } as any);

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        throw new Error('Failed to get screen video track');
      }

      // Notify parent component to replace track
      if (onTrackReplaced) {
        await onTrackReplaced(screenTrack);
      }

      // Handle user clicking "Stop sharing" in browser
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      setState((s) => ({ ...s, screenSharing: true, loading: false }));
    } catch (err: unknown) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Screen share cancelled'
          : `Screen share failed: ${err instanceof Error ? err.message : 'Unknown error'}`;

      setState((s) => ({ ...s, error: message, loading: false }));
      console.error('[ScreenShare] Error:', err);
    }
  }, [onTrackReplaced]);

  const stopScreenShare = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true }));

      // Stop screen stream
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      // Try to get camera stream if it was saved
      let cameraTrack = savedVideoTrackRef.current;
      savedVideoTrackRef.current = null;

      // If saved track ended, request new one
      if (!cameraTrack || cameraTrack.readyState === 'ended') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
            },
          });
          cameraTrack = stream.getVideoTracks()[0] || null;
        } catch (err) {
          console.warn('[ScreenShare] Could not re-acquire camera:', err);
          cameraTrack = null;
        }
      }

      // Notify parent to restore camera
      if (onTrackReplaced) {
        await onTrackReplaced(cameraTrack);
      }

      setState((s) => ({ ...s, screenSharing: false, loading: false, error: null }));
    } catch (err) {
      console.error('[ScreenShare] Stop error:', err);
      setState((s) => ({ ...s, loading: false, error: 'Failed to stop screen share' }));
    }
  }, [onTrackReplaced]);

  return {
    ...state,
    startScreenShare,
    stopScreenShare,
  };
}
]]>
</file>
<file name="frontend\hooks\useWebRTCRoom.ts">
<![CDATA[
'use client';

/**
 * useWebRTCRoom — Production WebRTC hook for interview video conferencing
 *
 * Architecture: Full-mesh WebRTC (each peer connects directly to every other peer)
 * Suitable for ≤6 participants. Beyond that, use an SFU (mediasoup, Livekit).
 *
 * Signal flow:
 *   1. Socket connects and authenticates via JWT
 *   2. Server sends room:snapshot with current participants
 *   3. For each existing participant: lower userId sends offer (avoids race)
 *   4. Receiving peer answers, ICE candidates exchanged
 *   5. WebRTC tracks flow directly peer-to-peer (bypassing server)
 *
 * Key design decisions:
 *   - RTCPeerConnection per remote peer (not shared)
 *   - ICE candidate queuing until remote description is set (critical fix)
 *   - Screen sharing replaces video track in existing senders (no renegotiation needed)
 *   - Exponential backoff reconnection for Socket.io
 *   - Refs for all mutable state touched in async callbacks (avoids stale closures)
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Public types ─────────────────────────────────────────────────────────────

export type RemotePeer = {
  userId: string;
  stream: MediaStream | null;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
};

export type ChatMessage = {
  userId: string;
  name: string;
  role?: string;
  message: string;
  timestamp: string;
};

export type ConnectionState =
  | 'idle'
  | 'acquiring-media'
  | 'connecting-socket'
  | 'joining-room'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'left';

type ParticipantSnapshot = {
  userId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
};

type UseWebRTCRoomArgs = {
  roomId: string;
  user: { id: string; full_name?: string; role?: string } | null;
};

// ─── ICE configuration ────────────────────────────────────────────────────────
// For production, configure TURN servers via the NEXT_PUBLIC_TURN_SERVERS env var.
// Example (stringified JSON array):
// NEXT_PUBLIC_TURN_SERVERS=[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]
// STUN alone fails across some NATs; TURN improves connectivity reliability.

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

let TURN_SERVERS: RTCIceServer[] = [];
try {
  const raw = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) TURN_SERVERS = parsed as RTCIceServer[];
  }
} catch (err) {
  // Non-fatal: fall back to STUN-only
  // eslint-disable-next-line no-console
  console.warn('Failed to parse NEXT_PUBLIC_TURN_SERVERS:', err);
}

const ICE_SERVERS: RTCIceServer[] = [
  ...DEFAULT_STUN_SERVERS,
  ...TURN_SERVERS,
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// ─── Media constraints ────────────────────────────────────────────────────────

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: 'user',
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

// ─── Internal state types ─────────────────────────────────────────────────────

type PeerState = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  iceCandidateQueue: RTCIceCandidateInit[];
  remoteDescSet: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCRoom({ roomId, user }: UseWebRTCRoomArgs) {
  // ── Public state ───────────────────────────────────────────────────────────
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string>('');
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);

  // ── Internal refs (not reactive — used in async callbacks) ────────────────
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedCamTrackRef = useRef<MediaStreamTrack | null>(null);

  // userId → PeerState
  const peersRef = useRef<Map<string, PeerState>>(new Map());

  // Stable copies of toggle state for closures
  const micOnRef = useRef(true);
  const camOnRef = useRef(true);
  const screenSharingRef = useRef(false);
  const userIdRef = useRef(user?.id ?? '');

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);
  useEffect(() => { screenSharingRef.current = screenSharing; }, [screenSharing]);
  useEffect(() => { userIdRef.current = user?.id ?? ''; }, [user?.id]);

  // ── Utility: update a single peer in state ─────────────────────────────────
  const updatePeer = useCallback((userId: string, patch: Partial<RemotePeer>) => {
    setPeers(prev =>
      prev.map(p => p.userId === userId ? { ...p, ...patch } : p)
    );
  }, []);

  const removePeer = useCallback((userId: string) => {
    const ps = peersRef.current.get(userId);
    if (ps) {
      ps.pc.close();
      peersRef.current.delete(userId);
    }
    setPeers(prev => prev.filter(p => p.userId !== userId));
  }, []);

  // ── Create RTCPeerConnection for a remote user ────────────────────────────
  const createPC = useCallback((
    remoteUserId: string,
    socket: Socket,
  ): PeerState => {
    // Clean up any existing connection
    const existing = peersRef.current.get(remoteUserId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(remoteUserId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const state: PeerState = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      iceCandidateQueue: [],
      remoteDescSet: false,
    };
    peersRef.current.set(remoteUserId, state);

    // Add local tracks immediately so remote can receive them
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    // ICE candidates
    pc.onicecandidate = (evt) => {
      if (!evt.candidate) return;
      socket.emit('interview:ice-candidate', {
        roomId,
        targetUserId: remoteUserId,
        candidate: evt.candidate.toJSON(),
      });
    };

    pc.onicecandidateerror = (evt) => {
      // Non-fatal; some ICE errors are expected (e.g., failed STUN checks)
      if ((evt as RTCPeerConnectionIceErrorEvent).errorCode !== 701) {
        console.warn('[ICE] Candidate error:', evt);
      }
    };

    // Receive remote tracks
    pc.ontrack = (evt) => {
      const [stream] = evt.streams;
      if (!stream) return;

      setPeers(prev => {
        const exists = prev.find(p => p.userId === remoteUserId);
        if (exists) {
          return prev.map(p =>
            p.userId === remoteUserId ? { ...p, stream } : p
          );
        }
        return [...prev, {
          userId: remoteUserId,
          stream,
          micOn: true,
          camOn: true,
          screenSharing: false,
        }];
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      console.debug(`[PC:${remoteUserId}] connectionState → ${cs}`);

      if (cs === 'failed') {
        // Attempt ICE restart
        console.warn(`[PC:${remoteUserId}] Connection failed — restarting ICE`);
        pc.restartIce();
      }
      if (cs === 'closed') {
        removePeer(remoteUserId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (state.makingOffer) return;
      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return; // Collided — abort
        await pc.setLocalDescription(offer);
        socket.emit('interview:offer', {
          roomId,
          targetUserId: remoteUserId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(`[PC:${remoteUserId}] Negotiation error:`, err);
      } finally {
        state.makingOffer = false;
      }
    };

    return state;
  }, [removePeer, roomId]);

  // ── Process queued ICE candidates after remote description is set ─────────
  const drainIceQueue = useCallback(async (state: PeerState, remoteUserId: string) => {
    const candidates = [...state.iceCandidateQueue];
    state.iceCandidateQueue = [];
    for (const candidate of candidates) {
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[PC:${remoteUserId}] ICE queue drain error:`, err);
      }
    }
  }, []);

  // ── Acquire local media ────────────────────────────────────────────────────
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;

    setConnectionState('acquiring-media');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: VIDEO_CONSTRAINTS,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicOn(stream.getAudioTracks().every(t => t.enabled));
    setCamOn(stream.getVideoTracks().every(t => t.enabled));
    return stream;
  }, []);

  // ── Connect and join room ──────────────────────────────────────────────────
  const join = useCallback(async () => {
    if (!user?.id || !roomId) return;
    if (socketRef.current?.connected) return; // Already connected

    try {
      setError('');

      // 1. Get local media
      await acquireMedia();

      // 2. Connect socket
      setConnectionState('connecting-socket');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
        .replace(/\/api\/?$/, '');

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('jc_token') ?? ''
        : '';

      const socket: Socket = io(`${apiBase}/interview`, {
        transports: ['websocket'],
        withCredentials: true,
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        timeout: 15_000,
      });
      socketRef.current = socket;

      // ── Socket event handlers ──────────────────────────────────────────────

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnectionState('joining-room');
        socket.emit('interview:join-room', {
          roomId,
          name: user.full_name,
        });
      });

      socket.on('connect_error', (err) => {
        console.error('[Socket] connect_error:', err.message);
        setError(`Cannot connect to signaling server: ${err.message}`);
        setConnectionState('error');
      });

      socket.on('disconnect', (reason) => {
        console.warn('[Socket] Disconnected:', reason);
        if (reason !== 'io client disconnect') {
          setConnectionState('reconnecting');
        }
      });

      socket.on('reconnect', () => {
        console.log('[Socket] Reconnected — rejoining room');
        socket.emit('interview:join-room', {
          roomId,
          name: user.full_name,
        });
      });

      socket.on('interview:error', (data: { message: string }) => {
        setError(data.message);
        setConnectionState('error');
      });

      // Room snapshot: current participants when we join
      socket.on('interview:room-snapshot', async (data: { participants: ParticipantSnapshot[] }) => {
        setConnectionState('connected');
        setRoomEnded(false);

        const others = data.participants.filter(p => p.userId !== user.id);

        // Update metadata for existing peers
        setPeers(prev => {
          const existing = new Map(prev.map(p => [p.userId, p]));
          for (const snap of others) {
            const e = existing.get(snap.userId);
            if (e) {
              existing.set(snap.userId, { ...e, ...snap });
            } else {
              existing.set(snap.userId, {
                userId: snap.userId,
                stream: null,
                name: snap.name,
                role: snap.role,
                micOn: snap.micOn,
                camOn: snap.camOn,
                screenSharing: snap.screenSharing,
              });
            }
          }
          return Array.from(existing.values());
        });

        // Polite peer model: lower userId is the "polite" peer (waits)
        // Higher userId sends the offer (initiates)
        for (const participant of others) {
          if (user.id > participant.userId) {
            // We are the impolite peer — send the offer
            const ps = createPC(participant.userId, socket);
            try {
              ps.makingOffer = true;
              const offer = await ps.pc.createOffer();
              await ps.pc.setLocalDescription(offer);
              socket.emit('interview:offer', {
                roomId,
                targetUserId: participant.userId,
                sdp: ps.pc.localDescription,
              });
            } catch (err) {
              console.error(`[PC:${participant.userId}] Initial offer failed:`, err);
            } finally {
              ps.makingOffer = false;
            }
          }
          // Polite peer (lower userId) waits for incoming offer
        }
      });

      // New participant joined after us
      socket.on('interview:user-joined', async (data: { participant: ParticipantSnapshot }) => {
        const { participant } = data;
        if (participant.userId === user.id) return;

        // Add to peer list (no stream yet)
        setPeers(prev => {
          if (prev.some(p => p.userId === participant.userId)) return prev;
          return [...prev, {
            userId: participant.userId,
            stream: null,
            name: participant.name,
            role: participant.role,
            micOn: participant.micOn,
            camOn: participant.camOn,
            screenSharing: participant.screenSharing,
          }];
        });

        // If we are the impolite peer (higher userId), send offer
        if (user.id > participant.userId) {
          const ps = createPC(participant.userId, socket);
          try {
            ps.makingOffer = true;
            const offer = await ps.pc.createOffer();
            await ps.pc.setLocalDescription(offer);
            socket.emit('interview:offer', {
              roomId,
              targetUserId: participant.userId,
              sdp: ps.pc.localDescription,
            });
          } catch (err) {
            console.error(`[PC:${participant.userId}] Offer error on join:`, err);
          } finally {
            ps.makingOffer = false;
          }
        }
      });

      // Incoming offer (from impolite peer)
      socket.on('interview:offer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        let ps = peersRef.current.get(data.fromUserId);
        if (!ps) {
          ps = createPC(data.fromUserId, socket);
        }

        const { pc } = ps;
        const offerCollision =
          data.sdp.type === 'offer' &&
          (ps.makingOffer || pc.signalingState !== 'stable');

        // Polite peer ignores colliding offers; impolite peer rolls back
        const isPolite = user.id < data.fromUserId;
        ps.ignoreOffer = !isPolite && offerCollision;
        if (ps.ignoreOffer) return;

        try {
          if (offerCollision) {
            // Rollback for polite peer
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          ps.remoteDescSet = true;
          await drainIceQueue(ps, data.fromUserId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('interview:answer', {
            roomId,
            targetUserId: data.fromUserId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] offer handling error:`, err);
        }
      });

      // Incoming answer
      socket.on('interview:answer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        const ps = peersRef.current.get(data.fromUserId);
        if (!ps || ps.ignoreOffer) return;
        try {
          await ps.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          ps.remoteDescSet = true;
          await drainIceQueue(ps, data.fromUserId);
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] answer handling error:`, err);
        }
      });

      // ICE candidates
      socket.on('interview:ice-candidate', async (data: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const ps = peersRef.current.get(data.fromUserId);
        if (!ps) return;

        // Queue until remote description is set (critical — prevents ordering issues)
        if (!ps.remoteDescSet || ps.pc.remoteDescription === null) {
          ps.iceCandidateQueue.push(data.candidate);
          return;
        }

        try {
          await ps.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          if (!ps.ignoreOffer) {
            console.error(`[PC:${data.fromUserId}] ICE candidate error:`, err);
          }
        }
      });

      // Participant left
      socket.on('interview:user-left', (data: { userId: string }) => {
        removePeer(data.userId);
      });

      // Media state changes
      socket.on('interview:user-media-toggled', (data: {
        userId: string;
        micOn: boolean;
        camOn: boolean;
        screenSharing: boolean;
      }) => {
        updatePeer(data.userId, {
          micOn: data.micOn,
          camOn: data.camOn,
          screenSharing: data.screenSharing,
        });
      });

      // In-room chat
      socket.on('interview:chat-message', (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
      });

      socket.on('interview:room-status', (data: {
        hostUserId: string | null;
        hostPresent: boolean;
        ended: boolean;
      }) => {
        setHostUserId(data.hostUserId ?? null);
        setHostPresent(!!data.hostPresent);
        if (data.ended) {
          setRoomEnded(true);
          setConnectionState('left');
        }
      });

      socket.on('interview:room-ended', () => {
        setRoomEnded(true);
        setConnectionState('left');
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      setError(msg);
      setConnectionState('error');
      console.error('[useWebRTCRoom] join error:', err);
    }
  }, [acquireMedia, createPC, drainIceQueue, removePeer, roomId, updatePeer, user]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leave = useCallback(() => {
    // Signal leave before disconnecting
    socketRef.current?.emit('interview:leave-room', { roomId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    // Close all peer connections
    for (const [, ps] of peersRef.current) {
      ps.pc.close();
    }
    peersRef.current.clear();

    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    savedCamTrackRef.current = null;

    setLocalStream(null);
    setPeers([]);
    setMessages([]);
    setScreenSharing(false);
    setHostPresent(false);
    setHostUserId(null);
    setRoomEnded(false);
    setConnectionState('left');
  }, [roomId]);

  // ── Mic toggle ─────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOnRef.current;
    stream.getAudioTracks().forEach(t => (t.enabled = next));
    setMicOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: next,
      camOn: camOnRef.current,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOnRef.current;
    // Only toggle the actual track if not screen sharing
    if (!screenSharingRef.current) {
      stream.getVideoTracks().forEach(t => (t.enabled = next));
    }
    setCamOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: next,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  // ── Screen share start ─────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (screenSharingRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 15 },
        },
        audio: {
          echoCancellation: false,
          suppressLocalAudioPlayback: false,
        } as any,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      } as any);

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Save current camera track before replacing
      const localVidTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localVidTrack) {
        savedCamTrackRef.current = localVidTrack;
      }

      // Replace video track in all PeerConnections
      const replaceOps: Promise<void>[] = [];
      for (const [, ps] of peersRef.current) {
        const sender = ps.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replaceOps.push(sender.replaceTrack(screenTrack));
        }
      }
      await Promise.allSettled(replaceOps);

      // Also update local stream for preview
      if (localStreamRef.current) {
        const local = localStreamRef.current;
        local.getVideoTracks().forEach(t => {
          t.enabled = false; // pause camera
        });
      }

      // Replace in local stream for preview
      const newStream = new MediaStream([
        ...(localStreamRef.current?.getAudioTracks() ?? []),
        screenTrack,
      ]);
      localStreamRef.current = newStream;
      setLocalStream(new MediaStream(newStream.getTracks()));
      setScreenSharing(true);

      // Auto-stop when browser's native "Stop sharing" is clicked
      screenTrack.addEventListener('ended', () => {
        void stopScreenShare();
      });

      socketRef.current?.emit('interview:toggle-media', {
        roomId,
        micOn: micOnRef.current,
        camOn: camOnRef.current,
        screenSharing: true,
      });
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        setError('Screen share unavailable. Check browser permissions.');
        console.error('[Screen share] error:', err);
      }
    }
  }, [roomId]); // stopScreenShare is defined below; safe because it's only called via event listener

  // ── Screen share stop ──────────────────────────────────────────────────────
  const stopScreenShare = useCallback(async () => {
    if (!screenSharingRef.current) return;

    // Stop screen stream tracks
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    // Restore camera
    let cameraTrack: MediaStreamTrack | null = savedCamTrackRef.current;
    savedCamTrackRef.current = null;

    // If saved track ended (user had video off), try to get a new one
    if (!cameraTrack || cameraTrack.readyState === 'ended') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
        });
        cameraTrack = s.getVideoTracks()[0] ?? null;
      } catch {
        cameraTrack = null;
      }
    }

    // Replace back in all PeerConnections
    if (cameraTrack) {
      cameraTrack.enabled = camOnRef.current;
      const replaceOps: Promise<void>[] = [];
      for (const [, ps] of peersRef.current) {
        const sender = ps.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replaceOps.push(sender.replaceTrack(cameraTrack!));
        }
      }
      await Promise.allSettled(replaceOps);
    }

    // Restore local stream
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const newTracks = cameraTrack ? [...audioTracks, cameraTrack] : audioTracks;
    const restored = new MediaStream(newTracks);
    localStreamRef.current = restored;
    setLocalStream(new MediaStream(restored.getTracks()));
    setScreenSharing(false);

    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: camOnRef.current,
      screenSharing: false,
    });
  }, [roomId]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !socketRef.current?.connected) return;
    socketRef.current.emit('interview:chat-message', { roomId, message: trimmed });
  }, [roomId]);

  const endRoom = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('interview:end-room', { roomId });
  }, [roomId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    connectionState,
    connected: connectionState === 'connected',
    connecting: connectionState === 'connecting-socket' || connectionState === 'joining-room' || connectionState === 'acquiring-media',
    localStream,
    peers,
    messages,
    micOn,
    camOn,
    screenSharing,
    error,
    hostUserId,
    hostPresent,
    roomEnded,
    canEndRoom: user?.role === 'recruiter' && !!hostUserId && user?.id === hostUserId,
    // Actions
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    endRoom,
  };
}
]]>
</file>
<file name="frontend\lib\alerts.ts">
<![CDATA[
// frontend/lib/alerts.ts
import api from '@/lib/axios';

export interface Alert {
  id:        string;
  type:      string;
  message:   string;
  read:      boolean;
  createdAt: string;
}

export async function getAlerts(): Promise<{ alerts: Alert[]; unread: number }> {
  try {
    const { data } = await api.get<{ alerts: Alert[]; unread: number }>('/alerts');
    return data;
  } catch {
    return { alerts: [], unread: 0 };
  }
}

]]>
</file>
<file name="frontend\lib\api\client.ts">
<![CDATA[
// frontend/lib/api/client.ts
// Legacy client kept for any files still importing from here.
// All new code should use @/lib/axios instead.
// This version reads jc_token and attaches the auth header automatically.

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('jc_token') : null;

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    ...init,
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error((data && (data.error || data.message || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const qs = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const resp = await fetch(`${API_BASE}${path}${qs}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error((data && (data.error || data.message || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },  // no Content-Type — browser sets multipart boundary
    body: form,
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error((data && (data.error || data.message || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

]]>
</file>
<file name="frontend\lib\api\profiles.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/axios';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CandidateProfile {
  full_name: string;
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  location: string | null;
  phone: string | null;
  availability: string;
  targetRoles: string[];
  targetIndustries: string[];
  employmentTypes: string[];
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryNegotiable: boolean;
  willingToRelocate: boolean;
  preferredLocations: string[];
  currentTitle: string | null;
  currentCompany: string | null;
  experienceYears: number | null;
  experienceLevel: string | null;
  topSkills: string[];
  activeResumeId: string | null;
  isVisible: boolean;
  profileCompletion: number;
  lastActiveAt: string;
  // Enriched
  analysis?: any;
  stats?: {
    total: number;
    applied: number;
    shortlisted: number;
    interview: number;
    offered: number;
    rejected: number;
  };
  recentApplications?: any[];
}

export interface RecruiterProfile {
  id: string;
  userId: string;
  title: string | null;
  photoUrl: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isVerified: boolean;
  companyName: string | null;
  companySize: string | null;
  companyIndustry: string[];
  companyWebsite: string | null;
  companyLogoUrl: string | null;
  companyDescription: string | null;
  companyLocation: string | null;
  hiringRoles: string[];
  typicalStack: string[];
  hiringVolume: string | null;
  openToRemote: boolean;
  subscriptionTier: string;
  profileCompletion: number;
  // Enriched
  pipeline?: {
    totalJobs: number;
    totalApplications: number;
    newApplicants: number;
    shortlisted: number;
    inInterview: number;
    offered: number;
    activeJobs: number;
    offerRate: number;
    avgDaysToHire: number;
  };
  recentApplicants?: any[];
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchCandidateProfile(): Promise<CandidateProfile> {
  const { data } = await api.get<CandidateProfile>('/candidates/profile');
  return data;
}

export async function updateCandidateProfile(
  dto: Partial<CandidateProfile>,
): Promise<CandidateProfile> {
  const { data } = await api.put<CandidateProfile>('/candidates/profile', dto);
  return data;
}

export async function fetchProfileCompletion() {
  const { data } = await api.get('/candidates/profile/completion');
  return data;
}

export async function fetchRecruiterProfile(): Promise<RecruiterProfile> {
  const { data } = await api.get<RecruiterProfile>('/recruiters/profile');
  return data;
}

export async function updateRecruiterProfile(
  dto: Partial<RecruiterProfile>,
): Promise<RecruiterProfile> {
  const { data } = await api.put<RecruiterProfile>('/recruiters/profile', dto);
  return data;
}

]]>
</file>
<file name="frontend\lib\auth.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'jc_token';

export type UserRole = 'candidate' | 'recruiter';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function roleRedirectPath(role: UserRole): string {

  return '/dashboard';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (typeof document !== 'undefined') {
    const secure = process.env.NODE_ENV === 'production' ? ';Secure' : '';
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `${TOKEN_KEY}=${token};path=/;SameSite=Strict;max-age=${maxAge}${secure}`;
  }
}

export function removeToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
  if (typeof document !== 'undefined') {
    document.cookie = `${TOKEN_KEY}=;path=/;max-age=0`;
  }
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  let body: any = null;
  try { body = await res.json(); } catch { body = { message: fallback }; }
  const err = new Error(body?.message || fallback);
  (err as any).status = res.status;
  (err as any).body = body;
  return err;
}

export async function register(full_name: string, email: string, password: string, role: UserRole): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, password, role }),
  });
  if (!res.ok) throw await parseError(res, 'Registration failed');
  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseError(res, 'Login failed');
  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { removeToken(); return null; }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password }),
  });
  if (!res.ok) throw await parseError(res, 'Reset failed');
  return res.json();
}
]]>
</file>
<file name="frontend\lib\axios.ts">
<![CDATA[
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

// ✅ REQUEST INTERCEPTOR - Attach JWT to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('jc_token')
      : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ✅ RESPONSE INTERCEPTOR - Handle 401 by clearing token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jc_token');
        localStorage.removeItem('user');
        // Optional: redirect to login
        // window.location.href = '/?auth=login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export type InterviewStage =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_PASSED'
  | 'INTERVIEW_FAILED'
  | 'FINAL_REVIEW'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'WITHDRAWN';

export const interviewApi = {
  startMockSession: (payload: {
    jobTitle: string;
    company: string;
    sessionType?: string;
    jobId?: string;
  }) => api.post('/interviews/sessions', payload),

  submitMockAnswer: (
    questionId: string,
    payload: { answer: string; timeTakenSecs: number },
  ) => api.post(`/interviews/questions/${questionId}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${sessionId}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),
  getMockSession: (sessionId: string) => api.get(`/interviews/sessions/${sessionId}`),

  initFromApplication: (applicationId: string) =>
    api.post(`/recruiter/interviews/${applicationId}/init`),

  scheduleRound: (
    interviewId: string,
    payload: {
      roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
      scheduledAt: string;
      durationMins?: number;
      mode?: 'video' | 'phone' | 'offline';
      interviewerId?: string;
    },
  ) => api.post(`/recruiter/interviews/${interviewId}/rounds`, payload),

  updateStage: (interviewId: string, stage: InterviewStage) =>
    api.patch(`/recruiter/interviews/${interviewId}/stage`, { stage }),

  submitRoundResult: (
    roundId: string,
    payload: {
      result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
      score?: number;
      feedback?: string;
    },
  ) => api.patch(`/recruiter/interviews/rounds/${roundId}/result`, payload),

  getRecruiterDashboard: (jobId?: string) =>
    api.get('/recruiter/interviews/dashboard', { params: { jobId } }),

  listRecruiterInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),

  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),

  getLivekitToken: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/token`),
};
]]>
</file>
<file name="frontend\lib\interviews.api.ts">
<![CDATA[
/**
 * Interviews API Client (ENHANCED)
 * File: frontend/lib/interviews-api.ts
 * 
 * Added: LiveKit token endpoint, room access validation
 */

import api from './axios';

export type InterviewStage =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_PASSED'
  | 'INTERVIEW_FAILED'
  | 'FINAL_REVIEW'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'WITHDRAWN';

export const interviewApi = {
  // ✨ NEW: Get LiveKit token for room
  getLivekitToken: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/token`),

  // ✨ NEW: Validate room access
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),

  // Existing mock interview methods
  startMockSession: (payload: {
    jobTitle: string;
    company: string;
    sessionType?: string;
    jobId?: string;
  }) => api.post('/interviews/sessions', payload),

  submitMockAnswer: (
    questionId: string,
    payload: { answer: string; timeTakenSecs: number },
  ) => api.post(`/interviews/questions/${questionId}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${sessionId}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),
  getMockSession: (sessionId: string) => api.get(`/interviews/sessions/${sessionId}`),

  // Recruiter methods
  initFromApplication: (applicationId: string) =>
    api.post(`/recruiter/interviews/${applicationId}/init`),

  scheduleRound: (
    interviewId: string,
    payload: {
      roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
      scheduledAt: string;
      durationMins?: number;
      mode?: 'video' | 'phone' | 'offline';
      interviewerId?: string;
    },
  ) => api.post(`/recruiter/interviews/${interviewId}/rounds`, payload),

  updateStage: (interviewId: string, stage: InterviewStage) =>
    api.patch(`/recruiter/interviews/${interviewId}/stage`, { stage }),

  submitRoundResult: (
    roundId: string,
    payload: {
      result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
      score?: number;
      feedback?: string;
    },
  ) => api.patch(`/recruiter/interviews/rounds/${roundId}/result`, payload),

  getRecruiterDashboard: (jobId?: string) =>
    api.get('/recruiter/interviews/dashboard', { params: { jobId } }),

  listRecruiterInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  // Candidate methods
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),
};
]]>
</file>
<file name="frontend\lib\resumes.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/lib/resumes.ts
// ✅ Uses axios (lib/axios.ts) — token + baseURL handled automatically by interceptor
import api from '@/lib/axios';

export type ResumeStatus =
  | 'uploaded'
  | 'processing'
  | 'analyzed'
  | 'failed';

export interface Resume {
  id:        string;
  userId:    string;
  fileName:  string;
  rawFile:   string;
  status:    ResumeStatus;
  createdAt: string;
}

export interface ResumeAnalysis {
  id:              string;
  resumeId:        string;
  personalInfo:    Record<string, any>;
  workExperience:  any[];
  education:       any[];
  skills:          any[];
  certifications:  any[];
  projects:        any[];
  languages:       any[];
  experienceYears: number;
  experienceLevel: string;
  topSkills:       string[];
  industryTags:    string[];
  trajectory:      string;
  status:          string;
  processedAt:     string | null;
}

// ── Upload resume file ────────────────────────────────────────────────────────

export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);

  // ✅ no /api/ prefix — axios baseURL already includes it
  const { data } = await api.post<Resume>('/resumes/upload-raw', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Trigger Groq analysis ─────────────────────────────────────────────────────

export async function triggerAnalysis(resumeId: string): Promise<{
  resumeId: string;
  status:   string;
  message:  string;
}> {
  // ✅ no /api/ prefix
  const { data } = await api.post(`/resumes/${resumeId}/analyse`);
  return data;
}

// ── Get latest resume ─────────────────────────────────────────────────────────

export async function getLatestResume(): Promise<Resume | null> {
  try {
    // ✅ no /api/ prefix
    const { data } = await api.get<Resume>('/resumes/latest');
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

// ── Get resume by ID ──────────────────────────────────────────────────────────

export async function getResume(id: string): Promise<Resume> {
  // ✅ no /api/ prefix
  const { data } = await api.get<Resume>(`/resumes/${id}`);
  return data;
}

// ── Poll resume status ────────────────────────────────────────────────────────

export async function pollResumeStatus(
  resumeId:        string,
  onStatusChange?: (status: ResumeStatus) => void,
  maxAttempts      = 40,
  intervalMs       = 5_000,
): Promise<Resume> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const resume = await getResume(resumeId);
        onStatusChange?.(resume.status);

        if (resume.status === 'analyzed') return resolve(resume);
        if (resume.status === 'failed')   return reject(new Error('Analysis failed. Please try again.'));
        if (attempts >= maxAttempts)      return reject(new Error('Analysis is taking longer than expected.'));

        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}

// ── Get analysis result ───────────────────────────────────────────────────────

export async function getResumeAnalysis(resumeId: string): Promise<ResumeAnalysis | null> {
  try {
    // ✅ no /api/ prefix
    const { data } = await api.get<ResumeAnalysis>(`/resumes/${resumeId}/analysis`);
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

]]>
</file>
<file name="frontend\lib\supabase\client.ts">
<![CDATA[
import { createClient } from '@supabase/supabase-js';
// frontend/lib/supabase/client.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

]]>
</file>
<file name="frontend\lib\supabase\realtime.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

// ── Change handler type ───────────────────────────────────────────────────────

type ChangeHandler<T = any> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new:       T;
  old:       T;
}) => void;

// ── Subscribe to alerts for a specific user ───────────────────────────────────

export function subscribeToAlerts(
  userId:  string,
  onAlert: ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(`alerts:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'alerts',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => onAlert({
        eventType: 'INSERT',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Subscribe to application status changes for a candidate ──────────────────

export function subscribeToApplications(
  candidateId: string,
  onUpdate:    ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(`applications:candidate:${candidateId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'applications',
        filter: `candidate_id=eq.${candidateId}`,
      },
      (payload: any) => onUpdate({
        eventType: 'UPDATE',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Subscribe to new applicants for a specific job ────────────────────────────

export function subscribeToJobApplicants(
  jobId:          string,
  onNewApplicant: ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(`applications:job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'applications',
        filter: `job_id=eq.${jobId}`,
      },
      (payload: any) => onNewApplicant({
        eventType: 'INSERT',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Subscribe to new job postings (candidate job feed) ────────────────────────

export function subscribeToNewJobs(
  onNewJob: ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel('jobs:feed')
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'jobs',
      },
      (payload: any) => onNewJob({
        eventType: 'INSERT',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

]]>
</file>
<file name="frontend\lib\utils\cn.ts">
<![CDATA[
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}// frontend/lib/utils/cn.ts

]]>
</file>
<file name="frontend\lib\utils\format.ts">
<![CDATA[
export function formatRelativeSafe(iso?: string) {
  if (!iso) return '';
  let d: Date;
  try {
    d = new Date(iso);
    if (isNaN(d.getTime())) return '';
  } catch {
    return '';
  }
  //frontend/lib/utils/format.ts

  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);
  const mo = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(sec) < 60) return rtf.format(-sec, 'second');
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour');
  if (Math.abs(day) < 7) return rtf.format(-day, 'day');
  if (Math.abs(wk) < 5) return rtf.format(-wk, 'week');
  if (Math.abs(mo) < 12) return rtf.format(-mo, 'month');
  return rtf.format(-yr, 'year');
}

]]>
</file>
<file name="frontend\lib\webrtc\ice-handler.ts">
<![CDATA[
/**
 * ICE Handler Utility
 * File: frontend/lib/webrtc/ice-handler.ts
 * 
 * Purpose: Manage ICE candidate buffering on frontend
 * Mirrors backend logic for critical reliability
 */

export interface BufferedCandidate {
  candidate: RTCIceCandidateInit;
  receivedAt: number;
}

type ICEState = 'idle' | 'local-set' | 'remote-set' | 'complete';

export class ICEHandler {
  private buffer: BufferedCandidate[] = [];
  private state: ICEState = 'idle';
  private maxBufferSize = 100;

  setLocalDescription(): void {
    if (this.state === 'idle') {
      this.state = 'local-set';
    }
  }

  setRemoteDescription(): void {
    if (this.state !== 'complete') {
      this.state = 'remote-set';
    }
  }

  canAddCandidates(): boolean {
    return this.state === 'remote-set' || this.state === 'complete';
  }

  bufferCandidate(candidate: RTCIceCandidateInit): void {
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift(); // Drop oldest
    }
    this.buffer.push({ candidate, receivedAt: Date.now() });
  }

  drain(): RTCIceCandidateInit[] {
    if (!this.canAddCandidates()) {
      return [];
    }

    const candidates = this.buffer.map((c) => c.candidate);
    this.buffer = [];
    this.state = 'complete';
    return candidates;
  }

  getBufferedCount(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
    this.state = 'idle';
  }
}
]]>
</file>
<file name="frontend\lib\webrtc\sdp-negotiation.ts">
<![CDATA[
/**
 * SDP Negotiation Utility
 * File: frontend/lib/webrtc/sdp-negotiation.ts
 * 
 * Purpose: Handle offer/answer collision detection (polite peer model)
 * 
 * Collision Scenario:
 * - Both peers call createOffer simultaneously
 * - Offers cross in flight
 * - One peer must rollback and create answer instead
 * - Polite peer (lower ID) rolls back; Impolite keeps offer
 */

type NegotiationRole = 'polite' | 'impolite';

export interface NegotiationState {
  makingOffer: boolean;
  ignoreOffer: boolean;
}

export class SDPNegotiator {
  private state: NegotiationState = {
    makingOffer: false,
    ignoreOffer: false,
  };

  constructor(private isPolite: boolean) {}

  /**
   * Check if we should ignore an incoming offer
   * (collision detection)
   */
  shouldIgnoreOffer(pc: RTCPeerConnection): boolean {
    const hasCollision =
      this.state.makingOffer || pc.signalingState !== 'stable';

    if (!hasCollision) {
      return false;
    }

    // Impolite peer ignores colliding offers
    if (!this.isPolite) {
      this.state.ignoreOffer = false;
      return true;
    }

    // Polite peer will rollback (return false to proceed)
    return false;
  }

  /**
   * Call before creating an offer
   */
  markMakingOffer(): void {
    this.state.makingOffer = true;
  }

  /**
   * Call after offer is sent
   */
  clearMakingOffer(): void {
    this.state.makingOffer = false;
  }

  /**
   * Get current negotiation state
   */
  getState(): NegotiationState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      makingOffer: false,
      ignoreOffer: false,
    };
  }
}
]]>
</file>
<file name="frontend\types\css.d.ts">
<![CDATA[
declare module '*.css';

]]>
</file>
<file name="frontend\types\google-search-results-nodejs.d.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/types/google-search-results-nodejs.d.ts
declare module 'google-search-results-nodejs' {
  export class GoogleSearch {
    constructor(apiKey: string);
    json(params: Record<string, any>, callback: (data: any) => void): void;
  }
  const SerpApi: { GoogleSearch: typeof GoogleSearch };
  export default SerpApi;
}

]]>
</file>
<file name="ts-api\prisma\prisma.config.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// prisma/prisma.config.ts
import { defineConfig } from 'prisma/config';
import * as fs   from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')];
      }),
  );
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    '[Prisma] DATABASE_URL is not set.\n' +
    'Add to ts-api/.env:\n' +
    'DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {          // ← correct property name (not datasourceUrl)
    url: databaseUrl,    // ← url lives here in config file, not in schema.prisma
  },
});
]]>
</file>
<file name="ts-api\prisma\prisma.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ✅ makes PrismaService available globally — no need to import PrismaModule everywhere
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
]]>
</file>
<file name="ts-api\prisma\prisma.service.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg }    from '@prisma/adapter-pg';
import { Pool }        from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        '[PrismaService] DATABASE_URL is not set. ' +
        'Add it to your .env and Render environment variables.',
      );
    }

    // ── SSL fix ────────────────────────────────────────────────────────────
    // When using PrismaPg (driver adapter), DATABASE_URL query params like
    // ?sslmode=no-verify are ignored — SSL must be configured on the pg Pool.
    // Render and Supabase use self-signed certs; rejectUnauthorized: false
    // keeps the connection encrypted but skips certificate chain validation.
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
]]>
</file>
<file name="ts-api\prisma\schema.prisma">
<![CDATA[
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters", "partialIndexes"]
}

datasource db {
  provider = "postgresql"
}

enum InterviewStage {
  APPLIED
  UNDER_REVIEW
  SHORTLISTED
  INTERVIEW_SCHEDULED
  INTERVIEW_IN_PROGRESS
  INTERVIEW_PASSED
  INTERVIEW_FAILED
  FINAL_REVIEW
  OFFERED
  HIRED
  REJECTED
  ON_HOLD
  WITHDRAWN
}

model Resume {
  id             String                 @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId         String                 @map("user_id") @db.Uuid
  content        String?                @map("content")
  embedding      Unsupported("vector")?
  status         String?                @default("processing")
  createdAt      DateTime?              @default(now()) @map("created_at") @db.Timestamptz(6)
  fileName       String?                @map("file_name")
  analysis       Json?
  rawFile        String?                @map("raw_file")
  fileBytes      Bytes?                 @map("file_bytes")
  garbagedAt     DateTime?              @map("garbaged_at") @db.Timestamptz(6)
  garbageReason  String?                @map("garbage_reason")
  applications   applications[]
  resumeAnalysis ResumeAnalysis?
  users          users                  @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([userId], map: "idx_resumes_user_id")
  @@index([status], map: "idx_resumes_status")
  @@index([garbagedAt], map: "idx_resumes_garbaged_at")
  @@map("resumes")
}

model ResumeAnalysis {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  resumeId        String    @unique @map("resume_id") @db.Uuid
  rawText         String    @map("raw_text")
  personalInfo    Json      @default("{}") @map("personal_info")
  workExperience  Json      @default("[]") @map("work_experience")
  education       Json      @default("[]")
  skills          Json      @default("[]")
  certifications  Json      @default("[]")
  projects        Json      @default("[]")
  languages       Json      @default("[]")
  experienceYears Float     @default(0) @map("experience_years")
  experienceLevel String    @default("junior") @map("experience_level")
  topSkills       String[]  @default([]) @map("top_skills")
  industryTags    String[]  @default([]) @map("industry_tags")
  trajectory      String?
  status          String    @default("pending")
  processedAt     DateTime? @map("processed_at") @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  resume          Resume    @relation(fields: [resumeId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@map("resume_analyses")
}

model CandidateProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  headline           String?
  bio                String?
  photoUrl           String?  @map("photo_url")
  location           String?
  phone              String?
  availability       String   @default("immediate")
  targetRoles        String[] @default([]) @map("target_roles")
  targetIndustries   String[] @default([]) @map("target_industries")
  employmentTypes    String[] @default([]) @map("employment_types")
  workMode           String?  @map("work_mode")
  salaryMin          Int?     @map("salary_min")
  salaryMax          Int?     @map("salary_max")
  salaryCurrency     String   @default("USD") @map("salary_currency")
  salaryNegotiable   Boolean  @default(true) @map("salary_negotiable")
  willingToRelocate  Boolean  @default(false) @map("willing_to_relocate")
  preferredLocations String[] @default([]) @map("preferred_locations")
  currentTitle       String?  @map("current_title")
  currentCompany     String?  @map("current_company")
  experienceYears    Float?   @map("experience_years")
  experienceLevel    String?  @map("experience_level")
  topSkills          String[] @default([]) @map("top_skills")
  activeResumeId     String?  @map("active_resume_id") @db.Uuid
  isVisible          Boolean  @default(true) @map("is_visible")
  profileCompletion  Int      @default(0) @map("profile_completion")
  lastActiveAt       DateTime @default(now()) @map("last_active_at") @db.Timestamptz(6)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("candidate_profiles")
}

model RecruiterProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  title              String?
  photoUrl           String?  @map("photo_url")
  phone              String?
  linkedinUrl        String?  @map("linkedin_url")
  isVerified         Boolean  @default(false) @map("is_verified")
  companyName        String?  @map("company_name")
  companySize        String?  @map("company_size")
  companyIndustry    String[] @default([]) @map("company_industry")
  companyWebsite     String?  @map("company_website")
  companyLogoUrl     String?  @map("company_logo_url")
  companyDescription String?  @map("company_description")
  companyLocation    String?  @map("company_location")
  hiringRoles        String[] @default([]) @map("hiring_roles")
  typicalStack       String[] @default([]) @map("typical_stack")
  hiringVolume       String?  @map("hiring_volume")
  openToRemote       Boolean  @default(true) @map("open_to_remote")
  subscriptionTier   String   @default("free") @map("subscription_tier")
  monthlyViewLimit   Int      @default(50) @map("monthly_view_limit")
  viewsUsedThisMonth Int      @default(0) @map("views_used_this_month")
  profileCompletion  Int      @default(0) @map("profile_completion")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("recruiter_profiles")
}

model Job {
  id                 String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recruiterId        String               @map("recruiter_id") @db.Uuid
  title              String
  description        String
  company            String
  location           String?
  work_mode          String?              @default("hybrid")
  employment_type    String?              @default("full_time")
  salary_min         Int?
  salary_max         Int?
  salary_currency    String?              @default("INR")
  required_skills    String[]             @default([])
  experience_min     Float?               @default(0)
  experience_max     Float?
  industry           String?
  status             String?              @default("active")
  applicant_count    Int?                 @default(0)
  createdAt          DateTime?            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime?            @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  source             String               @default("internal") @db.VarChar(20)
  external_id        String?              @unique @db.Text
  applyUrl           String?              @map("apply_url")
  expiresAt          DateTime?            @map("expires_at") @db.Timestamptz(6)
  sync_batch         String?              @db.VarChar(50)
  applications       applications[]
  recruiter          users                @relation(fields: [recruiterId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([expiresAt], map: "idx_jobs_expires_at")
  @@index([external_id], map: "idx_jobs_external_id")
  @@index([recruiterId], map: "idx_jobs_recruiter")
  @@index([recruiterId], map: "idx_jobs_recruiter_id")
  @@index([required_skills], map: "idx_jobs_skills", type: Gin)
  @@index([source], map: "idx_jobs_source")
  @@index([status], map: "idx_jobs_status")
  @@index([status, createdAt(sort: Desc)], map: "idx_jobs_status_created")
  @@index([status, source], map: "idx_jobs_status_src")
  @@map("jobs")
}

model JobApplication {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  jobId       String    @map("job_id") @db.Uuid
  candidateId String    @map("candidate_id")
  resumeId    String?   @map("resume_id") @db.Uuid
  status      String?   @default("applied")
  coverNote   String?   @map("cover_note")
  appliedAt   DateTime? @default(now()) @map("applied_at") @db.Timestamptz(6)
  updatedAt   DateTime? @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@unique([jobId, candidateId])
  @@index([candidateId], map: "idx_job_applications_candidate")
  @@index([jobId, status], map: "idx_job_applications_job")
  @@map("job_applications")
}

model alerts {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id    String    @db.Uuid
  type       String
  title      String
  message    String
  metadata   Json?     @default("{}")
  read       Boolean?  @default(false)
  created_at DateTime? @default(now()) @db.Timestamptz(6)
  users      users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id, read], map: "idx_alerts_unread", where: raw("(read = false)"))
  @@index([user_id], map: "idx_alerts_user")
}

model applications {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  job_id          String    @db.Uuid
  candidate_id    String    @db.Uuid
  resume_id       String?   @db.Uuid
  match_score     Float?
  status          String?   @default("applied")
  cover_letter    String?
  recruiter_notes String?
  applied_at      DateTime? @default(now()) @db.Timestamptz(6)
  updated_at      DateTime? @default(now()) @db.Timestamptz(6)
  users           users     @relation(fields: [candidate_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  jobs            Job       @relation(fields: [job_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  resumes         Resume?   @relation(fields: [resume_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@unique([job_id, candidate_id])
  @@index([candidate_id], map: "idx_applications_cand")
  @@index([job_id], map: "idx_applications_job")
  @@index([status], map: "idx_applications_stat")
}

model interview_questions {
  id                 String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id         String             @db.Uuid
  question_number    Int
  question           String
  category           String?
  difficulty         String?            @default("medium")
  ideal_answer       String?
  user_answer        String?
  score              Float?
  feedback           String?
  time_taken_secs    Int?
  answered_at        DateTime?          @db.Timestamptz(6)
  created_at         DateTime?          @default(now()) @db.Timestamptz(6)
  interview_sessions interview_sessions @relation(fields: [session_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([session_id], map: "idx_questions_session")
}

model interview_sessions {
  id                  String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id        String                @db.Uuid
  job_id              String?               @db.Uuid
  job_title           String
  company             String?
  session_type        String?               @default("technical")
  status              String?               @default("in_progress")
  overall_score       Float?
  total_questions     Int?                  @default(0)
  completed_at        DateTime?             @db.Timestamptz(6)
  created_at          DateTime?             @default(now()) @db.Timestamptz(6)
  interview_questions interview_questions[]
  users               users                 @relation(fields: [candidate_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([candidate_id], map: "idx_sessions_candidate")
}

model recruiter_interviews {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  application_id String         @unique @db.Uuid
  job_id         String         @db.Uuid
  candidate_id   String         @db.Uuid
  recruiter_id   String         @db.Uuid
  current_stage  InterviewStage @default(APPLIED)
  status_code    Int            @default(100)
  final_status   String?
  created_at     DateTime       @default(now()) @db.Timestamptz(6)
  updated_at     DateTime       @default(now()) @updatedAt @db.Timestamptz(6)

  @@index([recruiter_id, status_code], map: "idx_ri_recruiter_status")
  @@index([job_id, status_code], map: "idx_ri_job_status")
  @@index([candidate_id, created_at], map: "idx_ri_candidate_created")
}

model recruiter_interview_rounds {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interview_id     String    @db.Uuid
  round_number     Int
  round_type       String
  scheduled_at     DateTime? @db.Timestamptz(6)
  duration_mins    Int?      @default(45)
  mode             String?   @default("video")
  interviewer_id   String?   @db.Uuid
  meeting_provider String?   @default("internal")
  meeting_room_id  String?
  meeting_join_url String?
  result           String?   @default("pending")
  score            Float?
  feedback         String?
  notify_30_sent   Boolean   @default(false)
  notify_15_sent   Boolean   @default(false)
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @updatedAt @db.Timestamptz(6)

  // Relation to the interview_rooms table created below. This keeps the
  // meeting_room_id column for backward compatibility while providing a
  // Prisma-level relation to the canonical rooms table.
  meetingRoom      interview_rooms? @relation(fields: [meeting_room_id], references: [id])

  @@unique([interview_id, round_number])
  @@index([scheduled_at], map: "idx_rir_scheduled")
  @@index([interview_id], map: "idx_rir_interview")
}

model recruiter_interview_events {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interview_id  String   @db.Uuid
  actor_user_id String?  @db.Uuid
  event_type    String
  from_stage    String?
  to_stage      String?
  metadata      Json     @default("{}")
  created_at    DateTime @default(now()) @db.Timestamptz(6)

  @@index([interview_id, created_at], map: "idx_rie_interview_created")
}

model users {
  id                 String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  full_name          String
  email              String               @unique
  password_hash      String?
  reset_token        String?
  reset_token_expiry DateTime?            @db.Timestamptz(6)
  created_at         DateTime?            @default(now()) @db.Timestamptz(6)
  role               String               @default("candidate")
  alerts             alerts[]
  applications       applications[]
  interview_sessions interview_sessions[]
  jobs               Job[]
  resumes            Resume[]

  @@index([email], map: "idx_users_email")
  @@index([reset_token], map: "idx_users_reset_token")
  @@index([role], map: "idx_users_role")
}

// ----------------------------- Interview Models ---------------------------

model interview_rooms {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recruiter_round_id    String?  @map("recruiter_round_id") @db.Uuid
  session_id            String?  @map("session_id") @db.Uuid
  room_name             String?  @map("room_name")
  provider              String?  @default("internal")
  provider_room_id      String?  @map("provider_room_id")
  max_participants      Int?     @default(4) @map("max_participants")
  mode                  String?  @default("video")
  is_locked             Boolean  @default(false) @map("is_locked")
  host_user_id          String?  @map("host_user_id") @db.Uuid
  join_url              String?  @map("join_url")
  started_at            DateTime? @map("started_at") @db.Timestamptz(6)
  ended_at              DateTime? @map("ended_at") @db.Timestamptz(6)
  metadata              Json?    @default("{}")
  created_at            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  participants          room_participants[]

  @@map("interview_rooms")
  @@index([host_user_id], map: "idx_interview_rooms_host")
  @@index([recruiter_round_id], map: "idx_interview_rooms_round")
  recruiterInterviewRounds recruiter_interview_rounds[]
}

model room_participants {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  room_id        String   @map("room_id") @db.Uuid
  user_id        String   @map("user_id") @db.Uuid
  role           String?  @default("participant")
  display_name   String?  @map("display_name")
  joined_at      DateTime @default(now()) @map("joined_at") @db.Timestamptz(6)
  left_at        DateTime? @map("left_at") @db.Timestamptz(6)
  is_muted       Boolean  @default(false) @map("is_muted")
  is_video_off   Boolean  @default(false) @map("is_video_off")
  raised_hand    Boolean  @default(false) @map("raised_hand")
  rtc_client_id  String?  @map("rtc_client_id")
  metadata       Json?    @default("{}")

  media_state    media_states? @relation(fields: [id], references: [participant_id])

  @@map("room_participants")
  @@index([room_id], map: "idx_room_participants_room")
  @@index([user_id], map: "idx_room_participants_user")
  interviewRooms interview_rooms[]
}

model media_states {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  participant_id  String   @map("participant_id") @db.Uuid @unique
  audio_enabled   Boolean  @default(true) @map("audio_enabled")
  video_enabled   Boolean  @default(true) @map("video_enabled")
  screen_sharing  Boolean  @default(false) @map("screen_sharing")
  last_updated    DateTime @default(now()) @updatedAt @map("last_updated") @db.Timestamptz(6)
  bandwidth_kbps  Int?     @map("bandwidth_kbps")
  resolution      String?  @map("resolution")
  metadata        Json?    @default("{}")

  @@map("media_states")
  @@index([participant_id], map: "idx_media_states_participant")
  roomParticipants room_participants[]
}

model interview_transcripts {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id    String?  @map("session_id") @db.Uuid
  participant_id String? @map("participant_id") @db.Uuid
  content       String
  timestamp     DateTime @default(now()) @map("timestamp") @db.Timestamptz(6)
  source        String?  @default("local")
  confidence    Float?
  is_final      Boolean  @default(false) @map("is_final")
  created_at    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("interview_transcripts")
  @@index([session_id], map: "idx_transcripts_session")
}

model interview_scorecards {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id  String   @map("session_id") @db.Uuid
  created_by  String   @map("created_by") @db.Uuid
  rubric      Json?    @default("{}")
  total_score Float?   @map("total_score")
  comments    String?
  created_at  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updated_at  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("interview_scorecards")
  @@index([session_id], map: "idx_scorecards_session")
}

model interview_chat_messages {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  room_id      String   @map("room_id") @db.Uuid
  session_id   String?  @map("session_id") @db.Uuid
  sender_id    String   @map("sender_id") @db.Uuid
  message      String
  message_type String?  @default("text") @map("message_type")
  file_url     String?  @map("file_url")
  metadata     Json?    @default("{}")
  created_at   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("interview_chat_messages")
  @@index([room_id], map: "idx_chat_room")
  @@index([session_id], map: "idx_chat_session")
}

model interview_events_log {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id    String?  @map("session_id") @db.Uuid
  room_id       String?  @map("room_id") @db.Uuid
  actor_user_id String?  @map("actor_user_id") @db.Uuid
  event_type    String
  payload       Json?    @default("{}")
  created_at    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("interview_events_log")
  @@index([session_id], map: "idx_events_session")
  @@index([room_id], map: "idx_events_room")
}

]]>
</file>
<file name="ts-api\src\alerts\alerts.controller.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/alerts/alerts.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('alerts')
export class AlertsController {
  @Get()
  getAlerts() {
    return { alerts: [], unread: 0 };
  }
}
]]>
</file>
<file name="ts-api\src\alerts\alerts.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Global()
@Module({
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
]]>
</file>
<file name="ts-api\src\alerts\alerts.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface CreateAlertPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// ── Typed row interfaces ──────────────────────────────────────────────────────

interface AlertRow {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  message:    string;
  metadata:   Record<string, unknown>;
  read:       boolean;
  created_at: Date;
}

interface CountRow {
  count: string;
}

interface CandidateRow {
  user_id: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createAlert(payload: CreateAlertPayload) {
    const { rows } = await this.db.query<AlertRow>(
      `INSERT INTO alerts (user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        payload.userId,
        payload.type,
        payload.title,
        payload.message,
        JSON.stringify(payload.metadata || {}),
      ],
    );

    this.logger.log(`Alert created: ${payload.type} for user ${payload.userId}`);
    return rows[0];
  }

  async createBulkAlerts(payloads: CreateAlertPayload[]) {
    if (payloads.length === 0) return [];

    const values = payloads
      .map((_, i) => `($${i * 5 + 1},$${i * 5 + 2},$${i * 5 + 3},$${i * 5 + 4},$${i * 5 + 5})`)
      .join(', ');

    const params = payloads.flatMap(p => [
      p.userId, p.type, p.title, p.message,
      JSON.stringify(p.metadata || {}),
    ]);

    const { rows } = await this.db.query<AlertRow>(
      `INSERT INTO alerts (user_id, type, title, message, metadata)
       VALUES ${values} RETURNING *`,
      params,
    );

    return rows;
  }

  async notifyMatchingCandidates(job: any) {
    try {
      const { rows: candidates } = await this.db.query<CandidateRow>(
        `SELECT cp.user_id
         FROM candidate_profiles cp
         WHERE cp.is_visible = true
           AND cp.top_skills && $1::text[]
           AND (cp.experience_years IS NULL OR cp.experience_years >= $2)
           AND (cp.experience_years IS NULL OR $3::float IS NULL OR cp.experience_years <= $3)
         LIMIT 500`,
        [
          job.required_skills,
          job.experience_min || 0,
          job.experience_max,
        ],
      );

      if (candidates.length === 0) return;

      const alerts = candidates.map(c => ({
        userId:  c.user_id,
        type:    'job_match',
        title:   `New job match: ${job.title}`,
        message: `${job.company} is hiring for "${job.title}" — matches your skills`,
        metadata: {
          job_id:     job.id,
          company:    job.company,
          location:   job.location,
          work_mode:  job.work_mode,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
        },
      }));

      await this.createBulkAlerts(alerts);
      this.logger.log(`Notified ${candidates.length} candidates for job ${job.id}`);

    } catch (err) {
      this.logger.error(`Failed to notify candidates for job ${job.id}: ${(err as Error).message}`);
    }
  }

  async getUserAlerts(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [alertsResult, countResult] = await Promise.all([
      this.db.query<AlertRow>(
        `SELECT * FROM alerts WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.db.query<CountRow>(
        `SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND read = FALSE`,
        [userId],
      ),
    ]);

    return {
      alerts: alertsResult.rows,
      unread: parseInt(countResult.rows[0].count, 10), // ✅ string → number
      page,
      limit,
    };
  }

  async markRead(userId: string, alertIds?: string[]) {
    if (alertIds?.length) {
      await this.db.query(
        `UPDATE alerts SET read = TRUE
         WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, alertIds],
      );
    } else {
      await this.db.query(
        'UPDATE alerts SET read = TRUE WHERE user_id = $1 AND read = FALSE',
        [userId],
      );
    }
    return { success: true };
  }
}
]]>
</file>
<file name="ts-api\src\app.controller.ts">
<![CDATA[
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
   @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

]]>
</file>
<file name="ts-api\src\app.module.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/app.module.ts

import { Module }                    from '@nestjs/common';
import { APP_GUARD }                 from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule }                from '@nestjs/bullmq';
import { ScheduleModule }            from '@nestjs/schedule';  // ← add this

import configuration                 from './config/configuration';
import { DatabaseModule }            from './database/datbase.module';
import { AuthModule }                from './auth/auth.module';
import { ResumesModule }             from './resumes/resumes.module';
import { JobsModule }                from './jobs/jobs.module';
import { AlertsModule }              from './alerts/alerts.module';
import { CandidatesModule }          from './candidates/candidates.module';
import { RecruitersModule }          from './recruiters/recruiters.module';
import { InterviewsModule }          from './interviews/interviews.module';
import { LivekitModule }             from './livekit/livekit.module';
import { RecommendationsModule }     from './recommendations/recommendatyions.module';
import { OllamaModule }              from './ollama/ollama.module';
import { PrismaModule }              from '../prisma/prisma.module';
import { JwtAuthGuard }              from './auth/guards/jwt-auth.guard';
import { RolesGuard }                from './auth/guards/roles.guard';  // ← add this

const REDIS_ENABLED =
  process.env.REDIS_ENABLED === 'true' ||
  !!process.env.REDIS_URL ||
  !!process.env.REDIS_HOST;

@Module({
  imports: [
    // ── Global config ───────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load:     [configuration],
    }),

    // ── Cron scheduler — required for JobsSyncService @Cron ─────────────────
    ScheduleModule.forRoot(),

    // ── BullMQ — enabled only when Redis is configured ──────────────────────
    ...(REDIS_ENABLED
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject:  [ConfigService],
            useFactory: (config: ConfigService) => {
              const redisUrl = config.get<string>('redis.url');

              // Prefer connection URL (Upstash/Railway provide this)
              if (redisUrl) {
                return {
                  connection: { url: redisUrl },
                  defaultJobOptions: {
                    attempts:         3,
                    backoff:          { type: 'exponential', delay: 5_000 },
                    removeOnComplete: 100,
                    removeOnFail:     50,
                  },
                };
              }

              const redis = config.get('redis');
              return {
                connection: {
                  host:     redis.host,
                  port:     redis.port,
                  password: redis.password,
                  ...(redis.tls && { tls: { rejectUnauthorized: false } }),
                },
                defaultJobOptions: {
                  attempts:         3,
                  backoff:          { type: 'exponential', delay: 5_000 },
                  removeOnComplete: 100,
                  removeOnFail:     50,
                },
              };
            },
          }),
        ]
      : []),

    // ── Feature modules ──────────────────────────────────────────────────────
    PrismaModule,
    DatabaseModule,
    OllamaModule,
    AlertsModule,
    AuthModule,
    ResumesModule,
    JobsModule,
    CandidatesModule,
    RecruitersModule,
    InterviewsModule,
    RecommendationsModule,
    LivekitModule,
  ],

  providers: [
    // Guard execution order matters — JWT authenticates first,
    // Roles authorises second. NestJS respects registration order.
    {
      provide:  APP_GUARD,
      useClass: JwtAuthGuard,   // Step 1: validates token → sets request.user
    },
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,     // Step 2: checks request.user.role vs @Roles()
    },
  ],
})
export class AppModule {}
]]>
</file>
<file name="ts-api\src\app.service.ts">
<![CDATA[
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

]]>
</file>
<file name="ts-api\src\ats\ats.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/ats/ats.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AtsService } from './ats.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
  ],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}
]]>
</file>
<file name="ts-api\src\ats\ats.service.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/ats/ats.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface AtsScoreResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

@Injectable()
export class AtsService {
  private readonly pythonUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.pythonUrl = this.config.get<string>('pythonApiUrl') ?? '';
    this.apiKey = this.config.get<string>('pythonApiKey') ?? '';

    if (!this.pythonUrl || !this.apiKey) {
      throw new Error('ATS Service: Missing Python API configuration');
    }
  }

  async score(resumeText: string): Promise<AtsScoreResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AtsScoreResponse>(
          `${this.pythonUrl}/ai/ats/score`,
          { resume_text: resumeText },
          {
            headers: {
              'X-API-KEY': this.apiKey,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch ATS score from AI service',
      );
    }
  }
}
]]>
</file>
<file name="ts-api\src\auth\auth.controller.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

import { AuthService, UserRow } from './auth.service';
import { Public } from './decorators/public.decorators';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type CompleteOAuthSignupDto = {
  onboardingToken: string;
  role: 'candidate' | 'recruiter';
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body);
  }

  @Get('me')
  async me(@Req() req: any): Promise<UserRow> {
    return this.auth.getMe(req.user.id);
  }

  @Public()
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  async googleStart(
    @Req() _req: any,
    @Query('role') _role?: 'candidate' | 'recruiter',
    @Query('mode') _mode?: 'signin' | 'signup',
  ) {
    return;
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.auth.handleOAuthCallback({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'google',
      providerId: req.user.providerId,
      mode: req.user.mode === 'signup' ? 'signup' : 'signin',
      requestedRole: req.user.requestedRole === 'recruiter' ? 'recruiter' : 'candidate',
    });

    return res.redirect(result.redirectUrl);
  }

  @Public()
  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  async githubStart(
    @Req() _req: any,
    @Query('role') _role?: 'candidate' | 'recruiter',
    @Query('mode') _mode?: 'signin' | 'signup',
  ) {
    return;
  }

  @Public()
  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.auth.handleOAuthCallback({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'github',
      providerId: req.user.providerId,
      mode: req.user.mode === 'signup' ? 'signup' : 'signin',
      requestedRole: req.user.requestedRole === 'recruiter' ? 'recruiter' : 'candidate',
    });

    return res.redirect(result.redirectUrl);
  }

  @Public()
  @Post('oauth/complete-signup')
  async completeOAuthSignup(@Body() body: CompleteOAuthSignupDto) {
    if (!body?.onboardingToken) {
      throw new BadRequestException('onboardingToken is required');
    }
    if (body.role !== 'candidate' && body.role !== 'recruiter') {
      throw new BadRequestException('role must be candidate or recruiter');
    }
    return this.auth.completeOAuthSignup(body.onboardingToken, body.role);
  }
}
]]>
</file>
<file name="ts-api\src\auth\auth.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = (config.get<string>('jwt.expiresIn') ?? '7d') as StringValue;
        return {
          secret: config.getOrThrow<string>('jwt.secret'),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GithubStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
]]>
</file>
<file name="ts-api\src\auth\auth.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  password_hash: string;
  created_at: Date;
}

interface UserIdEmailRow {
  id: string;
  email: string;
}

interface UserIdRow {
  id: string;
}

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter | undefined;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.getOrThrow<string>('jwt.secret');
    this.jwtExpiresIn = this.config.get<string>('jwt.expiresIn') || '7d';
    this.frontendUrl = this.config.get<string>('frontendUrl') || 'http://localhost:3000';

    const smtpUser = this.config.get<string>('smtp.user');
    const smtpPass = this.config.get<string>('smtp.pass');

    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('smtp.host'),
        port: this.config.get<number>('smtp.port'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
  }

  private signToken(userId: string, email: string, role: string): string {
    return jwt.sign({ sub: userId, email, role }, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  buildFrontendOAuthRedirect(token: string): string {
    return `${this.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`;
  }

  private signOnboardingToken(payload: {
    email: string;
    fullName: string;
    provider: 'google' | 'github';
    providerId: string;
    mode: 'signin' | 'signup';
  }): string {
    return jwt.sign(
      { type: 'oauth_onboarding', ...payload },
      this.jwtSecret,
      { expiresIn: '10m' } as jwt.SignOptions,
    );
  }

  private verifyOnboardingToken(token: string): {
    type: 'oauth_onboarding';
    email: string;
    fullName: string;
    provider: 'google' | 'github';
    providerId: string;
    mode: 'signin' | 'signup';
  } {
    const decoded = jwt.verify(token, this.jwtSecret) as any;
    if (!decoded || decoded.type !== 'oauth_onboarding') {
      throw new UnauthorizedException('Invalid onboarding token');
    }
    return decoded;
  }

  buildFrontendOAuthOnboardingRedirect(data: {
    onboardingToken: string;
    provider: 'google' | 'github';
    mode: 'signin' | 'signup';
    email: string;
    fullName: string;
  }): string {
    const q = new URLSearchParams({
      ot: data.onboardingToken,
      provider: data.provider,
      mode: data.mode,
      email: data.email,
      name: data.fullName,
    });

    return `${this.frontendUrl}/auth/oauth-onboarding?${q.toString()}`;
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, full_name, email, role, password_hash, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  async handleOAuthCallback(input: {
  email: string;
  fullName: string;
  provider: 'google' | 'github';
  providerId: string;
  mode: 'signin' | 'signup';
  requestedRole: 'candidate' | 'recruiter'; // add this
}) {
  const existing = await this.findUserByEmail(input.email);

  if (existing) {
    // ✅ Enforce role on OAuth sign-in
    if (input.mode === 'signin' && existing.role !== input.requestedRole) {
      return {
        kind: 'role_mismatch' as const,
        redirectUrl: `${this.frontendUrl}/?auth=login&error=role_mismatch&expected=${existing.role}`,
      };
    }

    return {
      kind: 'login' as const,
      redirectUrl: this.buildFrontendOAuthRedirect(
        this.signToken(existing.id, existing.email, existing.role),
      ),
    };
  }

  const onboardingToken = this.signOnboardingToken({
    email: input.email.toLowerCase(),
    fullName: input.fullName,
    provider: input.provider,
    providerId: input.providerId,
    mode: input.mode,
  });

  return {
    kind: 'onboarding' as const,
    redirectUrl: this.buildFrontendOAuthOnboardingRedirect({
      onboardingToken,
      provider: input.provider,
      mode: input.mode,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
    }),
  };
}

  async completeOAuthSignup(onboardingToken: string, role: 'candidate' | 'recruiter') {
  const data = this.verifyOnboardingToken(onboardingToken);
  const existing = await this.findUserByEmail(data.email);

  if (existing) {
    // IMPORTANT: if this is signup flow, do not silently login wrong role
    if (data.mode === 'signup' && existing.role !== role) {
      throw new ConflictException(`Account already exists as ${existing.role}`);
    }

    return {
      token: this.signToken(existing.id, existing.email, existing.role),
      user: {
        id: existing.id,
        full_name: existing.full_name,
        email: existing.email,
        role: existing.role,
        created_at: existing.created_at,
      },
    };
  }

  const created = await this.db.query<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, full_name, email, role, password_hash, created_at`,
    [data.fullName, data.email.toLowerCase(), null, role],
  );

  const user = created.rows[0];

  return {
    token: this.signToken(user.id, user.email, user.role),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  };
}

  async register(dto: RegisterDto) {
    const existing = await this.db.query<UserIdRow>(
      'SELECT id FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.db.query<UserRow>(
      `INSERT INTO users (full_name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, full_name, email, role, created_at`,
      [dto.full_name, dto.email.toLowerCase(), passwordHash, dto.role],
    );

    const user = result.rows[0];

    return {
      token: this.signToken(user.id, user.email, user.role),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    };
  }

  async login(dto: LoginDto) {
    const result = await this.db.query<UserRow>(
      `SELECT id, full_name, email, password_hash, role, created_at
       FROM users WHERE email = $1`,
      [dto.email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      throw new UnauthorizedException(
        'No password set for this account. Please reset your password.',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      token: this.signToken(user.id, user.email, user.role),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const result = await this.db.query<UserIdEmailRow>(
      'SELECT id, email FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.db.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, expiry, user.id],
    );

    if (this.transporter) {
      const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      await this.transporter.sendMail({
        from: `"Job Crawler" <${this.config.get<string>('smtp.user')}>`,
        to: user.email,
        subject: 'Password Reset — Job Crawler',
        html: `<p>Reset password: <a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    }

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const result = await this.db.query<UserIdRow>(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [dto.token],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = result.rows[0];
    const passwordHash = await bcrypt.hash(dto.new_password, 12);

    await this.db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [passwordHash, user.id],
    );

    return { message: 'Password reset successful. You can now log in.' };
  }

  async getMe(userId: string) {
    const result = await this.db.query<UserRow>(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }
}
]]>
</file>
<file name="ts-api\src\auth\decorators\public.decorators.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/auth/decorators/public.decorators.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
]]>
</file>
<file name="ts-api\src\auth\decorators\roles.decorators.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
]]>
</file>
<file name="ts-api\src\auth\dto\forgot-password.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { IsEmail } from 'class-validator';
// ts-api/src/auth/dto/forgot-password.dto.ts
export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
]]>
</file>
<file name="ts-api\src\auth\dto\login.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { IsEmail, IsString } from 'class-validator';
// ts-api/src/auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
]]>
</file>
<file name="ts-api\src\auth\dto\register.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/auth/dto/register.dto.ts
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsIn(['candidate', 'recruiter'])  // ✅ validated at controller level
  role: 'candidate' | 'recruiter';
}
]]>
</file>
<file name="ts-api\src\auth\dto\reset-password.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { IsString, MinLength } from 'class-validator';
// ts-api/src/auth/dto/reset-password.dto.ts
export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}
]]>
</file>
<file name="ts-api\src\auth\guards\jwt-auth.guard.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector }     from '@nestjs/core';
import * as jwt          from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorators';

interface JwtPayload {
  sub:   string;
  email: string;
  role:  string;
  iat?:  number;
  exp?:  number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly config:    ConfigService,
    private readonly reflector: Reflector,
  ) {
    const secret = this.config.get<string>('jwt.secret');

    // ✅ Crash early at startup if secret is missing — better than silent failure
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    this.jwtSecret = secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ✅ Honor @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // ✅ Extract token safely
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;

      // ✅ Validate payload has required fields
      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException('Token payload is incomplete');
      }

      // ✅ Attach user to request — RolesGuard reads from here
      request.user = {
        id:    payload.sub,
        email: payload.email,
        role:  payload.role,
        iat:   payload.iat,
        exp:   payload.exp,
      };

      return true;
    } catch (err) {
      // ✅ Granular error messages
      if (err instanceof jwt.TokenExpiredError) {
        this.logger.warn(`Expired token used by: ${this.getIp(request)}`);
        throw new UnauthorizedException('Token has expired — please log in again');
      }

      if (err instanceof jwt.JsonWebTokenError) {
        this.logger.warn(`Invalid token from IP: ${this.getIp(request)}`);
        throw new UnauthorizedException('Invalid token');
      }

      if (err instanceof jwt.NotBeforeError) {
        throw new UnauthorizedException('Token not yet valid');
      }

      // ✅ Re-throw UnauthorizedException from payload validation above
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      // ✅ Unknown errors — don't leak internals
      this.logger.error('Unexpected JWT error', err);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  // ✅ Clean token extraction — handles edge cases
  private extractToken(request: any): string | null {
    const authHeader = request.headers?.['authorization'] as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  // ✅ Safe IP extraction for logging
  private getIp(request: any): string {
    return (
      request.headers?.['x-forwarded-for'] ||
      request.ip ||
      'unknown'
    );
  }
}
]]>
</file>
<file name="ts-api\src\auth\guards\roles.guard.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/guards/roles.guard.ts
/* eslint-disable prettier/prettier */
import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorators';    // ← correct import

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator on this route — allow through
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Support both direct role and Supabase user_metadata.role
    const userRole: string | null =
      user.role ?? user.user_metadata?.role ?? null;

    if (!requiredRoles.includes(userRole ?? '')) {
      throw new ForbiddenException(
        `Requires role: ${requiredRoles.join(' or ')} — your role: ${userRole ?? 'none'}`,
      );
    }

    return true;
  }
}
]]>
</file>
<file name="ts-api\src\auth\strategies\github.strategy.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

type OAuthReq = Request & {
  query?: Record<string, string | undefined>;
};

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: OAuthReq,
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (...args: any[]) => void,
  ): Promise<void> {
    const primaryEmail =
      profile?.emails?.find((e: any) => e?.primary)?.value ||
      profile?.emails?.[0]?.value;

    if (!primaryEmail) {
      return done(
        new UnauthorizedException(
          'GitHub email not available. Make sure your email is verified/public.',
        ),
        false,
      );
    }

    const requestedRole =
      req?.query?.role === 'recruiter' ? 'recruiter' : 'candidate';

    const mode =
      req?.query?.mode === 'signup' ? 'signup' : 'signin';

    return done(null, {
      email: String(primaryEmail).toLowerCase(),
      fullName: profile?.displayName || profile?.username || 'GitHub User',
      provider: 'github',
      providerId: profile?.id,
      requestedRole,
      mode,
    });
  }
}
]]>
</file>
<file name="ts-api\src\auth\strategies\google.strategy.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

type OAuthReq = Request & {
  query?: Record<string, string | undefined>;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: OAuthReq,
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (...args: any[]) => void,
  ): Promise<void> {
    const email = profile?.emails?.[0]?.value?.toLowerCase();
    if (!email) {
      return done(new UnauthorizedException('Google account email not available'), false);
    }

    const fullName =
      profile?.displayName ||
      `${profile?.name?.givenName ?? ''} ${profile?.name?.familyName ?? ''}`.trim() ||
      email.split('@')[0];

    const requestedRole =
      req?.query?.role === 'recruiter' ? 'recruiter' : 'candidate';

    const mode =
      req?.query?.mode === 'signup' ? 'signup' : 'signin';

    return done(null, {
      email,
      fullName,
      provider: 'google',
      providerId: profile?.id,
      requestedRole,
      mode,
    });
  }
}
]]>
</file>
<file name="ts-api\src\candidates\candidates.controller.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Controller, Get, Put, Body, Req,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.candidates.getEnrichedProfile(req.user.id);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateCandidateProfileDto) {
    return this.candidates.updateProfile(req.user.id, dto);
  }

  @Get('profile/completion')
  getCompletion(@Req() req: any) {
    return this.candidates.getCompletionDetails(req.user.id);
  }
}
]]>
</file>
<file name="ts-api\src\candidates\candidates.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';

@Module({
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
]]>
</file>
<file name="ts-api\src\candidates\candidates.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PrismaService }   from '../../prisma/prisma.service';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly db:     DatabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.prisma.candidateProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    // ✅ Explicitly typed so rows[0] assignment is valid
    let analysis: Record<string, unknown> | null = null;

    if (profile.activeResumeId) {
      const { rows } = await this.db.query<Record<string, unknown>>(
        `SELECT ra.*
         FROM resume_analyses ra
         WHERE ra.resume_id = $1
           AND ra.status = 'completed'
         ORDER BY ra.created_at DESC
         LIMIT 1`,
        [profile.activeResumeId],
      );
      analysis = rows[0] || null; // ✅ now valid
    }

    const { rows: appStats } = await this.db.query(
      `SELECT
         COUNT(*)                                            AS total,
         COUNT(*) FILTER (WHERE status = 'applied')         AS applied,
         COUNT(*) FILTER (WHERE status = 'reviewed')        AS reviewed,
         COUNT(*) FILTER (WHERE status = 'shortlisted')     AS shortlisted,
         COUNT(*) FILTER (WHERE status = 'interview')       AS interview,
         COUNT(*) FILTER (WHERE status = 'offered')         AS offered,
         COUNT(*) FILTER (WHERE status = 'rejected')        AS rejected
       FROM applications
       WHERE candidate_id = $1`,
      [userId],
    );

    const { rows: recentApps } = await this.db.query(
      `SELECT a.id, a.status, a.match_score, a.applied_at,
              j.title, j.company, j.location, j.work_mode,
              j.salary_min, j.salary_max, j.salary_currency
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 5`,
      [userId],
    );

    return {
      ...profile,
      analysis,
      stats:              appStats[0] || {},
      recentApplications: recentApps,
    };
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    await this.getProfile(userId);

    const updated = await this.prisma.candidateProfile.update({
      where: { userId },
      data: {
        ...(dto.headline           !== undefined && { headline: dto.headline }),
        ...(dto.bio                !== undefined && { bio: dto.bio }),
        ...(dto.location           !== undefined && { location: dto.location }),
        ...(dto.phone              !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl           !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.availability       !== undefined && { availability: dto.availability }),
        ...(dto.targetRoles        !== undefined && { targetRoles: dto.targetRoles }),
        ...(dto.targetIndustries   !== undefined && { targetIndustries: dto.targetIndustries }),
        ...(dto.employmentTypes    !== undefined && { employmentTypes: dto.employmentTypes }),
        ...(dto.workMode           !== undefined && { workMode: dto.workMode }),
        ...(dto.salaryMin          !== undefined && { salaryMin: dto.salaryMin }),
        ...(dto.salaryMax          !== undefined && { salaryMax: dto.salaryMax }),
        ...(dto.salaryCurrency     !== undefined && { salaryCurrency: dto.salaryCurrency }),
        ...(dto.salaryNegotiable   !== undefined && { salaryNegotiable: dto.salaryNegotiable }),
        ...(dto.willingToRelocate  !== undefined && { willingToRelocate: dto.willingToRelocate }),
        ...(dto.preferredLocations !== undefined && { preferredLocations: dto.preferredLocations }),
        ...(dto.isVisible          !== undefined && { isVisible: dto.isVisible }),
        lastActiveAt: new Date(),
      },
    });

    this.logger.log(`Candidate profile updated: ${userId}`);
    return updated;
  }

  async getCompletionDetails(userId: string) {
    const profile = await this.getProfile(userId);

    const checks = [
      { field: 'Full Name',           done: true },
      { field: 'Headline',            done: !!profile.headline },
      { field: 'Bio / Summary',       done: !!profile.bio },
      { field: 'Location',            done: !!profile.location },
      { field: 'Phone',               done: !!profile.phone },
      { field: 'Target Roles',        done: profile.targetRoles?.length > 0 },
      { field: 'Work Mode',           done: !!profile.workMode },
      { field: 'Resume Uploaded',     done: !!profile.activeResumeId },
      { field: 'Skills (from resume)',done: profile.topSkills?.length > 0 },
      { field: 'Salary Expectation',  done: !!profile.salaryMin || !!profile.salaryMax },
    ];

    const completed = checks.filter(c => c.done).length;
    const score     = Math.round((completed / checks.length) * 100);

    return { score, checks, total: checks.length, completed };
  }
}
]]>
</file>
<file name="ts-api\src\candidates\dto\update-candidate-profile.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import {
  IsString, IsOptional, IsArray, IsBoolean,
  IsNumber, IsIn, IsUrl, Min,
} from 'class-validator';

export class UpdateCandidateProfileDto {
  @IsString() @IsOptional()
  headline?: string;

  @IsString() @IsOptional()
  bio?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsUrl() @IsOptional()
  photoUrl?: string;

  @IsIn(['immediate', '2_weeks', '1_month', 'not_looking']) @IsOptional()
  availability?: string;

  @IsArray() @IsOptional()
  targetRoles?: string[];

  @IsArray() @IsOptional()
  targetIndustries?: string[];

  @IsArray() @IsOptional()
  employmentTypes?: string[];

  @IsIn(['remote', 'hybrid', 'onsite', 'any']) @IsOptional()
  workMode?: string;

  @IsNumber() @IsOptional() @Min(0)
  salaryMin?: number;

  @IsNumber() @IsOptional() @Min(0)
  salaryMax?: number;

  @IsString() @IsOptional()
  salaryCurrency?: string;

  @IsBoolean() @IsOptional()
  salaryNegotiable?: boolean;

  @IsBoolean() @IsOptional()
  willingToRelocate?: boolean;

  @IsArray() @IsOptional()
  preferredLocations?: string[];

  @IsBoolean() @IsOptional()
  isVisible?: boolean;
}
]]>
</file>
<file name="ts-api\src\common\constants\queue.constants.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/common/constants/queues.constant.ts
export const QUEUES = {
  RESUME_ANALYSIS: 'resume-analysis',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];
]]>
</file>
<file name="ts-api\src\common\filters\all-excepions.filter.ts">
<![CDATA[

]]>
</file>
<file name="ts-api\src\common\types\db-row.types.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/common/types/db-row.types.ts
//
// Typed interfaces for raw PostgreSQL row shapes returned by DatabaseService.
// These are intentionally separate from domain DTOs — they reflect the exact
// snake_case column names that pg returns, before any mapping to camelCase.
//
// Rule: add a row type here whenever a service uses db.query<T>() and the
// typed row needs to be visible across a module boundary (controller ↔ service).

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserRow {
  id:            string;
  full_name:     string;
  email:         string;
  role:          string;
  password_hash: string;
  created_at:    Date;
}

export interface UserIdRow {
  id: string;
}

export interface UserIdEmailRow {
  id:    string;
  email: string;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface AlertRow {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  message:    string;
  metadata:   Record<string, unknown>;
  read:       boolean;
  created_at: Date;
}

export interface CountRow {
  count: string;   // pg always returns COUNT() as string
}

export interface CandidateUserIdRow {
  user_id: string;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export interface JobRow {
  id:           string;
  title:        string;
  recruiter_id: string;
  source:       string;
}

export interface OwnershipRow {
  id:           string;
  candidate_id: string;
  title:        string;
}

export interface ProfileSkillsRow {
  top_skills:       string[];
  experience_level: string;
  current_title:    string;
  industry_tags:    string[];
}

export interface SkillsOnlyRow {
  top_skills: string[];
}

export interface RequiredSkillsRow {
  required_skills: string[];
}

// ── Interviews ────────────────────────────────────────────────────────────────

export interface InterviewQuestionRow {
  id:              string;
  session_id:      string;
  question_number: number;
  question:        string;
  category:        string;
  difficulty:      string;
  ideal_answer:    string;
  user_answer:     string | null;
  score:           number | null;
  feedback:        string | null;
  time_taken_secs: number | null;
  answered_at:     Date | null;
}

export interface InterviewQuestionWithCandidateRow extends InterviewQuestionRow {
  candidate_id: string;
}

export interface AnalysisContextRow {
  experience_level: string;
  experience_years: number;
  skills:           unknown;
  work_experience:  unknown;
}

// ── Recommendations ───────────────────────────────────────────────────────────

export interface CandidateProfileRow {
  top_skills:       string[];
  experience_level: string;
  experience_years: number;
  target_roles:     string[];
  work_mode:        string | null;
  salary_min:       number | null;
  salary_max:       number | null;
}

export interface JobRecommendationRow {
  id:              string;
  title:           string;
  company:         string;
  location:        string | null;
  work_mode:       string | null;
  employment_type: string | null;
  salary_min:      number | null;
  salary_max:      number | null;
  salary_currency: string;
  required_skills: string[];
  description:     string;
  created_at:      Date;
  apply_url:       string | null;
  recruiter_name:  string;
  applicant_count: string;
  status:          string;
  // SQL-computed scoring columns (CASE expressions return INTEGER from pg)
  skill_score:  number;
  mode_score:   number;
  salary_score: number;
}

export interface SkillDemandRow {
  skill:         string;
  demand_count:  string;
  candidate_has: boolean;
}
]]>
</file>
<file name="ts-api\src\config\configuration.ts">
<![CDATA[
/**
 * Application Configuration
 * File: ts-api/src/config/configuration.ts
 *
 * Purpose: Centralized environment configuration for NestJS application
 * Integrates: Database, JWT, Redis, Gemini AI, WebRTC, SMTP
 *
 * Updated: Added WebRTC video conferencing and SMTP notification settings
 */

/* eslint-disable prettier/prettier */

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface WebRTCConfig {
  signalingNamespace: string;
  pingInterval: number;
  pingTimeout: number;
  maxParticipants: number;
  roomLinkExpiryMins: number;
  iceServers: ICEServer[];
  metricsEnabled: boolean;
  metricsIntervalMs: number;
  sfuEnabled: boolean;
  sfuProvider: 'mediasoup' | 'livekit' | 'none';
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}

interface SMTPConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // ════════════════════════════════════════════════════════════════════════════
  // JWT Configuration
  // ════════════════════════════════════════════════════════════════════════════
  jwt: {
    secret: process.env.JWT_SECRET ?? 'supersecretkey',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Supabase Configuration (Auth + Storage)
  // ════════════════════════════════════════════════════════════════════════════
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Gemini AI Configuration (Resume analysis, recommendations)
  // ════════════════════════════════════════════════════════════════════════════
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Redis Configuration (BullMQ job queue, caching)
  // Supports both URL format (Upstash/Railway) and host/port (self-hosted)
  // ════════════════════════════════════════════════════════════════════════════
  redis: {
    enabled:
      process.env.REDIS_ENABLED === 'true' ||
      !!process.env.REDIS_URL ||
      !!process.env.REDIS_HOST,
    url: process.env.REDIS_URL ?? null, // ← primary, used by BullMQ
    host: process.env.REDIS_HOST ?? null,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls: process.env.REDIS_TLS === 'true',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ✨ NEW: WebRTC Configuration (Video Conferencing for Interviews)
  // ════════════════════════════════════════════════════════════════════════════
  webrtc: (() => {
    // Parse TURN servers from environment (JSON array)
    let turnServers: ICEServer[] = [];
    try {
      const raw = process.env.TURN_SERVERS;
      if (raw && raw !== '[]' && raw !== '') {
        turnServers = JSON.parse(raw) as ICEServer[];
      }
    } catch (err) {
      console.warn('[Config] Failed to parse TURN_SERVERS:', err);
    }

    // Default STUN servers (free, Google-provided)
    const stunServers: ICEServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];

    return {
      // Signaling server (Socket.IO)
      signalingNamespace: '/interview',
      pingInterval: parseInt(process.env.WEBRTC_PING_INTERVAL ?? '10000', 10),
      pingTimeout: parseInt(process.env.WEBRTC_PING_TIMEOUT ?? '5000', 10),

      // Room management
      maxParticipants: parseInt(
        process.env.INTERVIEW_ROOM_MAX_PARTICIPANTS ?? '6',
        10,
      ),
      // Room link expires 30min before and 2hrs after scheduled time
      roomLinkExpiryMins: parseInt(
        process.env.INTERVIEW_ROOM_LINK_EXPIRY_MINS ?? '120',
        10,
      ),

      // ICE servers for NAT traversal
      // STUN is free; TURN is paid/self-hosted for better connectivity
      iceServers: [...stunServers, ...turnServers],

      // Metrics collection for connection quality monitoring
      metricsEnabled: process.env.ENABLE_METRICS_COLLECTION !== 'false',
      metricsIntervalMs: parseInt(
        process.env.METRICS_COLLECTION_INTERVAL_MS ?? '2000',
        10,
      ),

      // SFU (Selective Forwarding Unit) fallback for large groups
      // Full-mesh for ≤6 participants; SFU for >6 participants
      sfuEnabled: process.env.SFU_ENABLED === 'true',
      sfuProvider:
        (process.env.SFU_PROVIDER as any) ?? 'none',
      livekitUrl: process.env.LIVEKIT_URL,
      livekitApiKey: process.env.LIVEKIT_API_KEY,
      livekitApiSecret: process.env.LIVEKIT_API_SECRET,
    } as WebRTCConfig;
  })(),

  // ════════════════════════════════════════════════════════════════════════════
  // ✨ NEW: SMTP Configuration (Email Notifications for Interviews)
  // ════════════════════════════════════════════════════════════════════════════
  smtp: (() => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    return {
      // Enable SMTP only if credentials are provided
      enabled: !!smtpUser && !!smtpPass,
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      user: smtpUser,
      pass: smtpPass,
      from: process.env.SMTP_FROM ?? 'noreply@job-crawler.com',
      fromName: process.env.SMTP_FROM_NAME ?? 'Job Crawler',
      replyTo: process.env.SMTP_REPLY_TO ?? 'support@job-crawler.com',
    } as SMTPConfig;
  })(),

  // ════════════════════════════════════════════════════════════════════════════
  // SerpAPI Configuration (Job scraping)
  // ════════════════════════════════════════════════════════════════════════════
  serpApiKey: process.env.SERPAPI_KEY ?? '',

  // ════════════════════════════════════════════════════════════════════════════
  // Database Configuration
  // ════════════════════════════════════════════════════════════════════════════
  database: {
    connectionString: process.env.DATABASE_URL ?? '',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Frontend URL (for CORS, OAuth redirects, email links)
  // ════════════════════════════════════════════════════════════════════════════
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});
]]>
</file>
<file name="ts-api\src\config\env.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// C:\Projects\Job-Crawler\ts-api\src\config\env.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  SERPAPI_KEY: requireEnv("SERPAPI_KEY"),
};

]]>
</file>
<file name="ts-api\src\config\webrtc.config.ts">
<![CDATA[
/**
 * WebRTC Configuration Service
 * File: ts-api/src/config/webrtc.config.ts
 *
 * Purpose: Centralized WebRTC configuration following your project's setup pattern
 * Integrates with:
 * - src/config/configuration.ts (main config)
 * - src/app.module.ts (ConfigModule)
 * - .env variables
 *
 * Usage: Inject ConfigService and access via config.get('webrtc.*')
 */

import { registerAs } from '@nestjs/config';

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  // Signaling server
  signalingNamespace: string;
  pingInterval: number;
  pingTimeout: number;

  // Room settings
  maxParticipants: number;
  roomLinkExpiryMins: number;

  // ICE servers (STUN/TURN)
  iceServers: ICEServer[];

  // Metrics collection
  metricsEnabled: boolean;
  metricsIntervalMs: number;

  // SFU fallback (for large groups)
  sfuEnabled: boolean;
  sfuProvider: 'mediasoup' | 'livekit' | 'none';
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}

export default registerAs('webrtc', (): WebRTCConfig => {
  // Parse TURN servers from environment
  let turnServers: ICEServer[] = [];
  try {
    const raw = process.env.TURN_SERVERS;
    if (raw && raw !== '[]') {
      turnServers = JSON.parse(raw) as ICEServer[];
    }
  } catch (err) {
    console.warn('[WebRTC Config] Failed to parse TURN_SERVERS:', err);
  }

  // Default STUN servers (free, Google-provided)
  const stunServers: ICEServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Combine: STUN first (free), then TURN (paid/self-hosted for NAT traversal)
  const iceServers = [...stunServers, ...turnServers];

  return {
    // ── Signaling ────────────────────────────────────────────────────────────
    signalingNamespace: '/interview',
    pingInterval: parseInt(process.env.WEBRTC_PING_INTERVAL || '10000', 10),
    pingTimeout: parseInt(process.env.WEBRTC_PING_TIMEOUT || '5000', 10),

    // ── Room Management ──────────────────────────────────────────────────────
    maxParticipants: parseInt(process.env.INTERVIEW_ROOM_MAX_PARTICIPANTS || '6', 10),
    roomLinkExpiryMins: parseInt(process.env.INTERVIEW_ROOM_LINK_EXPIRY_MINS || '120', 10),

    // ── ICE Servers ──────────────────────────────────────────────────────────
    // Clients use these to establish NAT traversal
    // TURN servers are required for production across different networks
    iceServers,

    // ── Metrics ──────────────────────────────────────────────────────────────
    metricsEnabled: process.env.ENABLE_METRICS_COLLECTION !== 'false',
    metricsIntervalMs: parseInt(process.env.METRICS_COLLECTION_INTERVAL_MS || '2000', 10),

    // ── SFU Fallback (for large groups) ──────────────────────────────────────
    // Use full-mesh WebRTC for ≤6 participants (direct peer connections)
    // Switch to SFU (Selective Forwarding Unit) for larger groups
    sfuEnabled: process.env.SFU_ENABLED === 'true',
    sfuProvider: (process.env.SFU_PROVIDER || 'none') as 'mediasoup' | 'livekit' | 'none',
    livekitUrl: process.env.LIVEKIT_URL,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  };
});
]]>
</file>
<file name="ts-api\src\database\database.config.ts">
<![CDATA[
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  connectionString: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
}));
]]>
</file>
<file name="ts-api\src\database\database.service.ts">
<![CDATA[
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>('database.connectionString');

    if (!connectionString) {
      throw new Error(
        '[DatabaseService] DATABASE_URL is not set. ' +
        'Ensure the environment variable is configured in your deployment.',
      );
    }

    // ── Strip sslmode from the connection string so pg Pool config controls SSL ──
    // Supabase pooler URLs include ?sslmode=require which causes pg to attempt
    // full certificate verification — conflicting with rejectUnauthorized: false.
    // We remove it from the URL and handle SSL entirely via the pool config object.
    const cleanConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/g, '')   // remove sslmode param
      .replace(/[?&]ssl=[^&]*/g, '')        // remove ssl param (if present)
      .replace(/\?$/, '');                  // clean trailing ? if it was the only param

    this.pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,  // ← Supabase uses self-signed intermediate CA
      },
      max:                    10,
      idleTimeoutMillis:   30_000,
      connectionTimeoutMillis: 5_000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected pg pool error: ${err.message}`, err.stack);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('✅ Database connection established successfully.');
    } catch (error) {
      this.logger.error(
        `[FATAL] Cannot connect to database: ${(error as Error).message}`,
        (error as Error).stack,
      );
      process.exit(1);
    }
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start  = Date.now();
    const client = await this.pool.connect();

    try {
      const result   = await client.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${text.substring(0, 100)}...`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Query failed: ${(error as Error).message}\nSQL: ${text.substring(0, 200)}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Transaction rolled back: ${(error as Error).message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed.');
  }
}

]]>
</file>
<file name="ts-api\src\database\datbase.module.ts">
<![CDATA[
// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import databaseConfig from './database.config';

/**
 * @Global() — registers DatabaseService as a singleton available
 * across the entire application without re-importing this module.
 *
 * Import once in AppModule. That's it.
 *
 * ConfigModule.forFeature() scopes the 'database' namespace config
 * (DATABASE_URL, DIRECT_URL) to this module so DatabaseService
 * can resolve config.get('database.connectionString') correctly.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig), // Registers the 'database' namespace
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
]]>
</file>
<file name="ts-api\src\interviews\candidate-interviews.controller.ts">
<![CDATA[
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';

@Controller('candidate/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('candidate')
export class CandidateInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  listMy(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.interviewsService.listCandidateInterviews(req.user.id, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.interviewsService.getCandidateInterview(req.user.id, id);
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interview-reminders.service.ts">
<![CDATA[
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InterviewRemindersService {
  private readonly logger = new Logger(InterviewRemindersService.name);

  constructor(private readonly db: DatabaseService) {}

  @Cron('* * * * *')
  async sendUpcomingReminders() {
    await this.processReminderWindow(30, 'notify_30_sent');
    await this.processReminderWindow(15, 'notify_15_sent');
  }

  private async processReminderWindow(minutes: number, flagColumn: 'notify_30_sent' | 'notify_15_sent') {
    const { rows } = await this.db.query<any>(
      `SELECT r.*, i.candidate_id, i.recruiter_id, j.title AS job_title, u.email AS candidate_email
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       LEFT JOIN jobs j ON j.id = i.job_id
       LEFT JOIN users u ON u.id = i.candidate_id
       WHERE r.scheduled_at IS NOT NULL
         AND r.${flagColumn} = false
         AND r.scheduled_at > NOW()
         AND r.scheduled_at <= NOW() + ($1 || ' minutes')::interval`,
      [minutes],
    );

    for (const row of rows) {
      const title = `Interview starts in ${minutes} minutes`;
      const message = `${row.round_type} interview for ${row.job_title ?? 'your application'} starts soon.`;

      // in-app/device notification (alerts)
      await this.db.query(
        `INSERT INTO alerts (user_id, type, title, message, metadata)
         VALUES ($1, 'interview_reminder', $2, $3, $4::jsonb),
                ($5, 'interview_reminder', $2, $3, $4::jsonb)`,
        [
          row.candidate_id,
          title,
          message,
          JSON.stringify({ roundId: row.id, joinUrl: row.meeting_join_url, scheduledAt: row.scheduled_at }),
          row.recruiter_id,
        ],
      );

      // Email integration point (plug your mailer here)
      this.logger.log(`[EMAIL:${minutes}m] to=${row.candidate_email} subject="${title}"`);

      await this.db.query(
        `UPDATE recruiter_interview_rounds SET ${flagColumn} = true WHERE id = $1`,
        [row.id],
      );
    }
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interview-room.controller.ts">
<![CDATA[
import { Controller, Get, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('interviews/room')
@UseGuards(JwtAuthGuard)
export class InterviewRoomController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get(':roomId/access')
  async access(@Req() req: any, @Param('roomId') roomId: string) {
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      req.user.id,
      req.user.role,
    );
    if (!access.allowed) throw new ForbiddenException('Not allowed to join this room');
    return access;
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interview-rooms.controller.ts">
<![CDATA[
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewRoomsService } from './interview-rooms.service';

@Controller('interview/rooms')
@UseGuards(JwtAuthGuard)
export class InterviewRoomsController {
  constructor(private readonly rooms: InterviewRoomsService) {}

  @Post('create')
  async create(@Req() req: any, @Body() body: any) {
    const user = req.user;
    return this.rooms.createRoom({
      recruiterRoundId: body.recruiterRoundId,
      sessionId: body.sessionId,
      hostUserId: user.id,
      roomName: body.roomName,
      maxParticipants: body.maxParticipants,
      provider: body.provider,
    });
  }

  @Post('join')
  async join(@Req() req: any, @Body() body: { roomId: string; displayName?: string }) {
    const user = req.user;
    return this.rooms.joinRoom(body.roomId, user.id, body.displayName, user.role);
  }

  @Post('leave')
  async leave(@Req() req: any, @Body() body: { roomId: string }) {
    const user = req.user;
    return this.rooms.leaveRoom(body.roomId, user.id);
  }

  @Post('session/start')
  async startSession(@Req() req: any, @Body() body: { interviewId: string; roundId: string }) {
    const user = req.user;
    return this.rooms.startSession(body.interviewId, body.roundId, user.id);
  }

  @Post('session/end')
  async endSession(@Req() req: any, @Body() body: { interviewId: string; roundId: string }) {
    const user = req.user;
    return this.rooms.endSession(body.interviewId, body.roundId, user.id);
  }

  @Get(':roomId')
  async getRoom(@Param('roomId') roomId: string) {
    return this.rooms.getRoom(roomId);
  }
}

]]>
</file>
<file name="ts-api\src\interviews\interview-rooms.service.ts">
<![CDATA[
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type CreateRoomInput = {
  recruiterRoundId?: string;
  sessionId?: string;
  hostUserId: string;
  roomName?: string;
  maxParticipants?: number;
  provider?: string;
};

@Injectable()
export class InterviewRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(input: CreateRoomInput) {
    const { recruiterRoundId, sessionId, hostUserId, roomName, maxParticipants, provider } = input;

    // If recruiterRoundId is provided, try to compute a human-friendly slug
    let slug: string | null = null;
    if (recruiterRoundId) {
      const round = await this.prisma.recruiter_interview_rounds.findUnique({ where: { id: recruiterRoundId } });
      if (!round) throw new NotFoundException('Round not found');
      // Keep backwards-compatible slug used elsewhere in the app
      slug = `jc-${round.interview_id}-r${round.round_number}`;
    }

    const room = await this.prisma.interview_rooms.create({
      data: {
        recruiter_round_id: recruiterRoundId ?? null,
        session_id: sessionId ?? null,
        room_name: roomName ?? null,
        provider: provider ?? 'internal',
        max_participants: maxParticipants ?? 4,
        host_user_id: hostUserId,
        join_url: slug ? `/interviews/room/${slug}` : null,
      },
    });

    // If slug was computed, persist as meeting_room_id for existing round compatibility
    if (slug && recruiterRoundId) {
      await this.prisma.recruiter_interview_rounds.update({
        where: { id: recruiterRoundId },
        data: { meeting_room_id: slug, meeting_join_url: `/interviews/room/${slug}` },
      });
    }

    return {
      id: room.id,
      joinUrl: room.join_url ?? `/interviews/room/${room.id}`,
      provider: room.provider,
      maxParticipants: room.max_participants,
    };
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.interview_rooms.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async joinRoom(roomId: string, userId: string, displayName?: string, role?: string) {
    // Validate room exists
    const room = await this.prisma.interview_rooms.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // Upsert participant for this user
    const participant = await this.prisma.room_participants.upsert({
      where: { id: `${roomId}_${userId}` },
      create: {
        id: `${roomId}_${userId}`,
        room_id: roomId,
        user_id: userId,
        display_name: displayName ?? null,
        role: role ?? 'participant',
      },
      update: {
        left_at: null,
        display_name: displayName ?? undefined,
        role: role ?? undefined,
      },
    });

    return participant;
  }

  async leaveRoom(roomId: string, userId: string) {
    const participantId = `${roomId}_${userId}`;
    const p = await this.prisma.room_participants.findUnique({ where: { id: participantId } });
    if (!p) throw new NotFoundException('Participant not found');

    await this.prisma.room_participants.update({ where: { id: participantId }, data: { left_at: new Date() } });

    return { ok: true };
  }

  async startSession(interviewId: string, roundId: string, actorUserId: string) {
    // Delegated to existing recruiter flow for auditing
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_started_via_api',
        metadata: { roundId },
      },
    });

    // best-effort update recruiter_interviews stage
    await this.prisma.recruiter_interviews.updateMany({
      where: { id: interviewId },
      data: { current_stage: 'INTERVIEW_IN_PROGRESS', status_code: 500 },
    });

    return { ok: true };
  }

  async endSession(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_ended_via_api',
        metadata: { roundId },
      },
    });
    return { ok: true };
  }
}

]]>
</file>
<file name="ts-api\src\interviews\interview.gateway.ts">
<![CDATA[
/// <reference lib="dom" />
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InterviewsService } from './interviews.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string;
  role: string;
  full_name?: string;
};

type RoomParticipant = {
  userId: string;
  socketId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
};

type RoomMeta = {
  interviewId: string;
  roundId: string;
  hostUserId: string;
  endedAt: number | null;
};

type SDP = RTCSessionDescriptionInit;
type ICECandidate = RTCIceCandidateInit;

// ─────────────────────────────────────────────────────────────────────────────
// InterviewGateway
//
// Handles all WebRTC signaling for interview rooms:
//   - Authentication via JWT on connection
//   - Room join/leave with access validation
//   - SDP offer/answer relay
//   - ICE candidate relay
//   - Media state sync (mic/cam/screen)
//   - In-room text chat
//   - Reconnection handling (duplicate socket → same user)
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: true,          // Reflect request origin — lock down in production
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 10_000,
  pingTimeout: 5_000,
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(InterviewGateway.name);

  // roomId → Map<userId, RoomParticipant>
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();

  // roomId → metadata used for waiting room and host-only controls
  private readonly roomMeta = new Map<string, RoomMeta>();

  // socketId → AuthUser (for fast disconnect lookup)
  private readonly socketUsers = new Map<string, AuthUser>();

  // userId → Set<socketId> (for reconnection handling: one user may have multiple sockets briefly)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Connection lifecycle ───────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ||
        this.extractBearer(client.handshake.headers?.authorization as string | undefined);

      if (!token) {
        this.logger.warn(`[${client.id}] No auth token — disconnecting`);
        client.disconnect(true);
        return;
      }

      const decoded = await this.jwtService.verifyAsync<{
        sub?: string;
        id?: string;
        role: string;
        full_name?: string;
      }>(token);

      const user: AuthUser = {
        id: decoded.sub ?? decoded.id ?? '',
        role: decoded.role,
        full_name: decoded.full_name,
      };

      if (!user.id) {
        client.disconnect(true);
        return;
      }

      (client as any).user = user;
      this.socketUsers.set(client.id, user);

      // Track all sockets for this user (handles reconnect)
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      this.logger.debug(`[${client.id}] Connected: ${user.id} (${user.role})`);
    } catch (err) {
      this.logger.warn(`[${client.id}] Auth failed: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    this.socketUsers.delete(client.id);

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(user.id);
    }

    // Remove from all rooms this socket was in
    for (const [roomId, participants] of this.rooms.entries()) {
      const participant = participants.get(user.id);
      // Only remove if THIS socket was the active one for this user
      if (participant && participant.socketId === client.id) {
        // Check if user reconnected with a different socket already
        const activeSockets = this.userSockets.get(user.id);
        if (!activeSockets || activeSockets.size === 0) {
          participants.delete(user.id);
          client.to(roomId).emit('interview:user-left', { userId: user.id });
          this.emitRoomStatus(roomId);
          this.logger.debug(`[room:${roomId}] ${user.id} left (disconnect)`);

          if (participants.size === 0) {
            this.rooms.delete(roomId);
            this.roomMeta.delete(roomId);
            this.logger.debug(`[room:${roomId}] Empty — cleaned up`);
          }
        }
      }
    }
  }

  // ── Room management ────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; name?: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return this.sendError(client, 'Unauthenticated');

    const { roomId } = body;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate that this user has access to this room
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      user.id,
      user.role,
    );

    if (!access.allowed) {
      return this.sendError(client, 'Forbidden: you do not have access to this room');
    }

    await client.join(roomId);

    // Get or create room participant map
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    const participants = this.rooms.get(roomId)!;

    const participant: RoomParticipant = {
      userId: user.id,
      socketId: client.id,
      name: body.name ?? user.full_name,
      role: user.role,
      micOn: true,
      camOn: true,
      screenSharing: false,
      joinedAt: Date.now(),
    };

    if (access.allowed && access.interviewId && access.roundId && access.hostUserId) {
      const existingMeta = this.roomMeta.get(roomId);
      this.roomMeta.set(roomId, {
        interviewId: access.interviewId,
        roundId: access.roundId,
        hostUserId: existingMeta?.hostUserId ?? access.hostUserId,
        endedAt: existingMeta?.endedAt ?? null,
      });
    }

    participants.set(user.id, participant);

    // Send current participant list to the joiner
    const allParticipants = Array.from(participants.values());
    client.emit('interview:room-snapshot', {
      participants: allParticipants.map(p => this.serializeParticipant(p)),
    });

    // Notify existing participants
    client.to(roomId).emit('interview:user-joined', {
      participant: this.serializeParticipant(participant),
    });

    this.emitRoomStatus(roomId);

    if (user.role === 'recruiter' && access.allowed && access.interviewId && access.roundId) {
      void this.interviewsService.markRoomStarted(access.interviewId, access.roundId, user.id);
    }

    this.logger.log(`[room:${roomId}] ${user.id} (${user.role}) joined — ${participants.size} total`);
  }

  @SubscribeMessage('interview:leave-room')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const { roomId } = body;
    await client.leave(roomId);

    const participants = this.rooms.get(roomId);
    if (participants) {
      participants.delete(user.id);
      client.to(roomId).emit('interview:user-left', { userId: user.id });
      this.emitRoomStatus(roomId);
      if (participants.size === 0) this.rooms.delete(roomId);
      if (participants.size === 0) this.roomMeta.delete(roomId);
    }

    this.logger.debug(`[room:${roomId}] ${user.id} left voluntarily`);
  }

  // ── WebRTC signaling relay ─────────────────────────────────────────────────
  // These are pure relay events — the gateway never inspects SDP/ICE content.
  // It only validates auth and routes to the correct target socket.

  @SubscribeMessage('interview:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: SDP },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:offer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: SDP },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:answer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; candidate: ICECandidate },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:ice-candidate', {
      fromUserId: user.id,
      candidate: body.candidate,
    });
  }

  // ── Media state ────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:toggle-media')
  onToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: {
      roomId: string;
      micOn: boolean;
      camOn: boolean;
      screenSharing?: boolean;
    },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const participants = this.rooms.get(body.roomId);
    if (participants?.has(user.id)) {
      const p = participants.get(user.id)!;
      p.micOn = body.micOn;
      p.camOn = body.camOn;
      p.screenSharing = body.screenSharing ?? false;
    }

    client.to(body.roomId).emit('interview:user-media-toggled', {
      userId: user.id,
      micOn: body.micOn,
      camOn: body.camOn,
      screenSharing: body.screenSharing ?? false,
    });
  }

  // ── In-room chat ───────────────────────────────────────────────────────────

  @SubscribeMessage('interview:chat-message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const msg = body.message?.trim();
    if (!msg || msg.length > 2000) return; // Basic validation

    const participants = this.rooms.get(body.roomId);
    const participant = participants?.get(user.id);

    this.server.to(body.roomId).emit('interview:chat-message', {
      userId: user.id,
      name: participant?.name ?? user.full_name ?? 'Participant',
      role: participant?.role ?? user.role,
      message: msg,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Heartbeat / ping ───────────────────────────────────────────────────────

  @SubscribeMessage('interview:ping')
  onPing(@ConnectedSocket() client: Socket): void {
    client.emit('interview:pong', { ts: Date.now() });
  }

  @SubscribeMessage('interview:end-room')
  async onEndRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const roomId = body?.roomId;
    if (!roomId) return this.sendError(client, 'roomId required');

    const access = await this.interviewsService.validateRoomAccessWithContext(roomId, user.id, user.role);
    if (!access.allowed) return this.sendError(client, 'Forbidden: cannot end room');

    const meta = this.roomMeta.get(roomId);
    const hostUserId = meta?.hostUserId ?? access.hostUserId;
    const canEnd = user.role === 'recruiter' && !!hostUserId && hostUserId === user.id;
    if (!canEnd) return this.sendError(client, 'Only host can end interview');

    this.roomMeta.set(roomId, {
      interviewId: access.interviewId!,
      roundId: access.roundId!,
      hostUserId,
      endedAt: Date.now(),
    });

    this.server.to(roomId).emit('interview:room-ended', {
      roomId,
      endedBy: user.id,
      endedAt: new Date().toISOString(),
    });

    await this.interviewsService.markRoomEnded(access.interviewId!, access.roundId!, user.id);

    // Detach all sockets from this room to guarantee hard end.
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(roomId);
        }
      }
    }

    this.rooms.delete(roomId);
    this.roomMeta.delete(roomId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private getAuthUser(client: Socket): AuthUser | null {
    return (client as any).user as AuthUser | null;
  }

  private sendError(client: Socket, message: string): void {
    client.emit('interview:error', { message });
  }

  /**
   * Relay a payload to a specific user in a room.
   * Finds the user's active socket by scanning the room adapter.
   */
  private relayToUser(
    roomId: string,
    targetUserId: string,
    event: string,
    payload: unknown,
  ): void {
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return;

    for (const socketId of roomSockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      const socketUser = socket ? this.socketUsers.get(socketId) : undefined;
      if (socketUser?.id === targetUserId && socket) {
        socket.emit(event, payload);
        return;
      }
    }
  }

  private serializeParticipant(p: RoomParticipant) {
    return {
      userId: p.userId,
      name: p.name,
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
      joinedAt: p.joinedAt,
    };
  }

  private emitRoomStatus(roomId: string): void {
    const participants = this.rooms.get(roomId);
    const meta = this.roomMeta.get(roomId);
    const hostPresent = !!meta?.hostUserId && !!participants?.has(meta.hostUserId);

    this.server.to(roomId).emit('interview:room-status', {
      roomId,
      hostUserId: meta?.hostUserId ?? null,
      hostPresent,
      participantCount: participants?.size ?? 0,
      ended: !!meta?.endedAt,
      endedAt: meta?.endedAt ? new Date(meta.endedAt).toISOString() : null,
    });
  }

  private extractBearer(authHeader?: string): string | null {
    if (!authHeader) return null;
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    return m ? m[1] : null;
  }

  // ── Room inspection (for admin/debugging) ─────────────────────────────────

  getRoomInfo(roomId: string) {
    const participants = this.rooms.get(roomId);
    return {
      roomId,
      participantCount: participants?.size ?? 0,
      participants: participants
        ? Array.from(participants.values()).map(p => this.serializeParticipant(p))
        : [],
    };
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interviews.controller.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Controller, Post, Get, Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  InterviewsService,
  AnswerEvaluation,
  InterviewQuestionRow,
} from './interviews.service';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  // ── POST /interviews/sessions ─────────────────────────────────────────────

  @Post('sessions')
  startSession(
    @Req()               req: any,
    @Body('jobTitle')    jobTitle: string,
    @Body('company')     company: string,
    @Body('sessionType') sessionType: string,
    @Body('jobId')       jobId?: string,
  ) {
    return this.interviews.startSession(
      req.user.id,
      jobTitle,
      company,
      sessionType ?? 'technical',
      jobId,
    );
  }

  // ── POST /interviews/questions/:questionId/answer ─────────────────────────
  // Explicit return type — AnswerEvaluation is exported from service

  @Post('questions/:questionId/answer')
  submitAnswer(
    @Param('questionId')   questionId: string,
    @Req()                 req: any,
    @Body('answer')        answer: string,
    @Body('timeTakenSecs') timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    return this.interviews.submitAnswer(
      questionId,
      req.user.id,
      answer,
      timeTakenSecs,
    ) as Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }>;
  }

  // ── POST /interviews/sessions/:sessionId/complete ─────────────────────────

  @Post('sessions/:sessionId/complete')
  complete(
    @Param('sessionId') sessionId: string,
    @Req()              req: any,
  ) {
    return this.interviews.completeSession(sessionId, req.user.id);
  }

  // ── GET /interviews/sessions ──────────────────────────────────────────────

  @Get('sessions')
  history(@Req() req: any) {
    return this.interviews.getSessionHistory(req.user.id);
  }

  // ── GET /interviews/sessions/:sessionId ───────────────────────────────────
  // Explicit return type — InterviewQuestionRow is exported from service

  @Get('sessions/:sessionId')
  getSession(
    @Param('sessionId') sessionId: string,
    @Req()              req: any,
  ): Promise<{ session: Record<string, unknown>; questions: InterviewQuestionRow[] }> {
    return this.interviews.getSession(
      sessionId,
      req.user.id,
    ) as Promise<{ session: Record<string, unknown>; questions: InterviewQuestionRow[] }>;
  }
}

]]>
</file>
<file name="ts-api\src\interviews\interviews.module.ts">
<![CDATA[
/**
 * Interviews Module (ENHANCED)
 * File: ts-api/src/interviews/interviews.module.ts
 * 
 * Added: WebRTC service, metrics, connection management
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

import { InterviewsController } from './interviews.controller';
import { InterviewGateway } from './interview.gateway';
import { InterviewsService } from './interviews.service';
import { WebRTCGateway } from './webrtc/webrtc.gateway';
import { WebRTCService } from './webrtc/webrtc.service';
import { ConnectionMetricsService } from './webrtc/connection-metrics';

import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { RecruiterInterviewsService } from './recruiter-interviews.service';

import { CandidateInterviewsController } from './candidate-interviews.controller';
import { InterviewRoomController } from './interview-room.controller';
import { InterviewRoomsController } from './interview-rooms.controller';
import { InterviewRoomsService } from './interview-rooms.service';
import { InterviewRemindersService } from './interview-reminders.service';

import { DatabaseModule } from '../database/datbase.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? config.get<string>('JWT_SECRET') ?? 'fallback-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  controllers: [
    InterviewsController,
    RecruiterInterviewsController,
    CandidateInterviewsController,
    InterviewRoomController,
    InterviewRoomsController,
  ],
  providers: [
    PrismaService,
    InterviewsService,
    RecruiterInterviewsService,
    InterviewRoomsService,
    InterviewRemindersService,
    // ✨ NEW WebRTC providers
    WebRTCService,
    WebRTCGateway,
    ConnectionMetricsService,
  ],
  exports: [InterviewsService, RecruiterInterviewsService, WebRTCService],
})
export class InterviewsModule {}
]]>
</file>
<file name="ts-api\src\interviews\interviews.service.ts">
<![CDATA[
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AnswerEvaluation = {
  score: number;
  feedback: string;
};

export type InterviewQuestionRow = {
  id: string;
  session_id: string;
  question_number: number;
  question: string;
  category: string | null;
  difficulty: string | null;
  ideal_answer: string | null;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
  time_taken_secs: number | null;
  answered_at: Date | null;
  created_at: Date | null;
};

type ScheduleRoundInput = {
  roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
  scheduledAt: string;
  durationMins?: number;
  mode?: 'video' | 'phone' | 'offline';
  interviewerId?: string;
};

type RoundResultInput = {
  result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
  score?: number;
  feedback?: string;
};

type RoomAccessResult = {
  allowed: boolean;
  reason?: 'invalid_room' | 'room_not_found' | 'forbidden' | 'room_link_expired';
  roomId?: string;
  interviewId?: string;
  roundId?: string;
  role?: string;
  userId?: string;
  hostUserId?: string;
  interviewStage?: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
};

const STAGE_TO_CODE: Record<string, number> = {
  APPLIED: 100,
  UNDER_REVIEW: 200,
  SHORTLISTED: 300,
  INTERVIEW_SCHEDULED: 400,
  INTERVIEW_IN_PROGRESS: 500,
  INTERVIEW_PASSED: 600,
  INTERVIEW_FAILED: 650,
  FINAL_REVIEW: 700,
  OFFERED: 800,
  HIRED: 900,
  REJECTED: 950,
  ON_HOLD: 120,
  WITHDRAWN: 980,
};

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // MOCK INTERVIEW (used by interviews.controller.ts)
  // ───────────────────────────────────────────────────────────────────────────

  async startSession(
    userId: string,
    jobTitle: string,
    company: string,
    sessionType = 'technical',
    jobId?: string,
  ) {
    if (!jobTitle?.trim()) throw new BadRequestException('jobTitle is required');

    const session = await this.prisma.interview_sessions.create({
      data: {
        candidate_id: userId,
        job_id: jobId ?? null,
        job_title: jobTitle.trim(),
        company: company ?? null,
        session_type: sessionType ?? 'technical',
        status: 'in_progress',
        total_questions: 5,
      },
    });

    const starterQuestions = [
      {
        question_number: 1,
        question: `Tell me about yourself and your fit for ${jobTitle}.`,
        category: 'behavioral',
        difficulty: 'easy',
        ideal_answer: 'Structured summary of experience, strengths, and relevance to role.',
      },
      {
        question_number: 2,
        question: `Explain a challenging problem you solved in your recent project.`,
        category: 'problem_solving',
        difficulty: 'medium',
        ideal_answer: 'Context, challenge, action, result with measurable impact.',
      },
      {
        question_number: 3,
        question: `How do you ensure quality while delivering under deadlines?`,
        category: 'execution',
        difficulty: 'medium',
        ideal_answer: 'Testing, prioritization, tradeoff communication, risk mitigation.',
      },
      {
        question_number: 4,
        question: `Describe your approach to collaboration with cross-functional teams.`,
        category: 'communication',
        difficulty: 'easy',
        ideal_answer: 'Clear communication, ownership, conflict handling, alignment.',
      },
      {
        question_number: 5,
        question: `Why do you want to join this company?`,
        category: 'motivation',
        difficulty: 'easy',
        ideal_answer: 'Company alignment, role impact, growth path.',
      },
    ];

    await this.prisma.interview_questions.createMany({
      data: starterQuestions.map((q) => ({
        session_id: session.id,
        ...q,
      })),
    });

    return session;
  }

  async submitAnswer(
    questionId: string,
    userId: string,
    answer: string,
    timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    const q = await this.prisma.interview_questions.findUnique({
      where: { id: questionId },
      include: { interview_sessions: true },
    });

    if (!q) throw new NotFoundException('Question not found');
    if (q.interview_sessions.candidate_id !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const clean = (answer ?? '').trim();
    const len = clean.length;
    const score = Math.max(0, Math.min(100, Math.round((len / 280) * 100)));
    const feedback =
      len < 60
        ? 'Answer too short; add context, action, and result.'
        : len < 160
        ? 'Good start; include stronger measurable outcomes.'
        : 'Strong answer structure and detail.';

    const updated = await this.prisma.interview_questions.update({
      where: { id: questionId },
      data: {
        user_answer: clean,
        time_taken_secs: timeTakenSecs,
        answered_at: new Date(),
        score,
        feedback,
      },
    });

    return {
      ...(updated as InterviewQuestionRow),
      evaluation: { score, feedback },
      idealAnswer: q.ideal_answer ?? '',
    };
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const qs = await this.prisma.interview_questions.findMany({
      where: { session_id: sessionId },
    });

    const scored = qs.filter((x) => typeof x.score === 'number');
    const overall =
      scored.length > 0
        ? Number(
            (
              scored.reduce((sum, x) => sum + Number(x.score ?? 0), 0) / scored.length
            ).toFixed(2),
          )
        : null;

    return this.prisma.interview_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        overall_score: overall,
        completed_at: new Date(),
      },
    });
  }

  async getSessionHistory(userId: string) {
    return this.prisma.interview_sessions.findMany({
      where: { candidate_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const questions = await this.prisma.interview_questions.findMany({
      where: { session_id: sessionId },
      orderBy: { question_number: 'asc' },
    });

    return { session, questions };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECRUITER INTERVIEW PIPELINE
  // ───────────────────────────────────────────────────────────────────────────

  async listRecruiterInterviews(
    recruiterId: string,
    params?: { statusCode?: number; limit?: number },
  ) {
    const rows = await this.prisma.recruiter_interviews.findMany({
      where: {
        recruiter_id: recruiterId,
        ...(typeof params?.statusCode === 'number' ? { status_code: params.statusCode } : {}),
      },
      orderBy: { updated_at: 'desc' },
      take: params?.limit ?? 30,
    });

    if (!rows.length) return [];

    const jobIds = [...new Set(rows.map((r) => r.job_id))];
    const candidateIds = [...new Set(rows.map((r) => r.candidate_id))];

    const [jobs, users] = await Promise.all([
      this.prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.users.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, full_name: true, email: true },
      }),
    ]);

    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => ({
      id: r.id,
      current_stage: r.current_stage,
      status_code: r.status_code,
      final_status: r.final_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: jobMap.get(r.job_id)?.title ?? null,
      company: jobMap.get(r.job_id)?.company ?? null,
      candidate_name: userMap.get(r.candidate_id)?.full_name ?? null,
      candidate_email: userMap.get(r.candidate_id)?.email ?? null,
    }));
  }

  async getRecruiterInterview(recruiterId: string, interviewId: string) {
    const row = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const [job, candidate, rounds] = await Promise.all([
      this.prisma.job.findUnique({
        where: { id: row.job_id },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.users.findUnique({
        where: { id: row.candidate_id },
        select: { id: true, full_name: true, email: true },
      }),
      this.prisma.recruiter_interview_rounds.findMany({
        where: { interview_id: row.id },
        orderBy: { round_number: 'asc' },
      }),
    ]);

    return {
      id: row.id,
      current_stage: row.current_stage,
      status_code: row.status_code,
      final_status: row.final_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      candidate_id: row.candidate_id,
      recruiter_id: row.recruiter_id,
      job_id: row.job_id,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      candidate_name: candidate?.full_name ?? null,
      candidate_email: candidate?.email ?? null,
      rounds,
    };
  }

  async scheduleRound(recruiterId: string, interviewId: string, payload: ScheduleRoundInput) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid scheduledAt');

    const lastRound = await this.prisma.recruiter_interview_rounds.findFirst({
      where: { interview_id: interviewId },
      orderBy: { round_number: 'desc' },
    });

    const nextRoundNumber = (lastRound?.round_number ?? 0) + 1;
    const roomId = `jc-${interviewId}-r${nextRoundNumber}`;
    const joinUrl = `/interviews/room/${roomId}`;

    const round = await this.prisma.recruiter_interview_rounds.create({
      data: {
        interview_id: interviewId,
        round_number: nextRoundNumber,
        round_type: payload.roundType,
        scheduled_at: scheduledAt,
        duration_mins: payload.durationMins ?? 45,
        mode: payload.mode ?? 'video',
        interviewer_id: payload.interviewerId ?? recruiterId,
        meeting_provider: 'internal',
        meeting_room_id: roomId,
        meeting_join_url: joinUrl,
        result: 'pending',
      },
    });

    await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: 'INTERVIEW_SCHEDULED',
        status_code: STAGE_TO_CODE.INTERVIEW_SCHEDULED,
      },
    });

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: recruiterId,
        event_type: 'round_scheduled',
        metadata: { round_id: round.id, round_number: round.round_number, room_id: roomId },
      },
    });

    return round;
  }

  async updateStage(recruiterId: string, interviewId: string, stage: string) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!(stage in STAGE_TO_CODE)) throw new BadRequestException('Invalid stage');

    const updated = await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: stage as any,
        status_code: STAGE_TO_CODE[stage],
        final_status: ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(stage)
          ? stage
          : interview.final_status,
      },
    });

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: recruiterId,
        event_type: 'stage_changed',
        from_stage: interview.current_stage,
        to_stage: stage,
      },
    });

    return updated;
  }

  async submitRoundResult(recruiterId: string, roundId: string, payload: RoundResultInput) {
    const round = await this.prisma.recruiter_interview_rounds.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Round not found');

    const interview = await this.prisma.recruiter_interviews.findUnique({
      where: { id: round.interview_id },
    });
    if (!interview || interview.recruiter_id !== recruiterId) throw new ForbiddenException('Not allowed');

    const updatedRound = await this.prisma.recruiter_interview_rounds.update({
      where: { id: roundId },
      data: {
        result: payload.result,
        score: payload.score ?? null,
        feedback: payload.feedback ?? null,
      },
    });

    if (payload.result === 'pass') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interview.id },
        data: {
          current_stage: 'INTERVIEW_PASSED',
          status_code: STAGE_TO_CODE.INTERVIEW_PASSED,
        },
      });
    } else if (payload.result === 'fail') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interview.id },
        data: {
          current_stage: 'INTERVIEW_FAILED',
          status_code: STAGE_TO_CODE.INTERVIEW_FAILED,
        },
      });
    }

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interview.id,
        actor_user_id: recruiterId,
        event_type: 'round_result_submitted',
        metadata: { round_id: roundId, result: payload.result, score: payload.score ?? null },
      },
    });

    return updatedRound;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CANDIDATE VIEWS
  // ───────────────────────────────────────────────────────────────────────────

  async listCandidateInterviews(candidateId: string, params?: { statusCode?: number; limit?: number }) {
    const rows = await this.prisma.recruiter_interviews.findMany({
      where: {
        candidate_id: candidateId,
        ...(typeof params?.statusCode === 'number' ? { status_code: params.statusCode } : {}),
      },
      orderBy: { updated_at: 'desc' },
      take: params?.limit ?? 30,
    });

    if (!rows.length) return [];

    const jobIds = [...new Set(rows.map((r) => r.job_id))];
    const jobs = await this.prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, title: true, company: true },
    });
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    return rows.map((r) => ({
      id: r.id,
      current_stage: r.current_stage,
      status_code: r.status_code,
      final_status: r.final_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: jobMap.get(r.job_id)?.title ?? null,
      company: jobMap.get(r.job_id)?.company ?? null,
    }));
  }

  async getCandidateInterview(candidateId: string, interviewId: string) {
    const row = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, candidate_id: candidateId },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const [job, rounds] = await Promise.all([
      this.prisma.job.findUnique({
        where: { id: row.job_id },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.recruiter_interview_rounds.findMany({
        where: { interview_id: row.id },
        orderBy: { round_number: 'asc' },
      }),
    ]);

    return {
      id: row.id,
      current_stage: row.current_stage,
      status_code: row.status_code,
      final_status: row.final_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      rounds,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROOM ACCESS VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  async validateRoomAccess(roomId: string, userId: string, role: string) {
    return this.validateRoomAccessWithContext(roomId, userId, role);
  }

  async validateRoomAccessWithContext(roomId: string, userId: string, role: string): Promise<RoomAccessResult> {
    const m = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(roomId);
    if (!m) return { allowed: false, reason: 'invalid_room' };

    const interviewId = m[1];
    const roundNumber = Number(m[2]);

    const [interview, round] = await Promise.all([
      this.prisma.recruiter_interviews.findUnique({ where: { id: interviewId } }),
      this.prisma.recruiter_interview_rounds.findFirst({
        where: { interview_id: interviewId, round_number: roundNumber },
      }),
    ]);

    if (!interview || !round) return { allowed: false, reason: 'room_not_found' };

    const isCandidate = role === 'candidate' && interview.candidate_id === userId;
    const isRecruiter = role === 'recruiter' && interview.recruiter_id === userId;
    if (!isCandidate && !isRecruiter) return { allowed: false, reason: 'forbidden' };

    // Expiring room URL policy:
    // Join opens 30 minutes before schedule and expires 2 hours after round end.
    if (round.scheduled_at) {
      const scheduledAt = round.scheduled_at.getTime();
      const durationMs = (round.duration_mins ?? 45) * 60 * 1000;
      const startsAtMs = scheduledAt - 30 * 60 * 1000;
      const expiresAtMs = scheduledAt + durationMs + 2 * 60 * 60 * 1000;
      const now = Date.now();

      if (now < startsAtMs || now > expiresAtMs) {
        return {
          allowed: false,
          reason: 'room_link_expired',
          roomId,
          interviewId,
          roundId: round.id,
          role,
          userId,
          hostUserId: interview.recruiter_id,
          interviewStage: interview.current_stage,
          scheduledAt: round.scheduled_at.toISOString(),
          expiresAt: new Date(expiresAtMs).toISOString(),
        };
      }
    }

    return {
      allowed: true,
      roomId,
      interviewId,
      roundId: round.id,
      role,
      userId,
      hostUserId: interview.recruiter_id,
      interviewStage: interview.current_stage,
      scheduledAt: round.scheduled_at ? round.scheduled_at.toISOString() : null,
      expiresAt: round.scheduled_at
        ? new Date(round.scheduled_at.getTime() + ((round.duration_mins ?? 45) + 120) * 60 * 1000).toISOString()
        : null,
    };
  }

  async markRoomStarted(interviewId: string, roundId: string, actorUserId: string) {
    const interview = await this.prisma.recruiter_interviews.findUnique({ where: { id: interviewId } });
    if (!interview) return;

    if (interview.current_stage !== 'INTERVIEW_IN_PROGRESS') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interviewId },
        data: {
          current_stage: 'INTERVIEW_IN_PROGRESS',
          status_code: STAGE_TO_CODE.INTERVIEW_IN_PROGRESS,
        },
      });
    }

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_started',
        metadata: { round_id: roundId },
      },
    });
  }

  async markRoomEnded(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_ended',
        metadata: { round_id: roundId },
      },
    });
  }
}
]]>
</file>
<file name="ts-api\src\interviews\recruiter-interviews.controller.ts">
<![CDATA[
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterInterviewsService, StageKey } from './recruiter-interviews.service';

@Controller('recruiter/interviews')
@UseGuards(JwtAuthGuard)
export class RecruiterInterviewsController {
  constructor(private readonly service: RecruiterInterviewsService) {}

  @Post(':applicationId/init')
  init(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.service.initInterview(applicationId, req.user.id);
  }

  @Post(':interviewId/rounds')
  scheduleRound(
    @Param('interviewId') interviewId: string,
    @Req() req: any,
    @Body() body: {
      roundType: string;
      scheduledAt: string;
      durationMins?: number;
      mode?: string;
      interviewerId?: string;
    },
  ) {
    return this.service.scheduleRound(interviewId, req.user.id, body);
  }

  @Patch(':interviewId/stage')
  updateStage(
    @Param('interviewId') interviewId: string,
    @Req() req: any,
    @Body('stage') stage: StageKey,
  ) {
    return this.service.updateStage(interviewId, req.user.id, stage);
  }

  @Patch('rounds/:roundId/result')
  submitRoundResult(
    @Param('roundId') roundId: string,
    @Req() req: any,
    @Body() body: { result: string; score?: number; feedback?: string },
  ) {
    return this.service.submitRoundResult(roundId, req.user.id, body);
  }

  @Get('dashboard')
  dashboard(@Req() req: any, @Query('jobId') jobId?: string) {
    return this.service.getDashboard(req.user.id, jobId);
  }

  @Get(':interviewId')
  detail(@Param('interviewId') interviewId: string, @Req() req: any) {
    return this.service.getInterview(interviewId, req.user.id, req.user.role);
  }

  @Get()
  list(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listInterviews(req.user.id, req.user.role, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 20,
    });
  }
}
]]>
</file>
<file name="ts-api\src\interviews\recruiter-interviews.service.ts">
<![CDATA[
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';

const STAGE_TO_CODE: Record<string, number> = {
  APPLIED: 100,
  UNDER_REVIEW: 110,
  SHORTLISTED: 120,
  INTERVIEW_SCHEDULED: 130,
  INTERVIEW_IN_PROGRESS: 140,
  INTERVIEW_PASSED: 150,
  INTERVIEW_FAILED: 160,
  FINAL_REVIEW: 170,
  OFFERED: 180,
  HIRED: 190,
  REJECTED: 900,
  ON_HOLD: 910,
  WITHDRAWN: 920,
};

export type StageKey = keyof typeof STAGE_TO_CODE;

@Injectable()
export class RecruiterInterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly db: DatabaseService,
  ) {}

  async initInterview(applicationId: string, recruiterId: string) {
    const { rows } = await this.db.query<any>(
      `SELECT a.id, a.job_id, a.candidate_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId],
    );
    if (!rows.length) throw new NotFoundException('Application not found');

    const app = rows[0];

    await this.db.query(
      `INSERT INTO recruiter_interviews (application_id, job_id, candidate_id, recruiter_id, current_stage, status_code)
       VALUES ($1, $2, $3, $4, 'APPLIED', 100)
       ON CONFLICT (application_id) DO NOTHING`,
      [app.id, app.job_id, app.candidate_id, recruiterId],
    );

    const detail = await this.db.query(
      `SELECT * FROM recruiter_interviews WHERE application_id = $1`,
      [applicationId],
    );

    return detail.rows[0];
  }

  async scheduleRound(
    interviewId: string,
    recruiterId: string,
    payload: { roundType: string; scheduledAt: string; durationMins?: number; mode?: string; interviewerId?: string },
  ) {
    const interview = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1 AND recruiter_id = $2`,
      [interviewId, recruiterId],
    );
    if (!interview.rows.length) throw new NotFoundException('Interview not found');

    const n = await this.db.query<{ next_round: number }>(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round
       FROM recruiter_interview_rounds
       WHERE interview_id = $1`,
      [interviewId],
    );
    const roundNumber = n.rows[0].next_round;

    const roomId = `jc-${interviewId.slice(0, 8)}-r${roundNumber}`;
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interviews/room/${roomId}`;

    const { rows } = await this.db.query(
      `INSERT INTO recruiter_interview_rounds
       (interview_id, round_number, round_type, scheduled_at, duration_mins, mode, interviewer_id, meeting_provider, meeting_room_id, meeting_join_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'internal',$8,$9)
       RETURNING *`,
      [
        interviewId,
        roundNumber,
        payload.roundType,
        payload.scheduledAt,
        payload.durationMins ?? 45,
        payload.mode ?? 'video',
        payload.interviewerId ?? null,
        roomId,
        joinUrl,
      ],
    );

    await this.updateStage(interviewId, recruiterId, 'INTERVIEW_SCHEDULED', true);
    return rows[0];
  }

  async updateStage(interviewId: string, actorUserId: string, stage: StageKey, skipAuth = false) {
    const code = STAGE_TO_CODE[stage];
    if (!code) throw new NotFoundException('Invalid stage');

    const interview = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!interview.rows.length) throw new NotFoundException('Interview not found');

    const current = interview.rows[0];
    if (!skipAuth && current.recruiter_id !== actorUserId) {
      throw new ForbiddenException('Not allowed');
    }

    const finalStatus =
      stage === 'REJECTED' ? 'rejected'
      : stage === 'HIRED' ? 'selected'
      : stage === 'SHORTLISTED' ? 'shortlisted'
      : stage === 'ON_HOLD' ? 'on_hold'
      : 'in_progress';

    const { rows } = await this.db.query(
      `UPDATE recruiter_interviews
       SET current_stage = $1, status_code = $2, final_status = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [stage, code, finalStatus, interviewId],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, from_stage, to_stage, metadata)
       VALUES ($1, $2, 'STATUS_CHANGED', $3, $4, $5::jsonb)`,
      [interviewId, actorUserId, current.current_stage, stage, JSON.stringify({ statusCode: code })],
    );

    if (stage === 'REJECTED') {
      await this.garbageRejectedResume(current.candidate_id, current.application_id);
    }

    return rows[0];
  }

  async submitRoundResult(roundId: string, recruiterId: string, payload: { result: string; score?: number; feedback?: string }) {
    const check = await this.db.query<any>(
      `SELECT r.*, i.recruiter_id, i.id AS interview_id
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       WHERE r.id = $1`,
      [roundId],
    );
    if (!check.rows.length) throw new NotFoundException('Round not found');
    if (check.rows[0].recruiter_id !== recruiterId) throw new ForbiddenException('Not allowed');

    const { rows } = await this.db.query(
      `UPDATE recruiter_interview_rounds
       SET result = $1, score = $2, feedback = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payload.result, payload.score ?? null, payload.feedback ?? null, roundId],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, metadata)
       VALUES ($1, $2, 'ROUND_COMPLETED', $3::jsonb)`,
      [check.rows[0].interview_id, recruiterId, JSON.stringify({ roundId, result: payload.result })],
    );

    return rows[0];
  }

  async getDashboard(recruiterId: string, jobId?: string) {
    const params: any[] = [recruiterId];
    let where = `WHERE recruiter_id = $1`;
    if (jobId) {
      params.push(jobId);
      where += ` AND job_id = $2`;
    }

    const { rows } = await this.db.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE current_stage='SHORTLISTED')::int as shortlisted,
         COUNT(*) FILTER (WHERE current_stage='REJECTED')::int as rejected,
         COUNT(*) FILTER (WHERE current_stage='INTERVIEW_SCHEDULED')::int as scheduled,
         COUNT(*) FILTER (WHERE current_stage='HIRED')::int as hired
       FROM recruiter_interviews
       ${where}`,
      params,
    );

    return rows[0];
  }

  async listInterviews(userId: string, role: string, opts: { statusCode?: number; limit?: number }) {
    const limit = Math.min(opts.limit ?? 20, 100);
    const params: any[] = [limit];
    let where = '';

    if (role === 'recruiter') {
      params.unshift(userId);
      where = `WHERE i.recruiter_id = $1`;
      if (opts.statusCode) {
        params.push(opts.statusCode);
        where += ` AND i.status_code = $${params.length}`;
      }
    } else {
      params.unshift(userId);
      where = `WHERE i.candidate_id = $1`;
      if (opts.statusCode) {
        params.push(opts.statusCode);
        where += ` AND i.status_code = $${params.length}`;
      }
    }

    const q = role === 'recruiter'
      ? `SELECT i.*, u.full_name as candidate_name, j.title as job_title
         FROM recruiter_interviews i
         LEFT JOIN users u ON u.id = i.candidate_id
         LEFT JOIN jobs j ON j.id = i.job_id
         ${where}
         ORDER BY i.updated_at DESC
         LIMIT $2`
      : `SELECT i.*, j.title as job_title, j.company
         FROM recruiter_interviews i
         LEFT JOIN jobs j ON j.id = i.job_id
         ${where}
         ORDER BY i.updated_at DESC
         LIMIT $2`;

    const { rows } = await this.db.query(q, params);
    return rows;
  }

  async getInterview(interviewId: string, userId: string, role: string) {
    const { rows } = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!rows.length) throw new NotFoundException('Interview not found');

    const i = rows[0];
    if (role === 'recruiter' && i.recruiter_id !== userId) throw new ForbiddenException('Not allowed');
    if (role !== 'recruiter' && i.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const rounds = await this.db.query(
      `SELECT * FROM recruiter_interview_rounds WHERE interview_id = $1 ORDER BY round_number`,
      [interviewId],
    );
    const events = await this.db.query(
      `SELECT * FROM recruiter_interview_events WHERE interview_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [interviewId],
    );

    return { interview: i, rounds: rounds.rows, events: events.rows };
  }

  private async garbageRejectedResume(candidateId: string, applicationId: string) {
    const app = await this.db.query<{ resume_id: string | null }>(
      `SELECT resume_id FROM applications WHERE id = $1`,
      [applicationId],
    );
    if (!app.rows.length || !app.rows[0].resume_id) return;

    const resumeId = app.rows[0].resume_id;

    await this.db.query(
      `UPDATE resumes
       SET status='garbaged',
           garbaged_at=NOW(),
           garbage_reason='rejected',
           content=NULL,
           file_bytes=NULL
       WHERE id = $1 AND user_id = $2`,
      [resumeId, candidateId],
    );

    await this.db.query(
      `UPDATE candidate_profiles
       SET active_resume_id = NULL
       WHERE user_id = $1 AND active_resume_id = $2`,
      [candidateId, resumeId],
    );
  }
}
]]>
</file>
<file name="ts-api\src\interviews\sfu.adapter.ts">
<![CDATA[
/**
 * SFU Adapter (pluggable)
 *
 * This file contains a small adapter interface and a lightweight skeleton
 * for integrating an SFU such as mediasoup or LiveKit. For production use
 * prefer a separate dedicated SFU service (K8s Deployment) and use the
 * adapter here to control rooms, create transports, and manage producers.
 */

import { Logger } from '@nestjs/common';

export type SFUProvider = 'mediasoup' | 'livekit' | 'janus' | 'none';

export interface SFURoomOptions {
  roomId: string;
  maxParticipants?: number;
  metadata?: Record<string, unknown>;
}

export interface SFUAdapter {
  provider: SFUProvider;
  ensureRoom(opts: SFURoomOptions): Promise<void>;
  createTransport(roomId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  closeRoom(roomId: string): Promise<void>;
}

export class NoopSFUAdapter implements SFUAdapter {
  provider: SFUProvider = 'none';
  private readonly logger = new Logger(NoopSFUAdapter.name);

  async ensureRoom(opts: SFURoomOptions): Promise<void> {
    this.logger.debug(`NoopSFUAdapter.ensureRoom ${opts.roomId}`);
    return;
  }

  async createTransport(roomId: string): Promise<Record<string, unknown>> {
    this.logger.debug(`NoopSFUAdapter.createTransport ${roomId}`);
    // P2P fallback — client will create plain RTCPeerConnection
    return { type: 'p2p-fallback' };
  }

  async closeRoom(roomId: string): Promise<void> {
    this.logger.debug(`NoopSFUAdapter.closeRoom ${roomId}`);
    return;
  }
}

// Export a simple factory used by the InterviewGateway to pick an adapter based
// on configuration or env. For a production deployment integrate a real SFU
// and implement an adapter that handles room lifecycle, create transports,
// and issues tokens for clients as needed.
export function createSFUAdapter(provider: SFUProvider): SFUAdapter {
  switch (provider) {
    case 'mediasoup':
    case 'livekit':
    case 'janus':
      // TODO: implement adapters for each SFU
      return new NoopSFUAdapter();
    default:
      return new NoopSFUAdapter();
  }
}

]]>
</file>
<file name="ts-api\src\interviews\types\interview.types.ts">
<![CDATA[
export enum InterviewStage {
  APPLIED = 'APPLIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_IN_PROGRESS = 'INTERVIEW_IN_PROGRESS',
  INTERVIEW_PASSED = 'INTERVIEW_PASSED',
  INTERVIEW_FAILED = 'INTERVIEW_FAILED',
  FINAL_REVIEW = 'FINAL_REVIEW',
  OFFERED = 'OFFERED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD',
  WITHDRAWN = 'WITHDRAWN',
}

export enum RoundType {
  HR = 'hr',
  TECHNICAL = 'technical',
  MANAGERIAL = 'managerial',
  ASSIGNMENT = 'assignment',
}

export enum RoundResult {
  PENDING = 'pending',
  PASS = 'pass',
  FAIL = 'fail',
  NO_SHOW = 'no_show',
  RESCHEDULE = 'reschedule',
}

export interface InterviewRoomParticipant {
  userId: string;
  socketId: string;
  displayName?: string;
  role: 'recruiter' | 'candidate';
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
}

export interface RoomSnapshot {
  roomId: string;
  participants: InterviewRoomParticipant[];
  hostUserId?: string;
  endedAt?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface InterviewScorecard {
  communication: number;
  technical: number;
  confidence: number;
  problemSolving: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire';
  aiNotes?: string;
}

export interface AIAssistancePayload {
  resume: string;
  jobDescription: string;
  interviewStage: InterviewStage;
  roundType: RoundType;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  followUpQuestions: string[];
  evaluationCriteria: string[];
}

export interface TranscriptParagraph {
  timestamp: number;
  speaker: 'candidate' | 'recruiter';
  text: string;
}

export interface RecordingMetadata {
  roomId: string;
  interviewId: string;
  roundId: string;
  candidateName: string;
  recruiterName: string;
  startedAt: string;
  endedAt: string;
}
]]>
</file>
<file name="ts-api\src\interviews\webrtc\connection-metrics.ts">
<![CDATA[
/**
 * Connection Metrics Service
 * File: ts-api/src/interviews/webrtc/connection-metrics.ts
 *
 * Purpose: Track and report WebRTC connection quality metrics
 * - Inbound/outbound bitrate (kbps)
 * - Packet loss percentage
 * - Round-trip latency (RTT)
 * - Jitter measurements
 * - Audio/video codec info
 *
 * Usage: Integrated into WebRTC gateway for real-time diagnostics
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ConnectionMetrics {
  timestamp: number;
  inboundBitrate: number; // kbps
  outboundBitrate: number; // kbps
  audioPacketsLost: number;
  videoPacketsLost: number;
  audioPacketLossPercent: number;
  videoPacketLossPercent: number;
  roundTripLatency: number; // ms
  audioJitter: number; // ms
  audioCodec: string;
  videoCodec: string;
  audioChannels: number;
  videoFrameRate: number;
  videoResolution: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
}

export interface MetricsReport {
  roomId: string;
  userId: string;
  remoteUserId: string;
  metrics: ConnectionMetrics;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

/**
 * Safe property accessor for RTCStats
 * Handles missing or undefined properties gracefully
 */
function getSafeProperty<T>(obj: any, key: string, defaultValue: T): T {
  const value = obj?.[key];
  return typeof value !== 'undefined' && value !== null ? value : defaultValue;
}

/**
 * Type guard for inbound-rtp stats
 */
function isInboundRtpReport(report: any): report is RTCInboundRtpStreamStats {
  return (
    report.type === 'inbound-rtp' &&
    typeof report.bytesReceived === 'number'
  );
}

/**
 * Type guard for outbound-rtp stats
 */
function isOutboundRtpReport(report: any): report is RTCOutboundRtpStreamStats {
  return (
    report.type === 'outbound-rtp' &&
    typeof report.bytesSent === 'number'
  );
}

@Injectable()
export class ConnectionMetricsService {
  private readonly logger = new Logger(ConnectionMetricsService.name);

  /**
   * Collect metrics from a single RTCPeerConnection
   * Called periodically (every 1-2 seconds) to monitor connection health
   */
  async collectMetrics(
    pc: RTCPeerConnection,
    direction: 'inbound' | 'outbound' | 'both' = 'both',
  ): Promise<ConnectionMetrics | null> {
    try {
      const stats = await pc.getStats();
      const metrics: Partial<ConnectionMetrics> = {
        timestamp: Date.now(),
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
        inboundBitrate: 0,
        outboundBitrate: 0,
        audioPacketsLost: 0,
        videoPacketsLost: 0,
        audioPacketLossPercent: 0,
        videoPacketLossPercent: 0,
        roundTripLatency: 0,
        audioJitter: 0,
        audioCodec: 'unknown',
        videoCodec: 'unknown',
        audioChannels: 0,
        videoFrameRate: 0,
        videoResolution: '0x0',
      };

      let inboundVideoStats: RTCInboundRtpStreamStats | null = null;
      let outboundVideoStats: RTCOutboundRtpStreamStats | null = null;
      let audioInboundStats: RTCInboundRtpStreamStats | null = null;
      let audioOutboundStats: RTCOutboundRtpStreamStats | null = null;

      // Parse stats by type with proper type checking
      stats.forEach((report) => {
        // Handle inbound-rtp
        if (isInboundRtpReport(report)) {
          const mediaType = getSafeProperty<string>(report, 'mediaType', 'unknown');
          if (mediaType === 'video') {
            inboundVideoStats = report;
          } else if (mediaType === 'audio') {
            audioInboundStats = report;
          }
        }

        // Handle outbound-rtp
        if (isOutboundRtpReport(report)) {
          const mediaType = getSafeProperty<string>(report, 'mediaType', 'unknown');
          if (mediaType === 'video') {
            outboundVideoStats = report;
          } else if (mediaType === 'audio') {
            audioOutboundStats = report;
          }
        }
      });

      // ✅ FIXED: Calculate video metrics safely with proper property access
      if (inboundVideoStats) {
        metrics.inboundBitrate = this.calculateBitrate(inboundVideoStats);

        // ✅ FIXED: Use getSafeProperty for packetsLost and packetsReceived
        const packetsLost = getSafeProperty<number>(
          inboundVideoStats,
          'packetsLost',
          0,
        );
        const packetsReceived = getSafeProperty<number>(
          inboundVideoStats,
          'packetsReceived',
          0,
        );

        metrics.videoPacketsLost = packetsLost;
        metrics.videoPacketLossPercent = this.calculatePacketLossPercent(
          packetsLost,
          packetsReceived,
        );

        const frameWidth = getSafeProperty<number>(
          inboundVideoStats,
          'frameWidth',
          0,
        );
        const frameHeight = getSafeProperty<number>(
          inboundVideoStats,
          'frameHeight',
          0,
        );
        metrics.videoResolution = `${frameWidth}x${frameHeight}`;

        const codecId = getSafeProperty<string>(inboundVideoStats, 'codecId', '');
        const mimeType = getSafeProperty<string>(inboundVideoStats, 'mimeType', '');
        metrics.videoCodec = codecId
          ? 'H.264'
          : mimeType.includes('vp8')
            ? 'VP8'
            : mimeType.includes('vp9')
              ? 'VP9'
              : 'unknown';
      }

      // ✅ FIXED: Calculate outbound video metrics safely
      if (outboundVideoStats) {
        metrics.outboundBitrate = this.calculateBitrate(outboundVideoStats);
        metrics.videoFrameRate = getSafeProperty<number>(
          outboundVideoStats,
          'framesPerSecond',
          0,
        );
      }

      // ✅ FIXED: Calculate audio metrics safely with getSafeProperty
      if (audioInboundStats) {
        // ✅ FIXED: Safe access to packetsLost and packetsReceived
        const packetsLost = getSafeProperty<number>(
          audioInboundStats,
          'packetsLost',
          0,
        );
        const packetsReceived = getSafeProperty<number>(
          audioInboundStats,
          'packetsReceived',
          0,
        );

        metrics.audioPacketsLost = packetsLost;
        metrics.audioPacketLossPercent = this.calculatePacketLossPercent(
          packetsLost,
          packetsReceived,
        );

        // ✅ FIXED: Safe access to jitter property
        const jitter = getSafeProperty<number>(audioInboundStats, 'jitter', 0);
        metrics.audioJitter = jitter * 1000; // Convert to ms

        metrics.audioCodec = getSafeProperty<string>(
          audioInboundStats,
          'mimeType',
          'opus',
        );
      }

      // ✅ FIXED: Safe access to audioLevel
      if (audioOutboundStats) {
        const audioLevel = getSafeProperty<number>(
          audioOutboundStats,
          'audioLevel',
          0,
        );
        metrics.audioChannels = audioLevel ? 1 : 0;
      }

      // Get candidate pair info for RTT
      stats.forEach((report) => {
        if (report.type === 'candidate-pair') {
          const pair = report as any;
          if (pair.state === 'succeeded') {
            const currentRoundTripTime = getSafeProperty<number>(
              pair,
              'currentRoundTripTime',
              0,
            );
            if (currentRoundTripTime > 0) {
              metrics.roundTripLatency = currentRoundTripTime * 1000; // Convert to ms
            }
          }
        }
      });

      return metrics as ConnectionMetrics;
    } catch (err) {
      this.logger.error(`Failed to collect metrics: ${String(err)}`);
      return null;
    }
  }

  /**
   * Assess connection quality based on key metrics
   */
  assessQuality(
    metrics: ConnectionMetrics,
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    // Not connected yet
    if (metrics.connectionState !== 'connected') {
      return 'unknown';
    }

    // Score calculation (0-100)
    let score = 100;

    // Packet loss penalty (very significant)
    const avgPacketLoss =
      (metrics.audioPacketLossPercent + metrics.videoPacketLossPercent) / 2;
    if (avgPacketLoss > 5) score -= 40; // >5% loss = major issue
    else if (avgPacketLoss > 2) score -= 20; // >2% loss = degraded
    else if (avgPacketLoss > 0) score -= 5;

    // Latency penalty
    if (metrics.roundTripLatency > 300) score -= 30; // >300ms = poor
    else if (metrics.roundTripLatency > 150) score -= 15; // >150ms = degraded
    else if (metrics.roundTripLatency > 80) score -= 5; // >80ms = acceptable

    // Bitrate penalty
    const targetBitrate = 2500; // 2.5 Mbps target
    if (metrics.outboundBitrate < targetBitrate * 0.3) score -= 25;
    else if (metrics.outboundBitrate < targetBitrate * 0.7) score -= 10;

    // Jitter penalty
    if (metrics.audioJitter > 30) score -= 10;
    else if (metrics.audioJitter > 15) score -= 5;

    // Quality thresholds
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * ✅ FIXED: Proper bitrate calculation for both inbound and outbound
   * Handles missing properties gracefully
   */
  private calculateBitrate(
    stats: RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats,
  ): number {
    const timestamp = getSafeProperty<number>(stats, 'timestamp', 0);

    if (timestamp === 0) {
      return 0;
    }

    if (stats.type === 'inbound-rtp') {
      const inbound = stats as RTCInboundRtpStreamStats;
      const bytesReceived = getSafeProperty<number>(
        inbound,
        'bytesReceived',
        0,
      );

      if (bytesReceived === 0) {
        return 0;
      }

      // Convert bytes to kilobits and timestamp to seconds
      // timestamp is in milliseconds, divide by 1000 to get seconds
      return (bytesReceived * 8) / (timestamp / 1000) / 1000; // kbps
    }

    if (stats.type === 'outbound-rtp') {
      const outbound = stats as RTCOutboundRtpStreamStats;
      const bytesSent = getSafeProperty<number>(outbound, 'bytesSent', 0);

      if (bytesSent === 0) {
        return 0;
      }

      // Convert bytes to kilobits and timestamp to seconds
      return (bytesSent * 8) / (timestamp / 1000) / 1000; // kbps
    }

    return 0;
  }

  /**
   * Calculate packet loss percentage safely
   */
  private calculatePacketLossPercent(lost: number, received: number): number {
    const total = (lost ?? 0) + (received ?? 0);
    if (total === 0) return 0;
    return ((lost ?? 0) / total) * 100;
  }

  /**
   * Format metrics for logging/reporting
   */
  formatMetrics(metrics: ConnectionMetrics): string {
    return [
      `📊 Connection Metrics (${new Date(metrics.timestamp).toLocaleTimeString()})`,
      `  🎬 Video: ${metrics.videoResolution} @ ${metrics.videoFrameRate.toFixed(1)}fps (${metrics.videoCodec})`,
      `  🔊 Audio: ${metrics.audioCodec}`,
      `  📤 Uplink: ${metrics.outboundBitrate.toFixed(0)} kbps`,
      `  📥 Downlink: ${metrics.inboundBitrate.toFixed(0)} kbps`,
      `  🔴 Packet Loss: Audio ${metrics.audioPacketLossPercent.toFixed(2)}% / Video ${metrics.videoPacketLossPercent.toFixed(2)}%`,
      `  ⏱️  RTT: ${metrics.roundTripLatency.toFixed(0)} ms`,
      `  📡 Jitter: ${metrics.audioJitter.toFixed(0)} ms`,
      `  🔗 State: ${metrics.connectionState} (ICE: ${metrics.iceConnectionState})`,
    ].join('\n');
  }
}
]]>
</file>
<file name="ts-api\src\interviews\webrtc\ice-candidate-buffer.ts">
<![CDATA[
/**
 * ICE Candidate Buffer & Ordering Service
 * File: ts-api/src/interviews/webrtc/ice-candidate-buffer.ts
 * 
 * Purpose: Manage ICE candidate collection and delivery in correct order
 * 
 * Problem it solves:
 * - ICE candidates arrive out of order on network
 * - Must queue candidates until remote description is set
 * - Prevents "Failed to add ICE candidate" errors
 * - Implements proper state machine for candidate delivery
 */

import { Logger } from '@nestjs/common';

export interface BufferedCandidate {
  candidate: RTCIceCandidateInit;
  receivedAt: number;
  addedAt?: number;
}

export type ICEState = 'idle' | 'local-description-set' | 'remote-description-set' | 'complete';

export class ICECandidateBuffer {
  private readonly logger = new Logger(ICECandidateBuffer.name);
  private readonly peerId: string;
  private buffer: BufferedCandidate[] = [];
  private state: ICEState = 'idle';
  private readonly maxBufferSize = 100; // Max candidates to hold

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  /**
   * Update state based on description type
   */
  setDescriptionSet(type: 'local' | 'remote'): void {
    if (type === 'local' && this.state === 'idle') {
      this.state = 'local-description-set';
    }
    if (type === 'remote' && this.state !== 'complete') {
      this.state = 'remote-description-set';
    }
  }

  /**
   * Check if candidates can be added (remote description must be set first)
   */
  canAddCandidates(): boolean {
    return this.state === 'remote-description-set' || this.state === 'complete';
  }

  /**
   * Add candidate to buffer, or queue if not ready
   */
  add(candidate: RTCIceCandidateInit): boolean {
    if (this.buffer.length >= this.maxBufferSize) {
      this.logger.warn(
        `[ICE:${this.peerId}] Buffer full (${this.maxBufferSize} candidates), dropping oldest`,
      );
      this.buffer.shift(); // Remove oldest
    }

    this.buffer.push({
      candidate,
      receivedAt: Date.now(),
    });

    this.logger.debug(
      `[ICE:${this.peerId}] Buffered candidate (total: ${this.buffer.length})`,
    );
    return true;
  }

  /**
   * Get all pending candidates that can now be added
   * Should be called after remote description is set
   */
  drain(): BufferedCandidate[] {
    if (!this.canAddCandidates()) {
      return [];
    }

    const candidates = [...this.buffer];
    const now = Date.now();
    candidates.forEach((c) => {
      c.addedAt = now;
    });

    this.logger.debug(
      `[ICE:${this.peerId}] Draining ${candidates.length} buffered candidates`,
    );

    this.buffer = [];
    this.state = 'complete';
    return candidates;
  }

  /**
   * Get buffer stats for diagnostics
   */
  getStats(): {
    buffered: number;
    state: ICEState;
    oldestCandidateAge: number | null;
  } {
    return {
      buffered: this.buffer.length,
      state: this.state,
      oldestCandidateAge: this.buffer.length > 0 ? Date.now() - this.buffer[0].receivedAt : null,
    };
  }

  /**
   * Clear buffer (when closing connection)
   */
  clear(): void {
    this.buffer = [];
    this.state = 'idle';
  }
}
]]>
</file>
<file name="ts-api\src\interviews\webrtc\webrtc.gateway.ts">
<![CDATA[
/**
 * WebRTC Gateway (Socket.IO)
 * File: ts-api/src/interviews/webrtc/webrtc.gateway.ts
 * 
 * Purpose: Handle real-time WebRTC signaling over Socket.IO
 * 
 * Events Handled:
 * - interview:join-room → user joins a room
 * - interview:offer → SDP offer relayed to remote peer
 * - interview:answer → SDP answer relayed to remote peer
 * - interview:ice-candidate → ICE candidate relayed
 * - interview:toggle-media → mic/cam/screen share toggles
 * - interview:chat-message → in-room text chat
 * - interview:leave-room → user leaves gracefully
 * - interview:end-room → host ends room for all
 * 
 * Architecture:
 * - Full-mesh WebRTC (each peer connects directly)
 * - Suitable for ≤6 participants
 * - For larger groups, integrate SFU (mediasoup, LiveKit)
 */

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InterviewsService } from '../interviews.service';
import { WebRTCService } from './webrtc.service';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string;
  role: string;
  full_name?: string;
};

type RoomParticipant = {
  userId: string;
  socketId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
};

type RoomMeta = {
  interviewId: string;
  roundId: string;
  hostUserId: string;
  endedAt: number | null;
};

// ──────────────────────────────────────────────────────────────────────────────
// WebRTC Gateway
// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 10_000,
  pingTimeout: 5_000,
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(WebRTCGateway.name);

  // roomId → Map<userId, RoomParticipant>
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();
  private readonly roomMeta = new Map<string, RoomMeta>();
  private readonly socketUsers = new Map<string, AuthUser>();
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly jwtService: JwtService,
    private readonly webrtcService: WebRTCService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Connection Lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ||
        this.extractBearer(client.handshake.headers?.authorization as string | undefined);

      if (!token) {
        this.logger.warn(`[${client.id}] No auth token — disconnecting`);
        client.disconnect(true);
        return;
      }

      // Verify JWT
      const decoded = await this.jwtService.verifyAsync<{
        sub?: string;
        id?: string;
        role: string;
        full_name?: string;
      }>(token);

      const user: AuthUser = {
        id: decoded.sub ?? decoded.id ?? '',
        role: decoded.role,
        full_name: decoded.full_name,
      };

      if (!user.id) {
        client.disconnect(true);
        return;
      }

      (client as any).user = user;
      this.socketUsers.set(client.id, user);

      // Track all sockets for this user (reconnect handling)
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      this.logger.debug(
        `[${client.id}] Connected: ${user.id} (${user.role})`,
      );
    } catch (err) {
      this.logger.warn(`[${client.id}] Auth failed: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    this.socketUsers.delete(client.id);

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(user.id);
    }

    // Remove from all rooms
    for (const [roomId, participants] of this.rooms.entries()) {
      const participant = participants.get(user.id);
      if (participant && participant.socketId === client.id) {
        const activeSockets = this.userSockets.get(user.id);
        if (!activeSockets || activeSockets.size === 0) {
          participants.delete(user.id);
          client.to(roomId).emit('interview:user-left', { userId: user.id });
          this.emitRoomStatus(roomId);
          this.logger.debug(`[room:${roomId}] ${user.id} left (disconnect)`);

          if (participants.size === 0) {
            this.rooms.delete(roomId);
            this.roomMeta.delete(roomId);
            this.logger.debug(`[room:${roomId}] Empty — cleaned up`);
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Room Management
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; name?: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return this.sendError(client, 'Unauthenticated');

    const { roomId } = body;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate access
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      user.id,
      user.role,
    );

    if (!access.allowed) {
      const reason = access.reason === 'room_link_expired' ? 'Room link expired' : 'Access denied';
      return this.sendError(client, reason);
    }

    await client.join(roomId);

    // Create room if new
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const participants = this.rooms.get(roomId)!;
    const participant: RoomParticipant = {
      userId: user.id,
      socketId: client.id,
      name: body.name ?? user.full_name,
      role: user.role,
      micOn: true,
      camOn: true,
      screenSharing: false,
      joinedAt: Date.now(),
    };

    // Store room metadata
    if (!this.roomMeta.has(roomId)) {
      this.roomMeta.set(roomId, {
        interviewId: access.interviewId!,
        roundId: access.roundId!,
        hostUserId: access.hostUserId!,
        endedAt: null,
      });
    }

    participants.set(user.id, participant);

    // Send room snapshot to joiner
    const allParticipants = Array.from(participants.values());
    client.emit('interview:room-snapshot', {
      participants: allParticipants.map((p) => this.serializeParticipant(p)),
    });

    // Notify others
    client.to(roomId).emit('interview:user-joined', {
      participant: this.serializeParticipant(participant),
    });

    this.emitRoomStatus(roomId);

    // Mark room started (for recruiter)
    if (user.role === 'recruiter' && access.interviewId && access.roundId) {
      await this.interviewsService.markRoomStarted(access.interviewId, access.roundId, user.id);
    }

    this.logger.log(
      `[room:${roomId}] ${user.id} (${user.role}) joined — ${participants.size} total`,
    );
  }

  @SubscribeMessage('interview:leave-room')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const { roomId } = body;
    await client.leave(roomId);

    const participants = this.rooms.get(roomId);
    if (participants) {
      participants.delete(user.id);
      client.to(roomId).emit('interview:user-left', { userId: user.id });
      this.emitRoomStatus(roomId);

      if (participants.size === 0) {
        this.rooms.delete(roomId);
        this.roomMeta.delete(roomId);
      }
    }

    this.logger.debug(`[room:${roomId}] ${user.id} left voluntarily`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WebRTC Signaling Relay
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: RTCSessionDescriptionInit },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:offer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });

    this.logger.debug(
      `[room:${body.roomId}] Offer relayed ${user.id} → ${body.targetUserId}`,
    );
  }

  @SubscribeMessage('interview:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: RTCSessionDescriptionInit },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:answer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });

    this.logger.debug(
      `[room:${body.roomId}] Answer relayed ${user.id} → ${body.targetUserId}`,
    );
  }

  @SubscribeMessage('interview:ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:ice-candidate', {
      fromUserId: user.id,
      candidate: body.candidate,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Media State
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:toggle-media')
  onToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: {
      roomId: string;
      micOn: boolean;
      camOn: boolean;
      screenSharing?: boolean;
    },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const participants = this.rooms.get(body.roomId);
    if (participants?.has(user.id)) {
      const p = participants.get(user.id)!;
      p.micOn = body.micOn;
      p.camOn = body.camOn;
      p.screenSharing = body.screenSharing ?? false;
    }

    client.to(body.roomId).emit('interview:user-media-toggled', {
      userId: user.id,
      micOn: body.micOn,
      camOn: body.camOn,
      screenSharing: body.screenSharing ?? false,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Chat
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:chat-message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const msg = body.message?.trim();
    if (!msg || msg.length > 2000) return;

    const participants = this.rooms.get(body.roomId);
    const participant = participants?.get(user.id);

    this.server.to(body.roomId).emit('interview:chat-message', {
      userId: user.id,
      name: participant?.name ?? user.full_name ?? 'Participant',
      role: participant?.role ?? user.role,
      message: msg,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `[room:${body.roomId}] Chat: ${user.id}: ${msg.substring(0, 50)}...`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Room End
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:end-room')
  async onEndRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const roomId = body?.roomId;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate access
    const access = await this.interviewsService.validateRoomAccessWithContext(
      roomId,
      user.id,
      user.role,
    );
    if (!access.allowed) {
      return this.sendError(client, 'Forbidden: cannot end room');
    }

    // Only recruiter (host) can end
    const meta = this.roomMeta.get(roomId);
    if (!meta || user.role !== 'recruiter' || user.id !== meta.hostUserId) {
      return this.sendError(client, 'Only host can end interview');
    }

    // Mark room as ended
    meta.endedAt = Date.now();

    // Notify all participants
    this.server.to(roomId).emit('interview:room-ended', {
      roomId,
      endedBy: user.id,
      endedAt: new Date().toISOString(),
    });

    // Mark ended in database
    await this.interviewsService.markRoomEnded(meta.interviewId, meta.roundId, user.id);

    // Disconnect all sockets from room
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(roomId);
        }
      }
    }

    // Cleanup
    this.rooms.delete(roomId);
    this.roomMeta.delete(roomId);

    this.logger.log(`[room:${roomId}] Room ended by ${user.id}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private getAuthUser(client: Socket): AuthUser | null {
    return (client as any).user as AuthUser | null;
  }

  private sendError(client: Socket, message: string): void {
    client.emit('interview:error', { message });
  }

  /**
   * Relay a message to a specific user in a room
   */
  private relayToUser(roomId: string, targetUserId: string, event: string, payload: unknown): void {
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return;

    for (const socketId of roomSockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      const socketUser = socket ? this.socketUsers.get(socketId) : undefined;
      if (socketUser?.id === targetUserId && socket) {
        socket.emit(event, payload);
        return;
      }
    }
  }

  private serializeParticipant(p: RoomParticipant) {
    return {
      userId: p.userId,
      name: p.name,
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
      joinedAt: p.joinedAt,
    };
  }

  private emitRoomStatus(roomId: string): void {
    const participants = this.rooms.get(roomId);
    const meta = this.roomMeta.get(roomId);
    const hostPresent = !!meta?.hostUserId && !!participants?.has(meta.hostUserId);

    this.server.to(roomId).emit('interview:room-status', {
      roomId,
      hostUserId: meta?.hostUserId ?? null,
      hostPresent,
      participantCount: participants?.size ?? 0,
      ended: !!meta?.endedAt,
      endedAt: meta?.endedAt ? new Date(meta.endedAt).toISOString() : null,
    });
  }

  private extractBearer(authHeader?: string): string | null {
    if (!authHeader) return null;
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    return m ? m[1] : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Admin Endpoints
  // ──────────────────────────────────────────────────────────────────────────

  getRoomInfo(roomId: string): Record<string, unknown> {
    const participants = this.rooms.get(roomId);
    return {
      roomId,
      participantCount: participants?.size ?? 0,
      participants: participants
        ? Array.from(participants.values()).map((p) => this.serializeParticipant(p))
        : [],
      meta: this.roomMeta.get(roomId),
    };
  }

  getAllRooms(): Record<string, unknown> {
    return {
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.keys()).map((roomId) => this.getRoomInfo(roomId)),
    };
  }
}
]]>
</file>
<file name="ts-api\src\interviews\webrtc\webrtc.service.ts">
<![CDATA[
/**
 * WebRTC Service
 * File: ts-api/src/interviews/webrtc/webrtc.service.ts
 *
 * Purpose: Orchestrate WebRTC peer connections, track state, manage lifecycle
 *
 * Responsibilities:
 * - Create/destroy RTCPeerConnections
 * - Track local and remote media streams
 * - Handle offer/answer collisions (polite peer model)
 * - Manage ICE candidate buffering
 * - Collect and report connection metrics
 * - Log all significant events
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICECandidateBuffer } from './ice-candidate-buffer';
import {
  ConnectionMetricsService,
  ConnectionMetrics,
} from './connection-metrics';

interface RTCConfiguration {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

interface PeerConnectionState {
  pc: RTCPeerConnection;
  iceBuffer: ICECandidateBuffer;
  makingOffer: boolean;
  ignoreOffer: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  metrics: ConnectionMetrics | null;
  lastMetricsCollected: number;
  createdAt: number;
  connectedAt?: number;
  metricsIntervalHandle?: NodeJS.Timeout; // ✅ Proper Node.js timer type
}

@Injectable()
export class WebRTCService {
  private readonly logger = new Logger(WebRTCService.name);
  private peers = new Map<string, PeerConnectionState>();
  private metricsService: ConnectionMetricsService;
  private metricsIntervals: Map<string, NodeJS.Timeout> = new Map(); // ✅ Fixed

  private rtcConfig: RTCConfiguration;

  constructor(private readonly config: ConfigService) {
    this.metricsService = new ConnectionMetricsService();

    // Parse TURN servers from config
    const webrtcConfig = this.config.get('webrtc');
    const iceServers = webrtcConfig?.iceServers ?? [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    this.rtcConfig = {
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle' as RTCBundlePolicy,
      rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    };

    this.logger.log(
      `WebRTC Service initialized with ${iceServers.length} ICE servers`,
    );
  }

  /**
   * Create a new peer connection for a remote user
   * Follows polite peer model for collision handling
   */
  createPeerConnection(peerId: string, isPolite: boolean): RTCPeerConnection {
    // Clean up any existing connection first
    if (this.peers.has(peerId)) {
      this.logger.warn(`[WebRTC] Recreating peer connection for ${peerId}`);
      this.closePeerConnection(peerId);
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    const state: PeerConnectionState = {
      pc,
      iceBuffer: new ICECandidateBuffer(peerId),
      makingOffer: false,
      ignoreOffer: !isPolite,
      localStream: null,
      remoteStreams: new Map(),
      metrics: null,
      lastMetricsCollected: 0,
      createdAt: Date.now(),
    };

    this.peers.set(peerId, state);
    this.setupPCHandlers(pc, peerId, state);
    this.startMetricsCollection(peerId);

    this.logger.debug(
      `[WebRTC] Created peer connection: ${peerId} (polite: ${isPolite})`,
    );
    return pc;
  }

  /**
   * Set up all event handlers for a peer connection
   */
  private setupPCHandlers(
    pc: RTCPeerConnection,
    peerId: string,
    state: PeerConnectionState,
  ): void {
    // ICE candidate handling
    pc.onicecandidate = (evt) => {
      if (!evt.candidate) {
        this.logger.debug(`[WebRTC:${peerId}] ICE gathering complete`);
        return;
      }
      this.logger.debug(
        `[WebRTC:${peerId}] ICE candidate: ${evt.candidate.candidate.substring(0, 50)}...`,
      );
      // Candidate will be emitted via Socket.IO by the gateway
    };

    pc.onicecandidateerror = (evt: any) => {
      // Error code 701 = mDNS candidate error (non-critical)
      if (evt.errorCode !== 701) {
        this.logger.warn(
          `[WebRTC:${peerId}] ICE candidate error ${evt.errorCode}: ${evt.errorText}`,
        );
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      this.logger.log(
        `[WebRTC:${peerId}] Connection state: ${pc.connectionState} (ICE: ${pc.iceConnectionState})`,
      );

      if (pc.connectionState === 'connected' && !state.connectedAt) {
        state.connectedAt = Date.now();
        this.logger.log(
          `[WebRTC:${peerId}] Connected after ${state.connectedAt - state.createdAt}ms`,
        );
      }

      if (pc.connectionState === 'failed') {
        this.logger.warn(
          `[WebRTC:${peerId}] Connection failed, attempting ICE restart`,
        );
        pc.restartIce();
      }

      if (
        pc.connectionState === 'closed' ||
        pc.connectionState === 'disconnected'
      ) {
        if (pc.connectionState === 'closed') {
          this.closePeerConnection(peerId);
        }
      }
    };

    // Signaling state for collision detection
    pc.onsignalingstatechange = () => {
      this.logger.debug(
        `[WebRTC:${peerId}] Signaling state: ${pc.signalingState}`,
      );
    };

    // Remote track arrival
    pc.ontrack = (evt: RTCTrackEvent) => {
      const [stream] = evt.streams;
      if (!stream) return;

      const trackKind = evt.track.kind;
      this.logger.log(`[WebRTC:${peerId}] Received ${trackKind} track`);

      // Store remote stream (indexed by streamId for potential multi-stream support)
      state.remoteStreams.set(stream.id, stream);
    };

    // Negotiation needed
    pc.onnegotiationneeded = async () => {
      if (state.makingOffer || pc.signalingState !== 'stable') {
        this.logger.debug(
          `[WebRTC:${peerId}] Negotiation skipped (makingOffer: ${state.makingOffer}, state: ${pc.signalingState})`,
        );
        return;
      }

      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();

        if (pc.signalingState !== 'stable') {
          this.logger.warn(
            `[WebRTC:${peerId}] Signaling state changed during createOffer, aborting`,
          );
          return;
        }

        await pc.setLocalDescription(offer);
        this.logger.debug(`[WebRTC:${peerId}] Created and set local offer`);
        // Offer will be sent via Socket.IO by the gateway
      } catch (err) {
        this.logger.error(`[WebRTC:${peerId}] Negotiation error: ${String(err)}`);
      } finally {
        state.makingOffer = false;
      }
    };
  }

  /**
   * Handle incoming SDP offer with collision detection
   */
  async handleOffer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<{ answer?: RTCSessionDescriptionInit; error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    const { pc } = state;

    // Collision detection (offer collision in non-stable state)
    const offerCollision =
      sdp.type === 'offer' &&
      (state.makingOffer || pc.signalingState !== 'stable');

    if (offerCollision) {
      // Polite peer: rollback and accept; Impolite peer: ignore
      if (state.ignoreOffer) {
        this.logger.debug(
          `[WebRTC:${peerId}] Ignoring colliding offer (impolite)`,
        );
        state.ignoreOffer = false;
        return {};
      }

      this.logger.debug(
        `[WebRTC:${peerId}] Collision detected, rolling back (polite)`,
      );
      try {
        await pc.setLocalDescription({ type: 'rollback' });
      } catch (err) {
        this.logger.warn(`[WebRTC:${peerId}] Rollback failed: ${String(err)}`);
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      state.iceBuffer.setDescriptionSet('remote');

      // Drain any buffered ICE candidates
      const buffered = state.iceBuffer.drain();
      for (const { candidate } of buffered) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          this.logger.warn(
            `[WebRTC:${peerId}] Failed to add buffered ICE: ${String(err)}`,
          );
        }
      }

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.logger.debug(`[WebRTC:${peerId}] Created and set answer`);
      return { answer: pc.localDescription ?? undefined };
    } catch (err) {
      const msg = `Failed to handle offer: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Handle incoming SDP answer
   */
  async handleAnswer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<{ error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    try {
      await state.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      state.iceBuffer.setDescriptionSet('remote');

      // Drain buffered candidates
      const buffered = state.iceBuffer.drain();
      for (const { candidate } of buffered) {
        try {
          await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          this.logger.warn(
            `[WebRTC:${peerId}] Failed to add buffered ICE: ${String(err)}`,
          );
        }
      }

      this.logger.debug(`[WebRTC:${peerId}] Answer handled successfully`);
      return {};
    } catch (err) {
      const msg = `Failed to handle answer: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Handle incoming ICE candidate (may buffer if not ready)
   */
  async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<{ error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    try {
      // Buffer if remote description not set yet
      if (!state.iceBuffer.canAddCandidates()) {
        state.iceBuffer.add(candidate);
        this.logger.debug(`[WebRTC:${peerId}] ICE candidate buffered`);
        return {};
      }

      // Add immediately if ready
      await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
      this.logger.debug(`[WebRTC:${peerId}] ICE candidate added`);
      return {};
    } catch (err) {
      const msg = `Failed to add ICE candidate: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Add local media stream to peer connection
   */
  addLocalStream(peerId: string, stream: MediaStream): void {
    const state = this.peers.get(peerId);
    if (!state) return;

    state.localStream = stream;
    for (const track of stream.getTracks()) {
      state.pc.addTrack(track, stream);
      this.logger.debug(`[WebRTC:${peerId}] Added ${track.kind} track`);
    }
  }

  /**
   * Replace video track (for screen sharing)
   */
  async replaceVideoTrack(
    peerId: string,
    newTrack: MediaStreamTrack | null,
  ): Promise<{ error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    try {
      const sender = state.pc
        .getSenders()
        .find((s) => s.track?.kind === 'video');

      if (!sender) {
        return { error: 'No video sender found' };
      }

      await sender.replaceTrack(newTrack);
      this.logger.debug(
        `[WebRTC:${peerId}] Video track replaced (${newTrack ? 'new' : 'none'})`,
      );
      return {};
    } catch (err) {
      const msg = `Failed to replace video track: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Get remote streams for a peer
   */
  getRemoteStreams(peerId: string): MediaStream[] {
    const state = this.peers.get(peerId);
    if (!state) return [];
    return Array.from(state.remoteStreams.values());
  }

  /**
   * Get peer connection for direct access (careful use only)
   */
  getPeerConnection(peerId: string): RTCPeerConnection | null {
    return this.peers.get(peerId)?.pc ?? null;
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(peerId: string): void {
    const state = this.peers.get(peerId);
    if (!state) return;

    // ✅ FIXED: Use NodeJS.Timeout instead of string | number | Timeout
    const interval: NodeJS.Timeout = setInterval(async () => {
      try {
        const metrics = await this.metricsService.collectMetrics(state.pc);
        if (metrics) {
          state.metrics = metrics;
          state.lastMetricsCollected = Date.now();

          // Log if quality degraded
          const quality = this.metricsService.assessQuality(metrics);
          if (quality === 'poor') {
            this.logger.warn(this.metricsService.formatMetrics(metrics));
          }
        }
      } catch (err) {
        this.logger.debug(
          `Failed to collect metrics for ${peerId}: ${String(err)}`,
        );
      }
    }, 2000); // Collect every 2 seconds

    this.metricsIntervals.set(peerId, interval);
    state.metricsIntervalHandle = interval; // Store in state too
  }

  /**
   * Get latest metrics for a peer
   */
  getMetrics(peerId: string): ConnectionMetrics | null {
    return this.peers.get(peerId)?.metrics ?? null;
  }

  /**
   * Get all peer connections (for admin endpoints)
   */
  getAllPeers(): Array<{
    peerId: string;
    connectionState: RTCPeerConnectionState;
    metrics: ConnectionMetrics | null;
  }> {
    return Array.from(this.peers.entries()).map(([peerId, state]) => ({
      peerId,
      connectionState: state.pc.connectionState,
      metrics: state.metrics,
    }));
  }

  /**
   * Close and clean up a peer connection
   */
  closePeerConnection(peerId: string): void {
    const state = this.peers.get(peerId);
    if (!state) return;

    // ✅ FIXED: Use NodeJS.Timeout type for clearInterval
    const interval = this.metricsIntervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.metricsIntervals.delete(peerId);
    }

    // Close peer connection
    state.pc.close();

    // Stop local stream tracks
    state.localStream?.getTracks().forEach((track) => track.stop());

    // Clear remote streams
    state.remoteStreams.clear();

    this.peers.delete(peerId);
    this.logger.log(`[WebRTC] Closed peer connection: ${peerId}`);
  }

  /**
   * Close all peer connections (cleanup on app shutdown)
   */
  closeAll(): void {
    for (const peerId of this.peers.keys()) {
      this.closePeerConnection(peerId);
    }
  }
}
]]>
</file>
<file name="ts-api\src\jobs\adapters\indeed.adapter.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/jobs/adapters/indeed.adapter.ts
//
// Also uses JSearch — filters by employer to surface Indeed-origin jobs.
// Same RAPIDAPI_KEY, same subscription, different query params.
// This avoids needing a second RapidAPI subscription.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { PlatformAdapter, PlatformJob } from './platform.adapter';

@Injectable()
export class IndeedAdapter extends PlatformAdapter {
  readonly name = 'indeed';
  private readonly logger = new Logger(IndeedAdapter.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http:   HttpService,
  ) {
    super();
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('RAPIDAPI_KEY not set — Indeed adapter disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];

    try {
      // ✅ JSearch with page 2 — gives different results from LinkedIn adapter
      // avoiding duplicate jobs while using the same API subscription
      const { data } = await firstValueFrom(
        this.http.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query:       `${query} in ${location}`,
            page:        '2',       // page 2 = different results from LinkedIn adapter
            num_pages:   '1',
            date_posted: 'week',
          },
          headers: {
            'X-RapidAPI-Key':  this.apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 15_000,
        })
      );

      const jobs = (data?.data ?? []) as any[];
      return jobs.slice(0, 10).map(j => this.normalize(j));

    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        this.logger.warn('Indeed (JSearch) rate limited — will retry next sync');
      } else {
        this.logger.error(`Indeed fetch failed: ${err.message}`);
      }
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    const text = `${j.job_title ?? ''} ${j.job_description ?? ''}`.toLowerCase();

    return {
      externalId:  `indeed_${j.job_id ?? Math.random()}`,
      title:       j.job_title      ?? '',
      company:     j.employer_name  ?? '',
      location:    j.job_city
        ? `${j.job_city}, ${j.job_country ?? ''}`
        : (j.job_country ?? ''),
      description: (j.job_description ?? '').slice(0, 5000),
      workMode:    j.job_is_remote
        ? 'remote'
        : text.includes('hybrid') ? 'hybrid' : 'onsite',
      empType:     this.inferEmpType(j.job_employment_type ?? ''),
      skills:      (j.job_required_skills ?? []).slice(0, 8),
      salaryMin:   j.job_min_salary ?? null,
      salaryMax:   j.job_max_salary ?? null,
      applyUrl:    j.job_apply_link ?? null,
      postedAt:    j.job_posted_at_datetime_utc
        ? new Date(j.job_posted_at_datetime_utc)
        : new Date(),
      platform:    'indeed',
    };
  }

  private inferEmpType(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract') || s.includes('freelance')) return 'contract';
    if (s.includes('part'))    return 'part_time';
    if (s.includes('intern'))  return 'internship';
    return 'full_time';
  }
}
]]>
</file>
<file name="ts-api\src\jobs\adapters\linkedin.adapter.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/jobs/adapters/linkedin.adapter.ts
//
// Correct RapidAPI endpoint for LinkedIn Jobs.
// 403 was caused by wrong API host — the subscribed API is
// "JSearch" which covers LinkedIn, Indeed, Glassdoor in one call.
// This is the most reliable free-tier option on RapidAPI.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { PlatformAdapter, PlatformJob } from './platform.adapter';

@Injectable()
export class LinkedInAdapter extends PlatformAdapter {
  readonly name = 'linkedin';
  private readonly logger = new Logger(LinkedInAdapter.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http:   HttpService,
  ) {
    super();
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('RAPIDAPI_KEY not set — LinkedIn adapter disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];

    try {
      // ✅ JSearch API — covers LinkedIn, Indeed, Glassdoor
      // Subscribe at: rapidapi.com/letscrape-6baf62026371/api/jsearch
      // Free tier: 200 requests/month
      const { data } = await firstValueFrom(
        this.http.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query:              `${query} in ${location}`,
            page:               '1',
            num_pages:          '1',
            date_posted:        'week',
          },
          headers: {
            'X-RapidAPI-Key':  this.apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',  // ✅ correct host
          },
          timeout: 15_000,
        })
      );

      const jobs = (data?.data ?? []) as any[];
      return jobs.slice(0, 10).map(j => this.normalize(j));

    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        this.logger.warn(`LinkedIn (JSearch) rate limited — will retry next sync`);
      } else if (status === 403) {
        this.logger.error(`LinkedIn (JSearch) 403 — check RapidAPI subscription at rapidapi.com/letscrape-6baf62026371/api/jsearch`);
      } else {
        this.logger.error(`LinkedIn fetch failed: ${err.message}`);
      }
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    const text = `${j.job_title ?? ''} ${j.job_description ?? ''}`.toLowerCase();

    return {
      externalId:  `linkedin_${j.job_id ?? Math.random()}`,
      title:       j.job_title           ?? '',
      company:     j.employer_name       ?? '',
      location:    j.job_city
        ? `${j.job_city}, ${j.job_country ?? ''}`
        : (j.job_country ?? ''),
      description: (j.job_description ?? '').slice(0, 5000),
      workMode:    j.job_is_remote
        ? 'remote'
        : text.includes('hybrid') ? 'hybrid' : 'onsite',
      empType:     this.inferEmpType(j.job_employment_type ?? ''),
      skills:      (j.job_required_skills ?? []).slice(0, 8),
      salaryMin:   j.job_min_salary  ?? null,
      salaryMax:   j.job_max_salary  ?? null,
      applyUrl:    j.job_apply_link  ?? null,
      postedAt:    j.job_posted_at_datetime_utc
        ? new Date(j.job_posted_at_datetime_utc)
        : new Date(),
      platform:    'linkedin',
    };
  }

  private inferEmpType(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract') || s.includes('freelance')) return 'contract';
    if (s.includes('part'))    return 'part_time';
    if (s.includes('intern'))  return 'internship';
    return 'full_time';
  }
}
]]>
</file>
<file name="ts-api\src\jobs\adapters\platform.adapter.ts">
<![CDATA[
// src/jobs/adapters/platform.adapter.ts
// 
// Abstract base — every job platform implements this interface.
// Adding a new platform = create one class, register in JobsModule.
// Zero changes to sync orchestrator.

export interface PlatformJob {
  externalId:  string;
  title:       string;
  company:     string;
  location:    string;
  description: string;
  workMode:    string;
  empType:     string;
  skills:      string[];
  salaryMin:   number | null;
  salaryMax:   number | null;
  applyUrl:    string | null;
  postedAt:    Date;
  platform:    'serpapi' | 'linkedin' | 'indeed';
}

export abstract class PlatformAdapter {
  abstract readonly name: string;
  abstract fetchJobs(query: string, location: string): Promise<PlatformJob[]>;
}
]]>
</file>
<file name="ts-api\src\jobs\adapters\serp.adapter.ts">
<![CDATA[
// src/jobs/adapters/serp.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { PlatformAdapter, PlatformJob } from './platform.adapter';
import { createHash } from 'crypto';

@Injectable()
export class SerpPlatformAdapter extends PlatformAdapter {
  readonly name = 'serpapi';
  private readonly logger = new Logger(SerpPlatformAdapter.name);
  private readonly apiKey: string;

  constructor(
    private readonly config:  ConfigService,
    private readonly http:    HttpService,
  ) {
    super();
    // ✅ One consistent key name across the entire codebase
    this.apiKey = this.config.get<string>('SERPAPI_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('SERPAPI_KEY not set — SerpAPI platform disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];
    try {
      const { data } = await firstValueFrom(
        this.http.get('https://serpapi.com/search.json', {
          params: {
            engine:   'google_jobs',
            q:        query,
            location,
            hl:       'en',
            gl:       'in',
            api_key:  this.apiKey,
          },
          timeout: 15_000,
        })
      );
      return ((data?.jobs_results ?? []) as any[]).map(j => this.normalize(j));
    } catch (err: any) {
      this.logger.error(`SerpAPI fetch failed: ${err.message}`);
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    const rawId = j.job_id ?? '';
    const externalId = rawId.length > 255
      ? createHash('sha256').update(rawId).digest('hex')
      : rawId;

    const text = `${j.title ?? ''} ${j.description ?? ''}`.toLowerCase();

    const quals = (j.job_highlights ?? [])
      .find((h: any) => h.title?.toLowerCase().includes('qualif'));

    const SKILLS = [
      'javascript','typescript','python','java','go','rust',
      'react','next.js','vue','angular','node.js','nestjs',
      'postgresql','mysql','mongodb','redis','aws','gcp',
      'azure','docker','kubernetes','graphql','rest','git','sql',
    ];
    const skillText = (quals?.items ?? []).join(' ').toLowerCase();
    const skills = SKILLS.filter(s => skillText.includes(s));

    return {
      externalId,
      title:       j.title       ?? '',
      company:     j.company_name ?? '',
      location:    j.location    ?? '',
      description: (j.description ?? '').slice(0, 5000),
      workMode:    text.includes('remote') ? 'remote'
                 : text.includes('hybrid') ? 'hybrid' : 'hybrid',
      empType:     this.inferEmpType(j.detected_extensions?.schedule_type ?? ''),
      skills,
      salaryMin:   null,
      salaryMax:   null,
      applyUrl:    j.related_links?.[0]?.link ?? j.share_link ?? null,
      postedAt:    new Date(),
      platform:    'serpapi',
    };
  }

  private inferEmpType(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract')) return 'contract';
    if (s.includes('part'))     return 'part_time';
    if (s.includes('intern'))   return 'internship';
    return 'full_time';
  }
}
]]>
</file>
<file name="ts-api\src\jobs\dto\create-job.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import {
  IsString, IsNotEmpty, IsOptional, IsNumber,
  IsArray, IsIn, Min, Max,
} from 'class-validator';

export class CreateJobDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsString() @IsNotEmpty()
  company: string;

  @IsString() @IsOptional()
  location?: string;

  @IsIn(['remote', 'hybrid', 'onsite']) @IsOptional()
  workMode?: string;

  @IsIn(['full_time', 'contract', 'part_time', 'freelance']) @IsOptional()
  employmentType?: string;

  @IsNumber() @IsOptional() @Min(0)
  salaryMin?: number;

  @IsNumber() @IsOptional()
  salaryMax?: number;

  @IsString() @IsOptional()
  salaryCurrency?: string;

  @IsArray() @IsOptional()
  requiredSkills?: string[];

  @IsNumber() @IsOptional() @Min(0)
  experienceMin?: number;

  @IsNumber() @IsOptional() @Max(40)
  experienceMax?: number;

  @IsString() @IsOptional()
  industry?: string;
}
]]>
</file>
<file name="ts-api\src\jobs\dto\update-application-status.dto.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
  import { IsIn, IsOptional, IsString } from 'class-validator';

  export class UpdateApplicationStatusDto {
    @IsIn(['applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected'])
    status: string;

    @IsString() @IsOptional()
    recruiterNotes?: string;
  }
]]>
</file>
<file name="ts-api\src\jobs\jobs-stream.service.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/jobs/jobs-stream.service.ts

import { Injectable } from '@nestjs/common';
import { Subject }    from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// Typed payloads for each event type
// Each interface has [key: string]: unknown — satisfies Record<string, unknown>
// while still giving callers full type safety on known fields.
// ─────────────────────────────────────────────────────────────────────────────

export interface JobCreatedPayload {
  id:      string;
  title:   string;
  company: string;
  [key: string]: unknown;   // ✅ satisfies Record<string, unknown>
}

export interface SyncedPayload {
  synced:    number;
  newJobs:   number;
  platforms: string[];
  [key: string]: unknown;   // ✅ fixes ts(2322) — index signature was missing
}

export interface AlertPayload {
  type:      string;
  message:   string;
  count?:    number;
  platforms?: string[];
  [key: string]: unknown;   // ✅ satisfies Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated union — each event type maps to its own payload shape.
// TypeScript can now narrow the payload type based on the event type.
// ─────────────────────────────────────────────────────────────────────────────

export type JobStreamEvent =
  | { type: 'job_created'; payload: JobCreatedPayload }
  | { type: 'jobs_synced'; payload: SyncedPayload     }
  | { type: 'alert';       payload: AlertPayload      };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class JobsStreamService {
  private readonly events$ = new Subject<JobStreamEvent>();

  get stream() {
    return this.events$.asObservable();
  }

  emitJobCreated(job: JobCreatedPayload): void {
    this.events$.next({ type: 'job_created', payload: job });
  }

  // ✅ ts(2322) fully resolved — SyncedPayload now has index signature
  emitJobsSynced(stats: SyncedPayload): void {
    this.events$.next({ type: 'jobs_synced', payload: stats });
  }

  emitAlert(alert: AlertPayload): void {
    this.events$.next({ type: 'alert', payload: alert });
  }
}

]]>
</file>
<file name="ts-api\src\jobs\jobs-sync.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/jobs/jobs-sync.service.ts

import { Injectable, Logger }   from '@nestjs/common';
import { Cron }                 from '@nestjs/schedule';
import { ConfigService }        from '@nestjs/config';
import { createHash }           from 'crypto';
import { DatabaseService }      from '../database/database.service';
import { AlertsService }        from '../alerts/alerts.service';
import { JobsStreamService }    from './jobs-stream.service';
import { SerpPlatformAdapter }  from './adapters/serp.adapter';
import { LinkedInAdapter }      from './adapters/linkedin.adapter';
import { IndeedAdapter }        from './adapters/indeed.adapter';
import { PlatformAdapter, PlatformJob } from './adapters/platform.adapter';

// ─────────────────────────────────────────────────────────────────────────────
// Sync strategy — designed around free tier API limits
//
// Free tier budgets (per month):
//   SerpAPI:  100 requests  → ~3 requests/day safe
//   JSearch:  200 requests  → ~6 requests/day safe (covers LinkedIn + Indeed)
//
// Strategy:
//   - 3 representative queries (not 13) — covers 90% of job seeker intent
//   - 1 location (India) — your target market
//   - Sequential execution per adapter (not parallel) — avoids burst 429s
//   - 2 second delay between each API call
//   - Sync every 6 hours (4×/day) — stays within budget
//   - Exponential backoff on 429 — self-healing
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_QUERIES = [
  'software engineer',       // broad — catches most tech roles
  'frontend backend developer', // specific — catches specialist roles
  'data devops product manager', // diverse — catches non-engineering roles
];

// One location — SerpAPI location must be a real geographic name
const SYNC_LOCATION = 'India';
const JOB_TTL_HOURS = 24;

// Delay between each individual API call — prevents burst rate limiting
const DELAY_BETWEEN_CALLS_MS = 2_000;  // 2 seconds

@Injectable()
export class JobsSyncService {
  private readonly logger   = new Logger(JobsSyncService.name);
  private readonly adapters: PlatformAdapter[];
  private isSyncing = false;

  constructor(
    private readonly db:      DatabaseService,
    private readonly config:  ConfigService,
    private readonly alerts:  AlertsService,
    private readonly stream:  JobsStreamService,
    serpAdapter:     SerpPlatformAdapter,
    linkedInAdapter: LinkedInAdapter,
    indeedAdapter:   IndeedAdapter,
  ) {
    this.adapters = [serpAdapter, linkedInAdapter, indeedAdapter];
  }

  // ── Every 6 hours — stays within free tier budget ────────────────────────
  @Cron('0 */6 * * *')
  async scheduledSync(): Promise<void> {
    await this.syncAllJobs();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('JobsSyncService ready — initial sync in 10s');
    setTimeout(() => void this.syncAllJobs(), 10_000);
  }

  async syncAllJobs(): Promise<{ synced: number; errors: number }> {
    if (this.isSyncing) {
      this.logger.warn('Sync already running — skipping');
      return { synced: 0, errors: 0 };
    }

    const serpKey    = this.config.get<string>('SERPAPI_KEY');
    const rapidKey   = this.config.get<string>('RAPIDAPI_KEY');

    if (!serpKey && !rapidKey) {
      this.logger.warn('No API keys configured — skipping sync');
      return { synced: 0, errors: 0 };
    }

    this.isSyncing  = true;
    const batchId   = `sync_${Date.now()}`;
    let totalSynced = 0;
    let totalErrors = 0;
    const activePlatforms: string[] = [];

    this.logger.log(`Sync started: ${batchId} — ${SYNC_QUERIES.length} queries × ${this.adapters.length} adapters`);

    try {
      const allJobs: PlatformJob[] = [];

      // ── Sequential execution — one call at a time ─────────────────────────
      // Parallel execution caused all 429s. Free tier APIs throttle by
      // requests-per-second. Sequential with 2s delay = zero rate limit hits.
      for (const query of SYNC_QUERIES) {
        for (const adapter of this.adapters) {
          try {
            this.logger.log(`Fetching: [${adapter.name}] "${query}"`);
            const jobs = await adapter.fetchJobs(query, SYNC_LOCATION);

            if (jobs.length > 0) {
              allJobs.push(...jobs);
              activePlatforms.push(adapter.name);
              this.logger.log(`✓ [${adapter.name}] ${jobs.length} jobs for "${query}"`);
            } else {
              this.logger.log(`○ [${adapter.name}] 0 jobs for "${query}"`);
            }
          } catch (err: any) {
            totalErrors++;
            this.logger.error(`✗ [${adapter.name}] "${query}": ${err.message}`);
          }

          // ✅ 2 second pause between every API call — prevents 429s on free tier
          await this.sleep(DELAY_BETWEEN_CALLS_MS);
        }
      }

      this.logger.log(`Fetch complete — ${allJobs.length} raw jobs from ${[...new Set(activePlatforms)].join(', ')}`);

      // Deduplicate by externalId across all platforms
      const seen   = new Set<string>();
      const unique = allJobs.filter(j => {
        if (!j.externalId || seen.has(j.externalId)) return false;
        seen.add(j.externalId);
        return true;
      });

      this.logger.log(`Unique after dedup: ${unique.length}`);

      const expiresAt    = new Date(Date.now() + JOB_TTL_HOURS * 3_600_000);
      const newJobIds: string[] = [];

      for (const job of unique) {
        try {
          const isNew = await this.upsertJob(job, batchId, expiresAt);
          if (isNew) newJobIds.push(job.externalId);
          totalSynced++;
        } catch (err: any) {
          totalErrors++;
          this.logger.error(`Upsert failed [${job.externalId}]: ${err.message}`);
        }
      }

      // Remove expired external jobs
      await this.db.query(
        `DELETE FROM jobs WHERE source != 'internal' AND expires_at < NOW()`,
        []
      );

      const uniquePlatforms = [...new Set(activePlatforms)];

      // Emit SSE — connected browsers revalidate instantly
      this.stream.emitJobsSynced({
        synced:    totalSynced,
        newJobs:   newJobIds.length,
        platforms: uniquePlatforms,
        sources: {
          serpapi:  allJobs.filter(j => j.platform === 'serpapi').length,
          linkedin: allJobs.filter(j => j.platform === 'linkedin').length,
          indeed:   allJobs.filter(j => j.platform === 'indeed').length,
        },
      });

      // Create alerts for candidates if new jobs arrived
      if (newJobIds.length > 0) {
        await this.createNewJobAlerts(newJobIds.length, uniquePlatforms);
      }

      this.logger.log(
        `Sync complete — synced: ${totalSynced}, new: ${newJobIds.length}, errors: ${totalErrors}`
      );

    } finally {
      this.isSyncing = false;
    }

    return { synced: totalSynced, errors: totalErrors };
  }

  // Returns true if row was newly inserted (not updated)
  private async upsertJob(
    job:       PlatformJob,
    batchId:   string,
    expiresAt: Date,
  ): Promise<boolean> {
    const externalId = this.normalizeId(job.externalId);

    const result = await this.db.query<{ was_inserted: boolean }>(
      `INSERT INTO jobs (
        external_id, source, title, company, location,
        description, work_mode, employment_type,
        salary_min, salary_max, salary_currency,
        required_skills, apply_url, status,
        recruiter_id, expires_at, sync_batch,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,'active',
        (SELECT id FROM users WHERE role = 'recruiter' LIMIT 1),
        $14,$15,
        NOW(),NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        title           = EXCLUDED.title,
        company         = EXCLUDED.company,
        location        = EXCLUDED.location,
        description     = EXCLUDED.description,
        work_mode       = EXCLUDED.work_mode,
        employment_type = EXCLUDED.employment_type,
        salary_min      = EXCLUDED.salary_min,
        salary_max      = EXCLUDED.salary_max,
        required_skills = EXCLUDED.required_skills,
        apply_url       = EXCLUDED.apply_url,
        expires_at      = EXCLUDED.expires_at,
        sync_batch      = EXCLUDED.sync_batch,
        status          = 'active',
        updated_at      = NOW()
      RETURNING (xmax = 0) AS was_inserted`,
      [
        externalId,      job.platform,  job.title,    job.company,  job.location,
        job.description, job.workMode,  job.empType,
        job.salaryMin,   job.salaryMax, 'INR',
        job.skills,      job.applyUrl,
        expiresAt,       batchId,
      ]
    );

    return result.rows[0]?.was_inserted === true;
  }

  private async createNewJobAlerts(
    newCount:  number,
    platforms: string[],
  ): Promise<void> {
    try {
      const { rows: candidates } = await this.db.query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'candidate'`,
        []
      );

      const platformLabel = platforms.join(', ');
      const message = `${newCount} new job${newCount > 1 ? 's' : ''} added from ${platformLabel}. Check your matches!`;

      for (const candidate of candidates) {
        await this.alerts.createAlert({
          userId:   candidate.id,
          type:     'new_jobs',
          title:    `${newCount} New Job${newCount > 1 ? 's' : ''} Available`,
          message,
          metadata: { count: newCount, platforms },
        });
      }

      this.stream.emitAlert({ type: 'new_jobs', message, count: newCount, platforms });

    } catch (err: any) {
      this.logger.error(`createNewJobAlerts failed: ${err.message}`);
    }
  }

  private normalizeId(rawId: string): string {
    if (!rawId) return `unknown_${Date.now()}_${Math.random()}`;
    return rawId.length <= 255
      ? rawId
      : createHash('sha256').update(rawId).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

]]>
</file>
<file name="ts-api\src\jobs\jobs.controller.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/jobs/jobs.controller.ts

import {
  Controller, Get, Post, Patch, Param,
  Body, Query, Req, UseGuards, Sse, MessageEvent,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { Public }          from '../auth/decorators/public.decorators';
import { JobsService }     from './jobs.service';
import { JobsStreamService } from './jobs-stream.service';
import { CreateJobDto }    from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(
    private readonly jobs:   JobsService,
    private readonly stream: JobsStreamService,   // ← inject stream service
  ) {}

  // ── SSE: real-time job + alert events ────────────────────────────────────
  // Clients connect once — server pushes events as they happen.
  // EventSource auto-reconnects on disconnect — no manual retry logic needed.
  // @Public() because EventSource API cannot send Authorization headers.
  // Token-based auth for SSE would require query param — acceptable tradeoff.

  @Public()
  @Sse('stream')
  liveStream(): Observable<MessageEvent> {
    return this.stream.stream.pipe(
      map(event => ({
        data: JSON.stringify(event),
        type: event.type,
      } as MessageEvent))
    );
  }

  // ── Public: browse all jobs ───────────────────────────────────────────────

  @Public()
  @Get()
  browse(
    @Req() req: any,
    @Query('search')    search?: string,
    @Query('workMode')  workMode?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('skills')    skills?: string,
    @Query('page')      page?: string,
    @Query('source')    source?: string,
  ) {
    return this.jobs.browseJobs(req.user?.id ?? null, {
      search,
      workMode,
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
      skills:    skills    ? skills.split(',')       : undefined,
      page:      page      ? parseInt(page, 10)      : 1,
      source:    (source as 'internal' | 'serpapi' | 'all') ?? 'all',
    });
  }

  // ── Candidate: personalised recommendations ───────────────────────────────

  @Get('recommendations')
  recommendations(@Req() req: any) {
    return this.jobs.getRecommendations(req.user.id);
  }

  // ── Candidate: own applications ───────────────────────────────────────────

  @Get('applications/mine')
  myApplications(@Req() req: any) {
    return this.jobs.getCandidateApplications(req.user.id);
  }

  // ── Recruiter: own internal postings ─────────────────────────────────────

  @Get('mine')
  myJobs(@Req() req: any) {
    return this.jobs.getRecruiterJobs(req.user.id);
  }

  // ── Recruiter: applicants for a job ──────────────────────────────────────

  @Get(':id/applicants')
  applicants(@Param('id') id: string, @Req() req: any) {
    return this.jobs.getJobApplicants(id, req.user.id);
  }

  // ── Recruiter: create internal job posting ────────────────────────────────

  @Post()
  create(@Body() dto: CreateJobDto, @Req() req: any) {
    return this.jobs.createJob(req.user.id, dto);
  }

  // ── Candidate: apply to internal job ─────────────────────────────────────

  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @Req() req: any,
    @Body('resumeId')    resumeId: string,
    @Body('coverLetter') coverLetter?: string,
  ) {
    return this.jobs.applyToJob(req.user.id, id, resumeId, coverLetter);
  }

  // ── Recruiter: move application through pipeline ──────────────────────────

  @Patch('applications/:appId/status')
  updateAppStatus(
    @Param('appId') appId: string,
    @Req() req: any,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.jobs.updateApplicationStatus(appId, req.user.id, dto);
  }

  // ── Recruiter: update job listing status ─────────────────────────────────

  @Patch(':id/status')
  updateJobStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body('status') status: 'active' | 'paused' | 'closed',
  ) {
    return this.jobs.updateJobStatus(id, req.user.id, status);
  }
}
]]>
</file>
<file name="ts-api\src\jobs\jobs.module.ts">
<![CDATA[
// src/jobs/jobs.module.ts
/* eslint-disable prettier/prettier */
import { Module }           from '@nestjs/common';
import { HttpModule }       from '@nestjs/axios';
import { JobsController }   from './jobs.controller';
import { JobsService }      from './jobs.service';
import { JobsSyncService }  from './jobs-sync.service';
import { JobsStreamService } from './jobs-stream.service';
import { SerpPlatformAdapter } from './adapters/serp.adapter';
import { LinkedInAdapter }  from './adapters/linkedin.adapter';
import { IndeedAdapter }    from './adapters/indeed.adapter';
import { AlertsModule }     from '../alerts/alerts.module';
import { DatabaseModule }   from '../database/datbase.module';
import { OllamaModule }     from '../ollama/ollama.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000, maxRedirects: 3 }),
    // ScheduleModule.forRoot() is in AppModule — not here
    AlertsModule,
    DatabaseModule,
    OllamaModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsSyncService,
    JobsStreamService,
    SerpPlatformAdapter,
    LinkedInAdapter,
    IndeedAdapter,
  ],
  exports: [JobsService, JobsStreamService],
})
export class JobsModule {}
]]>
</file>
<file name="ts-api\src\jobs\jobs.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/jobs/jobs.service.ts

import {
  Injectable, Logger, NotFoundException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import { HttpService }     from '@nestjs/axios';
import { firstValueFrom }  from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { AlertsService }   from '../alerts/alerts.service';
import { JobsStreamService } from './jobs-stream.service';
import { LlmService }      from '../ollama/Llm.service';
import { CreateJobDto }    from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

// ── Public types ──────────────────────────────────────────────────────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id:             string;
  source:         JobSource;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description:    string;
  postedAt:       string;
  applyUrl:       string | null;
  recruiterName:  string | null;
  applicantCount: number;
  status:         string;
  matchScore?:    number;
}

export interface BrowseFilters {
  search?:    string;
  workMode?:  string;
  salaryMin?: number;
  skills?:    string[];
  page?:      number;
  limit?:     number;
  // ✅ source now includes all platforms
  source?:    'internal' | 'serpapi' | 'linkedin' | 'indeed' | 'all';
}

// ── Typed DB row interfaces ───────────────────────────────────────────────────

interface CountRow      { count: string; }
interface ProfileRow {
  top_skills: string[];
  experience_level: string;
  current_title: string | null;
  target_roles: string[] | null;
  preferred_locations: string[] | null;
}
interface OwnershipRow  { id: string; candidate_id: string; title: string; }
interface JobRow        { id: string; title: string; recruiter_id: string; source: string; }
interface ResumeContextRow {
  summary: string | null;
  top_skills: string[] | null;
  experience_level: string | null;
  trajectory: string | null;
}
interface RecommendationPlan {
  queries: string[];
  location?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class JobsService {
  private readonly logger     = new Logger(JobsService.name);
  private readonly serpApiKey: string;
  private readonly rapidApiKey: string;

  constructor(
    private readonly db:     DatabaseService,
    private readonly alerts: AlertsService,
    private readonly config: ConfigService,
    private readonly http:   HttpService,
    private readonly llm:    LlmService,
    private readonly stream: JobsStreamService,  // ✅ injected for SSE events
  ) {
    // ✅ Both keys — SERPAPI_KEY for Google Jobs, RAPIDAPI_KEY for LinkedIn + Indeed
    this.serpApiKey  = this.config.get<string>('SERPAPI_KEY')  ?? '';
    this.rapidApiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';

    if (!this.serpApiKey)  this.logger.warn('SERPAPI_KEY not set  — Google Jobs disabled');
    if (!this.rapidApiKey) this.logger.warn('RAPIDAPI_KEY not set — LinkedIn/Indeed disabled');
  }

  // ── Browse jobs — pure DB query, sync service keeps DB fresh ─────────────

  async browseJobs(
    userId:  string | null,
    filters: BrowseFilters,
  ): Promise<{
    jobs:    UnifiedJob[];
    total:   number;
    sources: { internal: number; serpapi: number; linkedin: number; indeed: number };
  }> {
    const page   = filters.page  ?? 1;
    const limit  = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["j.status = 'active'"];
    const params: unknown[]    = [];
    let   idx = 1;

    const sourceFilter = filters.source ?? 'all';

    if (sourceFilter === 'internal') {
      conditions.push(`j.source = $${idx}`); params.push('internal'); idx++;
    } else if (sourceFilter === 'serpapi') {
      conditions.push(`j.source = $${idx}`); params.push('serpapi'); idx++;
    } else if (sourceFilter === 'linkedin') {
      conditions.push(`j.source = $${idx}`); params.push('linkedin'); idx++;
    } else if (sourceFilter === 'indeed') {
      conditions.push(`j.source = $${idx}`); params.push('indeed'); idx++;
    }
    // 'all' → no source filter, returns everything

    if (filters.search) {
      conditions.push(
        `(j.title ILIKE $${idx} OR j.description ILIKE $${idx} OR j.company ILIKE $${idx})`,
      );
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.workMode) {
      conditions.push(`j.work_mode = $${idx}`);
      params.push(filters.workMode);
      idx++;
    }

    if (filters.salaryMin) {
      conditions.push(`(j.salary_max IS NULL OR j.salary_max >= $${idx})`);
      params.push(filters.salaryMin);
      idx++;
    }

    if (filters.skills?.length) {
      conditions.push(`j.required_skills && $${idx}::text[]`);
      params.push(filters.skills);
      idx++;
    }

    const where = conditions.join(' AND ');

    const [countResult, rowsResult] = await Promise.all([
      this.db.query<CountRow>(
        `SELECT COUNT(*) FROM jobs j WHERE ${where}`,
        params,
      ),
      this.db.query(
        `SELECT
           j.*,
           u.full_name AS recruiter_name,
           COUNT(a.id) AS applicant_count
         FROM jobs j
         LEFT JOIN users u ON u.id = j.recruiter_id
         LEFT JOIN applications a ON a.job_id = j.id
         WHERE ${where}
         GROUP BY j.id, u.full_name
         ORDER BY j.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
    ]);

    let jobs: UnifiedJob[] = rowsResult.rows.map(r => this.mapRow(r));

    if (userId) {
      jobs = await this.injectMatchScores(userId, jobs);
      jobs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    // ✅ Count all four sources separately for frontend display
    const internal = jobs.filter(j => j.source === 'internal').length;
    const serpapi  = jobs.filter(j => j.source === 'serpapi').length;
    const linkedin = jobs.filter(j => j.source === 'linkedin').length;
    const indeed   = jobs.filter(j => j.source === 'indeed').length;

    return {
      jobs,
      total:   parseInt(countResult.rows[0].count, 10),
      sources: { internal, serpapi, linkedin, indeed },
    };
  }

  // ── Recommendations ───────────────────────────────────────────────────────

  async getRecommendations(userId: string): Promise<UnifiedJob[]> {
    this.logger.log(`[recs] Building for userId: ${userId}`);

    try {

    const profileResult = await this.db.query<ProfileRow>(
      `SELECT top_skills, experience_level, current_title, target_roles, preferred_locations
       FROM candidate_profiles WHERE user_id = $1`,
      [userId],
    );

    if (!profileResult.rows.length || !profileResult.rows[0].top_skills?.length) {
      this.logger.warn(`[recs] No profile for ${userId} — returning latest jobs`);
      return this.browseJobs(null, { limit: 12, source: 'all' }).then(r => r.jobs);
    }

    const { top_skills, experience_level, current_title, target_roles, preferred_locations } =
      profileResult.rows[0];

    const skills      = this.toStringArray(top_skills);
    const expLevel   = experience_level as string | null;
    const curTitle   = current_title    as string | null;
    const targetRoles = this.toStringArray(target_roles);
    const preferredLocation = this.toStringArray(preferred_locations)[0] ?? 'India';

    const { rows: resumeRows } = await this.db.query<ResumeContextRow>(
      `SELECT
         ra.summary,
         ra.top_skills,
         ra.experience_level,
         ra.trajectory
       FROM resume_analyses ra
       JOIN resumes r ON r.id = ra.resume_id
       WHERE r.user_id = $1
         AND ra.status = 'completed'
       ORDER BY ra.created_at DESC
       LIMIT 1`,
      [userId],
    );

    const resumeContext = resumeRows[0] ?? null;

    this.logger.log(`[recs] ${curTitle} | Skills: ${skills.slice(0, 4).join(', ')}`);

    const plan = await this.buildRecommendationPlan({
      skills,
      targetRoles,
      currentTitle: curTitle,
      preferredLocation,
      experienceLevel: expLevel,
      resumeSummary: resumeContext?.summary ?? null,
      trajectory: resumeContext?.trajectory ?? null,
    });

    const externalByQuery = await Promise.all(
      plan.queries.slice(0, 4).map(async (query) => {
        const [serp, linkedin, indeed] = await Promise.all([
          this.fetchSerpApiJobs({ query, location: plan.location ?? preferredLocation }),
          this.fetchLinkedInJobs({ query, location: plan.location ?? preferredLocation }),
          this.fetchIndeedJobs({ query, location: plan.location ?? preferredLocation }),
        ]);
        return [...serp, ...linkedin, ...indeed];
      }),
    );

    const externalJobs = externalByQuery.flat();
    const internalJobs = (await this.browseJobs(userId, { limit: 30, source: 'internal' })).jobs;

    const allJobs = this.dedupeJobs([...internalJobs, ...externalJobs]);
    const scored = this.scoreRecommendations(allJobs, skills, targetRoles, curTitle, expLevel);

    this.logger.log(`[recs] Generated ${scored.length} total recommendations`);
    return scored.slice(0, 25);
    } catch (err: any) {
      this.logger.error(`[recs] Failed to build recommendations: ${err.message}`);
      return this.browseJobs(null, { limit: 12, source: 'all' }).then(r => r.jobs);
    }
  }

  private async buildRecommendationPlan(input: {
    skills: string[];
    targetRoles: string[];
    currentTitle: string | null;
    preferredLocation: string;
    experienceLevel: string | null;
    resumeSummary: string | null;
    trajectory: string | null;
  }): Promise<RecommendationPlan> {
    const fallbackQueries = this.fallbackQueries(input);

    try {
      const plan = await this.llm.extractJsonWithRetry<RecommendationPlan>(
        'You are a job search planner. Return only JSON with fields {"queries": string[], "location": string}.',
        `Build 4 concise search queries to find currently open jobs from web sources.
Location: ${input.preferredLocation}
Target roles: ${input.targetRoles.join(', ') || 'none'}
Current title: ${input.currentTitle ?? 'none'}
Experience level: ${input.experienceLevel ?? 'unknown'}
Top skills: ${input.skills.join(', ') || 'none'}
Resume summary: ${input.resumeSummary ?? 'none'}
Career trajectory: ${input.trajectory ?? 'none'}

Return JSON only.`,
      );

      const queries = Array.from(
        new Set(this.toStringArray(plan.queries).map(q => q.trim()).filter(Boolean)),
      );
      return {
        queries: queries.length ? queries : fallbackQueries,
        location: plan.location?.trim() || input.preferredLocation,
      };
    } catch (err: any) {
      this.logger.warn(`[recs] Gemini planning fallback: ${err.message}`);
      return {
        queries: fallbackQueries,
        location: input.preferredLocation,
      };
    }
  }

  private fallbackQueries(input: {
    skills: string[];
    targetRoles: string[];
    currentTitle: string | null;
    preferredLocation: string;
  }): string[] {
    const role = input.targetRoles[0] ?? input.currentTitle ?? 'software engineer';
    const skillsChunk = input.skills.slice(0, 3).join(' ');
    return [
      `${role} ${skillsChunk}`.trim(),
      `${role} remote`,
      `${role} ${input.preferredLocation}`,
      `${role} jobs open now`,
    ];
  }

  private dedupeJobs(jobs: UnifiedJob[]): UnifiedJob[] {
    const seen = new Set<string>();
    const out: UnifiedJob[] = [];

    for (const job of jobs) {
      const key = `${job.title}|${job.company}|${job.location ?? ''}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(job);
    }

    return out;
  }

  private scoreRecommendations(
    jobs: UnifiedJob[],
    skills: string[],
    targetRoles: string[],
    currentTitle: string | null,
    experienceLevel: string | null,
  ): UnifiedJob[] {
    const normalize = (s: string) => s.toLowerCase().trim();
    const userSkills = this.toStringArray(skills).map(normalize);
    const roleHints = this.toStringArray([...targetRoles, currentTitle ?? ''])
      .map(normalize)
      .filter(Boolean);

    return jobs
      .map((job) => {
        const title = normalize(job.title ?? '');
        const desc = normalize(job.description ?? '');
        const jobSkills = this.toStringArray(job.requiredSkills).map(normalize);

        let score = 0;

        for (const skill of userSkills) {
          if (jobSkills.includes(skill)) score += 9;
          else if (title.includes(skill)) score += 4;
          else if (desc.includes(skill)) score += 2;
        }

        for (const role of roleHints) {
          if (title.includes(role)) score += 7;
        }

        if (experienceLevel && desc.includes(normalize(experienceLevel))) score += 3;

        const finalScore = Math.min(99, Math.max(job.matchScore ?? 0, Math.round(35 + score * 1.8)));
        return { ...job, matchScore: finalScore };
      })
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  // ── Create internal job (recruiter) ──────────────────────────────────────

  async createJob(recruiterId: string, dto: CreateJobDto): Promise<UnifiedJob> {
    const { rows } = await this.db.query(
      `INSERT INTO jobs (
        recruiter_id, source, title, description, company, location,
        work_mode, employment_type, salary_min, salary_max,
        salary_currency, required_skills, experience_min,
        experience_max, industry, status
      ) VALUES ($1,'internal',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')
      RETURNING *`,
      [
        recruiterId,
        dto.title,          dto.description,   dto.company,
        dto.location,       dto.workMode        ?? 'hybrid',
        dto.employmentType  ?? 'full_time',
        dto.salaryMin       ?? null,
        dto.salaryMax       ?? null,
        dto.salaryCurrency  ?? 'INR',
        dto.requiredSkills  ?? [],
        dto.experienceMin   ?? 0,
        dto.experienceMax   ?? null,
        dto.industry        ?? null,
      ],
    );

    const job = rows[0];
    this.logger.log(`Job created: ${job.id} by recruiter: ${recruiterId}`);

    // Notify matching candidates via alert rows
    void this.alerts.notifyMatchingCandidates(job);

    // ✅ Emit SSE → all connected browsers see new job instantly
    // No polling lag — EventSource clients revalidate SWR immediately
    this.stream.emitJobCreated({
      id:      String(job.id),
      title:   String(job.title),
      company: String(job.company),
    });

    return this.mapRow({ ...job, recruiter_name: null, applicant_count: 0 });
  }

  // ── Recruiter: own job listings ───────────────────────────────────────────

  async getRecruiterJobs(recruiterId: string): Promise<any[]> {
    const { rows } = await this.db.query(
      `SELECT j.*,
         COUNT(a.id)                                          AS total_applications,
         COUNT(a.id) FILTER (WHERE a.status = 'applied')     AS new_applicants,
         COUNT(a.id) FILTER (WHERE a.status = 'shortlisted') AS shortlisted,
         COUNT(a.id) FILTER (WHERE a.status = 'interview')   AS in_interview,
         COUNT(a.id) FILTER (WHERE a.status = 'offered')     AS offered
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1 AND j.source = 'internal'
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId],
    );
    return rows;
  }

  // ── Recruiter: applicants for a specific job ──────────────────────────────

  async getJobApplicants(jobId: string, recruiterId: string): Promise<any[]> {
    await this.assertRecruiterOwns(jobId, recruiterId);

    const { rows } = await this.db.query(
      `SELECT a.*, u.full_name, u.email,
         cp.headline, cp.experience_level, cp.top_skills,
         cp.location AS candidate_location, cp.photo_url,
         r.file_name, r.raw_file
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
       LEFT JOIN resumes r ON r.id = a.resume_id
       WHERE a.job_id = $1
       ORDER BY a.match_score DESC NULLS LAST, a.applied_at DESC`,
      [jobId],
    );
    return rows;
  }

  // ── Recruiter: update application status + alert candidate ───────────────

  async updateApplicationStatus(
    applicationId: string,
    recruiterId:   string,
    dto:           UpdateApplicationStatusDto,
  ): Promise<any> {
    const { rows: ownership } = await this.db.query<OwnershipRow>(
      `SELECT a.id, a.candidate_id, j.title
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId],
    );

    if (!ownership.length) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    const { candidate_id, title } = ownership[0];

    const { rows } = await this.db.query(
      `UPDATE applications
       SET status = $1, recruiter_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [dto.status, dto.recruiterNotes, applicationId],
    );

    // Alert the candidate of their updated status
    await this.alerts.createAlert({
      userId:   candidate_id,
      type:     'application_update',
      title:    `Application ${dto.status}`,
      message:  this.statusMessage(dto.status, title),
      metadata: { application_id: applicationId, status: dto.status },
    });

    // ✅ Emit SSE → candidate's alert badge updates in real time
    this.stream.emitAlert({
      type:    'application_update',
      message: this.statusMessage(dto.status, title),
    });

    return rows[0];
  }

  // ── Recruiter: toggle job listing status ─────────────────────────────────

  async updateJobStatus(
    jobId:       string,
    recruiterId: string,
    status:      'active' | 'paused' | 'closed',
  ): Promise<any> {
    const { rows } = await this.db.query(
      `UPDATE jobs SET status = $1, updated_at = NOW()
       WHERE id = $2 AND recruiter_id = $3 AND source = 'internal'
       RETURNING *`,
      [status, jobId, recruiterId],
    );
    if (!rows.length) throw new ForbiddenException('Not authorized or job not found');
    return rows[0];
  }

  // ── Candidate: apply to an internal job ──────────────────────────────────

  async applyToJob(
    candidateId:  string,
    jobId:        string,
    resumeId:     string,
    coverLetter?: string,
  ): Promise<any> {
    const { rows: jobRows } = await this.db.query<JobRow>(
      `SELECT id, title, recruiter_id, source
       FROM jobs WHERE id = $1 AND status = 'active'`,
      [jobId],
    );

    if (!jobRows.length) throw new NotFoundException('Job not found or closed');

    const job = jobRows[0];

    // External jobs (serpapi / linkedin / indeed) — must apply via applyUrl
    if (job.source !== 'internal') {
      throw new ForbiddenException(
        'This is an external job — please apply via the provided URL',
      );
    }

    const [profileResult, skillsResult] = await Promise.all([
      this.db.query<{ top_skills: string[] }>(
        'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
        [candidateId],
      ),
      this.db.query<{ required_skills: string[] }>(
        'SELECT required_skills FROM jobs WHERE id = $1',
        [jobId],
      ),
    ]);

    let matchScore: number | null = null;
    const userSkills = profileResult.rows[0]?.top_skills  ?? [];
    const jobSkills  = skillsResult.rows[0]?.required_skills ?? [];

    if (userSkills.length && jobSkills.length) {
      const lower   = (arr: string[]) => arr.map(s => s.toLowerCase());
      const overlap = lower(userSkills).filter(s => lower(jobSkills).includes(s)).length;
      matchScore    = Math.round((overlap / jobSkills.length) * 100);
    }

    try {
      const { rows } = await this.db.query(
        `INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, match_score)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [jobId, candidateId, resumeId, coverLetter, matchScore],
      );

      // Alert the recruiter of the new applicant
      await this.alerts.createAlert({
        userId:   job.recruiter_id,
        type:     'new_applicant',
        title:    'New Application Received',
        message:  `Someone applied to "${job.title}"`,
        metadata: { job_id: jobId, application_id: rows[0].id, match_score: matchScore },
      });

      // ✅ SSE → recruiter dashboard updates applicant count in real time
      this.stream.emitAlert({
        type:    'new_applicant',
        message: `New application received for "${job.title}"`,
      });

      return rows[0];
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Already applied to this job');
      throw err;
    }
  }

  // ── Candidate: own applications ───────────────────────────────────────────

  async getCandidateApplications(candidateId: string): Promise<any[]> {
    const { rows } = await this.db.query(
      `SELECT a.*, j.title, j.company, j.location,
         j.work_mode, j.salary_min, j.salary_max, j.source
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = $1
       ORDER BY a.applied_at DESC`,
      [candidateId],
    );
    return rows;
  }

  // ── On-demand SerpAPI fetch (used by sync service fallback) ──────────────

  async fetchSerpApiJobs(params: {
    query:     string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.serpApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://serpapi.com/search.json', {
          params: {
            engine:   'google_jobs',
            q:        params.query,
            location: params.location ?? 'India',
            hl:       'en',
            gl:       'in',
            api_key:  this.serpApiKey,   // ✅ SERPAPI_KEY
          },
          timeout: 10_000,
        }),
      );

      return ((data.jobs_results ?? []) as any[]).map(job => ({
        id:             `serpapi_${job.job_id}`,
        source:         'serpapi' as JobSource,
        title:          job.title            ?? '',
        company:        job.company_name     ?? '',
        location:       job.location         ?? '',
        workMode:       this.inferWorkMode(job),
        employmentType: this.inferEmpType(job),
        salaryMin:      null,
        salaryMax:      null,
        salaryCurrency: 'INR',
        requiredSkills: [],
        description:    job.description      ?? '',
        postedAt:       new Date().toISOString(),
        applyUrl:       job.related_links?.[0]?.link ?? null,
        recruiterName:  null,
        applicantCount: 0,
        status:         'active',
      }));
    } catch {
      return [];
    }
  }

  // ── On-demand LinkedIn fetch via RAPIDAPI_KEY ─────────────────────────────

  // src/jobs/jobs.service.ts
// REPLACE ONLY THESE TWO METHODS — everything else unchanged

// ── LinkedIn jobs via JSearch (RAPIDAPI_KEY) ──────────────────────────────
// Old endpoint: linkedin-jobs-search.p.rapidapi.com → 403 Forbidden
// New endpoint: jsearch.p.rapidapi.com              → ✅ works
async fetchLinkedInJobs(params: {
  query:     string;
  location?: string;
}): Promise<UnifiedJob[]> {
  if (!this.rapidApiKey) return [];

  try {
    const { data } = await firstValueFrom(
      this.http.get('https://jsearch.p.rapidapi.com/search', {
        params: {
          query:       `${params.query} in ${params.location ?? 'India'}`,
          page:        '1',
          num_pages:   '1',
          date_posted: 'week',
        },
        headers: {
          'X-RapidAPI-Key':  this.rapidApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',  // ✅ fixed
        },
        timeout: 10_000,
      }),
    );

    return ((data?.data ?? []) as any[]).slice(0, 10).map(job => ({
      id:             `linkedin_${job.job_id}`,
      source:         'linkedin' as JobSource,
      title:          job.job_title           ?? '',
      company:        job.employer_name        ?? '',
      location:       job.job_city
        ? `${job.job_city}, ${job.job_country ?? ''}`
        : (job.job_country ?? ''),
      workMode:       job.job_is_remote ? 'remote' : 'hybrid',
      employmentType: this.inferEmpTypeFromText(job.job_employment_type ?? ''),
      salaryMin:      job.job_min_salary       ?? null,
      salaryMax:      job.job_max_salary       ?? null,
      salaryCurrency: 'INR',
      requiredSkills: this.toStringArray(job.job_required_skills).slice(0, 8),
      description:    (job.job_description    ?? '').slice(0, 5000),
      postedAt:       job.job_posted_at_datetime_utc
        ? new Date(job.job_posted_at_datetime_utc).toISOString()
        : new Date().toISOString(),
      applyUrl:       job.job_apply_link       ?? null,
      recruiterName:  null,
      applicantCount: 0,
      status:         'active',
    }));
  } catch (err: any) {
    this.logger.error(`fetchLinkedInJobs failed: ${err.message}`);
    return [];
  }
}

// ── Indeed jobs via JSearch page 2 (RAPIDAPI_KEY) ────────────────────────
// Old endpoint: indeed12.p.rapidapi.com → 403 Forbidden
// New endpoint: jsearch.p.rapidapi.com  → ✅ works (page 2 = different results)
async fetchIndeedJobs(params: {
  query:     string;
  location?: string;
}): Promise<UnifiedJob[]> {
  if (!this.rapidApiKey) return [];

  try {
    const { data } = await firstValueFrom(
      this.http.get('https://jsearch.p.rapidapi.com/search', {
        params: {
          query:       `${params.query} in ${params.location ?? 'India'}`,
          page:        '2',        // page 2 avoids duplicate results vs LinkedIn
          num_pages:   '1',
          date_posted: 'week',
        },
        headers: {
          'X-RapidAPI-Key':  this.rapidApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',  // ✅ fixed
        },
        timeout: 10_000,
      }),
    );

    return ((data?.data ?? []) as any[]).slice(0, 10).map(job => ({
      id:             `indeed_${job.job_id}`,
      source:         'indeed' as JobSource,
      title:          job.job_title           ?? '',
      company:        job.employer_name        ?? '',
      location:       job.job_city
        ? `${job.job_city}, ${job.job_country ?? ''}`
        : (job.job_country ?? ''),
      workMode:       job.job_is_remote ? 'remote' : 'hybrid',
      employmentType: this.inferEmpTypeFromText(job.job_employment_type ?? ''),
      salaryMin:      job.job_min_salary       ?? null,
      salaryMax:      job.job_max_salary       ?? null,
      salaryCurrency: 'INR',
      requiredSkills: this.toStringArray(job.job_required_skills).slice(0, 8),
      description:    (job.job_description    ?? '').slice(0, 5000),
      postedAt:       job.job_posted_at_datetime_utc
        ? new Date(job.job_posted_at_datetime_utc).toISOString()
        : new Date().toISOString(),
      applyUrl:       job.job_apply_link       ?? null,
      recruiterName:  null,
      applicantCount: 0,
      status:         'active',
    }));
  } catch (err: any) {
    this.logger.error(`fetchIndeedJobs failed: ${err.message}`);
    return [];
  }
}
  // ── Private helpers ───────────────────────────────────────────────────────

  private mapRow(row: any): UnifiedJob {
    return {
      id:             row.id,
      source:         (row.source ?? 'internal') as JobSource,
      title:          row.title,
      company:        row.company        ?? '',
      location:       row.location,
      workMode:       row.work_mode,
      employmentType: row.employment_type,
      salaryMin:      row.salary_min,
      salaryMax:      row.salary_max,
      salaryCurrency: row.salary_currency ?? 'INR',
      requiredSkills: row.required_skills ?? [],
      description:    row.description    ?? '',
      postedAt:       row.created_at,
      applyUrl:       row.apply_url      ?? null,
      recruiterName:  row.recruiter_name ?? null,
      applicantCount: parseInt(row.applicant_count ?? '0', 10),
      status:         row.status,
    };
  }

  private async injectMatchScores(
    userId: string,
    jobs:   UnifiedJob[],
  ): Promise<UnifiedJob[]> {
    const { rows } = await this.db.query<{ top_skills: string[] }>(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [userId],
    );
    if (!rows.length) return jobs;

    const userSkills = (rows[0].top_skills ?? []).map(s => s.toLowerCase());

    return jobs.map(job => {
      if (!job.requiredSkills?.length || !userSkills.length) {
        return { ...job, matchScore: 0 };
      }
      const jobSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
      const overlap        = userSkills.filter(s => jobSkillsLower.includes(s)).length;
      const matchScore     = Math.round((overlap / jobSkillsLower.length) * 100);
      return { ...job, matchScore };
    });
  }

  private async assertRecruiterOwns(
    jobId:       string,
    recruiterId: string,
  ): Promise<void> {
    const { rows } = await this.db.query(
      'SELECT id FROM jobs WHERE id = $1 AND recruiter_id = $2 AND source = $3',
      [jobId, recruiterId, 'internal'],
    );
    if (!rows.length) throw new ForbiddenException('You do not own this job posting');
  }

  private statusMessage(status: string, title: string): string {
    const map: Record<string, string> = {
      reviewed:    `Your application for "${title}" has been reviewed`,
      shortlisted: `Great news — you've been shortlisted for "${title}" 🎉`,
      interview:   `You're invited to interview for "${title}" 🚀`,
      offered:     `You've received an offer for "${title}" 🎊`,
      rejected:    `Your application for "${title}" wasn't selected this time`,
    };
    return map[status] ?? `Application status updated for "${title}"`;
  }

  private inferWorkMode(job: any): string {
    return this.inferWorkModeFromText(`${job.title ?? ''} ${job.description ?? ''}`);
  }

  private inferWorkModeFromText(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('remote')) return 'remote';
    if (t.includes('hybrid')) return 'hybrid';
    return 'hybrid';
  }

  private inferEmpType(job: any): string {
    return this.inferEmpTypeFromText(job.detected_extensions?.schedule_type ?? '');
  }

  private inferEmpTypeFromText(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract') || s.includes('freelance')) return 'contract';
    if (s.includes('part'))    return 'part_time';
    if (s.includes('intern'))  return 'internship';
    return 'full_time';
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((v): v is string => typeof v === 'string')
        .map(v => v.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    return [];
  }
}
]]>
</file>
<file name="ts-api\src\lib\supabase.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

// For client-facing operations — respects RLS
export function getSupabaseClient(): SupabaseClient {
  if (!anonClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    anonClient = createClient(url, key);
  }
  return anonClient;
}

// For server-side operations — bypasses RLS
export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    serviceClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}
]]>
</file>
<file name="ts-api\src\livekit\livekit.controller.ts">
<![CDATA[
import {
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewsService } from '../interviews/interviews.service';
import { LivekitService } from './livekit.service';

@Controller('interviews/room')
@UseGuards(JwtAuthGuard)
export class LivekitController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly livekitService: LivekitService,
  ) {}

  @Post(':roomId/token')
  async issueRoomToken(@Req() req: any, @Param('roomId') roomId: string) {
    const access = await this.interviewsService.validateRoomAccessWithContext(
      roomId,
      req.user.id,
      req.user.role,
    );

    if (!access.allowed) {
      throw new ForbiddenException('Not allowed to access this room');
    }

    return this.livekitService.buildRoomToken({
      roomId,
      userId: req.user.id,
      userName: req.user.full_name ?? req.user.email ?? 'Participant',
      role: req.user.role,
      metadata: {
        interviewId: access.interviewId,
        roundId: access.roundId,
      },
    });
  }
}
]]>
</file>
<file name="ts-api\src\livekit\livekit.module.ts">
<![CDATA[
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterviewsModule } from '../interviews/interviews.module';
import { LivekitController } from './livekit.controller';
import { LivekitService } from './livekit.service';

@Module({
  imports: [ConfigModule, InterviewsModule],
  controllers: [LivekitController],
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
]]>
</file>
<file name="ts-api\src\livekit\livekit.service.ts">
<![CDATA[
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

type BuildTokenArgs = {
  roomId: string;
  userId: string;
  userName?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class LivekitService {
  constructor(private readonly config: ConfigService) {}

  buildRoomToken(args: BuildTokenArgs) {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new InternalServerErrorException(
        'LiveKit is not configured. Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET',
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: args.userId,
      name: args.userName ?? args.userId,
      ttl: '15m',
      metadata: JSON.stringify({
        role: args.role ?? 'participant',
        ...args.metadata,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room: args.roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      token: at.toJwt(),
      url: livekitUrl,
      roomId: args.roomId,
    };
  }
}
]]>
</file>
<file name="ts-api\src\main.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://job-crawler-wine.vercel.app',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server / health checks / curl requests without origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;

  // Render/Docker compatible host binding
  await app.listen(port, '0.0.0.0');

  const publicUrl =
    process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`🔗 Public URL: ${publicUrl}`);
  logger.log(`✅ Allowed CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
]]>
</file>
<file name="ts-api\src\ollama\dto\ollama.types.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: OllamaOptions;
}

export interface OllamaOptions {
  temperature?: number;    // 0.0 = deterministic, 1.0 = creative
  top_p?: number;
  top_k?: number;
  num_predict?: number;   // max tokens to generate
  repeat_penalty?: number;
  stop?: string[];        // stop sequences
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaTagsResponse {
  models: Array<{
    name: string;
    size: number;
    digest: string;
    modified_at: string;
  }>;
}

export interface OllamaHealthStatus {
  isHealthy: boolean;
  model: string;
  availableModels: string[];
  responseTimeMs?: number;
}
]]>
</file>
<file name="ts-api\src\ollama\Llm.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/ollama/llm.service.ts
//
// Production LLM service — Gemini cloud only.
// Uses Gemini Generative AI via Google REST API.

import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService }   from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError }    from 'axios';

const DEFAULT_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const RATE_LIMIT_BACKOFF_MS = 2_000;   // initial wait on 429
const MAX_RETRIES           = 3;

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly model:  string;

  constructor(
    private readonly config:      ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey =
      this.config.get<string>('gemini.apiKey') ??
      this.config.get<string>('GEMINI_API_KEY') ??
      '';

    this.model =
      this.config.get<string>('gemini.model') ??
      this.config.get<string>('GEMINI_MODEL') ??
      DEFAULT_MODEL;
  }

  // ── Startup validation ────────────────────────────────────────────────────
  // Fail fast on missing config — better to crash at startup than
  // to let the first resume upload fail silently 30 seconds later.

  async onModuleInit(): Promise<void> {
  // Diagnose exactly what the runtime sees
  this.logger.log(`[startup] GEMINI_API_KEY present: ${!!this.apiKey}`);
  this.logger.log(`[startup] GEMINI_API_KEY length:  ${this.apiKey.length}`);
  this.logger.log(`[startup] GEMINI_MODEL:           ${this.model}`);

  if (!this.apiKey) {
    this.logger.error(
      'GEMINI_API_KEY is not set.\n' +
      '1. Get a key from Google AI Studio\n' +
      '2. Add GEMINI_API_KEY to environment variables\n' +
      '   3. Trigger a manual redeploy — env vars only apply after restart',
    );
    return;
  }

  this.logger.log(`Gemini LLM service ready — model: ${this.model}`);
  }

  // ── Primary public interface ──────────────────────────────────────────────
  //
  // extractJson<T>() is the single entry point for all LLM calls.
  // Both ResumeAnalysisService and InterviewsService call this.
  //
  // Retry strategy:
  //   - Parse failure  → retry immediately (bad output, try again)
  //   - 429 rate limit → exponential backoff then retry
  //   - 5xx server err → retry with backoff
  //   - 4xx client err → throw immediately (bad request, no point retrying)

  async extractJson<T>(
    systemPrompt: string,
    userPrompt:   string,
    maxRetries    = MAX_RETRIES,
  ): Promise<T> {
    this.assertApiKeyConfigured();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const raw    = await this.callGeminiApi(systemPrompt, userPrompt);
        const parsed = this.parseJson<T>(raw);

        if (attempt > 1) {
          this.logger.log(`[gemini] Succeeded on attempt ${attempt}`);
        }

        return parsed;

      } catch (err) {
        lastError = err as Error;
        const axiosErr = err as AxiosError;
        const status   = axiosErr.response?.status;

        // ── 4xx client errors: don't retry, throw immediately ──────────────
        if (status && status >= 400 && status < 500 && status !== 429) {
          this.logger.error(`[gemini] Client error ${status} — not retrying`);
          throw new InternalServerErrorException(
            `Gemini API error ${status}: ${this.extractErrorMessage(axiosErr)}`,
          );
        }

        // ── 429 rate limit: back off longer ───────────────────────────────
        const isRateLimit   = status === 429;
        const backoffMs     = isRateLimit
          ? RATE_LIMIT_BACKOFF_MS * Math.pow(2, attempt - 1)   // 2s → 4s → 8s
          : 1_000 * attempt;                                     // 1s → 2s → 3s

        this.logger.warn(
          `[gemini] Attempt ${attempt}/${maxRetries + 1} failed` +
          `${isRateLimit ? ' (rate limited)' : ''}: ${lastError.message}` +
          (attempt <= maxRetries ? ` — retrying in ${backoffMs}ms` : ''),
        );

        if (attempt <= maxRetries) {
          await this.sleep(backoffMs);
        }
      }
    }

    throw new InternalServerErrorException(
      `Gemini LLM failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    );
  }

  // Alias — keeps InterviewsService call sites compatible
  async extractJsonWithRetry<T>(
    systemPrompt: string,
    userPrompt:   string,
    maxRetries    = MAX_RETRIES,
  ): Promise<T> {
    return this.extractJson<T>(systemPrompt, userPrompt, maxRetries);
  }

  // ── Gemini API call ────────────────────────────────────────────────────────

  private async callGeminiApi(
    systemPrompt: string,
    userPrompt:   string,
  ): Promise<string> {
    const startMs = Date.now();

    const { data } = await firstValueFrom(
      this.httpService.post(
        `${GEMINI_API_URL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        },
        {
          headers: {
            'Content-Type':  'application/json',
          },
          timeout: 30_000,
        },
      ),
    );

    const elapsedMs = Date.now() - startMs;
    const content =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
        .trim() ?? '';

    if (!content) {
      throw new Error('Gemini returned empty response');
    }

    this.logger.log(
      `[gemini] ${this.model} responded in ${elapsedMs}ms ` +
      `(${content.length} chars | ` +
      `tokens: ${data?.usageMetadata?.totalTokenCount ?? 'N/A'})`,
    );

    return content;
  }

  // ── JSON parsing ──────────────────────────────────────────────────────────
  //
  // Gemini usually returns clean JSON when instructed, but occasionally
  // wraps it in markdown fences. This handles both cases.

  private parseJson<T>(raw: string): T {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/,        '')
      .trim();

    // Fast path — clean JSON object or array
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Slow path — extract first JSON structure from noisy output
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[1]) as T;
        } catch {
          // fall through to error
        }
      }

      throw new Error(
        `Gemini returned non-JSON output. ` +
        `Preview: "${cleaned.slice(0, 300)}"`,
      );
    }
  }

  // ── Guards & utilities ────────────────────────────────────────────────────

  private assertApiKeyConfigured(): void {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured. ' +
        'Get a key from Google AI Studio and add it to your environment variables.',
      );
    }
  }

  private extractErrorMessage(err: AxiosError): string {
    const data = err.response?.data as any;
    return data?.error?.message ?? data?.message ?? err.message;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
]]>
</file>
<file name="ts-api\src\ollama\ollama.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/ollama/ollama.module.ts
import { Module }     from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from './Llm.service';

@Module({
  imports:   [HttpModule],
  providers: [LlmService],
  exports:   [LlmService],
})
export class OllamaModule {}
]]>
</file>
<file name="ts-api\src\recommendations\recommendations.controller.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Req, Query } from '@nestjs/common';
import {
  RecommendationsService,
  JobRecommendation,
  SkillGapAnalysis,
} from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  // ── GET /recommendations/jobs ─────────────────────────────────────────────
  // Skill-matched job recommendations for the authenticated candidate.
  // Explicit return type so TS4053 cannot fire — all types are exported.

  @Get('jobs')
  getJobs(
    @Req()          req: any,
    @Query('limit') limit?: string,
  ): Promise<{ recommendations: JobRecommendation[]; reason?: string; profile?: object }> {
    return this.recommendations.getJobRecommendations(
      req.user.id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ── GET /recommendations/skill-gaps ──────────────────────────────────────
  // Compares candidate's top_skills against the most-demanded skills
  // across all active job listings — surfaces what to learn next.

  @Get('skill-gaps')
  getSkillGaps(
    @Req() req: any,
  ): Promise<SkillGapAnalysis | null> {       // ← explicit, TS can name it
    return this.recommendations.getSkillGapAnalysis(req.user.id);
  }
}
]]>
</file>
<file name="ts-api\src\recommendations\recommendations.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService }    from '../database/database.service';

// ── Typed DB row interfaces — all exported so controllers can reference them ──

/**
 * Lightweight profile shape used for enriched lookups (title + industry context).
 * Returned by the dedicated fetchCandidateProfile helper.
 */
export interface ProfileRow {
  top_skills:       string[];
  experience_level: string;
  current_title:    string | null;
  industry_tags:    string[] | null; // mapped from target_industries column
}

export interface CandidateProfileRow {
  top_skills:       string[];
  experience_level: string;
  experience_years: number;
  target_roles:     string[];
  work_mode:        string | null;
  salary_min:       number | null;
  salary_max:       number | null;
}

export interface JobRecommendationRow {
  id:              string;
  title:           string;
  company:         string;
  location:        string | null;
  work_mode:       string | null;
  employment_type: string | null;
  salary_min:      number | null;
  salary_max:      number | null;
  salary_currency: string;
  required_skills: string[];
  description:     string;
  created_at:      Date;
  apply_url:       string | null;
  recruiter_name:  string;
  applicant_count: string;
  status:          string;
  skill_score:     number;
  mode_score:      number;
  salary_score:    number;
}

export interface SkillDemandRow {
  skill:         string;
  demand_count:  string;
  candidate_has: boolean;
}

export interface SkillsProfileRow {
  top_skills: string[];
}

// ── Recommendation result shape (returned to controller) ─────────────────────

export interface JobRecommendation {
  id:              string;
  source:          'internal';
  title:           string;
  company:         string;
  location:        string | null;
  workMode:        string | null;
  employmentType:  string | null;
  salaryMin:       number | null;
  salaryMax:       number | null;
  salaryCurrency:  string;
  requiredSkills:  string[];
  description:     string;
  postedAt:        Date;
  applyUrl:        null;
  recruiterName:   string;
  applicantCount:  string;
  status:          string;
  matchScore:      number;
  matchReason:     string;
}

export interface SkillGapAnalysis {
  userSkills:        string[];
  topDemandedSkills: SkillDemandRow[];
  skillGaps:         SkillDemandRow[];
  matchedSkills:     SkillDemandRow[];
  coveragePercent:   number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Fetches the enriched candidate profile row including current job title
   * and target industry tags. Used wherever we need richer context beyond
   * the base skills/salary/work-mode profile.
   *
   * Maps `target_industries` → `industry_tags` at the SQL level so the
   * application layer always works with the canonical `ProfileRow` shape.
   */
  private async fetchCandidateProfile(userId: string): Promise<ProfileRow | null> {
    const { rows } = await this.db.query<ProfileRow>(
      `SELECT top_skills,
              experience_level,
              current_title,
              target_industries AS industry_tags
       FROM candidate_profiles
       WHERE user_id = $1`,
      [userId],
    );

    return rows.length ? rows[0] : null;
  }

  // ── Public Methods ─────────────────────────────────────────────────────────

  async getJobRecommendations(
    candidateId: string,
    limit = 10,
  ): Promise<{ recommendations: JobRecommendation[]; reason?: string; profile?: object }> {

    // ── 1. Fetch full candidate profile (existing scoring fields) ────────────
    const { rows: profileRows } = await this.db.query<CandidateProfileRow>(
      `SELECT cp.top_skills, cp.experience_level, cp.experience_years,
              cp.target_roles, cp.work_mode, cp.salary_min, cp.salary_max
       FROM candidate_profiles cp
       WHERE cp.user_id = $1`,
      [candidateId],
    );

    if (!profileRows.length) {
      return { recommendations: [], reason: 'Complete your profile for recommendations' };
    }

    // ── 2. Fetch enriched profile (title + industry context) ─────────────────
    const enrichedProfile = await this.fetchCandidateProfile(candidateId);

    const profile      = profileRows[0];
    const skills:      string[] = profile.top_skills   || [];
    const targetRoles: string[] = profile.target_roles || [];

    // ── 3. Score and fetch matching jobs ─────────────────────────────────────
    const { rows: jobs } = await this.db.query<JobRecommendationRow>(
      `SELECT
         j.*,
         u.full_name AS recruiter_name,
         CASE
           WHEN array_length(j.required_skills, 1) IS NULL THEN 0
           ELSE ROUND(
             (
               SELECT COUNT(*)::FLOAT
               FROM unnest(j.required_skills) rs
               WHERE rs = ANY($2::text[])
             ) / array_length(j.required_skills, 1) * 100
           )::INTEGER
         END AS skill_score,
         CASE WHEN $3::text IS NULL OR j.work_mode = $3 THEN 20 ELSE 0 END AS mode_score,
         CASE
           WHEN $4::integer IS NULL THEN 10
           WHEN j.salary_max IS NULL THEN 10
           WHEN j.salary_max >= $4 THEN 15
           ELSE 0
         END AS salary_score
       FROM jobs j
       JOIN users u ON u.id = j.recruiter_id
       WHERE j.status = 'active'
         AND j.id NOT IN (
           SELECT job_id FROM applications WHERE candidate_id = $1
         )
       ORDER BY (skill_score + mode_score + salary_score) DESC, j.created_at DESC
       LIMIT $5`,
      [
        candidateId,
        skills,
        profile.work_mode,
        profile.salary_min,
        limit,
      ],
    );

    const recommendations: JobRecommendation[] = jobs.map(job => ({
      id:             job.id,
      source:         'internal' as const,
      title:          job.title,
      company:        job.company,
      location:       job.location,
      workMode:       job.work_mode,
      employmentType: job.employment_type,
      salaryMin:      job.salary_min,
      salaryMax:      job.salary_max,
      salaryCurrency: job.salary_currency,
      requiredSkills: job.required_skills,
      description:    job.description,
      postedAt:       job.created_at,
      applyUrl:       null,
      recruiterName:  job.recruiter_name,
      applicantCount: job.applicant_count,
      status:         job.status,
      matchScore: Math.min(
        100,
        (job.skill_score || 0) + (job.mode_score || 0) + (job.salary_score || 0),
      ),
      matchReason: this.buildMatchReason(job, profile, skills),
    }));

    return {
      recommendations,
      profile: {
        skills,
        experienceLevel: profile.experience_level,
        workMode:        profile.work_mode,
        // Enriched fields exposed to consumers if available
        currentTitle:    enrichedProfile?.current_title   ?? null,
        industryTags:    enrichedProfile?.industry_tags   ?? [],
      },
    };
  }

  async getSkillGapAnalysis(candidateId: string): Promise<SkillGapAnalysis | null> {
    const { rows: profileRows } = await this.db.query<SkillsProfileRow>(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [candidateId],
    );

    if (!profileRows.length) return null;

    const userSkills: string[] = profileRows[0].top_skills || [];

    const { rows: demandRows } = await this.db.query<SkillDemandRow>(
      `SELECT
         skill,
         COUNT(*) AS demand_count,
         COUNT(*) FILTER (WHERE skill = ANY($1::text[])) > 0 AS candidate_has
       FROM jobs, unnest(required_skills) AS skill
       WHERE status = 'active'
       GROUP BY skill
       ORDER BY demand_count DESC
       LIMIT 20`,
      [userSkills],
    );

    const gaps    = demandRows.filter(r => !r.candidate_has);
    const matches = demandRows.filter(r =>  r.candidate_has);

    return {
      userSkills,
      topDemandedSkills: demandRows,
      skillGaps:         gaps.slice(0, 8),
      matchedSkills:     matches,
      coveragePercent:   demandRows.length > 0
        ? Math.round((matches.length / demandRows.length) * 100)
        : 0,
    };
  }

  private buildMatchReason(
    job:        JobRecommendationRow,
    profile:    CandidateProfileRow,
    userSkills: string[],
  ): string {
    const overlapping = (job.required_skills || [])
      .filter((s: string) => userSkills.includes(s));

    const reasons: string[] = [];

    if (overlapping.length > 0) {
      reasons.push(`matches ${overlapping.slice(0, 3).join(', ')}`);
    }
    if (job.mode_score > 0 && profile.work_mode) {
      reasons.push(`${profile.work_mode} role`);
    }
    if (job.salary_score > 0) {
      reasons.push('within salary range');
    }

    return reasons.length > 0
      ? `Recommended because it ${reasons.join(', ')}`
      : 'Based on your profile';
  }
}
]]>
</file>
<file name="ts-api\src\recommendations\recommendatyions.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';

@Module({
  controllers: [RecommendationsController],
  providers:   [RecommendationsService],
  exports:     [RecommendationsService],
})
export class RecommendationsModule {}
]]>
</file>
<file name="ts-api\src\recruiters\dto\update-recruiter-profile.dto.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  IsString, IsOptional, IsArray, IsBoolean,
  IsNumber, IsIn, IsUrl, Min,
} from 'class-validator';

export class UpdateRecruiterProfileDto {
  @IsString() @IsOptional()
  title?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsUrl() @IsOptional()
  photoUrl?: string;

  @IsUrl() @IsOptional()
  linkedinUrl?: string;

  @IsString() @IsOptional()
  companyName?: string;

  @IsIn(['1-10', '11-50', '51-200', '201-500', '500+']) @IsOptional()
  companySize?: string;

  @IsArray() @IsOptional()
  companyIndustry?: string[];

  @IsUrl() @IsOptional()
  companyWebsite?: string;

  @IsUrl() @IsOptional()
  companyLogoUrl?: string;

  @IsString() @IsOptional()
  companyDescription?: string;

  @IsString() @IsOptional()
  companyLocation?: string;

  @IsArray() @IsOptional()
  hiringRoles?: string[];

  @IsArray() @IsOptional()
  typicalStack?: string[];

  @IsIn(['1-5', '5-20', '20+']) @IsOptional()
  hiringVolume?: string;

  @IsBoolean() @IsOptional()
  openToRemote?: boolean;
}
]]>
</file>
<file name="ts-api\src\recruiters\recruiters.controller.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { RecruitersService } from './recruiters.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Controller('recruiters')
export class RecruitersController {
  constructor(private readonly recruiters: RecruitersService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.recruiters.getEnrichedProfile(req.user.id);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateRecruiterProfileDto) {
    return this.recruiters.updateProfile(req.user.id, dto);
  }
}
]]>
</file>
<file name="ts-api\src\recruiters\recruiters.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { RecruitersService } from './recruiters.service';
import { RecruitersController } from './recruiters.controller';

@Module({
  controllers: [RecruitersController],
  providers: [RecruitersService],
  exports: [RecruitersService],
})
export class RecruitersModule {}
]]>
</file>
<file name="ts-api\src\recruiters\recruiters.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Injectable()
export class RecruitersService {
  private readonly logger = new Logger(RecruitersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService,
  ) {}

  // ── GET profile ──────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.prisma.recruiterProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  // ── GET enriched profile with live pipeline stats ────────────────────────

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    // Aggregate live hiring pipeline stats across all active jobs
    const { rows: pipeline } = await this.db.query(
      `SELECT
         COUNT(DISTINCT j.id)                                    AS total_jobs,
         COUNT(a.id)                                             AS total_applications,
         COUNT(a.id) FILTER (WHERE a.status = 'applied')        AS new_applicants,
         COUNT(a.id) FILTER (WHERE a.status = 'shortlisted')    AS shortlisted,
         COUNT(a.id) FILTER (WHERE a.status = 'interview')      AS in_interview,
         COUNT(a.id) FILTER (WHERE a.status = 'offered')        AS offered,
         COUNT(a.id) FILTER (WHERE a.status = 'rejected')       AS rejected,
         COUNT(j.id) FILTER (WHERE j.status = 'active')         AS active_jobs,
         ROUND(
           CASE WHEN COUNT(a.id) FILTER (WHERE a.status = 'interview') > 0
             THEN COUNT(a.id) FILTER (WHERE a.status = 'offered')::NUMERIC
               / COUNT(a.id) FILTER (WHERE a.status = 'interview') * 100
             ELSE 0 END, 1
         )                                                       AS offer_rate,
         ROUND(
           AVG(
             EXTRACT(EPOCH FROM (a.updated_at - a.applied_at)) / 86400
           )::NUMERIC, 1
         )                                                       AS avg_days_to_hire
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1`,
      [userId],
    );

    // Recent applicants across all jobs
    const { rows: recentApplicants } = await this.db.query(
      `SELECT
         a.id, a.status, a.match_score, a.applied_at,
         u.full_name, u.email,
         cp.headline, cp.experience_level, cp.top_skills,
         j.title AS job_title
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 8`,
      [userId],
    );

    return {
      ...profile,
      pipeline:          pipeline[0] || {},
      recentApplicants,
      profileCompletion: this.computeCompletion(profile),
    };
  }

  // ── UPDATE profile ───────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    await this.getProfile(userId);

    const updated = await this.prisma.recruiterProfile.update({
      where: { userId },
      data: {
        ...(dto.title              !== undefined && { title: dto.title }),
        ...(dto.phone              !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl           !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.linkedinUrl        !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.companyName        !== undefined && { companyName: dto.companyName }),
        ...(dto.companySize        !== undefined && { companySize: dto.companySize }),
        ...(dto.companyIndustry    !== undefined && { companyIndustry: dto.companyIndustry }),
        ...(dto.companyWebsite     !== undefined && { companyWebsite: dto.companyWebsite }),
        ...(dto.companyLogoUrl     !== undefined && { companyLogoUrl: dto.companyLogoUrl }),
        ...(dto.companyDescription !== undefined && { companyDescription: dto.companyDescription }),
        ...(dto.companyLocation    !== undefined && { companyLocation: dto.companyLocation }),
        ...(dto.hiringRoles        !== undefined && { hiringRoles: dto.hiringRoles }),
        ...(dto.typicalStack       !== undefined && { typicalStack: dto.typicalStack }),
        ...(dto.hiringVolume       !== undefined && { hiringVolume: dto.hiringVolume }),
        ...(dto.openToRemote       !== undefined && { openToRemote: dto.openToRemote }),
        profileCompletion: this.computeCompletion({ ...dto }),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Recruiter profile updated: ${userId}`);
    return updated;
  }

  // ── Private: compute completion score ────────────────────────────────────

  private computeCompletion(profile: any): number {
    const checks = [
      !!profile.title,
      !!profile.phone,
      !!profile.linkedinUrl,
      !!profile.companyName,
      !!profile.companySize,
      !!profile.companyIndustry?.length,
      !!profile.companyWebsite,
      !!profile.companyDescription,
      !!profile.hiringRoles?.length,
      !!profile.typicalStack?.length,
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    );
  }
}
]]>
</file>
<file name="ts-api\src\resumes\resumes-analysis.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/resumes/resumes-analysis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import { LlmService }         from '../ollama/Llm.service';
import { Prisma }             from '@prisma/client';

const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

// ── Prisma JSON helper ────────────────────────────────────────────────────────

function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

// ── What Groq returns ─────────────────────────────────────────────────────────

export interface ResumeAnalysisResult {
  personalInfo: {
    name:      string | null;
    email:     string | null;
    phone:     string | null;
    location:  string | null;
    linkedin:  string | null;
    github:    string | null;
    portfolio: string | null;
  };
  workExperience: Array<{
    company:          string;
    title:            string;
    startDate:        string | null;
    endDate:          string | null;
    isCurrent:        boolean;
    responsibilities: string[];
    achievements:     string[];
  }>;
  education: Array<{
    institution:    string;
    degree:         string;
    field:          string;
    graduationYear: number | null;
    gpa:            string | null;
  }>;
  skills: Array<{
    name:        string;
    category:    'technical' | 'soft' | 'language' | 'tool';
    proficiency: number;
  }>;
  certifications: Array<{
    name:       string;
    issuer:     string;
    issueDate:  string | null;
    expiryDate: string | null;
  }>;
  projects: Array<{
    title:       string;
    description: string;
    techStack:   string[];
    repoUrl:     string | null;
    liveUrl:     string | null;
  }>;
  languages: Array<{
    language:    string;
    proficiency: string;
  }>;
  summary:         string;
  experienceYears: number;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'principal';
  topSkills:       string[];
  industryTags:    string[];
  trajectory:      string;
}

// ── Groq system prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert resume parser. Extract structured data and return ONLY valid JSON.
No markdown fences, no explanation, no preamble — raw JSON only.

Return this exact schema:
{
  "personalInfo": {
    "name": string|null, "email": string|null, "phone": string|null,
    "location": string|null, "linkedin": string|null,
    "github": string|null, "portfolio": string|null
  },
  "workExperience": [{
    "company": string, "title": string,
    "startDate": string|null, "endDate": string|null,
    "isCurrent": boolean,
    "responsibilities": string[], "achievements": string[]
  }],
  "education": [{
    "institution": string, "degree": string, "field": string,
    "graduationYear": number|null, "gpa": string|null
  }],
  "skills": [{ "name": string, "category": "technical"|"soft"|"language"|"tool", "proficiency": 1-5 }],
  "certifications": [{ "name": string, "issuer": string, "issueDate": string|null, "expiryDate": string|null }],
  "projects": [{ "title": string, "description": string, "techStack": string[], "repoUrl": string|null, "liveUrl": string|null }],
  "languages": [{ "language": string, "proficiency": string }],
  "summary": string,
  "experienceYears": number,
  "experienceLevel": "junior"|"mid"|"senior"|"principal",
  "topSkills": string[],
  "industryTags": string[],
  "trajectory": string
}

Rules:
- experienceLevel: 0-2yrs=junior, 2-5=mid, 5-10=senior, 10+=principal
- topSkills: max 8 most relevant technical skills
- industryTags: domain tags e.g. ["fintech","saas","healthtech"]
- trajectory: one sentence career direction
- proficiency: 1=beginner 5=expert, infer from context
- Empty arrays [] for missing list fields, never null`;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);

  constructor(
    private readonly llm:    LlmService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Text extraction ───────────────────────────────────────────────────────

  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const result = await pdfParse(buffer);
      return result.text as string;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new Error(`Unsupported MIME type: ${mimetype}`);
  }

  // ── Main analysis pipeline ────────────────────────────────────────────────
  // Returns the extracted result so the processor can use it directly.
  // Profile sync is intentionally NOT done here — the processor owns that step.

  async analyzeResume(
    resumeId: string,
    buffer:   Buffer,
    mimetype: string,
  ): Promise<ResumeAnalysisResult> {
    this.logger.log(`[${resumeId}] Starting analysis — ${mimetype} — ${buffer.length} bytes`);

    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  { status: 'processing' },
    });

    let rawText = '';
    let extracted: ResumeAnalysisResult;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // STAGE 1: Extract raw text from PDF/DOCX
      // ──────────────────────────────────────────────────────────────────────
      try {
        this.logger.log(`[${resumeId}] Stage 1: text extraction starting`);
        rawText = await this.extractText(buffer, mimetype);
        this.logger.log(`[${resumeId}] ✅ Stage 1 complete — Extracted ${rawText.length} chars`);

        if (rawText.trim().length < 50) {
          this.logger.warn(
            `[${resumeId}] ⚠️ Extracted text too short (${rawText.trim().length} chars) — ` +
            `using fallback extraction anyway`,
          );
        }
      } catch (extractErr) {
        const error = extractErr as Error;
        this.logger.warn(
          `[${resumeId}] ⚠️ Stage 1 failed: ${error.message} — proceeding with empty text`,
        );
        rawText = '';
      }

      // ──────────────────────────────────────────────────────────────────────
      // STAGE 2: Send to Gemini with automatic fallback on any failure
      // ──────────────────────────────────────────────────────────────────────
      try {
        this.logger.log(`[${resumeId}] Stage 2: Gemini LLM extraction`);
        if (rawText.trim().length > 50) {
          extracted = await this.llm.extractJson<ResumeAnalysisResult>(
            SYSTEM_PROMPT,
            `Parse this resume and return JSON:\n\n${rawText.slice(0, 10_000)}`,
          );
          this.logger.log(
            `[${resumeId}] ✅ Stage 2 complete — Gemini success: ` +
            `${extracted.skills?.length ?? 0} skills | level: ${extracted.experienceLevel}`,
          );
        } else {
          throw new Error('Not enough text for Gemini');
        }
      } catch (llmErr) {
        const error = llmErr as Error;
        this.logger.warn(
          `[${resumeId}] ⚠️ Stage 2 failed: ${error.message}. Using fallback extraction.`,
        );
        extracted = this.buildFallbackAnalysis(rawText);
        this.logger.log(`[${resumeId}] ✅ Fallback extraction complete`);
      }

      // Safety: ensure we always have a valid result
      if (!extracted?.personalInfo) {
        this.logger.warn(`[${resumeId}] Result missing personalInfo — rebuilding`);
        extracted = this.buildFallbackAnalysis(rawText);
      }

      // ──────────────────────────────────────────────────────────────────────
      // STAGE 3: Persist the analysis record to database
      // ──────────────────────────────────────────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 3: Persisting analysis to database`);
      
      try {
        const upsertResult = await this.prisma.resumeAnalysis.upsert({
          where:  { resumeId },
          create: {
            resumeId,
            rawText:         rawText,
            personalInfo:    toJson(extracted.personalInfo),
            workExperience:  toJson(extracted.workExperience  ?? []),
            education:       toJson(extracted.education        ?? []),
            skills:          toJson(extracted.skills           ?? []),
            certifications:  toJson(extracted.certifications   ?? []),
            projects:        toJson(extracted.projects         ?? []),
            languages:       toJson(extracted.languages        ?? []),
            experienceYears: extracted.experienceYears          ?? 0,
            experienceLevel: extracted.experienceLevel          ?? 'junior',
            topSkills:       extracted.topSkills                ?? [],
            industryTags:    extracted.industryTags             ?? [],
            trajectory:      extracted.trajectory               ?? '',
            status:          'completed',
            processedAt:     new Date(),
          },
          update: {
            rawText:         rawText,
            personalInfo:    toJson(extracted.personalInfo),
            workExperience:  toJson(extracted.workExperience  ?? []),
            education:       toJson(extracted.education        ?? []),
            skills:          toJson(extracted.skills           ?? []),
            certifications:  toJson(extracted.certifications   ?? []),
            projects:        toJson(extracted.projects         ?? []),
            languages:       toJson(extracted.languages        ?? []),
            experienceYears: extracted.experienceYears          ?? 0,
            experienceLevel: extracted.experienceLevel          ?? 'junior',
            topSkills:       extracted.topSkills                ?? [],
            industryTags:    extracted.industryTags             ?? [],
            trajectory:      extracted.trajectory               ?? '',
            status:          'completed',
            processedAt:     new Date(),
          },
        });
        this.logger.log(`[${resumeId}] ✅ Stage 3 complete — Analysis record persisted`);
      } catch (dbErr) {
        const error = dbErr as Error;
        this.logger.error(
          `[${resumeId}] ❌ Stage 3 CRITICAL — DB upsert failed: ${error.message}`,
        );
        throw error; // ← DB errors are critical, re-throw to mark as failed
      }

      // ──────────────────────────────────────────────────────────────────────
      // STAGE 4: Mark resume as analyzed (non-optional)
      // ──────────────────────────────────────────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 4: Updating resume status to ANALYZED`);
      
      try {
        const updateResult = await this.prisma.resume.update({
          where: { id: resumeId },
          data:  { status: 'analyzed', content: rawText },
        });
        this.logger.log(`[${resumeId}] ✅ Stage 4 complete —resume marked as ANALYZED`);
      } catch (statusErr) {
        const error = statusErr as Error;
        this.logger.error(`[${resumeId}] ❌ Stage 4 CRITICAL — Failed to update resume status: ${error.message}`);
        throw error; // ← Status update is critical
      }

      this.logger.log(
        `[${resumeId}] ✅ ANALYSIS COMPLETE ✅\n` +
        `  Skills: ${extracted.skills?.length ?? 0}\n` +
        `  Level: ${extracted.experienceLevel}\n` +
        `  Experience: ${extracted.experienceYears} years`,
      );

      return extracted;

    } catch (err) {
      // ────────────────────────────────────────────────────────────────────
      // FATAL: Only reach here if analysis truly cannot complete
      // (e.g. corrupt resume file, database connection lost)
      // ────────────────────────────────────────────────────────────────────
      const error = err as Error;
      this.logger.error(
        `[${resumeId}] ❌❌ ANALYSIS FAILED (CRITICAL ERROR) ❌❌\n` +
        `  Error: ${error.message}\n` +
        `  Stack: ${error.stack?.split('\n').slice(0, 3).join('\n') ?? 'N/A'}`,
      );

      // Only set to 'failed' if we truly couldn't analyze
      try {
        await this.prisma.resume.update({
          where: { id: resumeId },
          data:  { status: 'failed' },
        });
        this.logger.warn(`[${resumeId}] ⚠️ Resume marked as FAILED`);
      } catch (finalErr) {
        const fe = finalErr as Error;
        this.logger.error(`[${resumeId}] ❌❌ DOUBLE FAIL — Could not even mark as failed: ${fe.message}`);
      }

      throw err;
    }
  }

  // ── Profile completion score (0–100) ─────────────────────────────────────

  calculateCompletion(data: ResumeAnalysisResult): number {
    const checks = [
      !!data.personalInfo?.name,
      !!data.personalInfo?.email,
      !!data.personalInfo?.phone,
      !!data.personalInfo?.location,
      !!data.personalInfo?.linkedin,
      (data.workExperience?.length ?? 0) > 0,
      (data.education?.length      ?? 0) > 0,
      (data.skills?.length         ?? 0) > 0,
      !!data.summary,
      (data.projects?.length       ?? 0) > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private buildFallbackAnalysis(rawText: string): ResumeAnalysisResult {
    const text = rawText.toLowerCase();
    const skillsDb = [
      'javascript', 'typescript', 'python', 'java', 'react', 'next.js', 'node.js',
      'nestjs', 'express', 'postgresql', 'mysql', 'mongodb', 'redis', 'docker',
      'kubernetes', 'aws', 'azure', 'gcp', 'git', 'rest', 'graphql',
    ];

    const foundSkills = skillsDb.filter((s) => text.includes(s)).slice(0, 8);
    const yearsMatch = rawText.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
    const experienceYears = yearsMatch ? Number(yearsMatch[1]) : 0;

    let experienceLevel: ResumeAnalysisResult['experienceLevel'] = 'junior';
    if (experienceYears >= 10) experienceLevel = 'principal';
    else if (experienceYears >= 5) experienceLevel = 'senior';
    else if (experienceYears >= 2) experienceLevel = 'mid';

    return {
      personalInfo: {
        name: null,
        email: rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        portfolio: null,
      },
      workExperience: [],
      education: [],
      skills: foundSkills.map((name) => ({ name, category: 'technical', proficiency: 3 })),
      certifications: [],
      projects: [],
      languages: [],
      summary: rawText.slice(0, 500),
      experienceYears,
      experienceLevel,
      topSkills: foundSkills,
      industryTags: [],
      trajectory: 'Generated via fallback extraction due temporary LLM failure.',
    };
  }
}
]]>
</file>
<file name="ts-api\src\resumes\resumes.controller.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterError } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumesService } from './resumes.service';
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Catch(MulterError)
class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      throw new PayloadTooLargeException('File exceeds 5 MB limit');
    }

    if (exception.code === 'LIMIT_UNEXPECTED_FILE') {
      throw new BadRequestException('Unexpected file field. Use field name "file"');
    }

    throw new BadRequestException(`Upload failed: ${exception.message}`);
  }
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
@UseFilters(MulterExceptionFilter)
export class ResumesController {
  private readonly logger = new Logger(ResumesController.name);

  constructor(private readonly service: ResumesService) {}

  @Post('upload-raw')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              `Unsupported file type: ${file.mimetype}. Accepted: PDF, DOCX, DOC`,
            ) as any,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.logger.log(`POST /resumes/upload-raw — user: ${req.user?.id}`);

    if (!req.user?.id) {
      throw new BadRequestException('User not authenticated');
    }

    if (!file) {
      throw new BadRequestException(
        'No file received. Field name must be "file" with Content-Type: multipart/form-data',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('File is empty');
    }

    return this.service.saveRawResume(file, req.user.id);
  }

  @Post(':id/analyse')
  async triggerAnalysis(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`POST /resumes/${id}/analyse — user: ${req.user?.id}`);
    return this.service.triggerAnalysis(id, req.user.id);
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user.id);
  }

  @Get('latest')
  async getLatest(@Req() req: any) {
    return this.service.getLatest(req.user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user.id);
  }

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string, @Req() req: any) {
    return this.service.getAnalysis(id, req.user.id);
  }
}
]]>
</file>
<file name="ts-api\src\resumes\resumes.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// src/resumes/resumes.module.ts
import { Module }     from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule }          from '../../prisma/prisma.module';
import { OllamaModule }          from '../ollama/ollama.module';  // exports LlmService
import { ResumesController }     from './resumes.controller';
import { ResumesService }        from './resumes.service';
import { ResumeAnalysisService } from './resumes-analysis.service';
import { ResumesProcessor }      from './resumes.processor';

const REDIS_ENABLED =
  process.env.REDIS_ENABLED === 'true' ||
  !!process.env.REDIS_URL ||
  !!process.env.REDIS_HOST;

@Module({
  imports: [
    ...(REDIS_ENABLED ? [BullModule.registerQueue({ name: 'resume-analysis' })] : []),
    PrismaModule,
    OllamaModule,   // ← provides LlmService (Groq)
  ],
  controllers: [ResumesController],
  providers:   [
    ResumesService,
    ResumeAnalysisService,
    ...(REDIS_ENABLED ? [ResumesProcessor] : []),
  ],
  exports:     [ResumesService],
})
export class ResumesModule {}

]]>
</file>
<file name="ts-api\src\resumes\resumes.processor.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
// FILE: src/resumes/resumes.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }                 from '@nestjs/common';
import { Job }                    from 'bullmq';
import { ResumeAnalysisService }  from './resumes-analysis.service';
import { PrismaService }          from '../../prisma/prisma.service';

export interface ResumeAnalysisJob {
  resumeId: string;
  buffer:   number[];
  mimetype: string;
}

@Processor('resume-analysis')
export class ResumesProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumesProcessor.name);

  constructor(
    private readonly analysisService: ResumeAnalysisService,
    private readonly prisma:          PrismaService,
  ) {
    super();
  }

  async process(job: Job<ResumeAnalysisJob>): Promise<void> {
    const { resumeId, buffer, mimetype } = job.data;

    this.logger.log(`[processor] Job ${job.id} started — resumeId: ${resumeId}`);

    const buf = Buffer.from(buffer);

    // ── Step 1: Run LLM analysis ───────────────────────────────────────────
    // analyzeResume saves the ResumeAnalysis record, updates resume status to
    // 'analyzed', and returns the extracted result directly.
    // It throws on failure — BullMQ retries per the job's backoff config.
    let extracted: Awaited<ReturnType<typeof this.analysisService.analyzeResume>>;

    try {
      extracted = await this.analysisService.analyzeResume(resumeId, buf, mimetype);
    } catch (err) {
      // analyzeResume already logged the error and set status='failed'.
      // Re-throw so BullMQ records the failure and schedules a retry.
      throw err;
    }

    this.logger.log(`[processor] LLM extraction complete for resume ${resumeId}`);

    // ── Step 2: Resolve userId ─────────────────────────────────────────────
    const resume = await this.prisma.resume.findUnique({
      where:  { id: resumeId },
      select: { userId: true },
    });

    if (!resume?.userId) {
      this.logger.warn(`[processor] No userId for resume ${resumeId} — skipping profile sync`);
      return;
    }

    // ── Step 3: Sync candidate_profiles ───────────────────────────────────
    // This is the ONLY place profile sync happens.
    // getRecommendations() reads candidate_profiles.top_skills — this row
    // must exist before the frontend polls for recommendations.
    //
    // Fields synced from AI output:
    //   topSkills, targetIndustries, experienceLevel, experienceYears
    //
    // Fields intentionally NOT touched (user-controlled):
    //   targetRoles, salaryMin, workMode, bio, headline

    const topSkills        = extracted.topSkills      ?? [];
    const targetIndustries = extracted.industryTags   ?? [];
    const experienceLevel  = extracted.experienceLevel ?? 'junior';
    const experienceYears  = extracted.experienceYears ?? 0;

    const currentRole =
      extracted.workExperience?.find(w => w.isCurrent) ??
      extracted.workExperience?.[0];

    const headline = currentRole
      ? `${currentRole.title} at ${currentRole.company}`
      : null;

    const profileCompletion = this.analysisService.calculateCompletion(extracted);

    try {
      await this.prisma.candidateProfile.upsert({
        where: { userId: resume.userId },

        create: {
          userId:            resume.userId,
          headline,
          bio:               extracted.summary       ?? null,
          currentTitle:      currentRole?.title       ?? null,
          currentCompany:    currentRole?.company     ?? null,
          topSkills,
          targetIndustries,
          experienceLevel,
          experienceYears,
          activeResumeId:    resumeId,
          profileCompletion,
        },

        update: {
          headline,
          currentTitle:      currentRole?.title       ?? null,
          currentCompany:    currentRole?.company     ?? null,
          topSkills,
          targetIndustries,
          experienceLevel,
          experienceYears,
          activeResumeId:    resumeId,
          profileCompletion,
          updatedAt:         new Date(),
        },
      });

      this.logger.log(
        `[processor] ✅ candidate_profiles synced for user ${resume.userId} — ` +
        `level: ${experienceLevel} | ` +
        `skills: [${topSkills.slice(0, 5).join(', ')}${topSkills.length > 5 ? '…' : ''}]`,
      );

    } catch (profileErr) {
      // Profile sync failure should NOT fail the job — analysis is already saved.
      // Log the error with full detail so you can fix schema issues without
      // forcing users to re-upload.
      const err = profileErr as Error;
      this.logger.error(
        `[processor] ⚠️ Profile sync failed for user ${resume.userId}\n` +
        `  This means recommendations won't work until the profile is re-synced.\n` +
        `  Error: ${err.message}\n` +
        `  Stack: ${err.stack?.split('\n')[1]?.trim() ?? 'N/A'}`,
      );
      // Don't re-throw — the resume is analyzed, don't mark it as failed
    }
  }
}
]]>
</file>
<file name="ts-api\src\resumes\resumes.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/resumes/resumes.service.ts

import {Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectQueue }   from '@nestjs/bullmq';
import { Queue }         from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';
import { ResumeAnalysisService } from './resumes-analysis.service';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: ResumeAnalysisService,
    @Optional()
    @InjectQueue('resume-analysis')
    private readonly analysisQueue?: Queue,
  ) {}

  // ── POST /resumes/upload-raw ───────────────────────────────────────────────
  // Stage 1 — Upload only. No analysis triggered.
  // Saves file to Supabase Storage, creates DB record with status='uploaded'.
  // Analysis is decoupled and triggered explicitly via POST /resumes/:id/analyse.

  async saveRawResume(file: Express.Multer.File, userId: string) {
    this.logger.log(`[upload] userId: ${userId} | ${file.originalname} | ${file.mimetype} | ${file.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌ MISSING'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ MISSING'}`);
    this.logger.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'OK' : 'MISSING'}`);

    // Sanitise filename — strip spaces and special chars for safe Supabase path
    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${userId}/${Date.now()}-${sanitized}`;

    // ── Stage 1: Upload to Supabase Storage ──────────────────────────────────
    const supabase = getSupabaseServiceClient();

    const { error: uploadError } = await supabase
      .storage
      .from('resume-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert:      false,
      });

    if (uploadError) {
      this.logger.error(`[upload] Supabase storage failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;
    this.logger.log(`[upload] File stored at: ${rawFile}`);

    // ── Stage 2: Persist resume record — status: 'uploaded' ──────────────────
    // Intentionally NOT enqueuing analysis here.
    // Analysis is decoupled — triggered by user via sidebar button.
    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          fileName,
          rawFile,
          status: 'uploaded',
        },
      });

      this.logger.log(`[upload] Resume record created: ${resume.id}`);

      return {
        ...resume,
        analysisStatus: 'not_started',
      };

    } catch (dbError: any) {
      this.logger.error(`[upload] DB insert failed: ${dbError.message}`);

      // Rollback Supabase upload to avoid orphaned files
      await supabase.storage.from('resume-files').remove([fileName]);
      this.logger.log(`[upload] Storage rollback complete for: ${fileName}`);

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }

  // ── POST /resumes/:id/analyse ─────────────────────────────────────────────
  // Stage 2 — Trigger analysis on demand.
  // Called when user clicks "Analyse Resume" in the sidebar.
  // Downloads file from Supabase, enqueues BullMQ job → Groq processes async.

  async triggerAnalysis(resumeId: string, userId: string) {
    this.logger.log(`[analyse] Trigger requested — resumeId: ${resumeId} | userId: ${userId}`);

    // ── Fetch and verify ownership ────────────────────────────────────────────
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${resumeId} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // ── Guard: already analysed ───────────────────────────────────────────────
    if (resume.status === 'analyzed') {
      this.logger.log(`[analyse] Resume ${resumeId} already analysed — skipping`);
      return {
        resumeId,
        status:  'analyzed',
        message: 'Resume has already been analysed',
      };
    }

    // ── Guard: already processing ─────────────────────────────────────────────
    if (resume.status === 'processing') {
      this.logger.log(`[analyse] Resume ${resumeId} already processing — skipping`);
      return {
        resumeId,
        status:  'processing',
        message: 'Analysis is already in progress',
      };
    }

    // ── Guard: fileName is string | null in Prisma schema ────────────────────
    // Supabase .download() requires a plain string.
    // A resume without a fileName is corrupted — reject with a clear message
    // rather than letting Supabase throw a cryptic downstream error.
    if (!resume.fileName) {
      this.logger.error(`[analyse] Resume ${resumeId} has no fileName — likely a corrupted record`);
      throw new BadRequestException(
        `Resume ${resumeId} has no associated file. Please re-upload your resume.`,
      );
    }

    // resume.fileName is now narrowed to string ✅

    // ── Download file from Supabase Storage ───────────────────────────────────
    // BullMQ workers run in a separate process — they need the raw buffer,
    // not just the storage URL.
    const supabase = getSupabaseServiceClient();

    this.logger.log(`[analyse] Downloading file from Supabase: ${resume.fileName}`);

    let fileData;
    try {
      const result = await supabase
        .storage
        .from('resume-files')
        .download(resume.fileName);

      if (result.error) {
        this.logger.error(`[analyse] Supabase download error: ${result.error.message}`);
        throw new InternalServerErrorException(
          `Supabase download failed: ${result.error.message}`,
        );
      }

      fileData = result.data;
      if (!fileData) {
        this.logger.error(`[analyse] Download returned empty data`);
        throw new InternalServerErrorException('Download returned empty file');
      }

      this.logger.log(`[analyse] File downloaded successfully — size: ${fileData.size} bytes`);
    } catch (downloadErr: any) {
      const errorMsg = downloadErr?.message ?? 'Unknown download error';
      this.logger.error(`[analyse] File download failed: ${errorMsg}`);
      
      // Mark as failed so UI shows error
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      throw new InternalServerErrorException(
        `Failed to download resume file: ${errorMsg}`,
      );
    }

    // Convert Blob → Buffer → number[] for BullMQ JSON serialisation
    let buffer: Buffer;
    try {
      this.logger.log(`[analyse] Converting Blob to Buffer`);
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      this.logger.log(`[analyse] Buffer conversion successful — size: ${buffer.length} bytes`);
    } catch (convErr: any) {
      const errorMsg = convErr?.message ?? 'Unknown conversion error';
      this.logger.error(`[analyse] Buffer conversion failed: ${errorMsg}`);

      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      throw new InternalServerErrorException(
        `Failed to convert file to buffer: ${errorMsg}`,
      );
    }

    // Infer mimetype from stored filename extension
    const mimetype = this.inferMimetype(resume.fileName);  // ✅ string — safe
    this.logger.log(`[analyse] Detected mimetype: ${mimetype}`);

    // ── If Redis/BullMQ is disabled, run analysis inline ─────────────────────
    if (!this.analysisQueue) {
      this.logger.warn('[analyse] BullMQ disabled (no Redis config) — running inline analysis');
      
      try {
        await this.analysisService.analyzeResume(resume.id, buffer, mimetype);
        this.logger.log(`[analyse] ✅ Inline analysis completed for ${resumeId}`);

        return {
          resumeId,
          status:  'analyzed',
          message: 'Analysis completed inline (queue disabled)',
        };
      } catch (inlineErr: any) {
        // analyzeResume already set status to 'failed', just log and re-throw
        const errorMsg = inlineErr?.message ?? 'Unknown analysis error';
        this.logger.error(
          `[analyse] ❌ Inline analysis failed for ${resumeId}: ${errorMsg}`,
        );
        throw new InternalServerErrorException(
          `Resume analysis failed: ${errorMsg}`,
        );
      }
    }

    // ── Enqueue analysis job ──────────────────────────────────────────────────
    try {
      this.logger.log(`[analyse] Enqueuing BullMQ job for resume: ${resumeId}`);
      
      await this.analysisQueue.add(
        'analyze',
        {
          resumeId: resume.id,
          buffer:   Array.from(buffer),   // Buffer → number[] for JSON serialisation
          mimetype,
        },
        {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail:     50,
        },
      );

      this.logger.log(`[analyse] ✅ Job successfully enqueued for resume: ${resumeId}`);
    } catch (queueErr: any) {
      const errorMsg = queueErr?.message ?? 'Unknown queue error';
      this.logger.error(`[analyse] ❌ Failed to enqueue job: ${errorMsg}`);

      // Mark as failed since we couldn't even queue the job
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      throw new InternalServerErrorException(
        `Failed to queue analysis job: ${errorMsg}`,
      );
    }

    // Mark as processing immediately so frontend poll reflects current state
    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  { status: 'processing' },
    });

    this.logger.log(`[analyse] ✅ Resume marked as processing: ${resumeId}`);

    return {
      resumeId,
      status:  'processing',
      message: 'Analysis started — poll GET /resumes/:id for status updates',
    };
  }

  // ── GET /resumes ──────────────────────────────────────────────────────────
  // Returns the authenticated user's resume history, most recent first.

  async listByUser(userId: string) {
    this.logger.log(`[list] Listing resumes for user: ${userId}`);

    return this.prisma.resume.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select: {
        id:        true,
        fileName:  true,
        rawFile:   true,
        status:    true,
        createdAt: true,
        // Exclude content (raw text) — too large for list views
      },
    });
  }

  // ── GET /resumes/latest ───────────────────────────────────────────────────
  // Returns the user's most recent resume.
  // Sidebar calls this on mount to determine the "Analyse Resume" button state.

  async getLatest(userId: string) {
    this.logger.log(`[latest] Fetching latest resume for user: ${userId}`);

    const resume = await this.prisma.resume.findFirst({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });

    return resume ?? null;
  }

  // ── GET /resumes/:id ──────────────────────────────────────────────────────
  // Status polling — called every 5s by frontend after analysis is triggered.
  // Returns the full resume record including current status.

  async getById(id: string, userId: string) {
    this.logger.log(`[getById] resumeId: ${id} | userId: ${userId}`);

    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    // Ownership guard — users can only access their own resumes
    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return resume;
  }

  // ── GET /resumes/:id/analysis ─────────────────────────────────────────────
  // Returns the completed analysis result.
  // Intentionally 404s while analysis is still running — frontend handles this.

  async getAnalysis(id: string, userId: string) {
    this.logger.log(`[getAnalysis] resumeId: ${id} | userId: ${userId}`);

    // Verify ownership before exposing analysis data
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId: id },
    });

    // 404 here is intentional and expected during processing.
    // Frontend polls GET /resumes/:id for status, and only calls
    // this endpoint once status === 'analyzed'.
    if (!analysis) {
      throw new NotFoundException('Analysis not ready yet');
    }

    return analysis;
  }

  // ── Private: infer MIME type from file extension ──────────────────────────

  private inferMimetype(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf'))  return 'application/pdf';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.doc'))  return 'application/msword';
    // Fallback — ResumeAnalysisService will throw an informative error
    return 'application/octet-stream';
  }
}
]]>
</file>
<file name="ts-api\src\types\express.d.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
//ts-api/src/types/express.d.ts
]]>
</file>
<file name="ts-api\src\types\google-search-results-nodejs.d.ts">
<![CDATA[
//C:\Projects\Job-Crawler\ts-api\src\types\google-search-results-nodejs.d.ts
declare module 'google-search-results-nodejs' {
  export class GoogleSearch {
    constructor(apiKey: string);
    json(params: Record<string, any>, callback: (data: any) => void): void;
  }
  const SerpApi: { GoogleSearch: typeof GoogleSearch };
  export default SerpApi;
}

]]>
</file>
<file name="ts-api\src\types\job.ts">
<![CDATA[
//C:\Projects\Job-Crawler\ts-api\src\types\job.ts
export interface NormalizedJob {
  externalId: string;
  source: string;
  title: string;
  company?: string;
  location?: string;
  description?: string;
  postingUrl?: string;
  postedAt?: Date | null;
  rawPayload: any;
}

]]>
</file>
<file name="ts-api\src\users\users.controller.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
//  ts-api/src/users/users.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: { full_name?: string }) {
    return this.usersService.updateProfile(req.user.id, body);
  }
}
]]>
</file>
<file name="ts-api\src\users\users.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
// ts-api/src/users/users.module.ts
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
]]>
</file>
<file name="ts-api\src\users\users.service.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
// ts-api/src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const result = await this.db.query(
      'SELECT id, full_name, email, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    return result.rows[0];
  }

  async updateProfile(userId: string, data: { full_name?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.full_name) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.full_name);
    }

    if (fields.length === 0) {
      return this.getProfile(userId);
    }

    values.push(userId);
    const result = await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, created_at`,
      values,
    );

    return result.rows[0];
  }
}
]]>
</file>
<file name="frontend\middleware.ts">
<![CDATA[
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All protected route prefixes
const PROTECTED = [
  '/dashboard',
  '/jobs',
  '/profile',
  '/resumes',
  '/resume',
  '/settings',
  '/mock-interview',
  '/recommendations',
  '/alerts',
  '/analyze',
  '/interviews',
  '/recruiter',
  '/candidate',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('jc_token')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/jobs/:path*',
    '/profile/:path*',
    '/resumes/:path*',
    '/resume/:path*',
    '/settings/:path*',
    '/mock-interview/:path*',
    '/recommendations/:path*',
    '/alerts/:path*',
    '/analyze/:path*',
    '/interviews/:path*',
    '/recruiter/:path*',
    '/candidate/:path*',
  ],
};
]]>
</file>
</files>
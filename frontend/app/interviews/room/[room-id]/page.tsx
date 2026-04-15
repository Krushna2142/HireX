'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

/**
 * Interview Room (Google Meet-like basic UI)
 * - Local preview + mic/cam toggles
 * - Optional Jitsi embed join mode
 * - Device checks and graceful error handling
 *
 * ENV (optional):
 * NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
 * NEXT_PUBLIC_USE_JITSI=true
 */

type DeviceState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export default function InterviewRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId ?? 'room';

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [deviceState, setDeviceState] = useState<DeviceState>('idle');
  const [errorText, setErrorText] = useState<string>('');
  const [joined, setJoined] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);

  const [elapsedSec, setElapsedSec] = useState(0);

  const useJitsi = (process.env.NEXT_PUBLIC_USE_JITSI ?? 'false') === 'true';
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const jitsiSrc = useMemo(
    () =>
      `https://${jitsiDomain}/${encodeURIComponent(roomId)}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`,
    [jitsiDomain, roomId],
  );

  useEffect(() => {
    if (!joined) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [joined]);

  useEffect(() => {
    return () => {
      stopLocalTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => String(n).padStart(2, '0');
  const elapsedLabel = `${fmt(Math.floor(elapsedSec / 3600))}:${fmt(
    Math.floor((elapsedSec % 3600) / 60),
  )}:${fmt(elapsedSec % 60)}`;

  async function initLocalPreview() {
    try {
      setDeviceState('requesting');
      setErrorText('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCameraOn(stream.getVideoTracks().some((t) => t.enabled));
      setMicOn(stream.getAudioTracks().some((t) => t.enabled));
      setDeviceState('granted');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setDeviceState('denied');
        setErrorText('Camera/Microphone access denied. Please allow permissions and retry.');
      } else {
        setDeviceState('error');
        setErrorText(err?.message || 'Failed to access camera/microphone.');
      }
    }
  }

  function stopLocalTracks() {
    const s = localStreamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }

  function toggleCamera() {
    const s = localStreamRef.current;
    if (!s) return;
    const tracks = s.getVideoTracks();
    tracks.forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
  }

  function toggleMic() {
    const s = localStreamRef.current;
    if (!s) return;
    const tracks = s.getAudioTracks();
    tracks.forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  }

  function toggleSpeaker() {
    // browser-level output control is limited; this controls local element mute
    setSpeakerOn((v) => !v);
  }

  async function handleJoin() {
    if (!localStreamRef.current) {
      await initLocalPreview();
    }
    if (deviceState === 'denied' || deviceState === 'error') return;
    setJoined(true);
  }

  function handleLeave() {
    setJoined(false);
    setElapsedSec(0);
    stopLocalTracks();
    setDeviceState('idle');
  }

  return (
    <main style={styles.root}>
      <style>{`
        @keyframes pulseDot {
          0%,100% { opacity: 1; }
          50% { opacity: .35; }
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Interview Room</h1>
          <p style={styles.subtitle}>Room ID: <code>{roomId}</code></p>
        </div>

        <div style={styles.topRight}>
          {joined && (
            <div style={styles.liveBadge}>
              <span style={styles.liveDot} />
              Live · {elapsedLabel}
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <section style={styles.body}>
        {!joined ? (
          <div style={styles.preJoinCard}>
            <div style={styles.previewWrap}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={styles.previewVideo}
              />
              {deviceState !== 'granted' && (
                <div style={styles.previewOverlay}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🎥</div>
                    <div style={{ fontWeight: 600 }}>Camera preview not started</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                      Click “Check Camera & Mic”
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.preJoinActions}>
              <button onClick={initLocalPreview} style={styles.btnSecondary}>
                {deviceState === 'requesting' ? 'Checking…' : 'Check Camera & Mic'}
              </button>
              <button onClick={handleJoin} style={styles.btnPrimary}>
                Join Interview
              </button>
            </div>

            {errorText ? <p style={styles.error}>{errorText}</p> : null}
            <p style={styles.note}>
              Tip: Use headphones for better audio quality.
            </p>
          </div>
        ) : (
          <div style={styles.meetLayout}>
            {/* Main stage */}
            <div style={styles.mainStage}>
              {useJitsi ? (
                <iframe
                  title="Interview conference"
                  src={jitsiSrc}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  style={styles.jitsiFrame}
                />
              ) : (
                <div style={styles.placeholderStage}>
                  <div style={{ fontSize: 42, marginBottom: 8 }}>🧑‍💻</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>Connected to Interview Session</div>
                  <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
                    WebRTC signaling can be integrated here (Socket/Nest Gateway).
                  </div>
                </div>
              )}
            </div>

            {/* Side panel */}
            <aside style={styles.sidePanel}>
              <div style={styles.tile}>
                <div style={styles.tileHeader}>Your Preview</div>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted={!speakerOn}
                  style={styles.localVideoSmall}
                />
              </div>

              <div style={styles.tile}>
                <div style={styles.tileHeader}>Interview Checklist</div>
                <ul style={styles.list}>
                  <li>Resume ready</li>
                  <li>Stable internet</li>
                  <li>Quiet environment</li>
                  <li>Company/job details reviewed</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* Footer controls */}
      <footer style={styles.footer}>
        <button onClick={toggleMic} style={micOn ? styles.ctrlBtn : styles.ctrlBtnOff}>
          {micOn ? '🎙 Mic On' : '🔇 Mic Off'}
        </button>
        <button onClick={toggleCamera} style={cameraOn ? styles.ctrlBtn : styles.ctrlBtnOff}>
          {cameraOn ? '📷 Cam On' : '🚫 Cam Off'}
        </button>
        <button onClick={toggleSpeaker} style={speakerOn ? styles.ctrlBtn : styles.ctrlBtnOff}>
          {speakerOn ? '🔊 Speaker On' : '🔈 Speaker Off'}
        </button>
        <button onClick={handleLeave} style={styles.leaveBtn}>
          Leave
        </button>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#0B1020',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
    gap: 12,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    margin: '4px 0 0',
    opacity: 0.75,
    fontSize: 12,
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    color: '#FCA5A5',
    border: '1px solid rgba(248,113,113,.35)',
    background: 'rgba(248,113,113,.12)',
    padding: '6px 10px',
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#F87171',
    animation: 'pulseDot 1.2s ease infinite',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
  },
  preJoinCard: {
    margin: 'auto',
    width: 'min(820px, 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    padding: 14,
  },
  previewWrap: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#05070f',
    minHeight: 360,
  },
  previewVideo: {
    width: '100%',
    height: 420,
    objectFit: 'cover',
    background: '#05070f',
  },
  previewOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.4))',
  },
  preJoinActions: {
    marginTop: 12,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    border: 'none',
    background: '#22C55E',
    color: '#001006',
    fontWeight: 800,
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  btnSecondary: {
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.04)',
    color: 'white',
    fontWeight: 600,
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  error: {
    marginTop: 10,
    color: '#FCA5A5',
    fontSize: 13,
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.75,
  },
  meetLayout: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 12,
  },
  mainStage: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#05070f',
    minHeight: 520,
  },
  jitsiFrame: {
    width: '100%',
    height: '100%',
    minHeight: 520,
    border: 'none',
  },
  placeholderStage: {
    height: '100%',
    minHeight: 520,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 20,
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  tile: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    padding: 10,
  },
  tileHeader: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.8,
    marginBottom: 8,
  },
  localVideoSmall: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderRadius: 8,
    background: '#05070f',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: 'grid',
    gap: 6,
    fontSize: 13,
    opacity: 0.9,
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    padding: 10,
  },
  ctrlBtn: {
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    borderRadius: 999,
    padding: '8px 12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  ctrlBtnOff: {
    border: '1px solid rgba(248,113,113,.35)',
    background: 'rgba(248,113,113,.12)',
    color: '#FCA5A5',
    borderRadius: 999,
    padding: '8px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  leaveBtn: {
    border: 'none',
    background: '#EF4444',
    color: 'white',
    borderRadius: 999,
    padding: '8px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
};
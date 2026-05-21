'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

type VideoTileProps = {
  stream: MediaStream | null;
  name: string;
  label?: string;
  muted?: boolean;
  mirror?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
  compact?: boolean;
};

function initials(name: string) {
  const clean = name.trim();
  if (!clean) return 'HX';

  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'HX';
}

function hasEnabledVideo(stream: MediaStream | null, camOn?: boolean) {
  if (camOn === false) return false;

  return Boolean(
    stream
      ?.getVideoTracks()
      .some((track) => track.readyState === 'live' && track.enabled),
  );
}

export default function VideoTile({
  stream,
  name,
  label,
  muted = false,
  mirror = false,
  micOn = true,
  camOn = true,
  isLocal = false,
  isSpeaking = false,
  compact = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoAvailable = hasEnabledVideo(stream, camOn);

  const audioTrackCount = useMemo(() => {
    return stream?.getAudioTracks().length ?? 0;
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    const play = async () => {
      try {
        await video.play();
      } catch {
        // Mobile browsers may block autoplay until user interaction.
      }
    };

    void play();

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: compact ? 150 : 240,
        borderRadius: 24,
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 30% 20%, rgba(56,189,248,0.14), transparent 34%), linear-gradient(135deg, #111827, #020617)',
        border: isSpeaking
          ? '2px solid rgba(52,211,153,0.9)'
          : '1px solid rgba(255,255,255,0.10)',
        boxShadow: isSpeaking
          ? '0 0 0 4px rgba(52,211,153,0.12), 0 24px 70px rgba(0,0,0,0.35)'
          : '0 24px 70px rgba(0,0,0,0.32)',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{
          width: '100%',
          height: '100%',
          minHeight: compact ? 150 : 240,
          objectFit: 'cover',
          display: videoAvailable ? 'block' : 'none',
          transform: mirror ? 'scaleX(-1)' : undefined,
          background: '#020617',
        }}
      />

      {!videoAvailable && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background:
              'radial-gradient(circle at center, rgba(167,139,250,0.22), transparent 38%), #070B14',
          }}
        >
          <div
            style={{
              width: compact ? 72 : 104,
              height: compact ? 72 : 104,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #38BDF8, #A78BFA, #F472B6)',
              color: '#020617',
              fontSize: compact ? 24 : 36,
              fontWeight: 950,
              boxShadow: '0 18px 50px rgba(167,139,250,0.35)',
            }}
          >
            {initials(name)}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          gap: 8,
        }}
      >
        <span style={iconBadgeStyle}>
          {micOn && audioTrackCount > 0 ? <Mic size={15} /> : <MicOff size={15} />}
        </span>

        <span style={iconBadgeStyle}>
          {videoAvailable ? <Video size={15} /> : <VideoOff size={15} />}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 14,
            background: 'rgba(2,6,23,0.72)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            color: '#F8FAFC',
            maxWidth: '78%',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 900,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name} {isLocal ? '(You)' : ''}
          </p>

          {label && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 10,
                color: 'rgba(226,232,240,0.58)',
              }}
            >
              {label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const iconBadgeStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(2,6,23,0.72)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#F8FAFC',
  backdropFilter: 'blur(12px)',
};
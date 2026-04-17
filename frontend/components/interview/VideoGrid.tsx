"use client";
import React from 'react';

export default function VideoGrid({ localStream, remoteStreams }: { localStream: MediaStream | null; remoteStreams: Array<{ userId: string; stream: MediaStream }>; }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {remoteStreams.map((r) => (
        <div key={r.userId} style={{ background: '#000', color: '#fff', position: 'relative' }}>
          <VideoPlayer stream={r.stream} label={r.userId} />
        </div>
      ))}
      <div style={{ position: 'relative' }}>
        <VideoPlayer stream={localStream} label={'You'} muted />
      </div>
    </div>
  );
}

function VideoPlayer({ stream, label, muted }: { stream: MediaStream | null; label?: string; muted?: boolean }) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    if (stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div style={{ width: '100%', height: 240 }}>
      <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', bottom: 6, left: 6, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>{label}</div>
    </div>
  );
}

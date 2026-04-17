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
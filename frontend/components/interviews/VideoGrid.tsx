'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { type CSSProperties } from 'react';
import VideoTile from './VideoTile';

export type InterviewGridParticipant = {
  id?: string;
  userId?: string;
  name?: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  stream?: MediaStream | null;
  localStream?: MediaStream | null;
  micOn?: boolean;
  camOn?: boolean;
  muted?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
};

type VideoGridProps = {
  participants?: InterviewGridParticipant[];
  localStream?: MediaStream | null;
  remoteStreams?: Array<MediaStream | null>;
  peers?: InterviewGridParticipant[];
  localName?: string;
  localLabel?: string;
  localMicOn?: boolean;
  localCamOn?: boolean;
  className?: string;
  style?: CSSProperties;
};

function safeString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function getParticipantKey(participant: InterviewGridParticipant, index: number) {
  return (
    participant.id ??
    participant.userId ??
    participant.email ??
    `${participant.name ?? 'participant'}-${index}`
  );
}

function getParticipantName(participant: InterviewGridParticipant, index: number) {
  return safeString(
    participant.name ??
      participant.full_name ??
      participant.fullName ??
      participant.email,
    `Participant ${index + 1}`,
  );
}

export function VideoGrid({
  participants,
  localStream,
  remoteStreams,
  peers,
  localName = 'You',
  localLabel = 'Local participant',
  localMicOn = true,
  localCamOn = true,
  className,
  style,
}: VideoGridProps) {
  const normalizedParticipants: InterviewGridParticipant[] = React.useMemo(() => {
    if (Array.isArray(participants) && participants.length > 0) {
      return participants;
    }

    const rows: InterviewGridParticipant[] = [];

    if (localStream) {
      rows.push({
        id: 'local',
        name: localName,
        role: localLabel,
        stream: localStream,
        isLocal: true,
        muted: true,
        micOn: localMicOn,
        camOn: localCamOn,
      });
    }

    if (Array.isArray(peers) && peers.length > 0) {
      rows.push(...peers);
    }

    if (Array.isArray(remoteStreams) && remoteStreams.length > 0) {
      rows.push(
        ...remoteStreams.map((stream, index) => ({
          id: `remote-${index}`,
          name: `Remote ${index + 1}`,
          role: 'participant',
          stream,
          isLocal: false,
          muted: false,
          micOn: true,
          camOn: true,
        })),
      );
    }

    return rows;
  }, [
    participants,
    localStream,
    localName,
    localLabel,
    localMicOn,
    localCamOn,
    peers,
    remoteStreams,
  ]);

  if (!normalizedParticipants.length) {
    return (
      <div className={className} style={{ ...emptyGridStyle, ...style }}>
        <div style={emptyCardStyle}>
          <strong>No participants yet</strong>
          <span>Join the room to start the interview session.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...gridStyle,
        gridTemplateColumns:
          normalizedParticipants.length <= 1
            ? 'minmax(0, 1fr)'
            : 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        ...style,
      }}
    >
      {normalizedParticipants.map((participant, index) => {
        const stream =
          participant.stream ??
          participant.localStream ??
          null;

        const isLocal = Boolean(participant.isLocal);

        return (
          <VideoTile
            key={getParticipantKey(participant, index)}
            stream={stream}
            name={getParticipantName(participant, index)}
            label={safeString(participant.role, isLocal ? 'Local participant' : 'Remote participant')}
            muted={participant.muted ?? isLocal}
            mirror={isLocal}
            isLocal={isLocal}
            micOn={participant.micOn !== false}
            camOn={participant.camOn !== false}
            isSpeaking={participant.isSpeaking === true}
          />
        );
      })}
    </div>
  );
}

const gridStyle: CSSProperties = {
  width: '100%',
  minHeight: 0,
  display: 'grid',
  gap: 14,
  alignItems: 'stretch',
};

const emptyGridStyle: CSSProperties = {
  width: '100%',
  minHeight: 260,
  display: 'grid',
  placeItems: 'center',
};

const emptyCardStyle: CSSProperties = {
  width: 'min(420px, 100%)',
  border: '1px solid rgba(255,255,255,0.10)',
  background:
    'radial-gradient(circle at 30% 20%, rgba(56,189,248,0.14), transparent 34%), rgba(15,23,42,0.92)',
  borderRadius: 24,
  padding: 24,
  display: 'grid',
  gap: 8,
  textAlign: 'center',
  color: '#F8FAFC',
};

export default VideoGrid;
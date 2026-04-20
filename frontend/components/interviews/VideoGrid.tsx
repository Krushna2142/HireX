// frontend/components/interview/VideoGrid.tsx
'use client';

import React from 'react';
import { VideoTile } from './VideoTile';

interface Participant {
  id: string;
  userId: string;
  displayName: string;
  isActive: boolean;
  videoStream: MediaStream | null;
}

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  participants: Participant[];
  activeSpeaker: string | null;
  remoteVideoRefsMap: Record<string, HTMLVideoElement | null>;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localVideoRef,
  participants,
  activeSpeaker,
  remoteVideoRefsMap,
}) => {
  const totalVideos = participants.length + 1;

  return (
    <div
      className="grid gap-2 h-full w-full"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
      }}
    >
      {/* Local Video */}
      <VideoTile
        videoRef={localVideoRef}
        isLocal={true}
        isActive={activeSpeaker === 'local'}
        displayName="You"
        participantCount={totalVideos}
      />

      {/* Remote Videos */}
      {participants.map((participant) => {
        const videoElement = remoteVideoRefsMap[participant.id];
        
        return (
          <VideoTile
            key={participant.id}
            videoElement={videoElement}
            isLocal={false}
            isActive={activeSpeaker === participant.id}
            displayName={participant.displayName}
            participantCount={totalVideos}
          />
        );
      })}
    </div>
  );
};
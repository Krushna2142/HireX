// frontend/components/interview/VideoTile.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Mic, Video } from 'lucide-react';

interface VideoTileProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
  videoElement?: HTMLVideoElement | null;
  isLocal: boolean;
  isActive: boolean;
  displayName: string;
  participantCount: number;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  videoRef,
  videoElement,
  isLocal,
  isActive,
  displayName,
  participantCount,
}) => {
  const internalRef = useRef<HTMLVideoElement>(null);
  const isSingleParticipant = participantCount === 1;

  // For remote videos, use the passed videoElement
  useEffect(() => {
    if (!isLocal && videoElement && internalRef.current) {
      internalRef.current.srcObject = videoElement.srcObject;
    }
  }, [videoElement, isLocal]);

  return (
    <div
      className={`relative bg-gray-800 rounded-lg overflow-hidden ${
        isActive ? 'ring-2 ring-emerald-500' : ''
      } ${isSingleParticipant ? 'col-span-full h-full' : ''}`}
    >
      <video
        ref={isLocal ? videoRef : internalRef}
        autoPlay
        muted={isLocal}
        playsInline
        className={`w-full h-full object-cover ${isLocal ? 'scaleX-[-1]' : ''}`}
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <p className="text-sm font-medium text-white">{displayName}</p>
        {isLocal && <span className="text-xs text-emerald-400">(You)</span>}
      </div>

      <div className="absolute top-3 right-3 flex gap-2">
        <div className="bg-gray-900/70 p-2 rounded-full">
          <Mic className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="bg-gray-900/70 p-2 rounded-full">
          <Video className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
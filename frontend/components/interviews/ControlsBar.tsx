// frontend/components/interview/ControlsBar.tsx
'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Phone,
  MessageCircle,
} from 'lucide-react';

interface ControlsBarProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  onScreenShare: () => void;
  onLeaveCall: () => void;
  onChatToggle: () => void;
  messageCount: number;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onMicToggle,
  onCameraToggle,
  onScreenShare,
  onLeaveCall,
  onChatToggle,
  messageCount,
}) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur border-t border-gray-700 p-4">
      <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
        <button
          onClick={onMicToggle}
          className={`p-3 rounded-full transition-all ${
            isMicOn
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          }`}
          title={isMicOn ? 'Mute' : 'Unmute'}
        >
          {isMicOn ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onCameraToggle}
          className={`p-3 rounded-full transition-all ${
            isCameraOn
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          }`}
          title={isCameraOn ? 'Stop video' : 'Start video'}
        >
          {isCameraOn ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onScreenShare}
          className={`p-3 rounded-full transition-all ${
            isScreenSharing
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title="Share screen"
        >
          <Monitor className="w-5 h-5" />
        </button>

        <button
          onClick={onChatToggle}
          className="relative p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all"
          title="Chat"
        >
          <MessageCircle className="w-5 h-5" />
          {messageCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full w-5 h-5 flex items-center justify-center">
              {messageCount > 9 ? '9+' : messageCount}
            </span>
          )}
        </button>

        <button
          onClick={onLeaveCall}
          className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all ml-auto"
          title="Leave call"
        >
          <Phone className="w-5 h-5 rotate-225" />
        </button>
      </div>
    </div>
  );
};
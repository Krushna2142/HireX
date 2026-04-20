// frontend/components/interview/InterviewHeader.tsx
'use client';

import React from 'react';
import { Copy, Users } from 'lucide-react';

interface InterviewHeaderProps {
  roomId: string;
  participantCount: number;
  onCopyUrl: () => void;
}

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  roomId,
  participantCount,
  onCopyUrl,
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Interview Room</h1>
          <p className="text-sm text-gray-400">ID: {roomId.slice(0, 8)}...</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-5 h-5" />
            <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
          </div>

          <button
            onClick={onCopyUrl}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-sm"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
};
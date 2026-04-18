'use client';

import React, { useState } from 'react';

export const RecordingIndicator: React.FC<{
  isRecording: boolean;
  duration: number; // in seconds
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}> = ({ isRecording, duration, onStartRecording, onStopRecording }) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
      {isRecording && (
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
      <span className="text-sm font-mono text-slate-300">
        {minutes.toString().padStart(2, '0')}:
        {seconds.toString().padStart(2, '0')}
      </span>

      {isRecording ? (
        <button
          onClick={onStopRecording}
          className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={onStartRecording}
          className="ml-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
        >
          Record
        </button>
      )}
    </div>
  );
};
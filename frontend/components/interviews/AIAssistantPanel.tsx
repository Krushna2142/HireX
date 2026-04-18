'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface AISuggestion {
  id: string;
  type: 'question' | 'insight' | 'warning';
  text: string;
  timestamp: Date;
  confidence: number;
}

export const AIAssistantPanel: React.FC<{
  roomId: string;
  isRecruiter: boolean;
}> = ({ roomId, isRecruiter }) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !isRecruiter) return;

    socket.on('ai:suggestion', (suggestion: AISuggestion) => {
      setSuggestions((prev) => [suggestion, ...prev].slice(0, 10));
    });

    return () => {
      socket.off('ai:suggestion');
    };
  }, [socket, isRecruiter]);

  if (!isRecruiter) return null;

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 p-4 flex flex-col gap-4 max-h-[600px] overflow-y-auto">
      <h3 className="text-sm font-semibold text-slate-300">🧠 AI Assistant</h3>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 rounded text-xs ${
              suggestion.type === 'question'
                ? 'bg-blue-900/20 border border-blue-700'
                : suggestion.type === 'warning'
                  ? 'bg-red-900/20 border border-red-700'
                  : 'bg-green-900/20 border border-green-700'
            }`}
          >
            <p className="text-slate-200">{suggestion.text}</p>
            <p className="text-slate-500 mt-1">
              {suggestion.confidence * 100}% confidence
            </p>
          </div>
        ))}
      </div>

      {suggestions.length === 0 && (
        <p className="text-xs text-slate-500">Waiting for AI suggestions...</p>
      )}
    </div>
  );
};
'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

export const useAIAssist = (roomId: string, enabled: boolean = true) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !enabled) return;

    socket.on('ai:suggestion', (suggestion) => {
      setSuggestions((prev) => [suggestion, ...prev].slice(0, 10));
    });

    socket.on('ai:loading', () => setIsLoading(true));
    socket.on('ai:loaded', () => setIsLoading(false));

    return () => {
      socket.off('ai:suggestion');
      socket.off('ai:loading');
      socket.off('ai:loaded');
    };
  }, [socket, enabled]);

  const requestSuggestion = (context: any) => {
    socket?.emit('ai:request_suggestion', { roomId, context });
  };

  return { suggestions, isLoading, requestSuggestion };
};
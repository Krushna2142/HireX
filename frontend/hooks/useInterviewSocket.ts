// frontend/hooks/useInterviewSocket.ts
'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

export const useInterviewSocket = (roomId: string) => {
  const { socket, isConnected } = useSocket();
  const [roomConnected, setRoomConnected] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    socket.emit('join_room', { roomId });

    socket.on('room:joined', () => {
      console.log('✅ Joined room:', roomId);
      setRoomConnected(true);
    });

    socket.on('room:error', (data: any) => {
      console.error('❌ Room error:', data.message);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:error');
    };
  }, [socket, isConnected, roomId]);

  return { socket, isConnected: roomConnected };
};
'use client';

import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

/**
 * Get or create global socket instance
 */
const getGlobalSocket = (): Socket => {
  if (globalSocket && globalSocket.connected) {
    return globalSocket;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  globalSocket = io(apiUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
    auth: {
      token: typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token')
        : undefined,
    },
  });

  globalSocket.on('connect', () => {
    console.log('✅ Socket connected:', globalSocket?.id);
  });

  globalSocket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  globalSocket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
  });

  return globalSocket;
};

/**
 * Main Socket Hook
 */
export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    try {
      // Initialize socket on mount
      const sock = getGlobalSocket();
      socketRef.current = sock;
      setSocket(sock);
      setIsConnected(sock.connected);

      // Listen for connection changes
      const handleConnect = () => {
        setIsConnected(true);
        console.log('🟢 Socket connected');
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        console.log('🔴 Socket disconnected');
      };

      sock.on('connect', handleConnect);
      sock.on('disconnect', handleDisconnect);

      return () => {
        sock.off('connect', handleConnect);
        sock.off('disconnect', handleDisconnect);
      };
    } catch (error) {
      console.error('❌ Socket initialization error:', error);
    }
  }, []);

  return { socket, isConnected };
};

/**
 * Socket Emit Hook
 */
export const useSocketEmit = () => {
  const { socket } = useSocket();

  const emit = (event: string, data?: any, callback?: (response: any) => void) => {
    if (!socket?.connected) {
      console.warn('⚠️ Socket not connected. Event not sent:', event);
      return;
    }
    socket.emit(event, data, callback);
  };

  return { emit };
};

/**
 * Socket Listen Hook
 */
export const useSocketListen = (
  event: string,
  callback: (data: any) => void,
  dependencies?: any[]
) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback, ...(dependencies || [])]);
};

/**
 * Join Room Hook
 */
export const useSocketRoom = (roomId: string) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('join_room', { roomId });

    return () => {
      socket.emit('leave_room', { roomId });
    };
  }, [socket, roomId]);
};
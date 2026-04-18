'use client';

import React, { ReactNode, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

/**
 * Socket Provider - Initializes socket globally
 */
export const SocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (isConnected) {
      console.log('✅ Socket initialized and connected');
    }
  }, [isConnected]);

  return <>{children}</>;
};
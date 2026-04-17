/**
 * Reconnection Hook
 * File: frontend/hooks/useReconnection.ts
 *
 * Purpose: Handle automatic reconnection with exponential backoff
 *
 * Features:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
 * - Max retry attempts (default 10)
 * - Jitter to prevent thundering herd
 * - Manual reset capability
 */

'use client';

import { useCallback, useRef, useState } from 'react';

export interface ReconnectionState {
  isReconnecting: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryIn: number; // ms
  lastError: string | null;
}

const DEFAULT_MAX_RETRIES = 10;
const BASE_DELAY = 1000; // 1s
const MAX_DELAY = 30000; // 30s

function getBackoffDelay(attempt: number): number {
  const delay = BASE_DELAY * Math.pow(2, Math.min(attempt, 4)); // Cap exponent at 4
  const jitter = Math.random() * delay * 0.1; // 10% jitter
  return Math.min(delay + jitter, MAX_DELAY);
}

export function useReconnection(
  onReconnect: () => Promise<void>,
  maxRetries = DEFAULT_MAX_RETRIES,
) {
  const [state, setState] = useState<ReconnectionState>({
    isReconnecting: false,
    retryCount: 0,
    maxRetries,
    nextRetryIn: 0,
    lastError: null,
  });

  // ✅ FIXED: Use NodeJS.Timeout instead of string | number | Timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setState((s) => ({
      ...s,
      isReconnecting: false,
      retryCount: 0,
      nextRetryIn: 0,
      lastError: null,
    }));
  }, []);

  const attempt = useCallback(async () => {
    setState((s) => ({ ...s, isReconnecting: true, lastError: null }));

    try {
      await onReconnect();
      reset();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Reconnection failed';
      const newRetryCount = state.retryCount + 1;

      if (newRetryCount >= maxRetries) {
        setState((s) => ({
          ...s,
          isReconnecting: false,
          lastError: `Max retries (${maxRetries}) exceeded`,
        }));
        return false;
      }

      const delay = getBackoffDelay(newRetryCount);
      let countdown = delay;

      setState((s) => ({
        ...s,
        retryCount: newRetryCount,
        nextRetryIn: countdown,
        lastError: error,
      }));

      // Update countdown every 100ms
      countdownRef.current = setInterval(() => {
        countdown -= 100;
        setState((s) => ({ ...s, nextRetryIn: Math.max(0, countdown) }));
      }, 100);

      // Schedule next attempt
      timeoutRef.current = setTimeout(() => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        void attempt();
      }, delay);

      return false;
    }
  }, [state.retryCount, maxRetries, onReconnect, reset]);

  return {
    ...state,
    attempt,
    reset,
  };
}
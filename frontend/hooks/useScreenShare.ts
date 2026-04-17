/**
 * Screen Share Hook
 * File: frontend/hooks/useScreenShare.ts
 * 
 * Purpose: Handle screen sharing with automatic track replacement
 * 
 * Features:
 * - Get screen stream from browser
 * - Replace video track in RTCPeerConnection
 * - Restore camera when screen share stops
 * - Handle browser "Stop sharing" button
 */

import { useCallback, useRef, useState } from 'react';

export interface ScreenShareState {
  screenSharing: boolean;
  loading: boolean;
  error: string | null;
}

export function useScreenShare(
  onTrackReplaced?: (track: MediaStreamTrack | null) => Promise<void>,
) {
  const [state, setState] = useState<ScreenShareState>({
    screenSharing: false,
    loading: false,
    error: null,
  });

  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  const startScreenShare = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 15, max: 30 },
          cursor: 'always',
        } as any,
        audio: {
          echoCancellation: false,
          suppressLocalAudioPlayback: false,
        } as any,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      } as any);

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        throw new Error('Failed to get screen video track');
      }

      // Notify parent component to replace track
      if (onTrackReplaced) {
        await onTrackReplaced(screenTrack);
      }

      // Handle user clicking "Stop sharing" in browser
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      setState((s) => ({ ...s, screenSharing: true, loading: false }));
    } catch (err: unknown) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Screen share cancelled'
          : `Screen share failed: ${err instanceof Error ? err.message : 'Unknown error'}`;

      setState((s) => ({ ...s, error: message, loading: false }));
      console.error('[ScreenShare] Error:', err);
    }
  }, [onTrackReplaced]);

  const stopScreenShare = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true }));

      // Stop screen stream
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      // Try to get camera stream if it was saved
      let cameraTrack = savedVideoTrackRef.current;
      savedVideoTrackRef.current = null;

      // If saved track ended, request new one
      if (!cameraTrack || cameraTrack.readyState === 'ended') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
            },
          });
          cameraTrack = stream.getVideoTracks()[0] || null;
        } catch (err) {
          console.warn('[ScreenShare] Could not re-acquire camera:', err);
          cameraTrack = null;
        }
      }

      // Notify parent to restore camera
      if (onTrackReplaced) {
        await onTrackReplaced(cameraTrack);
      }

      setState((s) => ({ ...s, screenSharing: false, loading: false, error: null }));
    } catch (err) {
      console.error('[ScreenShare] Stop error:', err);
      setState((s) => ({ ...s, loading: false, error: 'Failed to stop screen share' }));
    }
  }, [onTrackReplaced]);

  return {
    ...state,
    startScreenShare,
    stopScreenShare,
  };
}
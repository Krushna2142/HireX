'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Public types ─────────────────────────────────────────────────────────────

export type RemotePeer = {
  userId: string;
  stream: MediaStream;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  name?: string;
  role?: string;
};

export type ChatMessage = {
  userId: string;
  name: string;
  role?: string;
  message: string;
  timestamp: string;
};

type UserMeta = {
  userId: string;
  name?: string;
  role?: string;
  micOn?: boolean;
  camOn?: boolean;
  screenSharing?: boolean;
};

type UseWebRTCRoomArgs = {
  roomId: string;
  user: { id: string; full_name?: string; role?: string } | null;
  enabled?: boolean;
};

// ─── ICE / RTC config ─────────────────────────────────────────────────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCRoom({ roomId, user, enabled = true }: UseWebRTCRoomArgs) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [connecting, setConnecting]       = useState(false);
  const [connected, setConnected]         = useState(false);
  const [localReady, setLocalReady]       = useState(false);
  const [localStream, setLocalStream]     = useState<MediaStream | null>(null);
  const [micOn, setMicOn]                 = useState(true);
  const [camOn, setCamOn]                 = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [peers, setPeers]                 = useState<RemotePeer[]>([]);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [error, setError]                 = useState<string>('');

  // ── Refs (not reactive — internal to signaling logic) ─────────────────────
  const socketRef            = useRef<Socket | null>(null);
  const localStreamRef       = useRef<MediaStream | null>(null);
  const savedCameraTrackRef  = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef      = useRef<MediaStream | null>(null);
  const pcsRef               = useRef<Map<string, RTCPeerConnection>>(new Map());
  const userMetaRef          = useRef<Map<string, UserMeta>>(new Map());

  // Stable copies of toggle state for use inside event-listener closures
  const micOnRef        = useRef(micOn);
  const camOnRef        = useRef(camOn);
  const screenShareRef  = useRef(screenSharing);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);
  useEffect(() => { screenShareRef.current = screenSharing; }, [screenSharing]);

  // Stable ref to stopScreenShare — avoids a circular useCallback dependency
 const stopScreenShareRef = useRef<(() => Promise<void>) | null>(null);

  // ── Signaling URL ──────────────────────────────────────────────────────────
  const signalingUrl = useMemo(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
    return api.replace(/\/api\/?$/, '');
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Publish the current localStreamRef tracks as a fresh MediaStream state.
   *  Creating a new MediaStream reference is intentional — it signals React
   *  that the stream changed so VideoTile effects re-run. */
  const publishLocalStream = useCallback(() => {
    const src = localStreamRef.current;
    setLocalStream(src ? new MediaStream(src.getTracks()) : null);
  }, []);

  const stopLocalTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setLocalReady(false);
  }, []);

  const cleanupPeer = useCallback((remoteUserId: string) => {
    const pc = pcsRef.current.get(remoteUserId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcsRef.current.delete(remoteUserId);
    }
    setPeers(prev => prev.filter(p => p.userId !== remoteUserId));
  }, []);

  // ── Peer connection factory ────────────────────────────────────────────────

  const createPeerConnection = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const socket = socketRef.current;
      if (!socket) throw new Error('Socket not ready');

      // Re-use existing non-failed connection
      const existing = pcsRef.current.get(remoteUserId);
      if (existing && !['failed', 'closed', 'disconnected'].includes(existing.connectionState)) {
        return existing;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Add current local tracks so the remote peer receives our AV
      localStreamRef.current?.getTracks().forEach(track =>
        pc.addTrack(track, localStreamRef.current!),
      );

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        socket.emit('interview:ice-candidate', {
          roomId,
          targetUserId: remoteUserId,
          candidate: candidate.toJSON(),
        });
      };

      pc.ontrack = ({ streams: [stream] }) => {
        if (!stream) return;
        const meta = userMetaRef.current.get(remoteUserId);
        const peer: RemotePeer = {
          userId:        remoteUserId,
          stream,
          micOn:         meta?.micOn         ?? true,
          camOn:         meta?.camOn          ?? true,
          screenSharing: meta?.screenSharing  ?? false,
          name:          meta?.name,
          role:          meta?.role,
        };
        setPeers(prev => {
          if (prev.some(p => p.userId === remoteUserId)) {
            return prev.map(p => p.userId === remoteUserId ? { ...p, ...peer } : p);
          }
          return [...prev, peer];
        });
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          cleanupPeer(remoteUserId);
        }
      };

      pcsRef.current.set(remoteUserId, pc);
      return pc;
    },
    [cleanupPeer, roomId],
  );

  // ── Media acquisition ──────────────────────────────────────────────────────

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setLocalReady(true);
    setMicOn(stream.getAudioTracks().every(t => t.enabled));
    setCamOn(stream.getVideoTracks().every(t => t.enabled));
    return stream;
  }, []);

  // ── Offer / Answer helpers ─────────────────────────────────────────────────

  const makeOfferTo = useCallback(async (remoteUserId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      const pc = createPeerConnection(remoteUserId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socket.emit('interview:offer', { roomId, targetUserId: remoteUserId, sdp: offer });
    } catch (err) {
      console.error(`[WebRTC] offer failed for ${remoteUserId}:`, err);
    }
  }, [createPeerConnection, roomId]);

  // ── Join ───────────────────────────────────────────────────────────────────

  const join = useCallback(async () => {
    if (!enabled || !roomId || !user?.id) return;
    if (socketRef.current) return; // already connected

    try {
      setConnecting(true);
      setError('');

      await ensureLocalMedia();

      const socket = io(`${signalingUrl}/interview`, {
        transports: ['websocket'],
        withCredentials: true,
        reconnectionAttempts: 3,
        timeout: 10_000,
      });
      socketRef.current = socket;

      // ── Socket events ──────────────────────────────────────────────────────

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('interview:join-room', {
          roomId,
          userId:   user.id,
          name:     user.full_name,
          role:     user.role,
        });
      });

      socket.on('connect_error', (err: Error) => {
        setError(`Connection failed: ${err.message}`);
        setConnecting(false);
      });

      socket.on('disconnect', (reason: string) => {
        setConnected(false);
        if (reason === 'io server disconnect') setError('Disconnected by server');
      });

      // Current room snapshot on join
      socket.on('interview:room-users', async (payload: { users: UserMeta[] }) => {
        const others = (payload?.users ?? []).filter(u => u.userId !== user.id);
        others.forEach(u => userMetaRef.current.set(u.userId, u));
        // Deterministic offerer: lower userId initiates to avoid race conditions
        for (const remote of others) {
          if (user.id < remote.userId) await makeOfferTo(remote.userId);
        }
      });

      // New participant arrived
      socket.on('interview:user-joined', async (payload: { user: UserMeta }) => {
        const joined = payload?.user;
        if (!joined || joined.userId === user.id) return;
        userMetaRef.current.set(joined.userId, joined);
        if (user.id < joined.userId) await makeOfferTo(joined.userId);
      });

      // SDP signaling
      socket.on('interview:offer', async (payload: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        const pc = createPeerConnection(payload.fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('interview:answer', {
          roomId,
          targetUserId: payload.fromUserId,
          sdp: answer,
        });
      });

      socket.on('interview:answer', async (payload: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        const pc = pcsRef.current.get(payload.fromUserId);
        if (!pc) return;
        try { await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)); }
        catch (err) { console.error('[WebRTC] answer error:', err); }
      });

      socket.on('interview:ice-candidate', async (payload: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (!payload.candidate) return;
        const pc = pcsRef.current.get(payload.fromUserId);
        if (!pc) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
        catch (err) { console.error('[WebRTC] ICE error:', err); }
      });

      // Media state updates from peers
      socket.on('interview:user-media-toggled', (payload: {
        userId: string;
        micOn: boolean;
        camOn: boolean;
        screenSharing?: boolean;
      }) => {
        const meta = userMetaRef.current.get(payload.userId) ?? { userId: payload.userId };
        meta.micOn         = payload.micOn;
        meta.camOn         = payload.camOn;
        meta.screenSharing = payload.screenSharing ?? meta.screenSharing;
        userMetaRef.current.set(payload.userId, meta);

        setPeers(prev => prev.map(p =>
          p.userId === payload.userId
            ? { ...p, micOn: payload.micOn, camOn: payload.camOn, screenSharing: payload.screenSharing ?? p.screenSharing }
            : p,
        ));
      });

      // In-room chat
      socket.on('interview:chat-message', (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
      });

      socket.on('interview:user-left', (payload: { userId: string }) => {
        cleanupPeer(payload.userId);
      });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setConnecting(false);
    }
  }, [cleanupPeer, createPeerConnection, enabled, ensureLocalMedia, makeOfferTo, roomId, signalingUrl, user]);

  // ── Leave ──────────────────────────────────────────────────────────────────

  const leave = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('interview:leave-room', { roomId });
      socket.disconnect();
      socketRef.current = null;
    }
    pcsRef.current.forEach((_, id) => cleanupPeer(id));
    pcsRef.current.clear();
    userMetaRef.current.clear();
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    savedCameraTrackRef.current = null;
    setPeers([]);
    setMessages([]);
    setConnected(false);
    setScreenSharing(false);
    stopLocalTracks();
  }, [cleanupPeer, roomId, stopLocalTracks]);

  // ── Media controls ─────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOnRef.current;
    stream.getAudioTracks().forEach(t => (t.enabled = next));
    setMicOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: next,
      camOn: camOnRef.current,
      screenSharing: screenShareRef.current,
    });
  }, [roomId]);

  const toggleCam = useCallback(() => {
    // When screen sharing, the video sender carries the screen track.
    // Toggling cam here only affects what will be restored on stop.
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOnRef.current;
    if (!screenShareRef.current) {
      stream.getVideoTracks().forEach(t => (t.enabled = next));
    }
    setCamOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: next,
      screenSharing: screenShareRef.current,
    });
  }, [roomId]);

  // ── Screen sharing ─────────────────────────────────────────────────────────

  /**
   * stopScreenShare — restores the original camera track in every PeerConnection.
   * Declared before startScreenShare so stopScreenShareRef can point to it.
   */
  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    const savedTrack = savedCameraTrackRef.current;
    savedCameraTrackRef.current = null;

    let cameraVideoTrack: MediaStreamTrack | null = null;

    if (savedTrack && savedTrack.readyState === 'live') {
      cameraVideoTrack = savedTrack;
    } else {
      // Original track was stopped or lost — acquire a fresh one
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraVideoTrack = s.getVideoTracks()[0] ?? null;
      } catch { /* camera unavailable — proceed without */ }
    }

    const local = localStreamRef.current;
    if (local && cameraVideoTrack) {
      local.getVideoTracks().forEach(t => local.removeTrack(t));
      local.addTrack(cameraVideoTrack);
      cameraVideoTrack.enabled = camOnRef.current;
    }

    // Replace screen track → camera track in every active PeerConnection
    if (cameraVideoTrack) {
      await Promise.allSettled(
        Array.from(pcsRef.current.values()).map(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          return sender?.replaceTrack(cameraVideoTrack!) ?? Promise.resolve();
        }),
      );
    }

    publishLocalStream();
    setScreenSharing(false);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: camOnRef.current,
      screenSharing: false,
    });
  }, [publishLocalStream, roomId]);

  // Keep the ref current so startScreenShare can reference it without circular deps
  useEffect(() => { stopScreenShareRef.current = stopScreenShare; });

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: true,
      });
      screenStreamRef.current = screenStream;

      const screenVideoTrack = screenStream.getVideoTracks()[0];

      // Save the current camera video track before replacing it
      const local = localStreamRef.current;
      if (local) {
        const cameraTrack = local.getVideoTracks()[0];
        if (cameraTrack) {
          savedCameraTrackRef.current = cameraTrack;
          local.removeTrack(cameraTrack);
        }
        local.addTrack(screenVideoTrack);
      }

      // Replace video track in all active PeerConnections
      await Promise.allSettled(
        Array.from(pcsRef.current.values()).map(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          return sender?.replaceTrack(screenVideoTrack) ?? Promise.resolve();
        }),
      );

      publishLocalStream();
      setScreenSharing(true);
      socketRef.current?.emit('interview:toggle-media', {
        roomId,
        micOn: micOnRef.current,
        camOn: camOnRef.current,
        screenSharing: true,
      });

      // Auto-stop when user clicks browser's native "Stop sharing" button
      screenVideoTrack.addEventListener('ended', () => {
        void stopScreenShareRef.current?.();
      });
    } catch (err: unknown) {
      // NotAllowedError = user cancelled — silent. Others we surface.
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        setError('Screen share failed. Please try again.');
        console.error('[WebRTC] screen share error:', err);
      }
    }
  }, [publishLocalStream, roomId]);

  // ── Chat ───────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !socketRef.current) return;
    socketRef.current.emit('interview:chat-message', { roomId, message: trimmed });
  }, [roomId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => () => { leave(); }, [leave]);

  return {
    // State
    connecting,
    connected,
    localReady,
    localStream,
    peers,
    messages,
    micOn,
    camOn,
    screenSharing,
    error,
    // Actions
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
  };
}
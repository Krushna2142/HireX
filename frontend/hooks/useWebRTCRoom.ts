'use client';

/**
 * useWebRTCRoom — Production WebRTC hook for interview video conferencing
 *
 * Architecture: Full-mesh WebRTC (each peer connects directly to every other peer)
 * Suitable for ≤6 participants. Beyond that, use an SFU (mediasoup, Livekit).
 *
 * Signal flow:
 *   1. Socket connects and authenticates via JWT
 *   2. Server sends room:snapshot with current participants
 *   3. For each existing participant: lower userId sends offer (avoids race)
 *   4. Receiving peer answers, ICE candidates exchanged
 *   5. WebRTC tracks flow directly peer-to-peer (bypassing server)
 *
 * Key design decisions:
 *   - RTCPeerConnection per remote peer (not shared)
 *   - ICE candidate queuing until remote description is set (critical fix)
 *   - Screen sharing replaces video track in existing senders (no renegotiation needed)
 *   - Exponential backoff reconnection for Socket.io
 *   - Refs for all mutable state touched in async callbacks (avoids stale closures)
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Public types ─────────────────────────────────────────────────────────────

export type RemotePeer = {
  userId: string;
  stream: MediaStream | null;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
};

export type ChatMessage = {
  userId: string;
  name: string;
  role?: string;
  message: string;
  timestamp: string;
};

export type ConnectionState =
  | 'idle'
  | 'acquiring-media'
  | 'connecting-socket'
  | 'joining-room'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'left';

type ParticipantSnapshot = {
  userId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
};

type UseWebRTCRoomArgs = {
  roomId: string;
  user: { id: string; full_name?: string; role?: string } | null;
};

// ─── ICE configuration ────────────────────────────────────────────────────────
// For production, add TURN servers. STUN alone fails across symmetric NATs (~15% of users).
// Free TURN: Twilio TURN, Metered.ca, or self-host coturn.
// Critical: Without TURN, ~30% of peer connections will fail silently.

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Add TURN servers here for production:
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: process.env.NEXT_PUBLIC_TURN_USERNAME,
  //   credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  // },
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// ─── Media constraints ────────────────────────────────────────────────────────

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: 'user',
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

// ─── Internal state types ─────────────────────────────────────────────────────

type PeerState = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  iceCandidateQueue: RTCIceCandidateInit[];
  remoteDescSet: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCRoom({ roomId, user }: UseWebRTCRoomArgs) {
  // ── Public state ───────────────────────────────────────────────────────────
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string>('');

  // ── Internal refs (not reactive — used in async callbacks) ────────────────
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedCamTrackRef = useRef<MediaStreamTrack | null>(null);

  // userId → PeerState
  const peersRef = useRef<Map<string, PeerState>>(new Map());

  // Stable copies of toggle state for closures
  const micOnRef = useRef(true);
  const camOnRef = useRef(true);
  const screenSharingRef = useRef(false);
  const userIdRef = useRef(user?.id ?? '');

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);
  useEffect(() => { screenSharingRef.current = screenSharing; }, [screenSharing]);
  useEffect(() => { userIdRef.current = user?.id ?? ''; }, [user?.id]);

  // ── Utility: update a single peer in state ─────────────────────────────────
  const updatePeer = useCallback((userId: string, patch: Partial<RemotePeer>) => {
    setPeers(prev =>
      prev.map(p => p.userId === userId ? { ...p, ...patch } : p)
    );
  }, []);

  const removePeer = useCallback((userId: string) => {
    const ps = peersRef.current.get(userId);
    if (ps) {
      ps.pc.close();
      peersRef.current.delete(userId);
    }
    setPeers(prev => prev.filter(p => p.userId !== userId));
  }, []);

  // ── Create RTCPeerConnection for a remote user ────────────────────────────
  const createPC = useCallback((
    remoteUserId: string,
    socket: Socket,
  ): PeerState => {
    // Clean up any existing connection
    const existing = peersRef.current.get(remoteUserId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(remoteUserId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const state: PeerState = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      iceCandidateQueue: [],
      remoteDescSet: false,
    };
    peersRef.current.set(remoteUserId, state);

    // Add local tracks immediately so remote can receive them
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    // ICE candidates
    pc.onicecandidate = (evt) => {
      if (!evt.candidate) return;
      socket.emit('interview:ice-candidate', {
        roomId,
        targetUserId: remoteUserId,
        candidate: evt.candidate.toJSON(),
      });
    };

    pc.onicecandidateerror = (evt) => {
      // Non-fatal; some ICE errors are expected (e.g., failed STUN checks)
      if ((evt as RTCPeerConnectionIceErrorEvent).errorCode !== 701) {
        console.warn('[ICE] Candidate error:', evt);
      }
    };

    // Receive remote tracks
    pc.ontrack = (evt) => {
      const [stream] = evt.streams;
      if (!stream) return;

      setPeers(prev => {
        const exists = prev.find(p => p.userId === remoteUserId);
        if (exists) {
          return prev.map(p =>
            p.userId === remoteUserId ? { ...p, stream } : p
          );
        }
        return [...prev, {
          userId: remoteUserId,
          stream,
          micOn: true,
          camOn: true,
          screenSharing: false,
        }];
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      console.debug(`[PC:${remoteUserId}] connectionState → ${cs}`);

      if (cs === 'failed') {
        // Attempt ICE restart
        console.warn(`[PC:${remoteUserId}] Connection failed — restarting ICE`);
        pc.restartIce();
      }
      if (cs === 'closed') {
        removePeer(remoteUserId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (state.makingOffer) return;
      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return; // Collided — abort
        await pc.setLocalDescription(offer);
        socket.emit('interview:offer', {
          roomId,
          targetUserId: remoteUserId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(`[PC:${remoteUserId}] Negotiation error:`, err);
      } finally {
        state.makingOffer = false;
      }
    };

    return state;
  }, [removePeer, roomId]);

  // ── Process queued ICE candidates after remote description is set ─────────
  const drainIceQueue = useCallback(async (state: PeerState, remoteUserId: string) => {
    const candidates = [...state.iceCandidateQueue];
    state.iceCandidateQueue = [];
    for (const candidate of candidates) {
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[PC:${remoteUserId}] ICE queue drain error:`, err);
      }
    }
  }, []);

  // ── Acquire local media ────────────────────────────────────────────────────
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;

    setConnectionState('acquiring-media');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: VIDEO_CONSTRAINTS,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicOn(stream.getAudioTracks().every(t => t.enabled));
    setCamOn(stream.getVideoTracks().every(t => t.enabled));
    return stream;
  }, []);

  // ── Connect and join room ──────────────────────────────────────────────────
  const join = useCallback(async () => {
    if (!user?.id || !roomId) return;
    if (socketRef.current?.connected) return; // Already connected

    try {
      setError('');

      // 1. Get local media
      await acquireMedia();

      // 2. Connect socket
      setConnectionState('connecting-socket');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
        .replace(/\/api\/?$/, '');

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('jc_token') ?? ''
        : '';

      const socket: Socket = io(`${apiBase}/interview`, {
        transports: ['websocket'],
        withCredentials: true,
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        timeout: 15_000,
      });
      socketRef.current = socket;

      // ── Socket event handlers ──────────────────────────────────────────────

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnectionState('joining-room');
        socket.emit('interview:join-room', {
          roomId,
          name: user.full_name,
        });
      });

      socket.on('connect_error', (err) => {
        console.error('[Socket] connect_error:', err.message);
        setError(`Cannot connect to signaling server: ${err.message}`);
        setConnectionState('error');
      });

      socket.on('disconnect', (reason) => {
        console.warn('[Socket] Disconnected:', reason);
        if (reason !== 'io client disconnect') {
          setConnectionState('reconnecting');
        }
      });

      socket.on('reconnect', () => {
        console.log('[Socket] Reconnected — rejoining room');
        socket.emit('interview:join-room', {
          roomId,
          name: user.full_name,
        });
      });

      socket.on('interview:error', (data: { message: string }) => {
        setError(data.message);
        setConnectionState('error');
      });

      // Room snapshot: current participants when we join
      socket.on('interview:room-snapshot', async (data: { participants: ParticipantSnapshot[] }) => {
        setConnectionState('connected');

        const others = data.participants.filter(p => p.userId !== user.id);

        // Update metadata for existing peers
        setPeers(prev => {
          const existing = new Map(prev.map(p => [p.userId, p]));
          for (const snap of others) {
            const e = existing.get(snap.userId);
            if (e) {
              existing.set(snap.userId, { ...e, ...snap });
            } else {
              existing.set(snap.userId, {
                userId: snap.userId,
                stream: null,
                name: snap.name,
                role: snap.role,
                micOn: snap.micOn,
                camOn: snap.camOn,
                screenSharing: snap.screenSharing,
              });
            }
          }
          return Array.from(existing.values());
        });

        // Polite peer model: lower userId is the "polite" peer (waits)
        // Higher userId sends the offer (initiates)
        for (const participant of others) {
          if (user.id > participant.userId) {
            // We are the impolite peer — send the offer
            const ps = createPC(participant.userId, socket);
            try {
              ps.makingOffer = true;
              const offer = await ps.pc.createOffer();
              await ps.pc.setLocalDescription(offer);
              socket.emit('interview:offer', {
                roomId,
                targetUserId: participant.userId,
                sdp: ps.pc.localDescription,
              });
            } catch (err) {
              console.error(`[PC:${participant.userId}] Initial offer failed:`, err);
            } finally {
              ps.makingOffer = false;
            }
          }
          // Polite peer (lower userId) waits for incoming offer
        }
      });

      // New participant joined after us
      socket.on('interview:user-joined', async (data: { participant: ParticipantSnapshot }) => {
        const { participant } = data;
        if (participant.userId === user.id) return;

        // Add to peer list (no stream yet)
        setPeers(prev => {
          if (prev.some(p => p.userId === participant.userId)) return prev;
          return [...prev, {
            userId: participant.userId,
            stream: null,
            name: participant.name,
            role: participant.role,
            micOn: participant.micOn,
            camOn: participant.camOn,
            screenSharing: participant.screenSharing,
          }];
        });

        // If we are the impolite peer (higher userId), send offer
        if (user.id > participant.userId) {
          const ps = createPC(participant.userId, socket);
          try {
            ps.makingOffer = true;
            const offer = await ps.pc.createOffer();
            await ps.pc.setLocalDescription(offer);
            socket.emit('interview:offer', {
              roomId,
              targetUserId: participant.userId,
              sdp: ps.pc.localDescription,
            });
          } catch (err) {
            console.error(`[PC:${participant.userId}] Offer error on join:`, err);
          } finally {
            ps.makingOffer = false;
          }
        }
      });

      // Incoming offer (from impolite peer)
      socket.on('interview:offer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        let ps = peersRef.current.get(data.fromUserId);
        if (!ps) {
          ps = createPC(data.fromUserId, socket);
        }

        const { pc } = ps;
        const offerCollision =
          data.sdp.type === 'offer' &&
          (ps.makingOffer || pc.signalingState !== 'stable');

        // Polite peer ignores colliding offers; impolite peer rolls back
        const isPolite = user.id < data.fromUserId;
        ps.ignoreOffer = !isPolite && offerCollision;
        if (ps.ignoreOffer) return;

        try {
          if (offerCollision) {
            // Rollback for polite peer
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          ps.remoteDescSet = true;
          await drainIceQueue(ps, data.fromUserId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('interview:answer', {
            roomId,
            targetUserId: data.fromUserId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] offer handling error:`, err);
        }
      });

      // Incoming answer
      socket.on('interview:answer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        const ps = peersRef.current.get(data.fromUserId);
        if (!ps || ps.ignoreOffer) return;
        try {
          await ps.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          ps.remoteDescSet = true;
          await drainIceQueue(ps, data.fromUserId);
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] answer handling error:`, err);
        }
      });

      // ICE candidates
      socket.on('interview:ice-candidate', async (data: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const ps = peersRef.current.get(data.fromUserId);
        if (!ps) return;

        // Queue until remote description is set (critical — prevents ordering issues)
        if (!ps.remoteDescSet || ps.pc.remoteDescription === null) {
          ps.iceCandidateQueue.push(data.candidate);
          return;
        }

        try {
          await ps.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          if (!ps.ignoreOffer) {
            console.error(`[PC:${data.fromUserId}] ICE candidate error:`, err);
          }
        }
      });

      // Participant left
      socket.on('interview:user-left', (data: { userId: string }) => {
        removePeer(data.userId);
      });

      // Media state changes
      socket.on('interview:user-media-toggled', (data: {
        userId: string;
        micOn: boolean;
        camOn: boolean;
        screenSharing: boolean;
      }) => {
        updatePeer(data.userId, {
          micOn: data.micOn,
          camOn: data.camOn,
          screenSharing: data.screenSharing,
        });
      });

      // In-room chat
      socket.on('interview:chat-message', (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      setError(msg);
      setConnectionState('error');
      console.error('[useWebRTCRoom] join error:', err);
    }
  }, [acquireMedia, createPC, drainIceQueue, removePeer, roomId, updatePeer, user]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leave = useCallback(() => {
    // Signal leave before disconnecting
    socketRef.current?.emit('interview:leave-room', { roomId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    // Close all peer connections
    for (const [, ps] of peersRef.current) {
      ps.pc.close();
    }
    peersRef.current.clear();

    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    savedCamTrackRef.current = null;

    setLocalStream(null);
    setPeers([]);
    setMessages([]);
    setScreenSharing(false);
    setConnectionState('left');
  }, [roomId]);

  // ── Mic toggle ─────────────────────────────────────────────────────────────
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
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOnRef.current;
    // Only toggle the actual track if not screen sharing
    if (!screenSharingRef.current) {
      stream.getVideoTracks().forEach(t => (t.enabled = next));
    }
    setCamOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: next,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  // ── Screen share start ─────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (screenSharingRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 15 },
        },
        audio: {
          echoCancellation: false,
          suppressLocalAudioPlayback: false,
        } as any,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      } as any);

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Save current camera track before replacing
      const localVidTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localVidTrack) {
        savedCamTrackRef.current = localVidTrack;
      }

      // Replace video track in all PeerConnections
      const replaceOps: Promise<void>[] = [];
      for (const [, ps] of peersRef.current) {
        const sender = ps.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replaceOps.push(sender.replaceTrack(screenTrack));
        }
      }
      await Promise.allSettled(replaceOps);

      // Also update local stream for preview
      if (localStreamRef.current) {
        const local = localStreamRef.current;
        local.getVideoTracks().forEach(t => {
          t.enabled = false; // pause camera
        });
      }

      // Replace in local stream for preview
      const newStream = new MediaStream([
        ...(localStreamRef.current?.getAudioTracks() ?? []),
        screenTrack,
      ]);
      localStreamRef.current = newStream;
      setLocalStream(new MediaStream(newStream.getTracks()));
      setScreenSharing(true);

      // Auto-stop when browser's native "Stop sharing" is clicked
      screenTrack.addEventListener('ended', () => {
        void stopScreenShare();
      });

      socketRef.current?.emit('interview:toggle-media', {
        roomId,
        micOn: micOnRef.current,
        camOn: camOnRef.current,
        screenSharing: true,
      });
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        setError('Screen share unavailable. Check browser permissions.');
        console.error('[Screen share] error:', err);
      }
    }
  }, [roomId]); // stopScreenShare is defined below; safe because it's only called via event listener

  // ── Screen share stop ──────────────────────────────────────────────────────
  const stopScreenShare = useCallback(async () => {
    if (!screenSharingRef.current) return;

    // Stop screen stream tracks
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    // Restore camera
    let cameraTrack: MediaStreamTrack | null = savedCamTrackRef.current;
    savedCamTrackRef.current = null;

    // If saved track ended (user had video off), try to get a new one
    if (!cameraTrack || cameraTrack.readyState === 'ended') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
        });
        cameraTrack = s.getVideoTracks()[0] ?? null;
      } catch {
        cameraTrack = null;
      }
    }

    // Replace back in all PeerConnections
    if (cameraTrack) {
      cameraTrack.enabled = camOnRef.current;
      const replaceOps: Promise<void>[] = [];
      for (const [, ps] of peersRef.current) {
        const sender = ps.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replaceOps.push(sender.replaceTrack(cameraTrack!));
        }
      }
      await Promise.allSettled(replaceOps);
    }

    // Restore local stream
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const newTracks = cameraTrack ? [...audioTracks, cameraTrack] : audioTracks;
    const restored = new MediaStream(newTracks);
    localStreamRef.current = restored;
    setLocalStream(new MediaStream(restored.getTracks()));
    setScreenSharing(false);

    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: camOnRef.current,
      screenSharing: false,
    });
  }, [roomId]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !socketRef.current?.connected) return;
    socketRef.current.emit('interview:chat-message', { roomId, message: trimmed });
  }, [roomId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    connectionState,
    connected: connectionState === 'connected',
    connecting: connectionState === 'connecting-socket' || connectionState === 'joining-room' || connectionState === 'acquiring-media',
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
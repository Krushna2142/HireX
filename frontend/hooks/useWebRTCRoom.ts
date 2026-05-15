'use client';

/**
 * useWebRTCRoom — Production WebRTC hook for interview video conferencing
 *
 * Fix included:
 * - Prevents "max-bundle configured but session description has no BUNDLE group"
 * - Ensures PeerConnection has tracks/transceivers before createOffer()
 * - Uses one safe offer creator for initial offers and negotiationneeded offers
 * - Keeps ICE candidate queueing
 * - Keeps screen sharing, chat, room end, and media toggle flow
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

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

type PeerState = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  iceCandidateQueue: RTCIceCandidateInit[];
  remoteDescSet: boolean;
};

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

let TURN_SERVERS: RTCIceServer[] = [];

try {
  const raw = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      TURN_SERVERS = parsed as RTCIceServer[];
    }
  }
} catch (err) {
  console.warn('Failed to parse NEXT_PUBLIC_TURN_SERVERS:', err);
}

const ICE_SERVERS: RTCIceServer[] = [
  ...DEFAULT_STUN_SERVERS,
  ...TURN_SERVERS,
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

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

function safeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return fallback;
}

function getDisplayName(user: UseWebRTCRoomArgs['user']) {
  return safeString(user?.full_name, 'User');
}

function getAuthToken() {
  if (typeof window === 'undefined') return '';

  return (
    localStorage.getItem('jc_token') ??
    localStorage.getItem('token') ??
    localStorage.getItem('accessToken') ??
    localStorage.getItem('authToken') ??
    ''
  );
}

function getSocketBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  return raw
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
}

function hasBundleGroup(description: RTCSessionDescriptionInit | null | undefined) {
  const sdp = description?.sdp ?? '';

  return sdp.includes('a=group:BUNDLE');
}

function bundleErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.toLowerCase().includes('bundle');
}

/**
 * Critical WebRTC fix:
 * With bundlePolicy=max-bundle, Chrome can throw:
 * "Failed to set local offer sdp: max-bundle configured but session description has no BUNDLE group"
 *
 * This happens when createOffer() is called before any track/transceiver/data channel exists.
 * So before every offer, guarantee at least recvonly audio/video transceivers exist.
 */
function ensureBundleSafePeer(pc: RTCPeerConnection) {
  const hasSenderTrack = pc.getSenders().some((sender) => Boolean(sender.track));
  const hasTransceiver = pc.getTransceivers().length > 0;

  if (!hasSenderTrack && !hasTransceiver && pc.signalingState === 'stable') {
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.addTransceiver('video', { direction: 'recvonly' });
  }
}

async function createOfferWithBundle(pc: RTCPeerConnection, label: string) {
  ensureBundleSafePeer(pc);

  let offer = await pc.createOffer();

  if (!hasBundleGroup(offer)) {
    console.warn(`[${label}] Offer SDP did not contain BUNDLE group. Retrying with guaranteed transceivers.`);

    ensureBundleSafePeer(pc);
    offer = await pc.createOffer();
  }

  if (!hasBundleGroup(offer)) {
    throw new Error(
      `[${label}] Invalid WebRTC offer: missing BUNDLE group. This usually means offer was created before media/transceivers existed.`,
    );
  }

  return offer;
}

async function setLocalOfferWithBundle(pc: RTCPeerConnection, label: string) {
  const offer = await createOfferWithBundle(pc, label);

  try {
    await pc.setLocalDescription(offer);
  } catch (err) {
    if (!bundleErrorMessage(err)) {
      throw err;
    }

    console.warn(`[${label}] setLocalDescription failed because of BUNDLE. Retrying once.`, err);

    const retryOffer = await createOfferWithBundle(pc, `${label}:retry`);
    await pc.setLocalDescription(retryOffer);
  }
}

function isTerminalRoundResult(value: string) {
  return value === 'pass' || value === 'fail' || value === 'no_show' || value === 'completed';
}

export function useWebRTCRoom({ roomId, user }: UseWebRTCRoomArgs) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string>('');
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedCamTrackRef = useRef<MediaStreamTrack | null>(null);

  const peersRef = useRef<Map<string, PeerState>>(new Map());

  const micOnRef = useRef(true);
  const camOnRef = useRef(true);
  const screenSharingRef = useRef(false);
  const userIdRef = useRef(user?.id ?? '');

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => {
    camOnRef.current = camOn;
  }, [camOn]);

  useEffect(() => {
    screenSharingRef.current = screenSharing;
  }, [screenSharing]);

  useEffect(() => {
    userIdRef.current = user?.id ?? '';
  }, [user?.id]);

  const updatePeer = useCallback((userId: string, patch: Partial<RemotePeer>) => {
    setPeers((prev) =>
      prev.map((peer) => (peer.userId === userId ? { ...peer, ...patch } : peer)),
    );
  }, []);

  const removePeer = useCallback((userId: string) => {
    const peerState = peersRef.current.get(userId);

    if (peerState) {
      peerState.pc.close();
      peersRef.current.delete(userId);
    }

    setPeers((prev) => prev.filter((peer) => peer.userId !== userId));
  }, []);

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

  const makeAndSendOffer = useCallback(
    async (remoteUserId: string, socket: Socket, reason: string) => {
      const state = peersRef.current.get(remoteUserId);

      if (!state) return;
      if (state.makingOffer) return;

      const { pc } = state;

      if (pc.signalingState !== 'stable') {
        console.debug(`[PC:${remoteUserId}] Skip offer (${reason}); signalingState=${pc.signalingState}`);
        return;
      }

      try {
        state.makingOffer = true;

        await setLocalOfferWithBundle(pc, `PC:${remoteUserId}:${reason}`);

        if (!pc.localDescription) {
          throw new Error(`[PC:${remoteUserId}:${reason}] localDescription missing after setLocalDescription.`);
        }

        socket.emit('interview:offer', {
          roomId,
          targetUserId: remoteUserId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(`[PC:${remoteUserId}] Offer failed (${reason}):`, err);
      } finally {
        state.makingOffer = false;
      }
    },
    [roomId],
  );

  const createPC = useCallback(
    (remoteUserId: string, socket: Socket): PeerState => {
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

      const stream = localStreamRef.current;

      if (stream?.getTracks().length) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      } else {
        ensureBundleSafePeer(pc);
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        socket.emit('interview:ice-candidate', {
          roomId,
          targetUserId: remoteUserId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onicecandidateerror = (event) => {
        const iceError = event as RTCPeerConnectionIceErrorEvent;

        if (iceError.errorCode !== 701) {
          console.warn('[ICE] Candidate error:', event);
        }
      };

      pc.ontrack = (event) => {
        const streamFromEvent = event.streams?.[0] ?? new MediaStream([event.track]);

        setPeers((prev) => {
          const exists = prev.find((peer) => peer.userId === remoteUserId);

          if (exists) {
            return prev.map((peer) =>
              peer.userId === remoteUserId
                ? { ...peer, stream: streamFromEvent }
                : peer,
            );
          }

          return [
            ...prev,
            {
              userId: remoteUserId,
              stream: streamFromEvent,
              micOn: true,
              camOn: true,
              screenSharing: false,
            },
          ];
        });
      };

      pc.onconnectionstatechange = () => {
        const stateValue = pc.connectionState;
        console.debug(`[PC:${remoteUserId}] connectionState → ${stateValue}`);

        if (stateValue === 'failed') {
          console.warn(`[PC:${remoteUserId}] Connection failed — restarting ICE`);
          pc.restartIce();
        }

        if (stateValue === 'closed') {
          removePeer(remoteUserId);
        }
      };

      pc.onnegotiationneeded = async () => {
        await makeAndSendOffer(remoteUserId, socket, 'negotiationneeded');
      };

      return state;
    },
    [makeAndSendOffer, removePeer, roomId],
  );

  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;

    setConnectionState('acquiring-media');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: VIDEO_CONSTRAINTS,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicOn(stream.getAudioTracks().every((track) => track.enabled));
    setCamOn(stream.getVideoTracks().every((track) => track.enabled));

    return stream;
  }, []);

  const join = useCallback(async () => {
    if (!user?.id || !roomId) return;
    if (socketRef.current?.connected) return;

    try {
      setError('');
      setRoomEnded(false);

      await acquireMedia();

      setConnectionState('connecting-socket');

      const socket: Socket = io(`${getSocketBaseUrl()}/interview`, {
        transports: ['websocket'],
        withCredentials: true,
        auth: { token: getAuthToken() },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        timeout: 15_000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnectionState('joining-room');

        socket.emit('interview:join-room', {
          roomId,
          name: getDisplayName(user),
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
          name: getDisplayName(user),
        });
      });

      socket.on('interview:error', (data: { message?: string }) => {
        setError(safeString(data?.message, 'Interview room error.'));
        setConnectionState('error');
      });

      socket.on('interview:room-snapshot', async (data: { participants: ParticipantSnapshot[] }) => {
        setConnectionState('connected');
        setRoomEnded(false);

        const participants = Array.isArray(data.participants) ? data.participants : [];
        const others = participants.filter((participant) => participant.userId !== user.id);

        setPeers((prev) => {
          const existing = new Map(prev.map((peer) => [peer.userId, peer]));

          for (const snapshot of others) {
            const current = existing.get(snapshot.userId);

            if (current) {
              existing.set(snapshot.userId, { ...current, ...snapshot });
            } else {
              existing.set(snapshot.userId, {
                userId: snapshot.userId,
                stream: null,
                name: snapshot.name,
                role: snapshot.role,
                micOn: snapshot.micOn,
                camOn: snapshot.camOn,
                screenSharing: snapshot.screenSharing,
              });
            }
          }

          return Array.from(existing.values());
        });

        for (const participant of others) {
          if (user.id > participant.userId) {
            createPC(participant.userId, socket);
            await makeAndSendOffer(participant.userId, socket, 'room-snapshot');
          }
        }
      });

      socket.on('interview:user-joined', async (data: { participant: ParticipantSnapshot }) => {
        const participant = data.participant;

        if (!participant?.userId) return;
        if (participant.userId === user.id) return;

        setPeers((prev) => {
          if (prev.some((peer) => peer.userId === participant.userId)) return prev;

          return [
            ...prev,
            {
              userId: participant.userId,
              stream: null,
              name: participant.name,
              role: participant.role,
              micOn: participant.micOn,
              camOn: participant.camOn,
              screenSharing: participant.screenSharing,
            },
          ];
        });

        if (user.id > participant.userId) {
          createPC(participant.userId, socket);
          await makeAndSendOffer(participant.userId, socket, 'user-joined');
        }
      });

      socket.on('interview:offer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        if (!data?.fromUserId || !data?.sdp) return;

        if (data.sdp.type === 'offer' && !hasBundleGroup(data.sdp)) {
          console.warn(`[PC:${data.fromUserId}] Ignoring invalid offer without BUNDLE group.`);
          return;
        }

        let peerState = peersRef.current.get(data.fromUserId);

        if (!peerState) {
          peerState = createPC(data.fromUserId, socket);
        }

        const { pc } = peerState;

        const offerCollision =
          data.sdp.type === 'offer' &&
          (peerState.makingOffer || pc.signalingState !== 'stable');

        const isPolite = user.id < data.fromUserId;
        peerState.ignoreOffer = !isPolite && offerCollision;

        if (peerState.ignoreOffer) return;

        try {
          if (offerCollision) {
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          peerState.remoteDescSet = true;

          await drainIceQueue(peerState, data.fromUserId);

          const answer = await pc.createAnswer();

          if (!hasBundleGroup(answer)) {
            console.warn(`[PC:${data.fromUserId}] Answer SDP missing BUNDLE group.`);
          }

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

      socket.on('interview:answer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        if (!data?.fromUserId || !data?.sdp) return;

        const peerState = peersRef.current.get(data.fromUserId);

        if (!peerState || peerState.ignoreOffer) return;

        try {
          await peerState.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          peerState.remoteDescSet = true;

          await drainIceQueue(peerState, data.fromUserId);
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] answer handling error:`, err);
        }
      });

      socket.on('interview:ice-candidate', async (data: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (!data?.fromUserId || !data?.candidate) return;

        const peerState = peersRef.current.get(data.fromUserId);

        if (!peerState) return;

        if (!peerState.remoteDescSet || peerState.pc.remoteDescription === null) {
          peerState.iceCandidateQueue.push(data.candidate);
          return;
        }

        try {
          await peerState.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          if (!peerState.ignoreOffer) {
            console.error(`[PC:${data.fromUserId}] ICE candidate error:`, err);
          }
        }
      });

      socket.on('interview:user-left', (data: { userId: string }) => {
        if (!data?.userId) return;
        removePeer(data.userId);
      });

      socket.on('interview:user-media-toggled', (data: {
        userId: string;
        micOn: boolean;
        camOn: boolean;
        screenSharing: boolean;
      }) => {
        if (!data?.userId) return;

        updatePeer(data.userId, {
          micOn: Boolean(data.micOn),
          camOn: Boolean(data.camOn),
          screenSharing: Boolean(data.screenSharing),
        });
      });

      socket.on('interview:chat-message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
      });

      socket.on('interview:room-status', (data: {
        hostUserId: string | null;
        hostPresent: boolean;
        ended: boolean;
      }) => {
        setHostUserId(data.hostUserId ?? null);
        setHostPresent(Boolean(data.hostPresent));

        if (data.ended) {
          setRoomEnded(true);
          setConnectionState('left');
        }
      });

      socket.on('interview:room-ended', () => {
        setRoomEnded(true);
        setConnectionState('left');
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join room';

      setError(message);
      setConnectionState('error');

      console.error('[useWebRTCRoom] join error:', err);
    }
  }, [
    acquireMedia,
    createPC,
    drainIceQueue,
    makeAndSendOffer,
    removePeer,
    roomId,
    updatePeer,
    user,
  ]);

  const leave = useCallback(() => {
    socketRef.current?.emit('interview:leave-room', { roomId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    for (const [, peerState] of peersRef.current) {
      peerState.pc.close();
    }

    peersRef.current.clear();

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    savedCamTrackRef.current = null;

    setLocalStream(null);
    setPeers([]);
    setMessages([]);
    setScreenSharing(false);
    setHostPresent(false);
    setHostUserId(null);
    setRoomEnded(false);
    setConnectionState('left');
  }, [roomId]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;

    if (!stream) return;

    const next = !micOnRef.current;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });

    setMicOn(next);

    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: next,
      camOn: camOnRef.current,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;

    if (!stream) return;

    const next = !camOnRef.current;

    if (!screenSharingRef.current) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
    }

    setCamOn(next);

    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: next,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  const stopScreenShare = useCallback(async () => {
    if (!screenSharingRef.current) return;

    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    let cameraTrack: MediaStreamTrack | null = savedCamTrackRef.current;
    savedCamTrackRef.current = null;

    if (!cameraTrack || cameraTrack.readyState === 'ended') {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
        });

        cameraTrack = cameraStream.getVideoTracks()[0] ?? null;
      } catch {
        cameraTrack = null;
      }
    }

    if (cameraTrack) {
      cameraTrack.enabled = camOnRef.current;

      const replaceOps: Promise<void>[] = [];

      for (const [, peerState] of peersRef.current) {
        const sender = peerState.pc
          .getSenders()
          .find((item) => item.track?.kind === 'video');

        if (sender) {
          replaceOps.push(sender.replaceTrack(cameraTrack));
        }
      }

      await Promise.allSettled(replaceOps);
    }

    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const restoredTracks = cameraTrack ? [...audioTracks, cameraTrack] : audioTracks;
    const restoredStream = new MediaStream(restoredTracks);

    localStreamRef.current = restoredStream;
    setLocalStream(new MediaStream(restoredStream.getTracks()));
    setScreenSharing(false);

    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: camOnRef.current,
      screenSharing: false,
    });
  }, [roomId]);

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

      if (!screenTrack) {
        throw new Error('Screen share track was not created.');
      }

      const localVideoTrack = localStreamRef.current?.getVideoTracks()[0];

      if (localVideoTrack) {
        savedCamTrackRef.current = localVideoTrack;
      }

      const replaceOps: Promise<void>[] = [];

      for (const [, peerState] of peersRef.current) {
        const sender = peerState.pc
          .getSenders()
          .find((item) => item.track?.kind === 'video');

        if (sender) {
          replaceOps.push(sender.replaceTrack(screenTrack));
        }
      }

      await Promise.allSettled(replaceOps);

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      const newStream = new MediaStream([
        ...(localStreamRef.current?.getAudioTracks() ?? []),
        screenTrack,
      ]);

      localStreamRef.current = newStream;
      setLocalStream(new MediaStream(newStream.getTracks()));
      setScreenSharing(true);

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
  }, [roomId, stopScreenShare]);

  const sendMessage = useCallback((message: string) => {
    const trimmed = message.trim();

    if (!trimmed || !socketRef.current?.connected) return;

    socketRef.current.emit('interview:chat-message', {
      roomId,
      message: trimmed,
    });
  }, [roomId]);

  const endRoom = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('interview:end-room', { roomId });
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        leave();
      }
    };
  }, [leave]);

  return {
    connectionState,
    connected: connectionState === 'connected',
    connecting:
      connectionState === 'connecting-socket' ||
      connectionState === 'joining-room' ||
      connectionState === 'acquiring-media',
    localStream,
    peers,
    messages,
    micOn,
    camOn,
    screenSharing,
    error,
    hostUserId,
    hostPresent,
    roomEnded,
    canEndRoom: user?.role === 'recruiter' && Boolean(hostUserId) && user?.id === hostUserId,
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    endRoom,
  };
}
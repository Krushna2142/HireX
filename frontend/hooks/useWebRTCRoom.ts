'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type UserMeta = {
  userId: string;
  name?: string;
  role?: string;
  micOn?: boolean;
  camOn?: boolean;
};

type UseWebRTCRoomArgs = {
  roomId: string;
  user: { id: string; full_name?: string; role?: string } | null;
  enabled?: boolean;
};

type RemotePeer = {
  userId: string;
  stream: MediaStream;
  micOn: boolean;
  camOn: boolean;
  name?: string;
  role?: string;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN for production reliability:
    // {
    //   urls: process.env.NEXT_PUBLIC_TURN_URL!,
    //   username: process.env.NEXT_PUBLIC_TURN_USERNAME!,
    //   credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL!,
    // },
  ],
};

export function useWebRTCRoom({ roomId, user, enabled = true }: UseWebRTCRoomArgs) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const [localReady, setLocalReady] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [error, setError] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // key: remoteUserId
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const userMetaRef = useRef<Map<string, UserMeta>>(new Map());

  const signalingUrl = useMemo(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return api.replace(/\/api\/?$/, '');
  }, []);

  const stopLocalTracks = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
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
    remoteStreamsRef.current.delete(remoteUserId);
    setPeers((prev) => prev.filter((p) => p.userId !== remoteUserId));
  }, []);

  const createPeerConnection = useCallback(
    (remoteUserId: string) => {
      const socket = socketRef.current;
      if (!socket) throw new Error('Socket not connected');

      const pc = new RTCPeerConnection(rtcConfig);

      const local = localStreamRef.current;
      if (local) {
        local.getTracks().forEach((track) => {
          pc.addTrack(track, local);
        });
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        socket.emit('interview:ice-candidate', {
          roomId,
          targetUserId: remoteUserId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;

        remoteStreamsRef.current.set(remoteUserId, stream);
        const meta = userMetaRef.current.get(remoteUserId);

        setPeers((prev) => {
          const existing = prev.find((p) => p.userId === remoteUserId);
          if (existing) {
            return prev.map((p) =>
              p.userId === remoteUserId
                ? {
                    ...p,
                    stream,
                    micOn: meta?.micOn ?? p.micOn,
                    camOn: meta?.camOn ?? p.camOn,
                    name: meta?.name ?? p.name,
                    role: meta?.role ?? p.role,
                  }
                : p,
            );
          }

          return [
            ...prev,
            {
              userId: remoteUserId,
              stream,
              micOn: meta?.micOn ?? true,
              camOn: meta?.camOn ?? true,
              name: meta?.name,
              role: meta?.role,
            },
          ];
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
          cleanupPeer(remoteUserId);
        }
      };

      pcsRef.current.set(remoteUserId, pc);
      return pc;
    },
    [cleanupPeer, roomId],
  );

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    setLocalReady(true);
    setMicOn(stream.getAudioTracks().some((t) => t.enabled));
    setCamOn(stream.getVideoTracks().some((t) => t.enabled));
    return stream;
  }, []);

  const makeOfferTo = useCallback(
    async (remoteUserId: string) => {
      const pc = pcsRef.current.get(remoteUserId) ?? createPeerConnection(remoteUserId);
      const socket = socketRef.current;
      if (!socket) return;

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      socket.emit('interview:offer', {
        roomId,
        targetUserId: remoteUserId,
        sdp: offer,
      });
    },
    [createPeerConnection, roomId],
  );

  const join = useCallback(async () => {
    if (!enabled || !roomId || !user?.id) return;
    if (socketRef.current) return;

    try {
      setConnecting(true);
      setError('');

      await ensureLocalMedia();

      const socket = io(`${signalingUrl}/interview`, {
        transports: ['websocket'],
        withCredentials: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('interview:join-room', {
          roomId,
          userId: user.id,
          name: user.full_name,
          role: user.role,
        });
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('interview:room-users', async (payload: { users: UserMeta[] }) => {
        const others = (payload?.users ?? []).filter((u) => u.userId !== user.id);

        others.forEach((u) => userMetaRef.current.set(u.userId, u));

        // deterministic offerer: lower userId creates offer
        for (const remote of others) {
          if (user.id < remote.userId) {
            await makeOfferTo(remote.userId);
          }
        }
      });

      socket.on('interview:user-joined', async (payload: { user: UserMeta }) => {
        const joined = payload?.user;
        if (!joined || joined.userId === user.id) return;
        userMetaRef.current.set(joined.userId, joined);

        if (user.id < joined.userId) {
          await makeOfferTo(joined.userId);
        }
      });

      socket.on('interview:offer', async (payload: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
        const { fromUserId, sdp } = payload;
        const pc = pcsRef.current.get(fromUserId) ?? createPeerConnection(fromUserId);

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('interview:answer', {
          roomId,
          targetUserId: fromUserId,
          sdp: answer,
        });
      });

      socket.on('interview:answer', async (payload: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
        const { fromUserId, sdp } = payload;
        const pc = pcsRef.current.get(fromUserId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on('interview:ice-candidate', async (payload: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
        const { fromUserId, candidate } = payload;
        const pc = pcsRef.current.get(fromUserId) ?? createPeerConnection(fromUserId);
        if (!candidate) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on('interview:user-media-toggled', (payload: { userId: string; micOn: boolean; camOn: boolean }) => {
        const meta = userMetaRef.current.get(payload.userId) ?? { userId: payload.userId };
        meta.micOn = payload.micOn;
        meta.camOn = payload.camOn;
        userMetaRef.current.set(payload.userId, meta);

        setPeers((prev) =>
          prev.map((p) =>
            p.userId === payload.userId
              ? { ...p, micOn: payload.micOn, camOn: payload.camOn }
              : p,
          ),
        );
      });

      socket.on('interview:user-left', (payload: { userId: string }) => {
        cleanupPeer(payload.userId);
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to join room');
    } finally {
      setConnecting(false);
    }
  }, [cleanupPeer, createPeerConnection, enabled, ensureLocalMedia, makeOfferTo, roomId, signalingUrl, user]);

  const leave = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('interview:leave-room', { roomId });
      socket.disconnect();
      socketRef.current = null;
    }

    pcsRef.current.forEach((_, remoteUserId) => cleanupPeer(remoteUserId));
    pcsRef.current.clear();
    remoteStreamsRef.current.clear();
    userMetaRef.current.clear();
    setPeers([]);
    setConnected(false);

    stopLocalTracks();
  }, [cleanupPeer, roomId, stopLocalTracks]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);

    socketRef.current?.emit('interview:toggle-media', { roomId, micOn: next });
  }, [micOn, roomId]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);

    socketRef.current?.emit('interview:toggle-media', { roomId, camOn: next });
  }, [camOn, roomId]);

  useEffect(() => {
    return () => {
      leave();
    };
  }, [leave]);

  return {
    connecting,
    connected,
    localReady,
    localStream: localStreamRef.current,
    peers,
    micOn,
    camOn,
    error,
    join,
    leave,
    toggleMic,
    toggleCam,
  };
}
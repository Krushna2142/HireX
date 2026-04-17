"use client";
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type RemoteStream = { userId: string; stream: MediaStream; name?: string; role?: string };

export default function useWebRTC() {
  const socketRef = useRef<Socket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      if (socketRef.current) socketRef.current.disconnect();
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function ensureLocalMedia() {
    if (localStream) return localStream;
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(s);
    return s;
  }

  function createPeerConnectionFor(userId: string) {
    if (pcsRef.current.has(userId)) return pcsRef.current.get(userId)!;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      socketRef.current?.emit('interview:ice-candidate', {
        roomId: currentRoomIdRef.current,
        targetUserId: userId,
        candidate: ev.candidate,
      });
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      setRemoteStreams((prev) => {
        const exists = prev.find((p) => p.userId === userId);
        if (exists) return prev.map((p) => (p.userId === userId ? { ...p, stream } : p));
        return [...prev, { userId, stream }];
      });
    };

    pcsRef.current.set(userId, pc);
    return pc;
  }

  const currentRoomIdRef = useRef<string | null>(null);

  async function joinRoom(roomId: string, opts?: { displayName?: string }) {
    currentRoomIdRef.current = roomId;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
    const socket = io((process.env.NEXT_PUBLIC_API_WS_URL ?? '') + '/interview', {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => console.debug('signaling connected', socket.id));

    socket.on('interview:room-snapshot', async (payload: any) => {
      await ensureLocalMedia();
      const others = payload.participants || [];
      for (const p of others) {
        if (p.userId === socket.id) continue; // safety
        // Create peer connection and offer to each existing participant
        const pc = createPeerConnectionFor(p.userId);
        localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream!));
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('interview:offer', { roomId, targetUserId: p.userId, sdp: offer });
        } catch (err) {
          console.warn('offer error', err);
        }
      }
    });

    socket.on('interview:user-joined', async (evt: any) => {
      // new participant joined — create PC and send offer
      const p = evt.participant;
      if (!p || p.userId === socket.id) return;
      await ensureLocalMedia();
      const pc = createPeerConnectionFor(p.userId);
      localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream!));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('interview:offer', { roomId, targetUserId: p.userId, sdp: offer });
    });

    socket.on('interview:offer', async (msg: any) => {
      const from = msg.fromUserId;
      const sdp = msg.sdp;
      await ensureLocalMedia();
      const pc = createPeerConnectionFor(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream!));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('interview:answer', { roomId, targetUserId: from, sdp: answer });
    });

    socket.on('interview:answer', async (msg: any) => {
      const from = msg.fromUserId;
      const sdp = msg.sdp;
      const pc = pcsRef.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('interview:ice-candidate', async (msg: any) => {
      const from = msg.fromUserId;
      const cand = msg.candidate;
      const pc = pcsRef.current.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('addIceCandidate error', err);
      }
    });

    socket.on('interview:user-left', (evt: any) => {
      const userId = evt.userId;
      const pc = pcsRef.current.get(userId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(userId);
      }
      setRemoteStreams((prev) => prev.filter((r) => r.userId !== userId));
    });

    socket.on('interview:chat-message', (msg: any) => {
      // TODO: expose chat through hook return value
      console.debug('chat', msg);
    });

    // finally join the room via signaling
    socket.emit('interview:join-room', { roomId, name: opts?.displayName });
  }

  async function leaveRoom(roomId: string) {
    if (socketRef.current) {
      socketRef.current.emit('interview:leave-room', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    setRemoteStreams([]);
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
  }

  function toggleMic() {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsMicOn(t.enabled);
    });
  }

  function toggleCam() {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsCamOn(t.enabled);
    });
  }

  return {
    localStream,
    remoteStreams,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCam,
    isMicOn,
    isCamOn,
  };
}

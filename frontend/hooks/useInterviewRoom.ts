'use client';
/**
 * useInterviewRoom — owns all real-time media/signaling for the interview room.
 * start() now accepts pre-join mic/camera preferences so the green-room toggles
 * carry into the live room (join muted / camera-off is respected by peers).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { createInterviewSocket, emitAck } from '@/lib/interview-socket';
import { refreshAccessToken } from '@/lib/auth';

export type RoomStatus =
  | 'idle' | 'starting' | 'connecting' | 'joined' | 'reconnecting'
  | 'rejected' | 'ended' | 'replaced' | 'error';
export type PeerLink = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export interface RoomPeer {
  userId: string; name: string; role: string;
  micOn: boolean; camOn: boolean; screenSharing: boolean;
  connected: boolean; link: PeerLink; stream: MediaStream | null;
}
export interface RoomChatMessage {
  id: string; clientId: string | null; senderId: string; senderName: string;
  role: string; message: string; createdAt: string;
}
export interface RoomError { code: string; message: string; opensAt?: string; scheduledAt?: string | null }
export interface RemoteTranscript { userId: string; name: string; role: string; text: string; ts: number }
export interface JoinPreferences { micOn?: boolean; camOn?: boolean }
export interface UseInterviewRoomOptions {
  roomId: string;
  onRemoteTranscript?: (line: RemoteTranscript) => void;
  onRoomEnded?: () => void;
}

type PeerEntry = {
  pc: RTCPeerConnection; polite: boolean; makingOffer: boolean; ignoreOffer: boolean;
  pending: RTCIceCandidateInit[]; stream: MediaStream;
  restartTimer: ReturnType<typeof setTimeout> | null; iceRestarts: number;
  bindLocalAfterOffer: boolean;
};
type WireDescription = RTCSessionDescriptionInit & { rebuild?: boolean };
type ServerPeer = {
  userId: string; name: string; role: string; micOn: boolean; camOn: boolean;
  screenSharing: boolean; connected: boolean;
};
type JoinAck =
  | { ok: true; userId: string; isHost: boolean; hostUserId: string | null; recording: boolean;
      resumed: boolean; iceServers: RTCIceServer[]; participants: ServerPeer[] }
  | { ok: false; code: string; message: string; opensAt?: string; scheduledAt?: string | null };

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true, noiseSuppression: true, autoGainControl: true,
};
const DEFAULT_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function newInstanceId(): string {
  try { return crypto.randomUUID(); }
  catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
}
function defaultPeer(userId: string): RoomPeer {
  return { userId, name: 'Participant', role: 'candidate', micOn: true, camOn: true,
    screenSharing: false, connected: true, link: 'new', stream: null };
}
async function acquireMedia(): Promise<MediaStream | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('Camera and microphone need a secure connection (https:// or localhost).'), { name: 'InsecureContext' });
  }
  const attempts: MediaStreamConstraints[] = [
    { video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }, audio: AUDIO_CONSTRAINTS },
    { video: false, audio: AUDIO_CONSTRAINTS },
  ];
  for (const constraints of attempts) {
    try { return await navigator.mediaDevices.getUserMedia(constraints); }
    catch (e) {
      const name = (e as Error).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') throw e;
    }
  }
  return null;
}

export function useInterviewRoom(options: UseInterviewRoomOptions) {
  const { roomId } = options;
  const optsRef = useRef(options);
  optsRef.current = options;

  const [status, setStatus] = useState<RoomStatus>('idle');
  const [error, setError] = useState<RoomError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RoomPeer>>({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasCamera, setHasCamera] = useState(true);
  const [hasMic, setHasMic] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chat, setChat] = useState<RoomChatMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const instanceIdRef = useRef('');
  const selfIdRef = useRef<string | null>(null);
  const hostIdRef = useRef<string | null>(null);
  const pcsRef = useRef<Map<string, PeerEntry>>(new Map());
  const earlyIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const rebuildCountRef = useRef<Map<string, number>>(new Map());
  const rebuildFlagRef = useRef<Set<string>>(new Set());
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RoomPeer>>({});
  const micRef = useRef(true);
  const camRef = useRef(true);
  const startedRef = useRef(false);
  const leavingRef = useRef(false);
  const everJoinedRef = useRef(false);
  const connectErrorsRef = useRef(0);
  const authRetriesRef = useRef(0);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<{ rec: MediaRecorder; ctx: AudioContext; chunks: Blob[] } | null>(null);

  const setPeersSynced = useCallback((updater: (prev: Record<string, RoomPeer>) => Record<string, RoomPeer>) => {
    setPeers((prev) => { const next = updater(prev); peersRef.current = next; return next; });
  }, []);
  const upsertPeer = useCallback((patch: Partial<RoomPeer> & { userId: string }) => {
    setPeersSynced((prev) => ({ ...prev, [patch.userId]: { ...(prev[patch.userId] ?? defaultPeer(patch.userId)), ...patch } }));
  }, [setPeersSynced]);
  const removePeerState = useCallback((userId: string) => {
    setPeersSynced((prev) => {
      if (!(userId in prev)) return prev;
      const { [userId]: _gone, ...rest } = prev;
      return rest;
    });
  }, [setPeersSynced]);
  const notify = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5000);
  }, []);
  const emit = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    socketRef.current?.emit(event, { roomId, ...payload });
  }, [roomId]);

  const cameraTrack = () => localStreamRef.current?.getVideoTracks()[0] ?? null;
  const micTrack = () => localStreamRef.current?.getAudioTracks()[0] ?? null;
  const outgoingVideoTrack = () => screenStreamRef.current?.getVideoTracks()[0] ?? cameraTrack();

  const attachLocalTracks = (entry: PeerEntry, answerer = false) => {
    const { pc } = entry;
    const stream = localStreamRef.current;
    const audio = micTrack();
    const video = outgoingVideoTrack();
    if (audio) pc.addTrack(audio, stream ?? new MediaStream([audio]));
    else if (!answerer) pc.addTransceiver('audio', { direction: 'recvonly' });
    if (video) pc.addTrack(video, stream ?? new MediaStream([video]));
    else if (!answerer) pc.addTransceiver('video', { direction: 'recvonly' });
  };
  const attachVideo = async (entry: PeerEntry, track: MediaStreamTrack | null) => {
    const tr = entry.pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
    if (tr) {
      await tr.sender.replaceTrack(track);
      if (track && (tr.direction === 'recvonly' || tr.direction === 'inactive')) tr.direction = 'sendrecv';
    } else if (track) {
      entry.pc.addTrack(track, localStreamRef.current ?? new MediaStream([track]));
    }
  };

  const sendDescription = (userId: string, type: 'offer' | 'answer', d: RTCSessionDescriptionInit, rebuild = false) => {
    const sdp: WireDescription = { type: d.type, sdp: d.sdp, ...(rebuild ? { rebuild: true } : {}) };
    emit(type === 'offer' ? 'interview:offer' : 'interview:answer', { targetUserId: userId, sdp });
  };
  const closePeer = useCallback((userId: string, opts: { keepState?: boolean } = {}) => {
    const entry = pcsRef.current.get(userId);
    if (entry) {
      if (entry.restartTimer) clearTimeout(entry.restartTimer);
      entry.pc.onicecandidate = null; entry.pc.ontrack = null;
      entry.pc.onnegotiationneeded = null; entry.pc.onconnectionstatechange = null;
      entry.pc.oniceconnectionstatechange = null;
      try { entry.pc.close(); } catch { /* already closed */ }
      pcsRef.current.delete(userId);
    }
    earlyIceRef.current.delete(userId);
    if (!opts.keepState) removePeerState(userId);
  }, [removePeerState]);

  const restartIce = (userId: string) => {
    const entry = pcsRef.current.get(userId);
    if (!entry || entry.pc.signalingState === 'closed') return;
    entry.iceRestarts += 1;
    try {
      if (typeof entry.pc.restartIce === 'function') entry.pc.restartIce();
      else void (async () => {
        entry.makingOffer = true;
        try {
          await entry.pc.setLocalDescription(await entry.pc.createOffer({ iceRestart: true }));
          sendDescription(userId, 'offer', entry.pc.localDescription!);
        } finally { entry.makingOffer = false; }
      })();
    } catch { /* next recovery step handles it */ }
  };
  const startPeerRef = useRef<(userId: string, rebuild?: boolean) => void>(() => {});
  const scheduleRecovery = (userId: string, delayMs: number) => {
    const entry = pcsRef.current.get(userId);
    if (!entry || entry.restartTimer || leavingRef.current) return;
    entry.restartTimer = setTimeout(() => {
      entry.restartTimer = null;
      if (pcsRef.current.get(userId) !== entry) return;
      if (entry.pc.connectionState === 'connected') return;
      if (entry.iceRestarts < 2) { restartIce(userId); scheduleRecovery(userId, 8000); return; }
      const rebuilds = rebuildCountRef.current.get(userId) ?? 0;
      if (rebuilds < 2) {
        rebuildCountRef.current.set(userId, rebuilds + 1);
        closePeer(userId, { keepState: true });
        startPeerRef.current(userId, true);
        return;
      }
      upsertPeer({ userId, link: 'failed' });
    }, delayMs);
  };
  const flushPending = async (entry: PeerEntry) => {
    const queued = entry.pending.splice(0);
    for (const c of queued) { try { await entry.pc.addIceCandidate(c); } catch { /* stale */ } }
  };
  const createPeerEntry = (userId: string, bindLocalAfterOffer: boolean): PeerEntry => {
    const selfId = selfIdRef.current ?? '';
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 4, bundlePolicy: 'max-bundle' });
    const entry: PeerEntry = {
      pc, polite: selfId < userId, makingOffer: false, ignoreOffer: false,
      pending: earlyIceRef.current.get(userId) ?? [], stream: new MediaStream(),
      restartTimer: null, iceRestarts: 0, bindLocalAfterOffer,
    };
    earlyIceRef.current.delete(userId);
    pcsRef.current.set(userId, entry);
    pc.onicecandidate = (e) => {
      if (e.candidate) emit('interview:ice-candidate', { targetUserId: userId, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (!entry.stream.getTracks().some((t) => t.id === e.track.id)) entry.stream.addTrack(e.track);
      upsertPeer({ userId, stream: entry.stream });
      e.track.onunmute = () => upsertPeer({ userId, stream: entry.stream });
    };
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          const rebuild = rebuildFlagRef.current.delete(userId);
          sendDescription(userId, 'offer', pc.localDescription, rebuild);
        }
      } catch (err) { console.warn('[room] negotiation failed', err); }
      finally { entry.makingOffer = false; }
    };
    const onState = () => {
      const s = pc.connectionState; const ice = pc.iceConnectionState;
      const link: PeerLink =
        s === 'connected' || ice === 'connected' || ice === 'completed' ? 'connected'
        : s === 'failed' || ice === 'failed' ? 'failed'
        : s === 'disconnected' || ice === 'disconnected' ? 'disconnected'
        : s === 'closed' ? 'closed'
        : s === 'connecting' || ice === 'checking' ? 'connecting' : 'new';
      upsertPeer({ userId, link });
      if (link === 'connected') {
        if (entry.restartTimer) { clearTimeout(entry.restartTimer); entry.restartTimer = null; }
        entry.iceRestarts = 0; rebuildCountRef.current.delete(userId);
      } else if (link === 'failed') scheduleRecovery(userId, 500);
      else if (link === 'disconnected') scheduleRecovery(userId, 4000);
    };
    pc.onconnectionstatechange = onState;
    pc.oniceconnectionstatechange = onState;
    return entry;
  };
  const startPeer = useCallback((userId: string, rebuild = false) => {
    if (pcsRef.current.has(userId)) return;
    if (rebuild) rebuildFlagRef.current.add(userId);
    const entry = createPeerEntry(userId, false);
    upsertPeer({ userId, link: 'connecting' });
    attachLocalTracks(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  startPeerRef.current = startPeer;

  const handleDescription = async (from: string, desc: WireDescription) => {
    let entry = pcsRef.current.get(from);
    if (entry && desc.type === 'offer' && desc.rebuild) {
      const holdingOwnOffer = !entry.polite && entry.pc.signalingState === 'have-local-offer';
      if (!holdingOwnOffer) { closePeer(from, { keepState: true }); entry = undefined; }
    }
    if (!entry) {
      if (desc.type !== 'offer') return;
      entry = createPeerEntry(from, true);
      upsertPeer({ userId: from, link: 'connecting' });
    }
    const e = entry; const { pc } = e;
    const collision = desc.type === 'offer' && (e.makingOffer || pc.signalingState !== 'stable');
    e.ignoreOffer = !e.polite && collision;
    if (e.ignoreOffer) return;
    try {
      await pc.setRemoteDescription({ type: desc.type, sdp: desc.sdp });
      await flushPending(e);
      if (desc.type === 'offer') {
        if (e.bindLocalAfterOffer) { e.bindLocalAfterOffer = false; attachLocalTracks(e, true); }
        await pc.setLocalDescription();
        if (pc.localDescription) sendDescription(from, 'answer', pc.localDescription);
      }
    } catch (err) {
      console.warn('[room] failed to apply remote description', err);
      scheduleRecovery(from, 1500);
    }
  };

  const stopScreenShare = useCallback(async () => {
    const screen = screenStreamRef.current;
    if (!screen) return;
    screenStreamRef.current = null;
    setScreenStream(null);
    screen.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    const cam = cameraTrack();
    if (cam) cam.enabled = camRef.current;
    await Promise.all([...pcsRef.current.values()].map((e) => attachVideo(e, cam).catch(() => {})));
    setScreenSharing(false);
    emit('interview:toggle-media', { screenSharing: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emit]);

  const toggleScreenShare = useCallback(async () => {
    if (screenStreamRef.current) { await stopScreenShare(); return; }
    if (!navigator.mediaDevices?.getDisplayMedia) { notify('Screen sharing is not supported in this browser.'); return; }
    try {
      const displayOptions: DisplayMediaStreamOptions & {
        selfBrowserSurface?: 'include' | 'exclude';
        surfaceSwitching?: 'include' | 'exclude';
        monitorTypeSurfaces?: 'include' | 'exclude';
      } = {
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
        monitorTypeSurfaces: 'include',
      };
      const screen = await navigator.mediaDevices.getDisplayMedia(displayOptions);
      const track = screen.getVideoTracks()[0];
      if ('contentHint' in track) track.contentHint = 'detail';
      track.onended = () => void stopScreenShare();
      screenStreamRef.current = screen;
      setScreenStream(screen);
      await Promise.all([...pcsRef.current.values()].map((e) => attachVideo(e, track).catch(() => {})));
      setScreenSharing(true);
      emit('interview:toggle-media', { screenSharing: true });
    } catch (err) {
      if ((err as Error).name !== 'NotAllowedError') notify('Could not start screen sharing.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emit, notify, stopScreenShare]);

  const toggleMic = useCallback(() => {
    const track = micTrack();
    if (!track) { notify('No microphone available.'); return; }
    const next = !micRef.current;
    track.enabled = next; micRef.current = next; setMicOn(next);
    emit('interview:toggle-media', { micOn: next });
  }, [emit, notify]);

  const toggleCam = useCallback(() => {
    const track = cameraTrack();
    if (!track) { notify('No camera available.'); return; }
    const next = !camRef.current;
    track.enabled = next; camRef.current = next; setCamOn(next);
    emit('interview:toggle-media', { camOn: next });
  }, [emit, notify]);

  const sendChat = useCallback(async (text: string) => {
    const socket = socketRef.current;
    const message = text.trim();
    if (!socket || !message) return;
    try {
      const res = await emitAck<{ ok: boolean; message?: string }>(socket, 'interview:chat-message', {
        roomId, message, clientId: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });
      if (!res.ok) notify(res.message ?? 'Message could not be sent.');
    } catch { notify('Message not sent — you appear to be offline.'); }
  }, [roomId, notify]);

  const sendTranscript = useCallback((text: string) => {
    if (text.trim()) emit('interview:transcript', { text, ts: Date.now() });
  }, [emit]);

  const stopLocalRecording = () => {
    const r = recorderRef.current;
    if (!r) return;
    recorderRef.current = null;
    try { if (r.rec.state !== 'inactive') r.rec.stop(); } catch { /* ignore */ }
  };
  const startLocalRecording = (): boolean => {
    if (typeof MediaRecorder === 'undefined') return false;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const dest = ctx.createMediaStreamDestination();
      const addAudio = (s: MediaStream | null) => {
        const tracks = s?.getAudioTracks() ?? [];
        if (tracks.length) ctx.createMediaStreamSource(new MediaStream(tracks)).connect(dest);
      };
      addAudio(localStreamRef.current);
      pcsRef.current.forEach((e) => addAudio(e.stream));
      const remoteVideo = [...pcsRef.current.values()].map((e) => e.stream.getVideoTracks()[0]).find(Boolean);
      const video = remoteVideo ?? cameraTrack();
      const mixed = new MediaStream([...(video ? [video] : []), ...dest.stream.getAudioTracks()]);
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(mixed, mime ? { mimeType: mime, videoBitsPerSecond: 2_000_000 } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      rec.onstop = () => {
        void ctx.close().catch(() => {});
        if (!chunks.length) return;
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-${roomId}-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15_000);
      };
      rec.start(5000);
      recorderRef.current = { rec, ctx, chunks };
      return true;
    } catch (err) { console.warn('[room] recording could not start', err); return false; }
  };
  const toggleRecording = useCallback(async () => {
    if (selfIdRef.current !== hostIdRef.current) return;
    const socket = socketRef.current;
    if (!socket) return;
    if (recorderRef.current) {
      stopLocalRecording();
      await emitAck(socket, 'interview:recording-status', { roomId, recording: false }).catch(() => {});
      return;
    }
    if (!startLocalRecording()) { notify('Recording is not supported in this browser.'); return; }
    try {
      const res = await emitAck<{ ok: boolean }>(socket, 'interview:recording-status', { roomId, recording: true });
      if (!res.ok) { stopLocalRecording(); notify('Could not start recording.'); }
    } catch { stopLocalRecording(); notify('Could not start recording.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, notify]);

  const teardown = useCallback(() => {
    stopLocalRecording();
    pcsRef.current.forEach((_e, id) => closePeer(id, { keepState: true }));
    pcsRef.current.clear(); earlyIceRef.current.clear(); rebuildCountRef.current.clear();
    screenStreamRef.current?.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    screenStreamRef.current = null; setScreenStream(null);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null; setLocalStream(null);
    setScreenSharing(false); setSpeaking(new Set());
    const socket = socketRef.current;
    if (socket) { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; }
    startedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePeer]);

  const leave = useCallback(async () => {
    leavingRef.current = true;
    const socket = socketRef.current;
    if (socket?.connected) { try { await emitAck(socket, 'interview:leave-room', { roomId }, 2000); } catch { /* grace window */ } }
    teardown(); setStatus('idle');
  }, [roomId, teardown]);

  const endRoom = useCallback(async (): Promise<boolean> => {
    leavingRef.current = true;
    const socket = socketRef.current;
    let ok = true;
    if (socket?.connected) {
      try {
        const res = await emitAck<{ ok: boolean; message?: string }>(socket, 'interview:end-room', { roomId }, 5000);
        ok = !!res.ok;
        if (!ok) notify(res.message ?? 'Could not end the interview.');
      } catch { ok = false; }
    }
    teardown();
    return ok;
  }, [roomId, teardown, notify]);

  const performJoin = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;
    let res: JoinAck;
    try {
      res = await emitAck<JoinAck>(socket, 'interview:join-room', {
        roomId, instanceId: instanceIdRef.current, micOn: micRef.current, camOn: camRef.current,
      });
    } catch { socket.disconnect().connect(); return; }
    if (!res.ok) {
      if (res.code === 'unauthorized' && authRetriesRef.current < 2) {
        authRetriesRef.current += 1;
        await refreshAccessToken().catch(() => null);
        socket.disconnect().connect(); return;
      }
      setError({ code: res.code, message: res.message, opensAt: res.opensAt, scheduledAt: res.scheduledAt });
      setStatus('rejected'); leavingRef.current = true; teardown(); return;
    }
    authRetriesRef.current = 0; connectErrorsRef.current = 0; everJoinedRef.current = true;
    selfIdRef.current = res.userId; hostIdRef.current = res.hostUserId;
    setSelfUserId(res.userId); setHostUserId(res.hostUserId); setRecording(res.recording);
    iceServersRef.current = res.iceServers?.length ? res.iceServers : DEFAULT_ICE;
    const others = res.participants.filter((p) => p.userId !== res.userId);
    const present = new Set(others.map((p) => p.userId));
    [...pcsRef.current.keys()].forEach((id) => { if (!present.has(id)) closePeer(id); });
    for (const p of others) {
      upsertPeer({ ...p });
      const entry = pcsRef.current.get(p.userId);
      if (!entry) startPeer(p.userId);
      else if (['failed', 'closed', 'disconnected'].includes(entry.pc.connectionState)) scheduleRecovery(p.userId, 300);
    }
    setStatus('joined');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, closePeer, upsertPeer, startPeer, teardown]);

  const start = useCallback(async (prefs?: JoinPreferences) => {
    if (startedRef.current) return;
    startedRef.current = true; leavingRef.current = false; everJoinedRef.current = false;
    connectErrorsRef.current = 0; authRetriesRef.current = 0;
    setError(null); setChat([]); setStatus('starting');
    let stream: MediaStream | null = null;
    try { stream = await acquireMedia(); }
    catch (e) {
      const name = (e as Error).name;
      startedRef.current = false; setStatus('error');
      setError({
        code: name === 'NotAllowedError' ? 'media_denied' : 'media_unavailable',
        message: name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Camera / microphone permission was denied. Allow access in your browser’s address bar and try again.'
          : (e as Error).message || 'Could not access your camera or microphone.',
      });
      return;
    }
    localStreamRef.current = stream; setLocalStream(stream);
    const micAvailable = !!stream?.getAudioTracks().length;
    const camAvailable = !!stream?.getVideoTracks().length;
    // Pre-join choices win: join muted / camera-off when the user asked for it.
    const micEnabled = micAvailable && (prefs?.micOn ?? true);
    const camEnabled = camAvailable && (prefs?.camOn ?? true);
    stream?.getAudioTracks().forEach((t) => { t.enabled = micEnabled; });
    stream?.getVideoTracks().forEach((t) => { t.enabled = camEnabled; });
    micRef.current = micEnabled; camRef.current = camEnabled;
    setMicOn(micEnabled); setCamOn(camEnabled);
    setHasCamera(camAvailable); setHasMic(micAvailable);
    if (!camAvailable) notify('No camera detected — joining with audio only.');
    instanceIdRef.current = newInstanceId();
    setStatus('connecting');
    const socket = createInterviewSocket();
    socketRef.current = socket;
    socket.on('connect', () => void performJoin());
    socket.on('disconnect', (reason) => {
      if (leavingRef.current) return;
      if (reason === 'io server disconnect') return;
      setStatus((s) => (s === 'joined' ? 'reconnecting' : s));
    });
    socket.on('connect_error', async (err: Error) => {
      if (err.message?.startsWith('unauthorized')) {
        if (authRetriesRef.current >= 2) {
          setError({ code: 'unauthorized', message: 'Your session expired. Please sign in again.' });
          setStatus('error'); leavingRef.current = true; teardown(); return;
        }
        authRetriesRef.current += 1;
        await refreshAccessToken().catch(() => null);
        socketRef.current?.connect(); return;
      }
      connectErrorsRef.current += 1;
      if (!everJoinedRef.current && connectErrorsRef.current >= 6) {
        setError({ code: 'server_unreachable', message: 'Cannot reach the interview server. Check your connection and try again.' });
        setStatus('error'); leavingRef.current = true; teardown();
      }
    });
    socket.on('interview:user-joined', ({ participant }: { participant: ServerPeer }) => {
      closePeer(participant.userId, { keepState: true });
      upsertPeer({ ...participant, stream: null, link: 'new' });
    });
    socket.on('interview:user-left', ({ userId }: { userId: string }) => closePeer(userId));
    socket.on('interview:user-connection', ({ userId, connected }: { userId: string; connected: boolean }) => {
      if (userId !== selfIdRef.current) upsertPeer({ userId, connected });
    });
    socket.on('interview:user-media-toggled', (p: { userId: string; micOn: boolean; camOn: boolean; screenSharing: boolean }) => {
      upsertPeer({ userId: p.userId, micOn: p.micOn, camOn: p.camOn, screenSharing: p.screenSharing });
    });
    socket.on('interview:offer', (m: { fromUserId: string; sdp: WireDescription }) => void handleDescription(m.fromUserId, m.sdp));
    socket.on('interview:answer', (m: { fromUserId: string; sdp: WireDescription }) => void handleDescription(m.fromUserId, m.sdp));
    socket.on('interview:ice-candidate', async (m: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const entry = pcsRef.current.get(m.fromUserId);
      if (!entry) {
        const q = earlyIceRef.current.get(m.fromUserId) ?? [];
        q.push(m.candidate); earlyIceRef.current.set(m.fromUserId, q); return;
      }
      if (!entry.pc.remoteDescription) { entry.pending.push(m.candidate); return; }
      try { await entry.pc.addIceCandidate(m.candidate); }
      catch (err) { if (!entry.ignoreOffer) console.warn('[room] addIceCandidate failed', err); }
    });
    socket.on('interview:chat-message', (m: RoomChatMessage) => {
      setChat((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-499), m]));
    });
    socket.on('interview:recording-status', (m: { recording: boolean }) => {
      setRecording(!!m.recording);
      if (!m.recording) stopLocalRecording();
    });
    socket.on('interview:transcript', (m: RemoteTranscript) => optsRef.current.onRemoteTranscript?.(m));
    socket.on('interview:session-replaced', () => { leavingRef.current = true; teardown(); setStatus('replaced'); });
    socket.on('interview:room-ended', () => { leavingRef.current = true; teardown(); setStatus('ended'); optsRef.current.onRoomEnded?.(); });
    socket.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performJoin, closePeer, upsertPeer, teardown, notify]);

  useEffect(() => {
    if (status !== 'joined' && status !== 'reconnecting') return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let ctx: AudioContext;
    try { ctx = new AC(); } catch { return; }
    type Tap = { analyser: AnalyserNode; src: MediaStreamAudioSourceNode; stream: MediaStream; buf: Uint8Array; lastLoud: number };
    const taps = new Map<string, Tap>();
    let lastKey = '';
    const sync = (id: string, stream: MediaStream | null) => {
      const existing = taps.get(id);
      if (!stream || !stream.getAudioTracks().length) {
        if (existing) { existing.src.disconnect(); taps.delete(id); }
        return;
      }
      if (existing && existing.stream === stream) return;
      existing?.src.disconnect();
      const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
      const analyser = ctx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
      taps.set(id, { analyser, src, stream, buf: new Uint8Array(analyser.fftSize), lastLoud: 0 });
    };
    const timer = window.setInterval(() => {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      sync('local', localStreamRef.current);
      pcsRef.current.forEach((e, id) => sync(id, e.stream));
      [...taps.keys()].forEach((id) => {
        if (id !== 'local' && !pcsRef.current.has(id)) { taps.get(id)?.src.disconnect(); taps.delete(id); }
      });
      const now = performance.now();
      const active: string[] = [];
      taps.forEach((tap, id) => {
        tap.analyser.getByteTimeDomainData(tap.buf as any as Uint8Array<ArrayBuffer >);
        let sum = 0;
        for (let i = 0; i < tap.buf.length; i++) { const v = (tap.buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / tap.buf.length);
        const micIsOn = id === 'local' ? micRef.current : peersRef.current[id]?.micOn !== false;
        if (rms > 0.04 && micIsOn) tap.lastLoud = now;
        if (now - tap.lastLoud < 450) active.push(id);
      });
      const key = active.sort().join('|');
      if (key !== lastKey) { lastKey = key; setSpeaking(new Set(active)); }
    }, 200);
    return () => { window.clearInterval(timer); taps.forEach((t) => t.src.disconnect()); void ctx.close().catch(() => {}); };
  }, [status]);

  useEffect(() => {
    const onOnline = () => {
      const s = socketRef.current;
      if (s && !s.connected && !leavingRef.current) s.connect();
      pcsRef.current.forEach((e, id) => { if (e.pc.connectionState !== 'connected') scheduleRecovery(id, 500); });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (status !== 'joined' && status !== 'reconnecting') return;
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [status]);
  useEffect(() => () => {
    leavingRef.current = true;
    const socket = socketRef.current;
    if (socket?.connected) socket.emit('interview:leave-room', { roomId });
    teardown();
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconnectPeer = useCallback((userId: string) => {
    rebuildCountRef.current.delete(userId);
    closePeer(userId, { keepState: true });
    startPeer(userId, true);
  }, [closePeer, startPeer]);

  const peerList = useMemo(() => Object.values(peers), [peers]);
  return {
    status, error, notice, localStream, screenStream, peers: peerList,
    micOn, camOn, hasCamera, hasMic, screenSharing, chat, recording,
    hostUserId, selfUserId, isHost: !!selfUserId && selfUserId === hostUserId, speaking,
    start, leave, endRoom, toggleMic, toggleCam, toggleScreenShare, toggleRecording,
    sendChat, sendTranscript, reconnectPeer,
  };
}
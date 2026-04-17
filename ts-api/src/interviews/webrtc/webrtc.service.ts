/**
 * WebRTC Service
 * File: ts-api/src/interviews/webrtc/webrtc.service.ts
 *
 * Purpose: Orchestrate WebRTC peer connections, track state, manage lifecycle
 *
 * Responsibilities:
 * - Create/destroy RTCPeerConnections
 * - Track local and remote media streams
 * - Handle offer/answer collisions (polite peer model)
 * - Manage ICE candidate buffering
 * - Collect and report connection metrics
 * - Log all significant events
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICECandidateBuffer } from './ice-candidate-buffer';
import {
  ConnectionMetricsService,
  ConnectionMetrics,
} from './connection-metrics';

interface RTCConfiguration {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

interface PeerConnectionState {
  pc: RTCPeerConnection;
  iceBuffer: ICECandidateBuffer;
  makingOffer: boolean;
  ignoreOffer: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  metrics: ConnectionMetrics | null;
  lastMetricsCollected: number;
  createdAt: number;
  connectedAt?: number;
  metricsIntervalHandle?: NodeJS.Timeout; // ✅ Proper Node.js timer type
}

@Injectable()
export class WebRTCService {
  private readonly logger = new Logger(WebRTCService.name);
  private peers = new Map<string, PeerConnectionState>();
  private metricsService: ConnectionMetricsService;
  private metricsIntervals: Map<string, NodeJS.Timeout> = new Map(); // ✅ Fixed

  private rtcConfig: RTCConfiguration;

  constructor(private readonly config: ConfigService) {
    this.metricsService = new ConnectionMetricsService();

    // Parse TURN servers from config
    const webrtcConfig = this.config.get('webrtc');
    const iceServers = webrtcConfig?.iceServers ?? [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    this.rtcConfig = {
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle' as RTCBundlePolicy,
      rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    };

    this.logger.log(
      `WebRTC Service initialized with ${iceServers.length} ICE servers`,
    );
  }

  /**
   * Create a new peer connection for a remote user
   * Follows polite peer model for collision handling
   */
  createPeerConnection(peerId: string, isPolite: boolean): RTCPeerConnection {
    // Clean up any existing connection first
    if (this.peers.has(peerId)) {
      this.logger.warn(`[WebRTC] Recreating peer connection for ${peerId}`);
      this.closePeerConnection(peerId);
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    const state: PeerConnectionState = {
      pc,
      iceBuffer: new ICECandidateBuffer(peerId),
      makingOffer: false,
      ignoreOffer: !isPolite,
      localStream: null,
      remoteStreams: new Map(),
      metrics: null,
      lastMetricsCollected: 0,
      createdAt: Date.now(),
    };

    this.peers.set(peerId, state);
    this.setupPCHandlers(pc, peerId, state);
    this.startMetricsCollection(peerId);

    this.logger.debug(
      `[WebRTC] Created peer connection: ${peerId} (polite: ${isPolite})`,
    );
    return pc;
  }

  /**
   * Set up all event handlers for a peer connection
   */
  private setupPCHandlers(
    pc: RTCPeerConnection,
    peerId: string,
    state: PeerConnectionState,
  ): void {
    // ICE candidate handling
    pc.onicecandidate = (evt) => {
      if (!evt.candidate) {
        this.logger.debug(`[WebRTC:${peerId}] ICE gathering complete`);
        return;
      }
      this.logger.debug(
        `[WebRTC:${peerId}] ICE candidate: ${evt.candidate.candidate.substring(0, 50)}...`,
      );
      // Candidate will be emitted via Socket.IO by the gateway
    };

    pc.onicecandidateerror = (evt: any) => {
      // Error code 701 = mDNS candidate error (non-critical)
      if (evt.errorCode !== 701) {
        this.logger.warn(
          `[WebRTC:${peerId}] ICE candidate error ${evt.errorCode}: ${evt.errorText}`,
        );
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      this.logger.log(
        `[WebRTC:${peerId}] Connection state: ${pc.connectionState} (ICE: ${pc.iceConnectionState})`,
      );

      if (pc.connectionState === 'connected' && !state.connectedAt) {
        state.connectedAt = Date.now();
        this.logger.log(
          `[WebRTC:${peerId}] Connected after ${state.connectedAt - state.createdAt}ms`,
        );
      }

      if (pc.connectionState === 'failed') {
        this.logger.warn(
          `[WebRTC:${peerId}] Connection failed, attempting ICE restart`,
        );
        pc.restartIce();
      }

      if (
        pc.connectionState === 'closed' ||
        pc.connectionState === 'disconnected'
      ) {
        if (pc.connectionState === 'closed') {
          this.closePeerConnection(peerId);
        }
      }
    };

    // Signaling state for collision detection
    pc.onsignalingstatechange = () => {
      this.logger.debug(
        `[WebRTC:${peerId}] Signaling state: ${pc.signalingState}`,
      );
    };

    // Remote track arrival
    pc.ontrack = (evt: RTCTrackEvent) => {
      const [stream] = evt.streams;
      if (!stream) return;

      const trackKind = evt.track.kind;
      this.logger.log(`[WebRTC:${peerId}] Received ${trackKind} track`);

      // Store remote stream (indexed by streamId for potential multi-stream support)
      state.remoteStreams.set(stream.id, stream);
    };

    // Negotiation needed
    pc.onnegotiationneeded = async () => {
      if (state.makingOffer || pc.signalingState !== 'stable') {
        this.logger.debug(
          `[WebRTC:${peerId}] Negotiation skipped (makingOffer: ${state.makingOffer}, state: ${pc.signalingState})`,
        );
        return;
      }

      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();

        if (pc.signalingState !== 'stable') {
          this.logger.warn(
            `[WebRTC:${peerId}] Signaling state changed during createOffer, aborting`,
          );
          return;
        }

        await pc.setLocalDescription(offer);
        this.logger.debug(`[WebRTC:${peerId}] Created and set local offer`);
        // Offer will be sent via Socket.IO by the gateway
      } catch (err) {
        this.logger.error(`[WebRTC:${peerId}] Negotiation error: ${String(err)}`);
      } finally {
        state.makingOffer = false;
      }
    };
  }

  /**
   * Handle incoming SDP offer with collision detection
   */
  async handleOffer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<{ answer?: RTCSessionDescriptionInit; error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    const { pc } = state;

    // Collision detection (offer collision in non-stable state)
    const offerCollision =
      sdp.type === 'offer' &&
      (state.makingOffer || pc.signalingState !== 'stable');

    if (offerCollision) {
      // Polite peer: rollback and accept; Impolite peer: ignore
      if (state.ignoreOffer) {
        this.logger.debug(
          `[WebRTC:${peerId}] Ignoring colliding offer (impolite)`,
        );
        state.ignoreOffer = false;
        return {};
      }

      this.logger.debug(
        `[WebRTC:${peerId}] Collision detected, rolling back (polite)`,
      );
      try {
        await pc.setLocalDescription({ type: 'rollback' });
      } catch (err) {
        this.logger.warn(`[WebRTC:${peerId}] Rollback failed: ${String(err)}`);
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      state.iceBuffer.setDescriptionSet('remote');

      // Drain any buffered ICE candidates
      const buffered = state.iceBuffer.drain();
      for (const { candidate } of buffered) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          this.logger.warn(
            `[WebRTC:${peerId}] Failed to add buffered ICE: ${String(err)}`,
          );
        }
      }

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.logger.debug(`[WebRTC:${peerId}] Created and set answer`);
      return { answer: pc.localDescription ?? undefined };
    } catch (err) {
      const msg = `Failed to handle offer: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Handle incoming SDP answer
   */
  async handleAnswer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<{ error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    try {
      await state.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      state.iceBuffer.setDescriptionSet('remote');

      // Drain buffered candidates
      const buffered = state.iceBuffer.drain();
      for (const { candidate } of buffered) {
        try {
          await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          this.logger.warn(
            `[WebRTC:${peerId}] Failed to add buffered ICE: ${String(err)}`,
          );
        }
      }

      this.logger.debug(`[WebRTC:${peerId}] Answer handled successfully`);
      return {};
    } catch (err) {
      const msg = `Failed to handle answer: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Handle incoming ICE candidate (may buffer if not ready)
   */
  async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<{ error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    try {
      // Buffer if remote description not set yet
      if (!state.iceBuffer.canAddCandidates()) {
        state.iceBuffer.add(candidate);
        this.logger.debug(`[WebRTC:${peerId}] ICE candidate buffered`);
        return {};
      }

      // Add immediately if ready
      await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
      this.logger.debug(`[WebRTC:${peerId}] ICE candidate added`);
      return {};
    } catch (err) {
      const msg = `Failed to add ICE candidate: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Add local media stream to peer connection
   */
  addLocalStream(peerId: string, stream: MediaStream): void {
    const state = this.peers.get(peerId);
    if (!state) return;

    state.localStream = stream;
    for (const track of stream.getTracks()) {
      state.pc.addTrack(track, stream);
      this.logger.debug(`[WebRTC:${peerId}] Added ${track.kind} track`);
    }
  }

  /**
   * Replace video track (for screen sharing)
   */
  async replaceVideoTrack(
    peerId: string,
    newTrack: MediaStreamTrack | null,
  ): Promise<{ error?: string }> {
    const state = this.peers.get(peerId);
    if (!state) {
      return { error: `Peer ${peerId} not found` };
    }

    try {
      const sender = state.pc
        .getSenders()
        .find((s) => s.track?.kind === 'video');

      if (!sender) {
        return { error: 'No video sender found' };
      }

      await sender.replaceTrack(newTrack);
      this.logger.debug(
        `[WebRTC:${peerId}] Video track replaced (${newTrack ? 'new' : 'none'})`,
      );
      return {};
    } catch (err) {
      const msg = `Failed to replace video track: ${String(err)}`;
      this.logger.error(`[WebRTC:${peerId}] ${msg}`);
      return { error: msg };
    }
  }

  /**
   * Get remote streams for a peer
   */
  getRemoteStreams(peerId: string): MediaStream[] {
    const state = this.peers.get(peerId);
    if (!state) return [];
    return Array.from(state.remoteStreams.values());
  }

  /**
   * Get peer connection for direct access (careful use only)
   */
  getPeerConnection(peerId: string): RTCPeerConnection | null {
    return this.peers.get(peerId)?.pc ?? null;
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(peerId: string): void {
    const state = this.peers.get(peerId);
    if (!state) return;

    // ✅ FIXED: Use NodeJS.Timeout instead of string | number | Timeout
    const interval: NodeJS.Timeout = setInterval(async () => {
      try {
        const metrics = await this.metricsService.collectMetrics(state.pc);
        if (metrics) {
          state.metrics = metrics;
          state.lastMetricsCollected = Date.now();

          // Log if quality degraded
          const quality = this.metricsService.assessQuality(metrics);
          if (quality === 'poor') {
            this.logger.warn(this.metricsService.formatMetrics(metrics));
          }
        }
      } catch (err) {
        this.logger.debug(
          `Failed to collect metrics for ${peerId}: ${String(err)}`,
        );
      }
    }, 2000); // Collect every 2 seconds

    this.metricsIntervals.set(peerId, interval);
    state.metricsIntervalHandle = interval; // Store in state too
  }

  /**
   * Get latest metrics for a peer
   */
  getMetrics(peerId: string): ConnectionMetrics | null {
    return this.peers.get(peerId)?.metrics ?? null;
  }

  /**
   * Get all peer connections (for admin endpoints)
   */
  getAllPeers(): Array<{
    peerId: string;
    connectionState: RTCPeerConnectionState;
    metrics: ConnectionMetrics | null;
  }> {
    return Array.from(this.peers.entries()).map(([peerId, state]) => ({
      peerId,
      connectionState: state.pc.connectionState,
      metrics: state.metrics,
    }));
  }

  /**
   * Close and clean up a peer connection
   */
  closePeerConnection(peerId: string): void {
    const state = this.peers.get(peerId);
    if (!state) return;

    // ✅ FIXED: Use NodeJS.Timeout type for clearInterval
    const interval = this.metricsIntervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.metricsIntervals.delete(peerId);
    }

    // Close peer connection
    state.pc.close();

    // Stop local stream tracks
    state.localStream?.getTracks().forEach((track) => track.stop());

    // Clear remote streams
    state.remoteStreams.clear();

    this.peers.delete(peerId);
    this.logger.log(`[WebRTC] Closed peer connection: ${peerId}`);
  }

  /**
   * Close all peer connections (cleanup on app shutdown)
   */
  closeAll(): void {
    for (const peerId of this.peers.keys()) {
      this.closePeerConnection(peerId);
    }
  }
}
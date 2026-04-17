/**
 * ICE Handler Utility
 * File: frontend/lib/webrtc/ice-handler.ts
 * 
 * Purpose: Manage ICE candidate buffering on frontend
 * Mirrors backend logic for critical reliability
 */

export interface BufferedCandidate {
  candidate: RTCIceCandidateInit;
  receivedAt: number;
}

type ICEState = 'idle' | 'local-set' | 'remote-set' | 'complete';

export class ICEHandler {
  private buffer: BufferedCandidate[] = [];
  private state: ICEState = 'idle';
  private maxBufferSize = 100;

  setLocalDescription(): void {
    if (this.state === 'idle') {
      this.state = 'local-set';
    }
  }

  setRemoteDescription(): void {
    if (this.state !== 'complete') {
      this.state = 'remote-set';
    }
  }

  canAddCandidates(): boolean {
    return this.state === 'remote-set' || this.state === 'complete';
  }

  bufferCandidate(candidate: RTCIceCandidateInit): void {
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift(); // Drop oldest
    }
    this.buffer.push({ candidate, receivedAt: Date.now() });
  }

  drain(): RTCIceCandidateInit[] {
    if (!this.canAddCandidates()) {
      return [];
    }

    const candidates = this.buffer.map((c) => c.candidate);
    this.buffer = [];
    this.state = 'complete';
    return candidates;
  }

  getBufferedCount(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
    this.state = 'idle';
  }
}
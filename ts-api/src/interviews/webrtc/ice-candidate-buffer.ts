/**
 * ICE Candidate Buffer & Ordering Service
 * File: ts-api/src/interviews/webrtc/ice-candidate-buffer.ts
 * 
 * Purpose: Manage ICE candidate collection and delivery in correct order
 * 
 * Problem it solves:
 * - ICE candidates arrive out of order on network
 * - Must queue candidates until remote description is set
 * - Prevents "Failed to add ICE candidate" errors
 * - Implements proper state machine for candidate delivery
 */

import { Logger } from '@nestjs/common';

export interface BufferedCandidate {
  candidate: RTCIceCandidateInit;
  receivedAt: number;
  addedAt?: number;
}

export type ICEState = 'idle' | 'local-description-set' | 'remote-description-set' | 'complete';

export class ICECandidateBuffer {
  private readonly logger = new Logger(ICECandidateBuffer.name);
  private readonly peerId: string;
  private buffer: BufferedCandidate[] = [];
  private state: ICEState = 'idle';
  private readonly maxBufferSize = 100; // Max candidates to hold

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  /**
   * Update state based on description type
   */
  setDescriptionSet(type: 'local' | 'remote'): void {
    if (type === 'local' && this.state === 'idle') {
      this.state = 'local-description-set';
    }
    if (type === 'remote' && this.state !== 'complete') {
      this.state = 'remote-description-set';
    }
  }

  /**
   * Check if candidates can be added (remote description must be set first)
   */
  canAddCandidates(): boolean {
    return this.state === 'remote-description-set' || this.state === 'complete';
  }

  /**
   * Add candidate to buffer, or queue if not ready
   */
  add(candidate: RTCIceCandidateInit): boolean {
    if (this.buffer.length >= this.maxBufferSize) {
      this.logger.warn(
        `[ICE:${this.peerId}] Buffer full (${this.maxBufferSize} candidates), dropping oldest`,
      );
      this.buffer.shift(); // Remove oldest
    }

    this.buffer.push({
      candidate,
      receivedAt: Date.now(),
    });

    this.logger.debug(
      `[ICE:${this.peerId}] Buffered candidate (total: ${this.buffer.length})`,
    );
    return true;
  }

  /**
   * Get all pending candidates that can now be added
   * Should be called after remote description is set
   */
  drain(): BufferedCandidate[] {
    if (!this.canAddCandidates()) {
      return [];
    }

    const candidates = [...this.buffer];
    const now = Date.now();
    candidates.forEach((c) => {
      c.addedAt = now;
    });

    this.logger.debug(
      `[ICE:${this.peerId}] Draining ${candidates.length} buffered candidates`,
    );

    this.buffer = [];
    this.state = 'complete';
    return candidates;
  }

  /**
   * Get buffer stats for diagnostics
   */
  getStats(): {
    buffered: number;
    state: ICEState;
    oldestCandidateAge: number | null;
  } {
    return {
      buffered: this.buffer.length,
      state: this.state,
      oldestCandidateAge: this.buffer.length > 0 ? Date.now() - this.buffer[0].receivedAt : null,
    };
  }

  /**
   * Clear buffer (when closing connection)
   */
  clear(): void {
    this.buffer = [];
    this.state = 'idle';
  }
}
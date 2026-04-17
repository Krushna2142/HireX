/**
 * SDP Negotiation Utility
 * File: frontend/lib/webrtc/sdp-negotiation.ts
 * 
 * Purpose: Handle offer/answer collision detection (polite peer model)
 * 
 * Collision Scenario:
 * - Both peers call createOffer simultaneously
 * - Offers cross in flight
 * - One peer must rollback and create answer instead
 * - Polite peer (lower ID) rolls back; Impolite keeps offer
 */

type NegotiationRole = 'polite' | 'impolite';

export interface NegotiationState {
  makingOffer: boolean;
  ignoreOffer: boolean;
}

export class SDPNegotiator {
  private state: NegotiationState = {
    makingOffer: false,
    ignoreOffer: false,
  };

  constructor(private isPolite: boolean) {}

  /**
   * Check if we should ignore an incoming offer
   * (collision detection)
   */
  shouldIgnoreOffer(pc: RTCPeerConnection): boolean {
    const hasCollision =
      this.state.makingOffer || pc.signalingState !== 'stable';

    if (!hasCollision) {
      return false;
    }

    // Impolite peer ignores colliding offers
    if (!this.isPolite) {
      this.state.ignoreOffer = false;
      return true;
    }

    // Polite peer will rollback (return false to proceed)
    return false;
  }

  /**
   * Call before creating an offer
   */
  markMakingOffer(): void {
    this.state.makingOffer = true;
  }

  /**
   * Call after offer is sent
   */
  clearMakingOffer(): void {
    this.state.makingOffer = false;
  }

  /**
   * Get current negotiation state
   */
  getState(): NegotiationState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      makingOffer: false,
      ignoreOffer: false,
    };
  }
}
/**
 * Connection Metrics Service
 * File: ts-api/src/interviews/webrtc/connection-metrics.ts
 *
 * Purpose: Track and report WebRTC connection quality metrics
 * - Inbound/outbound bitrate (kbps)
 * - Packet loss percentage
 * - Round-trip latency (RTT)
 * - Jitter measurements
 * - Audio/video codec info
 *
 * Usage: Integrated into WebRTC gateway for real-time diagnostics
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ConnectionMetrics {
  timestamp: number;
  inboundBitrate: number; // kbps
  outboundBitrate: number; // kbps
  audioPacketsLost: number;
  videoPacketsLost: number;
  audioPacketLossPercent: number;
  videoPacketLossPercent: number;
  roundTripLatency: number; // ms
  audioJitter: number; // ms
  audioCodec: string;
  videoCodec: string;
  audioChannels: number;
  videoFrameRate: number;
  videoResolution: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
}

export interface MetricsReport {
  roomId: string;
  userId: string;
  remoteUserId: string;
  metrics: ConnectionMetrics;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

/**
 * Safe property accessor for RTCStats
 * Handles missing or undefined properties gracefully
 */
function getSafeProperty<T>(obj: any, key: string, defaultValue: T): T {
  const value = obj?.[key];
  return typeof value !== 'undefined' && value !== null ? value : defaultValue;
}

/**
 * Type guard for inbound-rtp stats
 */
function isInboundRtpReport(report: any): report is RTCInboundRtpStreamStats {
  return (
    report.type === 'inbound-rtp' &&
    typeof report.bytesReceived === 'number'
  );
}

/**
 * Type guard for outbound-rtp stats
 */
function isOutboundRtpReport(report: any): report is RTCOutboundRtpStreamStats {
  return (
    report.type === 'outbound-rtp' &&
    typeof report.bytesSent === 'number'
  );
}

@Injectable()
export class ConnectionMetricsService {
  private readonly logger = new Logger(ConnectionMetricsService.name);

  /**
   * Collect metrics from a single RTCPeerConnection
   * Called periodically (every 1-2 seconds) to monitor connection health
   */
  async collectMetrics(
    pc: RTCPeerConnection,
    direction: 'inbound' | 'outbound' | 'both' = 'both',
  ): Promise<ConnectionMetrics | null> {
    try {
      const stats = await pc.getStats();
      const metrics: Partial<ConnectionMetrics> = {
        timestamp: Date.now(),
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
        inboundBitrate: 0,
        outboundBitrate: 0,
        audioPacketsLost: 0,
        videoPacketsLost: 0,
        audioPacketLossPercent: 0,
        videoPacketLossPercent: 0,
        roundTripLatency: 0,
        audioJitter: 0,
        audioCodec: 'unknown',
        videoCodec: 'unknown',
        audioChannels: 0,
        videoFrameRate: 0,
        videoResolution: '0x0',
      };

      let inboundVideoStats: RTCInboundRtpStreamStats | null = null;
      let outboundVideoStats: RTCOutboundRtpStreamStats | null = null;
      let audioInboundStats: RTCInboundRtpStreamStats | null = null;
      let audioOutboundStats: RTCOutboundRtpStreamStats | null = null;

      // Parse stats by type with proper type checking
      stats.forEach((report) => {
        // Handle inbound-rtp
        if (isInboundRtpReport(report)) {
          const mediaType = getSafeProperty<string>(report, 'mediaType', 'unknown');
          if (mediaType === 'video') {
            inboundVideoStats = report;
          } else if (mediaType === 'audio') {
            audioInboundStats = report;
          }
        }

        // Handle outbound-rtp
        if (isOutboundRtpReport(report)) {
          const mediaType = getSafeProperty<string>(report, 'mediaType', 'unknown');
          if (mediaType === 'video') {
            outboundVideoStats = report;
          } else if (mediaType === 'audio') {
            audioOutboundStats = report;
          }
        }
      });

      // ✅ FIXED: Calculate video metrics safely with proper property access
      if (inboundVideoStats) {
        metrics.inboundBitrate = this.calculateBitrate(inboundVideoStats);

        // ✅ FIXED: Use getSafeProperty for packetsLost and packetsReceived
        const packetsLost = getSafeProperty<number>(
          inboundVideoStats,
          'packetsLost',
          0,
        );
        const packetsReceived = getSafeProperty<number>(
          inboundVideoStats,
          'packetsReceived',
          0,
        );

        metrics.videoPacketsLost = packetsLost;
        metrics.videoPacketLossPercent = this.calculatePacketLossPercent(
          packetsLost,
          packetsReceived,
        );

        const frameWidth = getSafeProperty<number>(
          inboundVideoStats,
          'frameWidth',
          0,
        );
        const frameHeight = getSafeProperty<number>(
          inboundVideoStats,
          'frameHeight',
          0,
        );
        metrics.videoResolution = `${frameWidth}x${frameHeight}`;

        const codecId = getSafeProperty<string>(inboundVideoStats, 'codecId', '');
        const mimeType = getSafeProperty<string>(inboundVideoStats, 'mimeType', '');
        metrics.videoCodec = codecId
          ? 'H.264'
          : mimeType.includes('vp8')
            ? 'VP8'
            : mimeType.includes('vp9')
              ? 'VP9'
              : 'unknown';
      }

      // ✅ FIXED: Calculate outbound video metrics safely
      if (outboundVideoStats) {
        metrics.outboundBitrate = this.calculateBitrate(outboundVideoStats);
        metrics.videoFrameRate = getSafeProperty<number>(
          outboundVideoStats,
          'framesPerSecond',
          0,
        );
      }

      // ✅ FIXED: Calculate audio metrics safely with getSafeProperty
      if (audioInboundStats) {
        // ✅ FIXED: Safe access to packetsLost and packetsReceived
        const packetsLost = getSafeProperty<number>(
          audioInboundStats,
          'packetsLost',
          0,
        );
        const packetsReceived = getSafeProperty<number>(
          audioInboundStats,
          'packetsReceived',
          0,
        );

        metrics.audioPacketsLost = packetsLost;
        metrics.audioPacketLossPercent = this.calculatePacketLossPercent(
          packetsLost,
          packetsReceived,
        );

        // ✅ FIXED: Safe access to jitter property
        const jitter = getSafeProperty<number>(audioInboundStats, 'jitter', 0);
        metrics.audioJitter = jitter * 1000; // Convert to ms

        metrics.audioCodec = getSafeProperty<string>(
          audioInboundStats,
          'mimeType',
          'opus',
        );
      }

      // ✅ FIXED: Safe access to audioLevel
      if (audioOutboundStats) {
        const audioLevel = getSafeProperty<number>(
          audioOutboundStats,
          'audioLevel',
          0,
        );
        metrics.audioChannels = audioLevel ? 1 : 0;
      }

      // Get candidate pair info for RTT
      stats.forEach((report) => {
        if (report.type === 'candidate-pair') {
          const pair = report as any;
          if (pair.state === 'succeeded') {
            const currentRoundTripTime = getSafeProperty<number>(
              pair,
              'currentRoundTripTime',
              0,
            );
            if (currentRoundTripTime > 0) {
              metrics.roundTripLatency = currentRoundTripTime * 1000; // Convert to ms
            }
          }
        }
      });

      return metrics as ConnectionMetrics;
    } catch (err) {
      this.logger.error(`Failed to collect metrics: ${String(err)}`);
      return null;
    }
  }

  /**
   * Assess connection quality based on key metrics
   */
  assessQuality(
    metrics: ConnectionMetrics,
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    // Not connected yet
    if (metrics.connectionState !== 'connected') {
      return 'unknown';
    }

    // Score calculation (0-100)
    let score = 100;

    // Packet loss penalty (very significant)
    const avgPacketLoss =
      (metrics.audioPacketLossPercent + metrics.videoPacketLossPercent) / 2;
    if (avgPacketLoss > 5) score -= 40; // >5% loss = major issue
    else if (avgPacketLoss > 2) score -= 20; // >2% loss = degraded
    else if (avgPacketLoss > 0) score -= 5;

    // Latency penalty
    if (metrics.roundTripLatency > 300) score -= 30; // >300ms = poor
    else if (metrics.roundTripLatency > 150) score -= 15; // >150ms = degraded
    else if (metrics.roundTripLatency > 80) score -= 5; // >80ms = acceptable

    // Bitrate penalty
    const targetBitrate = 2500; // 2.5 Mbps target
    if (metrics.outboundBitrate < targetBitrate * 0.3) score -= 25;
    else if (metrics.outboundBitrate < targetBitrate * 0.7) score -= 10;

    // Jitter penalty
    if (metrics.audioJitter > 30) score -= 10;
    else if (metrics.audioJitter > 15) score -= 5;

    // Quality thresholds
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * ✅ FIXED: Proper bitrate calculation for both inbound and outbound
   * Handles missing properties gracefully
   */
  private calculateBitrate(
    stats: RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats,
  ): number {
    const timestamp = getSafeProperty<number>(stats, 'timestamp', 0);

    if (timestamp === 0) {
      return 0;
    }

    if (stats.type === 'inbound-rtp') {
      const inbound = stats as RTCInboundRtpStreamStats;
      const bytesReceived = getSafeProperty<number>(
        inbound,
        'bytesReceived',
        0,
      );

      if (bytesReceived === 0) {
        return 0;
      }

      // Convert bytes to kilobits and timestamp to seconds
      // timestamp is in milliseconds, divide by 1000 to get seconds
      return (bytesReceived * 8) / (timestamp / 1000) / 1000; // kbps
    }

    if (stats.type === 'outbound-rtp') {
      const outbound = stats as RTCOutboundRtpStreamStats;
      const bytesSent = getSafeProperty<number>(outbound, 'bytesSent', 0);

      if (bytesSent === 0) {
        return 0;
      }

      // Convert bytes to kilobits and timestamp to seconds
      return (bytesSent * 8) / (timestamp / 1000) / 1000; // kbps
    }

    return 0;
  }

  /**
   * Calculate packet loss percentage safely
   */
  private calculatePacketLossPercent(lost: number, received: number): number {
    const total = (lost ?? 0) + (received ?? 0);
    if (total === 0) return 0;
    return ((lost ?? 0) / total) * 100;
  }

  /**
   * Format metrics for logging/reporting
   */
  formatMetrics(metrics: ConnectionMetrics): string {
    return [
      `📊 Connection Metrics (${new Date(metrics.timestamp).toLocaleTimeString()})`,
      `  🎬 Video: ${metrics.videoResolution} @ ${metrics.videoFrameRate.toFixed(1)}fps (${metrics.videoCodec})`,
      `  🔊 Audio: ${metrics.audioCodec}`,
      `  📤 Uplink: ${metrics.outboundBitrate.toFixed(0)} kbps`,
      `  📥 Downlink: ${metrics.inboundBitrate.toFixed(0)} kbps`,
      `  🔴 Packet Loss: Audio ${metrics.audioPacketLossPercent.toFixed(2)}% / Video ${metrics.videoPacketLossPercent.toFixed(2)}%`,
      `  ⏱️  RTT: ${metrics.roundTripLatency.toFixed(0)} ms`,
      `  📡 Jitter: ${metrics.audioJitter.toFixed(0)} ms`,
      `  🔗 State: ${metrics.connectionState} (ICE: ${metrics.iceConnectionState})`,
    ].join('\n');
  }
}
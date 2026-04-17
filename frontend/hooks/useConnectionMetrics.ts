/**
 * Connection Metrics Hook
 * File: frontend/hooks/useConnectionMetrics.ts
 *
 * Purpose: Monitor and report WebRTC connection quality metrics
 *
 * Returns:
 * - Real-time metrics (bitrate, packet loss, latency)
 * - Quality assessment (excellent/good/fair/poor)
 * - Connection state
 * - Auto-reports every 2 seconds
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ConnectionMetricsState {
  inboundBitrate: number; // kbps
  outboundBitrate: number; // kbps
  rtt: number; // ms
  audioPacketLoss: number; // %
  videoPacketLoss: number; // %
  audioJitter: number; // ms
  videoFrameRate: number;
  videoResolution: string;
  connectionState: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  lastUpdated: number;
}

const INITIAL_STATE: ConnectionMetricsState = {
  inboundBitrate: 0,
  outboundBitrate: 0,
  rtt: 0,
  audioPacketLoss: 0,
  videoPacketLoss: 0,
  audioJitter: 0,
  videoFrameRate: 0,
  videoResolution: '0x0',
  connectionState: 'new',
  quality: 'unknown',
  lastUpdated: 0,
};

// ✅ Type guard for inbound-rtp stats
function isInboundRtpReport(report: any): boolean {
  return (
    report.type === 'inbound-rtp' &&
    typeof report.bytesReceived === 'number' &&
    typeof report.timestamp === 'number'
  );
}

// ✅ Type guard for outbound-rtp stats
function isOutboundRtpReport(report: any): boolean {
  return (
    report.type === 'outbound-rtp' &&
    typeof report.bytesSent === 'number' &&
    typeof report.timestamp === 'number'
  );
}

export function useConnectionMetrics(
  pc: RTCPeerConnection | null,
  enabled = true,
): ConnectionMetricsState {
  const [metrics, setMetrics] = useState<ConnectionMetricsState>(INITIAL_STATE);
  const prevStatsRef = useRef<Map<string, any>>(new Map());
  // ✅ FIXED: Use NodeJS.Timeout instead of NodeJS.Timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const collectMetrics = useCallback(async () => {
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      let inboundBitrate = 0;
      let outboundBitrate = 0;
      let rtt = 0;
      let audioPacketLoss = 0;
      let videoPacketLoss = 0;
      let audioJitter = 0;
      let videoFrameRate = 0;
      let videoResolution = '0x0';

      const now = Date.now();
      const prevStats = prevStatsRef.current;

      stats.forEach((report) => {
        const prevReport = prevStats.get(report.id);

        // ✅ FIXED: Safely check inbound-rtp with type guard
        if (isInboundRtpReport(report)) {
          const mediaType = (report as any).mediaType;

          if (mediaType === 'video') {
            const bytes = report.bytesReceived;
            const prevBytes = prevReport?.bytesReceived ?? 0;
            const bytesDelta = bytes - prevBytes;
            const timeDelta =
              (report.timestamp - (prevReport?.timestamp ?? 0)) / 1000;

            if (timeDelta > 0) {
              inboundBitrate = (bytesDelta * 8) / timeDelta / 1000; // kbps
            }

            const packetsLost = report.packetsLost ?? 0;
            const packetsReceived = report.packetsReceived ?? 0;
            const total = packetsLost + packetsReceived;
            videoPacketLoss =
              total > 0 ? (packetsLost / total) * 100 : 0;

            const frameWidth = (report as any).frameWidth ?? 0;
            const frameHeight = (report as any).frameHeight ?? 0;
            videoResolution = `${frameWidth}x${frameHeight}`;
          } else if (mediaType === 'audio') {
            const packetsLost = report.packetsLost ?? 0;
            const packetsReceived = report.packetsReceived ?? 0;
            const total = packetsLost + packetsReceived;
            audioPacketLoss =
              total > 0 ? (packetsLost / total) * 100 : 0;

            audioJitter = ((report as any).jitter ?? 0) * 1000; // ms
          }
        }

        // ✅ FIXED: Safely check outbound-rtp with type guard
        if (isOutboundRtpReport(report)) {
          const mediaType = (report as any).mediaType;

          if (mediaType === 'video') {
            const bytes = report.bytesSent;
            const prevBytes = prevReport?.bytesSent ?? 0;
            const bytesDelta = bytes - prevBytes;
            const timeDelta =
              (report.timestamp - (prevReport?.timestamp ?? 0)) / 1000;

            if (timeDelta > 0) {
              outboundBitrate = (bytesDelta * 8) / timeDelta / 1000; // kbps
            }

            videoFrameRate = (report as any).framesPerSecond ?? 0;
          }
        }

        // ✅ Safely check candidate-pair
        if (report.type === 'candidate-pair') {
          const pair = report as any;
          if (
            pair.state === 'succeeded' &&
            typeof pair.currentRoundTripTime === 'number'
          ) {
            rtt = pair.currentRoundTripTime * 1000; // ms
          }
        }

        prevStats.set(report.id, report);
      });

      // Assess quality
      let quality: ConnectionMetricsState['quality'] = 'unknown';
      if (pc.connectionState === 'connected') {
        let score = 100;

        // Packet loss penalty
        const avgPacketLoss = (audioPacketLoss + videoPacketLoss) / 2;
        if (avgPacketLoss > 5) score -= 40;
        else if (avgPacketLoss > 2) score -= 20;
        else if (avgPacketLoss > 0) score -= 5;

        // Latency penalty
        score -=
          rtt > 300
            ? 30
            : rtt > 150
              ? 15
              : rtt > 80
                ? 5
                : 0;

        // Bitrate penalty
        if (outboundBitrate < 2500 * 0.3) score -= 25;
        else if (outboundBitrate < 2500 * 0.7) score -= 10;

        // Jitter penalty
        if (audioJitter > 30) score -= 10;
        else if (audioJitter > 15) score -= 5;

        // Quality thresholds
        if (score >= 85) quality = 'excellent';
        else if (score >= 70) quality = 'good';
        else if (score >= 50) quality = 'fair';
        else quality = 'poor';
      }

      setMetrics({
        inboundBitrate,
        outboundBitrate,
        rtt,
        audioPacketLoss,
        videoPacketLoss,
        audioJitter,
        videoFrameRate,
        videoResolution,
        connectionState: pc.connectionState,
        quality,
        lastUpdated: now,
      });
    } catch (err) {
      console.error('[Metrics] Collection failed:', err);
    }
  }, [pc]);

  useEffect(() => {
    if (!enabled || !pc) return;

    // ✅ FIXED: setInterval returns NodeJS.Timeout
    intervalRef.current = setInterval(() => {
      void collectMetrics();
    }, 2000); // Collect every 2 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [collectMetrics, enabled, pc]);

  return metrics;
}
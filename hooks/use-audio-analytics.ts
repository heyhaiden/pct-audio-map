/**
 * Audio analytics hook for performance tracking
 */

import { useRef, useCallback, useEffect } from 'react';
import { AudioAnalytics } from '@/types/audio-streaming';
import { getNetworkInfo } from '@/lib/mobile-optimizations';

interface AnalyticsConfig {
  enabled: boolean;
  onSessionEnd?: (analytics: AudioAnalytics) => void;
}

export function useAudioAnalytics(config: AnalyticsConfig = { enabled: true }) {
  const analyticsRef = useRef<AudioAnalytics | null>(null);
  const sessionStartRef = useRef<number>(0);
  const lastPlayTimeRef = useRef<number>(0);
  const totalPlayTimeRef = useRef<number>(0);
  const bandwidthMeasurementsRef = useRef<number[]>([]);

  /**
   * Initialize analytics session
   */
  const initializeSession = useCallback((audioId: string, audioUrl: string) => {
    if (!config.enabled) return;

    const networkInfo = getNetworkInfo();
    const now = Date.now();

    analyticsRef.current = {
      audioId,
      audioUrl,
      totalPlayTime: 0,
      completionRate: 0,
      seekCount: 0,
      stallCount: 0,
      errorCount: 0,
      timeToFirstByte: 0,
      timeToPlay: 0,
      averageBufferHealth: 0,
      estimatedBandwidth: 0,
      totalBytesTransferred: 0,
      sessionStart: now,
      sessionEnd: 0,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connectionType: networkInfo.type
    };

    sessionStartRef.current = now;
    lastPlayTimeRef.current = 0;
    totalPlayTimeRef.current = 0;
    bandwidthMeasurementsRef.current = [];
  }, [config.enabled]);

  /**
   * Track time to first byte
   */
  const trackTimeToFirstByte = useCallback((timeMs: number) => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.timeToFirstByte = timeMs;
  }, [config.enabled]);

  /**
   * Track time to play
   */
  const trackTimeToPlay = useCallback((timeMs: number) => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.timeToPlay = timeMs;
  }, [config.enabled]);

  /**
   * Track play time
   */
  const trackPlayTime = useCallback((deltaSeconds: number) => {
    if (!config.enabled || !analyticsRef.current) return;

    totalPlayTimeRef.current += deltaSeconds;
    analyticsRef.current.totalPlayTime = totalPlayTimeRef.current;
  }, [config.enabled]);

  /**
   * Track completion rate
   */
  const trackCompletion = useCallback((currentTime: number, duration: number) => {
    if (!config.enabled || !analyticsRef.current || duration === 0) return;

    const completionRate = Math.min(currentTime / duration, 1);
    analyticsRef.current.completionRate = completionRate;
  }, [config.enabled]);

  /**
   * Track seek event
   */
  const trackSeek = useCallback(() => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.seekCount++;
  }, [config.enabled]);

  /**
   * Track stall event
   */
  const trackStall = useCallback(() => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.stallCount++;
  }, [config.enabled]);

  /**
   * Track error event
   */
  const trackError = useCallback(() => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.errorCount++;
  }, [config.enabled]);

  /**
   * Track bandwidth measurement
   */
  const trackBandwidth = useCallback((bytesPerSecond: number) => {
    if (!config.enabled || !analyticsRef.current) return;

    bandwidthMeasurementsRef.current.push(bytesPerSecond);

    // Calculate average bandwidth
    const sum = bandwidthMeasurementsRef.current.reduce((a, b) => a + b, 0);
    const avg = sum / bandwidthMeasurementsRef.current.length;

    analyticsRef.current.estimatedBandwidth = avg;
  }, [config.enabled]);

  /**
   * Track bytes transferred
   */
  const trackBytesTransferred = useCallback((bytes: number) => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.totalBytesTransferred += bytes;
  }, [config.enabled]);

  /**
   * Track buffer health
   */
  const trackBufferHealth = useCallback((healthPercentage: number) => {
    if (!config.enabled || !analyticsRef.current) return;

    // Running average of buffer health
    const currentAvg = analyticsRef.current.averageBufferHealth;
    const newAvg = currentAvg === 0 ? healthPercentage : (currentAvg + healthPercentage) / 2;

    analyticsRef.current.averageBufferHealth = newAvg;
  }, [config.enabled]);

  /**
   * End analytics session
   */
  const endSession = useCallback(() => {
    if (!config.enabled || !analyticsRef.current) return;

    analyticsRef.current.sessionEnd = Date.now();

    // Call callback if provided
    if (config.onSessionEnd) {
      config.onSessionEnd(analyticsRef.current);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Audio Analytics Session:', analyticsRef.current);
    }

    // Reset refs
    analyticsRef.current = null;
    sessionStartRef.current = 0;
    lastPlayTimeRef.current = 0;
    totalPlayTimeRef.current = 0;
    bandwidthMeasurementsRef.current = [];
  }, [config.enabled, config.onSessionEnd]);

  /**
   * Get current analytics data
   */
  const getAnalytics = useCallback((): AudioAnalytics | null => {
    return analyticsRef.current;
  }, []);

  /**
   * Send analytics to server (placeholder - implement your own endpoint)
   */
  const sendAnalytics = useCallback(async () => {
    if (!config.enabled || !analyticsRef.current) return;

    try {
      // In production, send to your analytics endpoint
      // await fetch('/api/analytics/audio', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(analyticsRef.current)
      // });

      console.log('Analytics would be sent:', analyticsRef.current);
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }, [config.enabled]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (analyticsRef.current && analyticsRef.current.sessionEnd === 0) {
        endSession();
      }
    };
  }, [endSession]);

  return {
    initializeSession,
    trackTimeToFirstByte,
    trackTimeToPlay,
    trackPlayTime,
    trackCompletion,
    trackSeek,
    trackStall,
    trackError,
    trackBandwidth,
    trackBytesTransferred,
    trackBufferHealth,
    endSession,
    getAnalytics,
    sendAnalytics
  };
}

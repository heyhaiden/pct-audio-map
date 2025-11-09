/**
 * Audio preloader hook - preloads nearby audio markers based on distance
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  PreloadConfig,
  PreloadedAudio,
  DEFAULT_PRELOAD_CONFIG
} from '@/types/audio-streaming';
import { AudioMarker } from '@/types/map';
import { calculateDistance, preloadAudio } from '@/lib/audio-streaming';
import { getMobileOptimizations, shouldEnablePreload } from '@/lib/mobile-optimizations';

interface UseAudioPreloaderOptions {
  config?: Partial<PreloadConfig>;
  onPreloadComplete?: (audioId: string) => void;
  onPreloadError?: (audioId: string, error: Error) => void;
}

export function useAudioPreloader(options: UseAudioPreloaderOptions = {}) {
  const {
    config: configOverrides = {},
    onPreloadComplete,
    onPreloadError
  } = options;

  const config: PreloadConfig = {
    ...DEFAULT_PRELOAD_CONFIG,
    ...configOverrides
  };

  // Preloaded audio cache
  const [preloadedAudio, setPreloadedAudio] = useState<Map<string, PreloadedAudio>>(
    new Map()
  );

  // Currently preloading audio IDs
  const [preloading, setPreloading] = useState<Set<string>>(new Set());

  // Abort controllers for active preloads
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Preload queue
  const queueRef = useRef<string[]>([]);

  /**
   * Check if audio is already preloaded
   */
  const isPreloaded = useCallback(
    (audioId: string): boolean => {
      const cached = preloadedAudio.get(audioId);
      if (!cached) return false;

      // Check if not expired
      return cached.expiresAt > Date.now();
    },
    [preloadedAudio]
  );

  /**
   * Get preloaded audio blob
   */
  const getPreloadedAudio = useCallback(
    (audioId: string): Blob | null => {
      const cached = preloadedAudio.get(audioId);
      if (!cached || cached.expiresAt <= Date.now()) {
        return null;
      }

      return cached.blob;
    },
    [preloadedAudio]
  );

  /**
   * Calculate nearby markers based on distance
   */
  const getNearbyMarkers = useCallback(
    (
      markers: AudioMarker[],
      currentPosition: { lat: number; lng: number }
    ): AudioMarker[] => {
      return markers
        .map((marker) => ({
          marker,
          distance: calculateDistance(
            currentPosition.lat,
            currentPosition.lng,
            marker.coordinates[1],
            marker.coordinates[0]
          )
        }))
        .filter(({ distance }) => distance <= config.maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .map(({ marker }) => marker);
    },
    [config.maxDistance]
  );

  /**
   * Preload a single audio file
   */
  const preloadSingle = useCallback(
    async (audioId: string, audioUrl: string): Promise<void> => {
      // Check if already preloaded or currently preloading
      if (isPreloaded(audioId) || preloading.has(audioId)) {
        return;
      }

      // Check device capabilities
      const optimizations = await getMobileOptimizations();
      if (!shouldEnablePreload(optimizations, config.minBatteryLevel, config.wifiOnly)) {
        console.log('Preloading disabled due to device constraints');
        return;
      }

      // Add to preloading set
      setPreloading((prev) => new Set(prev).add(audioId));

      // Create abort controller
      const abortController = new AbortController();
      abortControllersRef.current.set(audioId, abortController);

      try {
        const blob = await preloadAudio(
          audioUrl,
          (progress) => {
            // Optional: track progress
            console.log(`Preloading ${audioId}: ${Math.round(progress * 100)}%`);
          },
          abortController.signal
        );

        // Cache the blob with 1 hour expiration
        const cached: PreloadedAudio = {
          audioId,
          audioUrl,
          blob,
          expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
          size: blob.size
        };

        setPreloadedAudio((prev) => {
          const next = new Map(prev);
          next.set(audioId, cached);
          return next;
        });

        if (onPreloadComplete) {
          onPreloadComplete(audioId);
        }

        console.log(`Preloaded audio: ${audioId} (${blob.size} bytes)`);
      } catch (error) {
        if (error instanceof Error && error.message !== 'Preload aborted') {
          console.error(`Failed to preload ${audioId}:`, error);

          if (onPreloadError) {
            onPreloadError(audioId, error instanceof Error ? error : new Error('Unknown error'));
          }
        }
      } finally {
        // Remove from preloading set
        setPreloading((prev) => {
          const next = new Set(prev);
          next.delete(audioId);
          return next;
        });

        // Clean up abort controller
        abortControllersRef.current.delete(audioId);
      }
    },
    [isPreloaded, preloading, config, onPreloadComplete, onPreloadError]
  );

  /**
   * Process preload queue
   */
  const processQueue = useCallback(async () => {
    // Don't exceed max concurrent preloads
    if (preloading.size >= config.maxConcurrent) {
      return;
    }

    const nextId = queueRef.current.shift();
    if (!nextId) return;

    // Find the marker to get the URL
    // Note: This assumes markers are available in scope
    // In real implementation, you'd pass this in or store it
    console.log(`Processing preload queue: ${nextId}`);
  }, [preloading, config.maxConcurrent]);

  /**
   * Preload nearby markers
   */
  const preloadNearby = useCallback(
    async (
      markers: AudioMarker[],
      currentPosition: { lat: number; lng: number }
    ): Promise<void> => {
      if (!config.enabled) return;

      const nearby = getNearbyMarkers(markers, currentPosition);

      // Preload up to maxConcurrent markers
      const toPreload = nearby.slice(0, config.maxConcurrent);

      for (const marker of toPreload) {
        await preloadSingle(marker.id, marker.audioUrl);
      }
    },
    [config.enabled, config.maxConcurrent, getNearbyMarkers, preloadSingle]
  );

  /**
   * Cancel preload for specific audio
   */
  const cancelPreload = useCallback((audioId: string) => {
    const controller = abortControllersRef.current.get(audioId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(audioId);
    }

    setPreloading((prev) => {
      const next = new Set(prev);
      next.delete(audioId);
      return next;
    });

    // Remove from queue
    queueRef.current = queueRef.current.filter((id) => id !== audioId);
  }, []);

  /**
   * Cancel all preloads
   */
  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });

    abortControllersRef.current.clear();
    setPreloading(new Set());
    queueRef.current = [];
  }, []);

  /**
   * Clear expired cache entries
   */
  const clearExpired = useCallback(() => {
    const now = Date.now();

    setPreloadedAudio((prev) => {
      const next = new Map(prev);
      let cleared = 0;

      for (const [id, cached] of next.entries()) {
        if (cached.expiresAt <= now) {
          next.delete(id);
          cleared++;
        }
      }

      if (cleared > 0) {
        console.log(`Cleared ${cleared} expired preloaded audio entries`);
      }

      return next;
    });
  }, []);

  /**
   * Clear all cached audio
   */
  const clearAll = useCallback(() => {
    setPreloadedAudio(new Map());
    console.log('Cleared all preloaded audio');
  }, []);

  /**
   * Get cache stats
   */
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    let totalSize = 0;
    let validCount = 0;
    let expiredCount = 0;

    preloadedAudio.forEach((cached) => {
      if (cached.expiresAt > now) {
        validCount++;
        totalSize += cached.size;
      } else {
        expiredCount++;
      }
    });

    return {
      totalSize,
      validCount,
      expiredCount,
      preloadingCount: preloading.size,
      queueLength: queueRef.current.length
    };
  }, [preloadedAudio, preloading]);

  // Periodically clear expired cache
  useEffect(() => {
    const interval = setInterval(clearExpired, 60 * 1000); // Every minute

    return () => {
      clearInterval(interval);
    };
  }, [clearExpired]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelAll();
      clearAll();
    };
  }, [cancelAll, clearAll]);

  return {
    // State
    preloadedAudio: Array.from(preloadedAudio.values()),
    preloading: Array.from(preloading),

    // Methods
    preloadSingle,
    preloadNearby,
    isPreloaded,
    getPreloadedAudio,
    cancelPreload,
    cancelAll,
    clearExpired,
    clearAll,
    getCacheStats,
    getNearbyMarkers
  };
}

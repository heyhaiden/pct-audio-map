/**
 * Vercel Blob client utilities and bandwidth estimation
 */

import { BandwidthEstimate } from '@/types/audio-streaming';

/**
 * Bandwidth estimator class
 */
export class BandwidthEstimator {
  private measurements: Array<{ bytes: number; duration: number }> = [];
  private maxMeasurements = 5;

  addMeasurement(bytes: number, duration: number): void {
    this.measurements.push({ bytes, duration });

    // Keep only the last N measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }
  }

  getEstimate(): BandwidthEstimate {
    if (this.measurements.length === 0) {
      return {
        bytesPerSecond: 0,
        confidence: 0,
        lastUpdated: Date.now(),
        measurementCount: 0
      };
    }

    // Calculate weighted average (more recent measurements have higher weight)
    let totalBytes = 0;
    let totalDuration = 0;
    let totalWeight = 0;

    this.measurements.forEach((measurement, index) => {
      const weight = index + 1; // Linear weight (1, 2, 3, ...)
      totalBytes += measurement.bytes * weight;
      totalDuration += measurement.duration * weight;
      totalWeight += weight;
    });

    const weightedBytes = totalBytes / totalWeight;
    const weightedDuration = totalDuration / totalWeight;

    const bytesPerSecond =
      weightedDuration > 0 ? (weightedBytes / weightedDuration) * 1000 : 0;

    // Confidence increases with more measurements
    const confidence = Math.min(this.measurements.length / this.maxMeasurements, 1);

    return {
      bytesPerSecond,
      confidence,
      lastUpdated: Date.now(),
      measurementCount: this.measurements.length
    };
  }

  reset(): void {
    this.measurements = [];
  }
}

/**
 * Create a streaming audio source with range request support
 */
export async function createStreamingSource(
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<Blob> {
  const response = await fetch(url, {
    headers: {
      Range: 'bytes=0-' // Request entire file with range support
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (onProgress) {
      onProgress(loaded, total);
    }
  }

  // Combine chunks into single blob
  const blob = new Blob(chunks, {
    type: response.headers.get('content-type') || 'audio/mpeg'
  });

  return blob;
}

/**
 * Fetch audio metadata without downloading entire file
 */
export async function fetchAudioMetadata(url: string): Promise<{
  duration: number;
  size: number;
  type: string;
}> {
  // First, get content length via HEAD request
  const headResponse = await fetch(url, { method: 'HEAD' });

  if (!headResponse.ok) {
    throw new Error(`Failed to fetch metadata: ${headResponse.status}`);
  }

  const contentLength = headResponse.headers.get('content-length');
  const contentType = headResponse.headers.get('content-type') || 'audio/mpeg';
  const size = contentLength ? parseInt(contentLength, 10) : 0;

  // For duration, we need to parse the audio file
  // This requires downloading a small portion to read headers
  const rangeResponse = await fetch(url, {
    headers: {
      Range: 'bytes=0-16383' // First 16KB should contain metadata
    }
  });

  if (!rangeResponse.ok) {
    throw new Error(`Failed to fetch audio range: ${rangeResponse.status}`);
  }

  const buffer = await rangeResponse.arrayBuffer();

  // Parse MP3 duration from headers (simplified)
  // In production, you'd use a proper audio parsing library
  const duration = await parseAudioDuration(buffer, contentType);

  return {
    duration,
    size,
    type: contentType
  };
}

/**
 * Parse audio duration from buffer
 * This is a simplified implementation - for production use a library like music-metadata
 */
async function parseAudioDuration(
  buffer: ArrayBuffer,
  contentType: string
): Promise<number> {
  // Create a temporary audio element to get duration
  return new Promise((resolve) => {
    const blob = new Blob([buffer], { type: contentType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration || 0);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    audio.load();
  });
}

/**
 * Preload audio file with progress tracking
 */
export async function preloadAudio(
  url: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed to preload audio: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    if (signal?.aborted) {
      throw new Error('Preload aborted');
    }

    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (onProgress && total > 0) {
      onProgress(loaded / total);
    }
  }

  const blob = new Blob(chunks, {
    type: response.headers.get('content-type') || 'audio/mpeg'
  });

  return blob;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Create object URL from blob with automatic cleanup
 */
export function createManagedObjectURL(blob: Blob): {
  url: string;
  revoke: () => void;
} {
  const url = URL.createObjectURL(blob);
  let revoked = false;

  const revoke = () => {
    if (!revoked) {
      URL.revokeObjectURL(url);
      revoked = true;
    }
  };

  // Auto-revoke after 5 minutes
  setTimeout(revoke, 5 * 60 * 1000);

  return { url, revoke };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format time to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Estimate time remaining based on current buffer and bandwidth
 */
export function estimateTimeRemaining(
  currentTime: number,
  duration: number,
  bufferedEnd: number,
  bandwidthBytesPerSecond: number,
  fileSizeBytes: number
): number {
  if (bufferedEnd >= duration) {
    return 0; // Fully buffered
  }

  const remainingDuration = duration - bufferedEnd;
  const remainingBytes = (remainingDuration / duration) * fileSizeBytes;

  if (bandwidthBytesPerSecond === 0) {
    return Infinity;
  }

  return remainingBytes / bandwidthBytesPerSecond;
}

/**
 * Check if audio format is supported
 */
export function isAudioFormatSupported(mimeType: string): boolean {
  if (typeof Audio === 'undefined') return false;

  const audio = new Audio();
  const support = audio.canPlayType(mimeType);

  return support === 'probably' || support === 'maybe';
}

/**
 * Get supported audio formats
 */
export function getSupportedAudioFormats(): string[] {
  if (typeof Audio === 'undefined') return [];

  const audio = new Audio();
  const formats = [
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/flac'
  ];

  return formats.filter((format) => {
    const support = audio.canPlayType(format);
    return support === 'probably' || support === 'maybe';
  });
}

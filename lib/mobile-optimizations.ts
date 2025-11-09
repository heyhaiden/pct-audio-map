/**
 * Mobile and network optimization utilities
 */

import {
  MobileOptimizations,
  ConnectionType,
  EffectiveConnectionType
} from '@/types/audio-streaming';

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get battery status (if Battery API is available)
 */
export async function getBatteryStatus(): Promise<{
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
} | null> {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return null;
  }

  try {
    const battery = await (navigator as any).getBattery();
    return {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    };
  } catch (error) {
    console.warn('Battery Status API not available:', error);
    return null;
  }
}

/**
 * Get network connection information
 */
export function getNetworkInfo(): {
  type: ConnectionType;
  effectiveType: EffectiveConnectionType;
  downlink?: number;
  rtt?: number;
  saveData: boolean;
} {
  if (typeof navigator === 'undefined') {
    return {
      type: ConnectionType.UNKNOWN,
      effectiveType: EffectiveConnectionType.UNKNOWN,
      saveData: false
    };
  }

  const connection = (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) {
    return {
      type: ConnectionType.UNKNOWN,
      effectiveType: EffectiveConnectionType.UNKNOWN,
      saveData: false
    };
  }

  // Map connection type
  let connectionType: ConnectionType = ConnectionType.UNKNOWN;
  if (connection.type) {
    switch (connection.type) {
      case 'wifi':
        connectionType = ConnectionType.WIFI;
        break;
      case 'cellular':
        connectionType = ConnectionType.CELLULAR;
        break;
      case 'ethernet':
        connectionType = ConnectionType.ETHERNET;
        break;
      case 'none':
        connectionType = ConnectionType.NONE;
        break;
    }
  }

  // Map effective type
  let effectiveType: EffectiveConnectionType = EffectiveConnectionType.UNKNOWN;
  if (connection.effectiveType) {
    switch (connection.effectiveType) {
      case 'slow-2g':
        effectiveType = EffectiveConnectionType.SLOW_2G;
        break;
      case '2g':
        effectiveType = EffectiveConnectionType.TWO_G;
        break;
      case '3g':
        effectiveType = EffectiveConnectionType.THREE_G;
        break;
      case '4g':
        effectiveType = EffectiveConnectionType.FOUR_G;
        break;
    }
  }

  return {
    type: connectionType,
    effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData || false
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if device is in low power mode (iOS-specific heuristic)
 */
export function isLowPowerMode(): boolean {
  if (typeof window === 'undefined') return false;

  // iOS low power mode can be detected through performance timing
  // This is a heuristic and not 100% reliable
  if (!('performance' in window)) return false;

  try {
    // Low power mode typically throttles timers
    const start = performance.now();
    setTimeout(() => {}, 0);
    const elapsed = performance.now() - start;

    // If timer resolution is throttled, likely in low power mode
    return elapsed > 4;
  } catch {
    return false;
  }
}

/**
 * Get comprehensive mobile optimizations data
 */
export async function getMobileOptimizations(): Promise<MobileOptimizations> {
  const isMobile = isMobileDevice();
  const battery = await getBatteryStatus();
  const network = getNetworkInfo();

  return {
    isMobile,
    isLowPowerMode: isLowPowerMode(),
    batteryLevel: battery?.level ?? 1,
    isCharging: battery?.charging ?? false,
    connectionType: network.type,
    effectiveConnectionType: network.effectiveType,
    saveData: network.saveData,
    reducedMotion: prefersReducedMotion()
  };
}

/**
 * Determine if preloading should be enabled based on device state
 */
export function shouldEnablePreload(
  optimizations: MobileOptimizations,
  minBatteryLevel: number = 0.2,
  wifiOnly: boolean = false
): boolean {
  // Don't preload if battery is low and not charging
  if (
    optimizations.batteryLevel < minBatteryLevel &&
    !optimizations.isCharging
  ) {
    return false;
  }

  // Don't preload in low power mode
  if (optimizations.isLowPowerMode) {
    return false;
  }

  // Don't preload if user has data saver enabled
  if (optimizations.saveData) {
    return false;
  }

  // If wifi only mode, check connection type
  if (wifiOnly && optimizations.connectionType !== ConnectionType.WIFI) {
    return false;
  }

  // Don't preload on slow connections
  if (
    optimizations.effectiveConnectionType === EffectiveConnectionType.SLOW_2G ||
    optimizations.effectiveConnectionType === EffectiveConnectionType.TWO_G
  ) {
    return false;
  }

  return true;
}

/**
 * Listen for network changes
 */
export function watchNetworkChanges(
  callback: (info: ReturnType<typeof getNetworkInfo>) => void
): () => void {
  if (typeof navigator === 'undefined') {
    return () => {};
  }

  const connection = (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) {
    return () => {};
  }

  const handler = () => callback(getNetworkInfo());

  connection.addEventListener('change', handler);

  return () => {
    connection.removeEventListener('change', handler);
  };
}

/**
 * Listen for battery changes
 */
export function watchBatteryChanges(
  callback: (battery: {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  }) => void
): () => void {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return () => {};
  }

  let battery: any = null;
  const handlers: Array<() => void> = [];

  const levelHandler = () => {
    if (battery) {
      callback({
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      });
    }
  };

  (navigator as any).getBattery().then((b: any) => {
    battery = b;
    battery.addEventListener('levelchange', levelHandler);
    battery.addEventListener('chargingchange', levelHandler);
    battery.addEventListener('chargingtimechange', levelHandler);
    battery.addEventListener('dischargingtimechange', levelHandler);
  });

  return () => {
    if (battery) {
      battery.removeEventListener('levelchange', levelHandler);
      battery.removeEventListener('chargingchange', levelHandler);
      battery.removeEventListener('chargingtimechange', levelHandler);
      battery.removeEventListener('dischargingtimechange', levelHandler);
    }
  };
}

/**
 * Estimate optimal buffer size based on connection quality
 */
export function getOptimalBufferSize(
  effectiveType: EffectiveConnectionType
): number {
  // Return buffer size in seconds
  switch (effectiveType) {
    case EffectiveConnectionType.FOUR_G:
      return 30;
    case EffectiveConnectionType.THREE_G:
      return 45;
    case EffectiveConnectionType.TWO_G:
      return 60;
    case EffectiveConnectionType.SLOW_2G:
      return 90;
    default:
      return 30;
  }
}

/**
 * Check if device supports touch
 */
export function supportsTouchEvents(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Detect if running as PWA
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

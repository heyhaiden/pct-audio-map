/**
 * Example integration of the streaming audio player
 *
 * This file demonstrates how to integrate the new StreamingAudioPlayer
 * into your existing PCT Audio Map application.
 *
 * STEPS TO INTEGRATE:
 * 1. Replace the import in app/page.tsx from audio-player to streaming-audio-player
 * 2. Add preloader hook if you want nearby audio preloading
 * 3. Configure analytics endpoint (optional)
 * 4. Test keyboard shortcuts and accessibility
 */

"use client";

import { useState, useEffect } from "react";
import { StreamingAudioPlayer } from "@/components/audio/streaming-audio-player";
import { useAudioPreloader } from "@/hooks/use-audio-preloader";
import type { AudioMarker } from "@/types/map";
import { audioMarkers } from "@/data/audio-markers";

/**
 * Example: Basic integration
 *
 * Minimal changes - just replace the component import
 */
export function BasicExample() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);

  return (
    <div>
      {/* Your map and other components */}

      {/* Replace old AudioPlayer with new StreamingAudioPlayer */}
      <StreamingAudioPlayer
        marker={selectedMarker}
        onClose={() => setSelectedMarker(null)}
      />
    </div>
  );
}

/**
 * Example: With preloading
 *
 * Adds intelligent preloading of nearby audio markers
 */
export function WithPreloadingExample() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState({ lat: 36.58, lng: -118.29 });

  // Initialize preloader
  const preloader = useAudioPreloader({
    config: {
      enabled: true,
      maxDistance: 50, // Preload markers within 50km
      maxConcurrent: 3, // Max 3 simultaneous preloads
      minBatteryLevel: 0.2, // Don't preload below 20% battery
      wifiOnly: false // Preload on cellular too (set to true for WiFi only)
    },
    onPreloadComplete: (audioId) => {
      console.log(`Successfully preloaded: ${audioId}`);
    },
    onPreloadError: (audioId, error) => {
      console.error(`Failed to preload ${audioId}:`, error);
    }
  });

  // Preload nearby markers when map center changes
  useEffect(() => {
    const nearby = preloader.getNearbyMarkers(audioMarkers, currentMapCenter);
    console.log(`Found ${nearby.length} nearby markers to preload`);

    // Preload them
    preloader.preloadNearby(audioMarkers, currentMapCenter);
  }, [currentMapCenter]);

  // Check if current marker is preloaded
  const isCurrentPreloaded = selectedMarker
    ? preloader.isPreloaded(selectedMarker.id)
    : false;

  // Get cache statistics
  const cacheStats = preloader.getCacheStats();

  return (
    <div>
      {/* Debug info (remove in production) */}
      <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
        <h4 className="font-bold mb-2">Preloader Stats</h4>
        <dl className="space-y-1">
          <div>
            <dt className="inline">Cached:</dt>
            <dd className="inline ml-2">{cacheStats.validCount}</dd>
          </div>
          <div>
            <dt className="inline">Preloading:</dt>
            <dd className="inline ml-2">{cacheStats.preloadingCount}</dd>
          </div>
          <div>
            <dt className="inline">Size:</dt>
            <dd className="inline ml-2">{(cacheStats.totalSize / 1024 / 1024).toFixed(2)} MB</dd>
          </div>
          {selectedMarker && (
            <div>
              <dt className="inline">Current:</dt>
              <dd className="inline ml-2">
                {isCurrentPreloaded ? "✅ Cached" : "⏳ Not cached"}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Your map component */}
      {/* Pass setCurrentMapCenter to your map to track position */}

      {/* Audio player */}
      <StreamingAudioPlayer
        marker={selectedMarker}
        onClose={() => setSelectedMarker(null)}
      />
    </div>
  );
}

/**
 * Example: Full integration in app/page.tsx
 *
 * This is what your updated app/page.tsx would look like
 */
export function FullIntegrationExample() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);
  const [currentChapter, setCurrentChapter] = useState("start");
  const [mapCenter, setMapCenter] = useState({ lat: 36.58, lng: -118.29 });

  // Preloader with production settings
  const preloader = useAudioPreloader({
    config: {
      enabled: true,
      maxDistance: 50,
      maxConcurrent: 2, // Conservative for mobile
      minBatteryLevel: 0.25, // 25% minimum
      wifiOnly: false
    }
  });

  // Preload on chapter change
  useEffect(() => {
    preloader.preloadNearby(audioMarkers, mapCenter);
  }, [currentChapter, mapCenter]);

  // Handle marker click
  const handleMarkerClick = (marker: AudioMarker) => {
    setSelectedMarker(marker);

    // Optional: Send analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'audio_marker_click', {
        marker_id: marker.id,
        marker_name: marker.name,
        chapter: marker.chapter
      });
    }
  };

  // Handle player close
  const handlePlayerClose = () => {
    setSelectedMarker(null);

    // Optional: Send analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'audio_player_close');
    }
  };

  return (
    <div className="relative h-screen">
      {/* Fixed map background */}
      <div className="fixed inset-0 z-0">
        {/* Your PCTMap component */}
        {/* <PCTMap onCenterChange={setMapCenter} /> */}
      </div>

      {/* Scrollable story content */}
      <div className="relative z-10">
        {/* Your StorytellingScroll component */}
        {/* <StorytellingScroll onChapterChange={setCurrentChapter} /> */}
      </div>

      {/* Audio markers */}
      <div className="fixed inset-0 z-20 pointer-events-none">
        {/* Your AudioMarkers component */}
        {/* <AudioMarkers
          markers={audioMarkers}
          currentChapter={currentChapter}
          selectedMarkerId={selectedMarker?.id}
          onMarkerClick={handleMarkerClick}
        /> */}
      </div>

      {/* Enhanced streaming audio player */}
      <StreamingAudioPlayer
        marker={selectedMarker}
        onClose={handlePlayerClose}
      />

      {/* Optional: Preloader status indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-24 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50">
          <div className="font-bold mb-1">Audio Cache</div>
          <div>Loaded: {preloader.preloadedAudio.length}</div>
          <div>Loading: {preloader.preloading.length}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Custom analytics integration
 *
 * Send analytics to your own endpoint
 */
export function WithCustomAnalyticsExample() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);

  // You can access analytics data through the hook
  // Note: This is handled internally by the player, but you could
  // create a custom implementation if needed

  return (
    <StreamingAudioPlayer
      marker={selectedMarker}
      onClose={() => setSelectedMarker(null)}
    />
  );
}

/**
 * Example: Programmatic control
 *
 * Control the player programmatically from parent component
 */
export function WithProgrammaticControlExample() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);

  // Note: For programmatic control, you might want to use the hook directly
  // and build a custom UI. Here's how:

  // import { useStreamingAudioPlayer } from "@/hooks/use-streaming-audio-player";

  // const { state, controls, loadAudio } = useStreamingAudioPlayer({
  //   autoPlay: true,
  //   onEnded: () => {
  //     // Auto-advance to next marker
  //     const currentIndex = audioMarkers.findIndex(m => m.id === selectedMarker?.id);
  //     if (currentIndex < audioMarkers.length - 1) {
  //       const nextMarker = audioMarkers[currentIndex + 1];
  //       setSelectedMarker(nextMarker);
  //       loadAudio(nextMarker.id, nextMarker.audioUrl);
  //     }
  //   }
  // });

  return (
    <StreamingAudioPlayer
      marker={selectedMarker}
      onClose={() => setSelectedMarker(null)}
    />
  );
}

/**
 * MIGRATION CHECKLIST
 *
 * [ ] 1. Install any missing dependencies
 * [ ] 2. Copy all new files to your project
 * [ ] 3. Update import in app/page.tsx
 * [ ] 4. Test basic playback
 * [ ] 5. Test keyboard shortcuts
 * [ ] 6. Test with screen reader
 * [ ] 7. Test on mobile device
 * [ ] 8. Test on slow network
 * [ ] 9. Configure analytics endpoint (optional)
 * [ ] 10. Add error monitoring (optional)
 * [ ] 11. Set up preloading (optional)
 * [ ] 12. Remove old audio-player.tsx (after testing)
 * [ ] 13. Update documentation
 */

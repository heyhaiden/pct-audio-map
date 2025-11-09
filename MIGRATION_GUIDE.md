# Migration Guide: Streaming Audio Player

This guide walks you through migrating from the basic audio player to the enhanced streaming audio player.

## Prerequisites

Ensure your project has these dependencies:
```bash
pnpm install
# All required dependencies should already be in package.json
```

## Step-by-Step Migration

### Step 1: Verify New Files

Ensure all new files are present:

```
✓ /types/audio-streaming.ts
✓ /lib/audio-streaming.ts
✓ /lib/mobile-optimizations.ts
✓ /hooks/use-streaming-audio-player.ts
✓ /hooks/use-audio-preloader.ts
✓ /hooks/use-audio-analytics.ts
✓ /components/audio/streaming-audio-player.tsx
```

### Step 2: Update app/page.tsx

**Before:**
```typescript
import { AudioPlayer } from "@/components/audio/audio-player";

export default function Home() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);

  return (
    <>
      {/* ... other components ... */}

      <AudioPlayer
        marker={selectedMarker}
        onClose={() => setSelectedMarker(null)}
      />
    </>
  );
}
```

**After:**
```typescript
import { StreamingAudioPlayer } from "@/components/audio/streaming-audio-player";

export default function Home() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);

  return (
    <>
      {/* ... other components ... */}

      <StreamingAudioPlayer
        marker={selectedMarker}
        onClose={() => setSelectedMarker(null)}
      />
    </>
  );
}
```

That's it! The component has the same interface, so it's a drop-in replacement.

### Step 3: Test Basic Functionality

1. Start the development server:
```bash
pnpm dev
```

2. Test these features:
   - Click an audio marker
   - Press play/pause
   - Seek through the audio
   - Adjust volume
   - Close the player

### Step 4: Add Preloading (Optional)

If you want to enable intelligent preloading of nearby markers:

```typescript
import { StreamingAudioPlayer } from "@/components/audio/streaming-audio-player";
import { useAudioPreloader } from "@/hooks/use-audio-preloader";
import { audioMarkers } from "@/data/audio-markers";

export default function Home() {
  const [selectedMarker, setSelectedMarker] = useState<AudioMarker | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 36.58, lng: -118.29 });

  // Add preloader
  const preloader = useAudioPreloader({
    config: {
      enabled: true,
      maxDistance: 50, // km
      maxConcurrent: 2,
      minBatteryLevel: 0.2,
      wifiOnly: false
    }
  });

  // Preload nearby markers when map moves
  useEffect(() => {
    preloader.preloadNearby(audioMarkers, mapCenter);
  }, [mapCenter]);

  return (
    <>
      {/* Pass setMapCenter to your map component */}
      <PCTMap onCenterChange={setMapCenter} />

      <StreamingAudioPlayer
        marker={selectedMarker}
        onClose={() => setSelectedMarker(null)}
      />
    </>
  );
}
```

### Step 5: Test Accessibility

1. **Keyboard Navigation:**
   - Tab through all controls
   - Use Space/K to play/pause
   - Use J/L for seeking
   - Use arrow keys for volume

2. **Screen Reader:**
   - Test with NVDA (Windows), JAWS (Windows), or VoiceOver (Mac)
   - Verify all controls are announced
   - Check state changes are announced

3. **Mobile:**
   - Test on actual iOS/Android device
   - Verify touch controls work
   - Check responsive layout

### Step 6: Test Performance

1. **Network Throttling:**
   - Open Chrome DevTools
   - Go to Network tab
   - Set throttling to "Slow 3G"
   - Test audio playback

2. **Battery Testing:**
   - Test on mobile device
   - Verify preloading stops on low battery
   - Check battery drain during playback

3. **Lighthouse:**
```bash
# Run Lighthouse audit
pnpm lighthouse
```

### Step 7: Configure Analytics (Optional)

To send analytics to your own endpoint, update the hook:

```typescript
// hooks/use-audio-analytics.ts

const sendAnalytics = useCallback(async () => {
  if (!config.enabled || !analyticsRef.current) return;

  try {
    // Send to your analytics endpoint
    await fetch('/api/analytics/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analyticsRef.current)
    });
  } catch (error) {
    console.error('Failed to send analytics:', error);
  }
}, [config.enabled]);
```

Then create the API endpoint:

```typescript
// app/api/analytics/audio/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();

  // Store in your database or analytics service
  console.log('Audio analytics:', data);

  // Example: Send to PostHog, Mixpanel, etc.
  // await posthog.capture('audio_session', data);

  return NextResponse.json({ success: true });
}
```

### Step 8: Remove Old Files (After Testing)

Once you've verified everything works:

```bash
# Backup the old player (optional)
mv components/audio/audio-player.tsx components/audio/audio-player.tsx.backup

# Or delete it
rm components/audio/audio-player.tsx

# If you had a custom hook for the old player
rm hooks/use-audio-player.ts
```

## Feature Comparison

| Feature | Old Player | New Streaming Player |
|---------|-----------|---------------------|
| Basic playback | ✅ | ✅ |
| Seek control | ✅ | ✅ |
| Volume control | ✅ | ✅ |
| Buffer indicator | ❌ | ✅ |
| Playback rate | ❌ | ✅ |
| Keyboard shortcuts | ❌ | ✅ |
| Screen reader support | Partial | Full |
| Mobile optimization | Basic | Advanced |
| Preloading | ❌ | ✅ |
| Analytics | ❌ | ✅ |
| Error handling | Basic | Advanced |
| Retry mechanism | ❌ | ✅ |
| Network detection | ❌ | ✅ |
| Battery awareness | ❌ | ✅ |
| Stall detection | ❌ | ✅ |

## Keyboard Shortcuts Reference

Print this for users:

```
Audio Player Keyboard Shortcuts
================================

Playback:
  Space / K     Play/Pause
  J / ←         Skip backward 10s
  L / →         Skip forward 10s

Volume:
  ↑             Volume up
  ↓             Volume down
  M             Mute/Unmute

Speed:
  >             Increase speed
  <             Decrease speed

Navigation:
  Tab           Next control
  Shift+Tab     Previous control
  Enter         Activate button
```

## Troubleshooting

### Audio Won't Play

**Problem:** Click play but nothing happens

**Solution:**
1. Check browser console for errors
2. Verify audio file exists at the URL
3. Check CORS headers if audio is on different domain
4. Try different browser
5. Check if browser requires user interaction first (some browsers block autoplay)

### Keyboard Shortcuts Don't Work

**Problem:** Pressing keys doesn't trigger actions

**Solution:**
1. Click somewhere on the page to give focus
2. Don't have a text input focused
3. Check browser console for errors
4. Verify event listeners are attached

### Preloading Not Working

**Problem:** Nearby audio isn't preloading

**Solution:**
1. Check network tab in DevTools
2. Verify battery level is above 20%
3. Check if data saver mode is enabled
4. Look at console for preload errors
5. Verify WiFi-only setting if applicable

### High Memory Usage

**Problem:** Browser using too much memory

**Solution:**
1. Reduce `maxConcurrent` preloads
2. Lower cache expiration time
3. Call `preloader.clearAll()` periodically
4. Check for memory leaks in DevTools

### Poor Performance on Mobile

**Problem:** Laggy or slow on mobile devices

**Solution:**
1. Disable preloading on cellular
2. Reduce buffer size
3. Disable animations (reduced motion)
4. Check battery level
5. Close other apps

## Rollback Plan

If you need to rollback to the old player:

1. Restore the backup:
```bash
mv components/audio/audio-player.tsx.backup components/audio/audio-player.tsx
```

2. Update imports in app/page.tsx:
```typescript
import { AudioPlayer } from "@/components/audio/audio-player";
```

3. Replace component usage:
```typescript
<AudioPlayer
  marker={selectedMarker}
  onClose={() => setSelectedMarker(null)}
/>
```

4. Restart development server:
```bash
pnpm dev
```

## Getting Help

If you encounter issues:

1. Check the console for errors
2. Review the STREAMING_AUDIO_IMPLEMENTATION.md
3. Look at INTEGRATION_EXAMPLE.tsx for usage patterns
4. Check TESTING_GUIDE.md for testing strategies
5. Open an issue on GitHub

## Next Steps

After migration:

1. ✅ Monitor analytics for playback issues
2. ✅ Gather user feedback on new features
3. ✅ Test on various devices and browsers
4. ✅ Optimize preloading based on usage patterns
5. ✅ Consider implementing additional features:
   - Playlist support
   - Waveform visualization
   - Transcriptions
   - Social sharing
   - Download for offline

## Version History

- **v1.0.0** - Initial streaming player release
  - Progressive buffering
  - Mobile optimizations
  - Full accessibility
  - Performance analytics
  - Intelligent preloading

## License

Same as parent project.

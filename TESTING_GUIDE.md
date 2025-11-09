# Testing Guide for Streaming Audio Player

This guide provides comprehensive testing strategies for the streaming audio player implementation.

## Testing Stack

### Recommended Tools
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **axe-core** - Accessibility testing
- **MSW (Mock Service Worker)** - API mocking
- **Lighthouse CI** - Performance testing

## Unit Tests

### Testing Hooks

#### useStreamingAudioPlayer

```typescript
// __tests__/hooks/use-streaming-audio-player.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStreamingAudioPlayer } from '@/hooks/use-streaming-audio-player';

describe('useStreamingAudioPlayer', () => {
  beforeEach(() => {
    // Mock Audio element
    global.Audio = jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      load: jest.fn(),
      volume: 0.8,
      playbackRate: 1,
      currentTime: 0,
      duration: 100,
      buffered: {
        length: 1,
        start: () => 0,
        end: () => 50
      }
    })) as any;
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => useStreamingAudioPlayer());

    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.volume).toBe(0.8);
    expect(result.current.state.playbackRate).toBe(1);
  });

  test('should load audio', async () => {
    const { result } = renderHook(() => useStreamingAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('test-1', '/audio/test.mp3');
    });

    expect(result.current.state.audioId).toBe('test-1');
    expect(result.current.state.audioUrl).toBe('/audio/test.mp3');
    expect(result.current.state.isLoading).toBe(true);
  });

  test('should play audio', async () => {
    const { result } = renderHook(() => useStreamingAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('test-1', '/audio/test.mp3');
    });

    await act(async () => {
      await result.current.controls.play();
    });

    expect(result.current.state.isPlaying).toBe(true);
  });

  test('should pause audio', async () => {
    const { result } = renderHook(() => useStreamingAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('test-1', '/audio/test.mp3');
      await result.current.controls.play();
    });

    act(() => {
      result.current.controls.pause();
    });

    expect(result.current.state.isPlaying).toBe(false);
  });

  test('should seek to position', async () => {
    const { result } = renderHook(() => useStreamingAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('test-1', '/audio/test.mp3');
    });

    act(() => {
      result.current.controls.seek(50);
    });

    expect(result.current.audioRef.current?.currentTime).toBe(50);
  });

  test('should handle errors', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useStreamingAudioPlayer({ onError })
    );

    // Simulate error
    await act(async () => {
      await result.current.loadAudio('test-1', '/invalid-url.mp3');
    });

    // Trigger error event
    const audioElement = result.current.audioRef.current;
    const errorEvent = new Event('error');
    audioElement?.dispatchEvent(errorEvent);

    expect(onError).toHaveBeenCalled();
    expect(result.current.state.error).not.toBeNull();
  });
});
```

#### useAudioPreloader

```typescript
// __tests__/hooks/use-audio-preloader.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioPreloader } from '@/hooks/use-audio-preloader';
import type { AudioMarker } from '@/types/map';

// Mock fetch
global.fetch = jest.fn();

const mockMarkers: AudioMarker[] = [
  {
    id: 'marker-1',
    name: 'Test Marker 1',
    coordinates: [-118.29, 36.58],
    elevation: 1000,
    audioUrl: '/audio/test-1.mp3',
    chapter: 'test',
    featured: true
  },
  {
    id: 'marker-2',
    name: 'Test Marker 2',
    coordinates: [-118.30, 36.59],
    elevation: 1100,
    audioUrl: '/audio/test-2.mp3',
    chapter: 'test',
    featured: false
  }
];

describe('useAudioPreloader', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new Uint8Array([1, 2, 3])
            })
            .mockResolvedValueOnce({
              done: true
            })
        })
      },
      headers: new Headers({
        'content-type': 'audio/mpeg',
        'content-length': '1024'
      })
    });
  });

  test('should get nearby markers', () => {
    const { result } = renderHook(() => useAudioPreloader());

    const nearby = result.current.getNearbyMarkers(
      mockMarkers,
      { lat: 36.58, lng: -118.29 }
    );

    expect(nearby.length).toBeGreaterThan(0);
  });

  test('should preload audio', async () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useAudioPreloader({ onPreloadComplete: onComplete })
    );

    await act(async () => {
      await result.current.preloadSingle('marker-1', '/audio/test-1.mp3');
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('marker-1');
    });
  });

  test('should check if audio is preloaded', async () => {
    const { result } = renderHook(() => useAudioPreloader());

    expect(result.current.isPreloaded('marker-1')).toBe(false);

    await act(async () => {
      await result.current.preloadSingle('marker-1', '/audio/test-1.mp3');
    });

    await waitFor(() => {
      expect(result.current.isPreloaded('marker-1')).toBe(true);
    });
  });

  test('should cancel preload', async () => {
    const { result } = renderHook(() => useAudioPreloader());

    const preloadPromise = act(async () => {
      await result.current.preloadSingle('marker-1', '/audio/test-1.mp3');
    });

    act(() => {
      result.current.cancelPreload('marker-1');
    });

    await waitFor(() => {
      expect(result.current.preloading).not.toContain('marker-1');
    });
  });
});
```

#### useAudioAnalytics

```typescript
// __tests__/hooks/use-audio-analytics.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAudioAnalytics } from '@/hooks/use-audio-analytics';

describe('useAudioAnalytics', () => {
  test('should initialize session', () => {
    const { result } = renderHook(() => useAudioAnalytics());

    act(() => {
      result.current.initializeSession('test-1', '/audio/test.mp3');
    });

    const analytics = result.current.getAnalytics();
    expect(analytics?.audioId).toBe('test-1');
    expect(analytics?.audioUrl).toBe('/audio/test.mp3');
  });

  test('should track play time', () => {
    const { result } = renderHook(() => useAudioAnalytics());

    act(() => {
      result.current.initializeSession('test-1', '/audio/test.mp3');
      result.current.trackPlayTime(10);
      result.current.trackPlayTime(5);
    });

    const analytics = result.current.getAnalytics();
    expect(analytics?.totalPlayTime).toBe(15);
  });

  test('should track seeks', () => {
    const { result } = renderHook(() => useAudioAnalytics());

    act(() => {
      result.current.initializeSession('test-1', '/audio/test.mp3');
      result.current.trackSeek();
      result.current.trackSeek();
    });

    const analytics = result.current.getAnalytics();
    expect(analytics?.seekCount).toBe(2);
  });

  test('should call onSessionEnd', () => {
    const onSessionEnd = jest.fn();
    const { result } = renderHook(() =>
      useAudioAnalytics({ enabled: true, onSessionEnd })
    );

    act(() => {
      result.current.initializeSession('test-1', '/audio/test.mp3');
      result.current.endSession();
    });

    expect(onSessionEnd).toHaveBeenCalled();
  });
});
```

## Component Tests

### StreamingAudioPlayer

```typescript
// __tests__/components/streaming-audio-player.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StreamingAudioPlayer } from '@/components/audio/streaming-audio-player';
import type { AudioMarker } from '@/types/map';

const mockMarker: AudioMarker = {
  id: 'test-marker',
  name: 'Test Location',
  coordinates: [-118.29, 36.58],
  elevation: 1000,
  audioUrl: '/audio/test.mp3',
  chapter: 'test',
  featured: true
};

describe('StreamingAudioPlayer', () => {
  beforeEach(() => {
    global.Audio = jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      load: jest.fn(),
      volume: 0.8,
      playbackRate: 1,
      currentTime: 0,
      duration: 100,
      buffered: { length: 0 }
    })) as any;
  });

  test('should render player when marker is provided', () => {
    render(<StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />);

    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 1,000 ft')).toBeInTheDocument();
  });

  test('should not render when marker is null', () => {
    const { container } = render(
      <StreamingAudioPlayer marker={null} onClose={jest.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<StreamingAudioPlayer marker={mockMarker} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close audio player');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  test('should toggle play/pause on button click', async () => {
    render(<StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />);

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });

  test('should handle keyboard shortcuts', async () => {
    render(<StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />);

    // Space to play
    fireEvent.keyDown(window, { code: 'Space' });

    await waitFor(() => {
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });

  test('should display error message', async () => {
    // Mock error state
    render(<StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />);

    // Simulate error
    // This would require mocking the hook to return an error state
    // For now, this is a placeholder
  });

  test('should be accessible', async () => {
    const { container } = render(
      <StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />
    );

    // Check for ARIA attributes
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Audio player');
    expect(screen.getByRole('slider', { name: /seek/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument();

    // Check for live region
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

## E2E Tests

### Playwright Tests

```typescript
// e2e/audio-player.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Streaming Audio Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open player when marker is clicked', async ({ page }) => {
    // Click on an audio marker
    await page.click('[data-testid="audio-marker-1"]');

    // Player should be visible
    await expect(page.locator('[aria-label="Audio player"]')).toBeVisible();
  });

  test('should play and pause audio', async ({ page }) => {
    await page.click('[data-testid="audio-marker-1"]');

    const playButton = page.locator('[aria-label="Play"]');
    await playButton.click();

    // Should change to pause button
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible();

    const pauseButton = page.locator('[aria-label="Pause"]');
    await pauseButton.click();

    // Should change back to play button
    await expect(playButton).toBeVisible();
  });

  test('should seek through audio', async ({ page }) => {
    await page.click('[data-testid="audio-marker-1"]');

    const seekBar = page.locator('[aria-label="Seek"]');
    const bbox = await seekBar.boundingBox();

    if (bbox) {
      // Click at 50% position
      await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);

      // Time should update
      const currentTime = await page.locator('time[aria-label="Current time"]');
      await expect(currentTime).not.toHaveText('0:00');
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.click('[data-testid="audio-marker-1"]');

    // Press space to play
    await page.keyboard.press('Space');
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible();

    // Press K to pause
    await page.keyboard.press('k');
    await expect(page.locator('[aria-label="Play"]')).toBeVisible();

    // Press L to skip forward
    await page.keyboard.press('l');

    // Press J to skip backward
    await page.keyboard.press('j');
  });

  test('should close player', async ({ page }) => {
    await page.click('[data-testid="audio-marker-1"]');

    const closeButton = page.locator('[aria-label="Close audio player"]');
    await closeButton.click();

    await expect(page.locator('[aria-label="Audio player"]')).not.toBeVisible();
  });

  test('should be accessible with keyboard only', async ({ page }) => {
    // Tab to marker
    await page.keyboard.press('Tab');
    // Continue tabbing until we reach a marker
    // This is a simplified version - adjust based on your layout

    // Open player with Enter
    await page.keyboard.press('Enter');

    // Player should be visible
    await expect(page.locator('[aria-label="Audio player"]')).toBeVisible();

    // Tab through controls
    await page.keyboard.press('Tab'); // Close button
    await page.keyboard.press('Tab'); // Playback rate
    await page.keyboard.press('Tab'); // Skip backward
    await page.keyboard.press('Tab'); // Play button
    await page.keyboard.press('Enter'); // Activate play

    await expect(page.locator('[aria-label="Pause"]')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-testid="audio-marker-1"]');

    const player = page.locator('[aria-label="Audio player"]');
    await expect(player).toBeVisible();

    // Touch controls should work
    const playButton = page.locator('[aria-label="Play"]');
    await playButton.tap();

    await expect(page.locator('[aria-label="Pause"]')).toBeVisible();
  });

  test('should handle slow network', async ({ page }) => {
    // Throttle network
    await page.route('**/*.mp3', (route) => {
      route.fulfill({
        status: 200,
        body: Buffer.alloc(1024 * 1024), // 1MB dummy audio
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(1024 * 1024)
        }
      });
    });

    await page.click('[data-testid="audio-marker-1"]');

    // Should show loading state
    await expect(page.locator('[aria-label="Play"]')).toBeDisabled();

    // Eventually should be playable
    await expect(page.locator('[aria-label="Play"]')).toBeEnabled({ timeout: 10000 });
  });
});
```

## Accessibility Tests

### axe-core Tests

```typescript
// __tests__/accessibility/audio-player.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { StreamingAudioPlayer } from '@/components/audio/streaming-audio-player';
import type { AudioMarker } from '@/types/map';

expect.extend(toHaveNoViolations);

const mockMarker: AudioMarker = {
  id: 'test-marker',
  name: 'Test Location',
  coordinates: [-118.29, 36.58],
  elevation: 1000,
  audioUrl: '/audio/test.mp3',
  chapter: 'test',
  featured: true
};

describe('Accessibility', () => {
  test('should have no accessibility violations', async () => {
    const { container } = render(
      <StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should have proper ARIA labels', () => {
    const { getByLabelText, getByRole } = render(
      <StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />
    );

    expect(getByRole('region')).toHaveAttribute('aria-label', 'Audio player');
    expect(getByLabelText('Play')).toBeInTheDocument();
    expect(getByLabelText('Volume')).toBeInTheDocument();
    expect(getByLabelText('Seek')).toBeInTheDocument();
  });

  test('should announce state changes to screen readers', async () => {
    const { getByRole, getByLabelText } = render(
      <StreamingAudioPlayer marker={mockMarker} onClose={jest.fn()} />
    );

    const liveRegion = getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });
});
```

## Performance Tests

### Lighthouse CI

```yaml
# .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

## Testing Checklist

### Before Each Release
- [ ] All unit tests pass
- [ ] All component tests pass
- [ ] All E2E tests pass
- [ ] Accessibility tests pass (no violations)
- [ ] Lighthouse scores meet targets
- [ ] Manual testing on Chrome, Firefox, Safari
- [ ] Manual testing on iOS Safari
- [ ] Manual testing on Android Chrome
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Keyboard navigation testing
- [ ] Network throttling testing
- [ ] Battery testing on mobile devices

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Run accessibility tests
        run: pnpm test:a11y

      - name: Run Lighthouse CI
        run: pnpm lighthouse:ci
```

## Manual Testing Checklist

### Functionality
- [ ] Audio loads and plays
- [ ] Pause works correctly
- [ ] Seek works (click and drag)
- [ ] Volume control works
- [ ] Playback rate changes work
- [ ] Skip forward/backward work
- [ ] Buffer indicator displays correctly
- [ ] Error handling works
- [ ] Retry mechanism works
- [ ] Close button works

### Keyboard Navigation
- [ ] Tab through all controls
- [ ] Enter activates buttons
- [ ] Space plays/pauses
- [ ] Arrow keys work on sliders
- [ ] All shortcuts work (K, J, L, etc.)

### Screen Reader
- [ ] All controls have labels
- [ ] State changes are announced
- [ ] Progress is announced
- [ ] Errors are announced
- [ ] Time updates are accessible

### Mobile
- [ ] Touch controls work
- [ ] Responsive layout
- [ ] No layout shift
- [ ] Battery detection works
- [ ] Network detection works
- [ ] Works in landscape mode
- [ ] Works on small screens

### Performance
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Fast load time
- [ ] Efficient buffering
- [ ] No jank on scroll

### Edge Cases
- [ ] Handles missing audio files
- [ ] Handles network errors
- [ ] Handles slow connections
- [ ] Handles very long audio files
- [ ] Handles rapid play/pause
- [ ] Handles rapid seeking
- [ ] Handles browser back button
- [ ] Handles page refresh during playback

## **Prompt 1: Pacific Crest Trail Audio Map - React/TypeScript
with Mapbox Storytelling**

\`\`\`
Create a React/TypeScript web application for an immersive Pacific Crest Trail (PCT) audio experience using Mapbox's storytelling/scrollytelling features. This project showcases ambient sound recordings collected along the 2,650-mile trail from Mexico to Canada through an interactive, scroll-driven map interface with cinematic camera movements and 3D terrain.

PROJECT VISION:
The application tells the story of the PCT through sound - capturing the diverse acoustic environments from the Sonoran Desert to the Cascade Mountains. Users scroll through a cinematic journey with smooth, choreographed camera movements that follow the trail's path while revealing audio recording points. The interface combines minimalistic design with rich multimedia content and dramatic 3D terrain visualization, creating an engaging digital storytelling experience similar to premium editorial pieces from The New York Times or National Geographic.

CORE FEATURES:
- Full-screen interactive map with 3D terrain showing PCT elevation changes
- Mapbox storytelling with smooth camera path animations between trail segments
- Free camera movements that follow the trail's natural curves and elevation
- Clickable audio markers at specific trail locations with high-quality ambient recordings
- Minimalistic dark aesthetic with the trail highlighted in pink/red against terrain
- Mobile-responsive design optimized for both desktop and touch devices
- Progressive audio loading with seamless playback controls

TECHNICAL STACK:
- React 18+ with TypeScript for type safety and modern development
- Next.js 14+ for optimized performance and deployment
- Mapbox GL JS v2+ with terrain and storytelling features (https://docs.mapbox.com/mapbox-gl-js/api/)
- @visgl/react-map-gl for React integration (https://visgl.github.io/react-map-gl/)
- Framer Motion for UI animations (https://www.framer.com/motion/)
- Tailwind CSS for utility-first styling
- React Intersection Observer for scroll detection

MAPBOX STORYTELLING INTEGRATION:
The map leverages Mapbox's advanced storytelling capabilities including:

1. **Free Camera Path Animation** (https://docs.mapbox.com/mapbox-gl-js/example/free-camera-path/)
   - Smooth camera movements that follow the PCT trail's natural curves
   - Dynamic pitch and bearing changes to showcase terrain features
   - Choreographed flight paths between major trail segments

2. **3D Terrain Visualization** (https://docs.mapbox.com/mapbox-gl-js/example/add-terrain/)
   - Mapbox terrain-rgb source for elevation data
   - 3D terrain rendering to show PCT's dramatic elevation changes
   - Enhanced depth perception for Sierra Nevada, Cascades sections

3. **Scroll-Driven Camera Control**
   - Intersection Observer triggers camera path animations
   - Smooth transitions between predefined camera positions
   - Speed and easing control for cinematic feel

MAPBOX CONFIGURATION:
\`\`\`typescript
// Essential Mapbox features for PCT storytelling
const mapConfig = {
  style: 'mapbox://styles/mapbox/satellite-v9', // Dark satellite base
  terrain: {
    source: 'mapbox-terrain-rgb',
    exaggeration: 1.5 // Emphasize elevation changes
  },
  camera: {
    // Free camera path following PCT route
    path: [
      // Southern California segment
      { center: [-116.46, 32.60], zoom: 8, pitch: 60, bearing: 45 },
      // Sierra Nevada segment  
      { center: [-118.29, 36.58], zoom: 9, pitch: 70, bearing: 30 },
      // Northern California segment
      { center: [-121.50, 40.50], zoom: 8, pitch: 45, bearing: 15 },
      // Oregon segment
      { center: [-121.70, 44.20], zoom: 7, pitch: 40, bearing: 0 },
      // Washington segment
      { center: [-121.15, 47.75], zoom: 8, pitch: 50, bearing: -15 }
    ]
  }
};
\`\`\`

KEY MAPBOX APIS TO IMPLEMENT:
- \`map.addSource()\` for terrain-rgb and trail data
- \`map.easeTo()\` and \`map.flyTo()\` for camera animations  
- \`map.setTerrain()\` for 3D terrain activation
- Custom easing functions for natural camera movement
- Layer opacity transitions for storytelling effects

DATA STRUCTURE:
\`\`\`typescript
interface PCTChapter {
  id: string;
  title: string;
  description: string;
  camera: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
    duration: number;
  };
  terrain?: {
    exaggeration: number;
  };
  audioMarkers: string[]; // IDs of relevant audio recordings
}

interface AudioMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  elevation: number;
  audioUrl: string;
  chapter: string;
  featured: boolean;
}
\`\`\`

VISUAL DESIGN:
- Dark satellite base style emphasizing natural terrain
- PCT trail rendered as prominent pink/red line (#ff6b9d) with glow effect
- 3D terrain with enhanced exaggeration for dramatic elevation visualization
- Clean typography using system fonts
- Floating content cards with glassmorphism effects
- Cinematic camera movements that respect the trail's natural flow
- Mobile-optimized touch targets and responsive layouts

SCROLL INTERACTION & STORYTELLING:
The scroll-driven narrative uses Mapbox's storytelling pattern:
1. Intersection Observer detects scroll position
2. Triggers smooth camera path animations following the PCT route
3. Each scroll section represents a major trail segment with dramatic camera positioning
4. Terrain exaggeration and lighting adjust for each segment's character
5. Audio markers fade in/out based on camera position and zoom level

PERFORMANCE CONSIDERATIONS:
- Terrain data streaming for smooth 3D rendering
- Progressive audio loading with intelligent preloading
- Optimized camera path calculations
- Efficient marker clustering at different zoom levels
- Mobile GPU optimization for terrain rendering

PROJECT STRUCTURE:
\`\`\`
src/
├── components/
│   ├── Map/
│   │   ├── PCTMap.tsx              // Main map with terrain
│   │   ├── CameraController.tsx    // Free camera path logic
│   │   └── TerrainLayer.tsx        // 3D terrain configuration
│   ├── Scroll/
│   │   ├── StorytellingScroll.tsx  // Mapbox storytelling integration
│   │   └── ChapterSection.tsx      // Individual trail segments
│   └── Audio/
│       └── AudioPlayer.tsx         // Audio playback with map sync
├── hooks/
│   ├── useMapboxStory.ts          // Storytelling camera control
│   └── useTerrainEffects.ts       // 3D terrain interactions
├── utils/
│   └── cameraPath.ts              // Camera path calculations
└── data/
    ├── pct-trail.geojson          // Trail geometry with elevation
    ├── camera-path.json           // Predefined camera positions
    └── audio-markers.geojson      // Audio locations with elevation
\`\`\`

ENVIRONMENT REQUIREMENTS:
- Mapbox access token with terrain and storytelling features enabled
- Node.js 18+ for development
- Modern browser with WebGL 2.0 support for 3D terrain rendering

Create the foundational React components that integrate Mapbox's storytelling capabilities, focusing on smooth camera path animations and 3D terrain visualization. Include proper TypeScript interfaces for camera control, terrain configuration, and audio marker integration. The initial implementation should render a full-screen map with 3D terrain, demonstrate basic camera path movement, and show the PCT trail prominently against the terrain.

Reference documentation:
- Mapbox Storytelling: https://docs.mapbox.com/help/tutorials/storytelling/
- Free Camera Path: https://docs.mapbox.com/mapbox-gl-js/example/free-camera-path/
- 3D Terrain: https://docs.mapbox.com/mapbox-gl-js/example/add-terrain/
- Camera API: https://docs.mapbox.com/mapbox-gl-js/api/map/#map#easeto
- React Map GL: https://visgl.github.io/react-map-gl/
\`\`\`

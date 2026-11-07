// Custom place labels drawn on top of the Studio style. Source of truth:
// "Mapbox custom labels" sheet + Anna's Figma label-style board. Each `kind` is
// styled to match one of the Studio style's own layers (see
// lib/trail-label-layer.ts):
//   town     → "small city labels"
//   poi      → "non-green POIs" (always the teardrop marker icon)
//   mountain → "mountain peak labels"
//   tree     → "parks labels" (park icon)
//   water    → "water label" (lowercase)
//   road     → "airport label"
//   pass     → same as road
//
// Left out: rows marked "already on map" in the sheet (Big Bear Lake,
// Wrightwood, Mount Baden-Powell, Vasquez Rocks, South Lake Tahoe), and Big
// Lake Youth Camp, whose sheet coordinates duplicate McKenzie Pass.

export type TrailLabelKind = "town" | "poi" | "mountain" | "tree" | "water" | "road" | "pass"

export interface TrailLabel {
  name: string
  /** [lng, lat] */
  coordinates: [number, number]
  kind: TrailLabelKind
  /** Sheet says "ok to leave out if too busy": loses label collisions first. */
  optional?: boolean
  /**
   * Base-map spellings of the same feature, hidden so the place isn't labelled
   * twice. The label's own `name` is always hidden from the base map too.
   */
  baseMapAliases?: string[]
}

export const trailLabels: TrailLabel[] = [
  { name: "PCT Southern Terminus", coordinates: [-116.466988, 32.589729], kind: "poi" },
  { name: "Campo", coordinates: [-116.473148, 32.60947], kind: "town" },
  { name: "Lake Morena", coordinates: [-116.526941, 32.69664], kind: "water" },
  { name: "Mount Laguna", coordinates: [-116.41877, 32.867649], kind: "town" },
  { name: "Scissors Crossing", coordinates: [-116.470192, 33.098759], kind: "road" },
  { name: "Third Gate Water Cache", coordinates: [-116.542778, 33.167801], kind: "poi" },
  { name: "Montezuma Valley Road", coordinates: [-116.587929, 33.216782], kind: "road" },
  { name: "Warner Springs", coordinates: [-116.634186, 33.282887], kind: "town" },
  { name: "Mike's Place", coordinates: [-116.591202, 33.380531], kind: "poi" },
  { name: "Little Bear Hostel", coordinates: [-116.59617, 33.51114], kind: "poi" },
  { name: "Paradise Valley Cafe", coordinates: [-116.5914, 33.56905], kind: "poi" },
  { name: "Idyllwild", coordinates: [-116.713173, 33.744789], kind: "town" },
  { name: "Mount San Jacinto", coordinates: [-116.67942, 33.814739], kind: "mountain", baseMapAliases: ["San Jacinto Peak"] },
  { name: "Cabazon", coordinates: [-116.783142, 33.917389], kind: "town" },
  { name: "Whitewater Preserve", coordinates: [-116.655861, 33.98914], kind: "tree" },
  { name: "Mission Creek", coordinates: [-116.655632, 34.042336], kind: "water" },
  { name: "Cedar Glen Malt Shop", coordinates: [-117.167786, 34.253803], kind: "poi" },
  { name: "Deep Creek Hot Springs", coordinates: [-117.176521, 34.33947], kind: "poi" },
  { name: "Silverwood Reservoir", coordinates: [-117.318865, 34.299834], kind: "water", baseMapAliases: ["Silverwood Lake"] },
  { name: "Cajon Junction", coordinates: [-117.475082, 34.311806], kind: "town" },
  { name: "Acton", coordinates: [-118.196106, 34.467171], kind: "town" },
  { name: "RV Resort", coordinates: [-118.265831, 34.438057], kind: "poi" },
  { name: "Agua Dulce", coordinates: [-118.326675, 34.496365], kind: "town" },
  { name: "Green Valley", coordinates: [-118.413254, 34.622696], kind: "town" },
  { name: "Hikertown", coordinates: [-118.606773, 34.77578], kind: "town" },
  { name: "Wee Vill Market", coordinates: [-118.457474, 34.77446], kind: "poi" },
  { name: "Los Angeles Aqueduct", coordinates: [-118.587471, 34.83416], kind: "poi" },
  { name: "Cottonwood Creek", coordinates: [-118.455391, 34.89748], kind: "water" },
  { name: "Isabella Lake", coordinates: [-118.414045, 35.665577], kind: "water", baseMapAliases: ["Lake Isabella"] },
  { name: "Walker Pass", coordinates: [-118.02639, 35.663055], kind: "pass" },
  { name: "Kennedy Meadows (South)", coordinates: [-118.122336, 36.017817], kind: "town" },
  { name: "Horseshoe Meadow", coordinates: [-118.170635, 36.448066], kind: "poi" },
  { name: "Cottonwood Pass", coordinates: [-118.215736, 36.45319], kind: "pass" },
  { name: "Mount Whitney", coordinates: [-118.292183, 36.578621], kind: "mountain" },
  { name: "Shepherd Pass", coordinates: [-118.368467, 36.654845], kind: "pass", optional: true },
  { name: "Forester Pass", coordinates: [-118.37352, 36.694538], kind: "pass" },
  { name: "Kearsarge Pass", coordinates: [-118.376478, 36.773188], kind: "pass" },
  { name: "Glen Pass", coordinates: [-118.411972, 36.789612], kind: "pass" },
  { name: "Sawmill Pass", coordinates: [-118.364487, 36.882977], kind: "pass", optional: true },
  { name: "Pinchot Pass", coordinates: [-118.41256, 36.936169], kind: "pass" },
  { name: "Mather Pass", coordinates: [-118.46019, 37.03125], kind: "pass" },
  { name: "Bishop Pass", coordinates: [-118.544961, 37.114956], kind: "pass", optional: true },
  { name: "Muir Pass", coordinates: [-118.67099, 37.112068], kind: "pass" },
  { name: "Piute Pass", coordinates: [-118.684246, 37.23976], kind: "pass", optional: true },
  { name: "Independence", coordinates: [-118.201515, 36.805531], kind: "town" },
  { name: "Lone Pine", coordinates: [-118.062782, 36.60611], kind: "town" },
  { name: "Big Pine", coordinates: [-118.289795, 37.165992], kind: "town" },
  { name: "Muir Trail Ranch", coordinates: [-118.881027, 37.237339], kind: "poi" },
  { name: "Vermillion Valley Resort", coordinates: [-119.013229, 37.376141], kind: "poi" },
  { name: "Florence Lake", coordinates: [-118.961029, 37.261417], kind: "water" },
  { name: "Lake Thomas A. Edison", coordinates: [-118.97622, 37.380742], kind: "water", baseMapAliases: ["Lake Thomas A Edison"] },
  { name: "Selden Pass", coordinates: [-118.872849, 37.28997], kind: "pass" },
  { name: "Silver Pass", coordinates: [-118.923233, 37.467874], kind: "pass" },
  { name: "Devil's Postpile", coordinates: [-119.085037, 37.62492], kind: "poi", optional: true },
  { name: "Red's Meadow Resort", coordinates: [-119.074883, 37.61499], kind: "poi" },
  { name: "Island Pass", coordinates: [-119.194717, 37.73687], kind: "pass" },
  { name: "Donohue Pass", coordinates: [-119.248682, 37.76095], kind: "pass" },
  { name: "Tuolumne Meadows", coordinates: [-119.356689, 37.874699], kind: "town" },
  { name: "Lee Vining", coordinates: [-119.120018, 37.957561], kind: "town" },
  { name: "Mono Lake", coordinates: [-119.076101, 37.972533], kind: "water" },
  { name: "Glen Aulin Campground", coordinates: [-119.419868, 37.90963], kind: "poi" },
  { name: "Benson Pass", coordinates: [-119.460564, 38.015308], kind: "pass" },
  { name: "Seavey Pass", coordinates: [-119.520081, 38.046001], kind: "pass" },
  { name: "Dorothy Lake Pass", coordinates: [-119.58156, 38.180126], kind: "pass" },
  { name: "Kennedy Meadows (North)", coordinates: [-119.745552, 38.31105], kind: "town" },
  { name: "Sonora Pass", coordinates: [-119.6371, 38.328121], kind: "pass" },
  { name: "Carson Pass", coordinates: [-119.983231, 38.683189], kind: "pass" },
  { name: "Ebbetts Pass", coordinates: [-119.810829, 38.54575], kind: "pass" },
  { name: "Echo Lake", coordinates: [-120.040908, 38.832508], kind: "town" },
  { name: "Bridgeport", coordinates: [-119.223106, 38.255054], kind: "town" },
  { name: "Walker", coordinates: [-119.476707, 38.515179], kind: "town" },
  { name: "Markleeville", coordinates: [-119.780296, 38.694904], kind: "town" },
  { name: "Soda Springs", coordinates: [-120.383972, 39.324253], kind: "town" },
  { name: "Donner Ski Ranch", coordinates: [-120.329887, 39.317829], kind: "poi" },
  { name: "Sierra City", coordinates: [-120.636841, 39.565411], kind: "town" },
  { name: "Bucks Lake", coordinates: [-121.173759, 39.867771], kind: "town" },
  { name: "Belden", coordinates: [-121.251205, 40.005943], kind: "town" },
  { name: "PCT Halfway Marker", coordinates: [-121.355843, 40.209999], kind: "poi" },
  { name: "Old Station", coordinates: [-121.433235, 40.674656], kind: "town" },
  { name: "Burney Mountain Guest Ranch", coordinates: [-121.560066, 40.954426], kind: "poi" },
  { name: "Burney", coordinates: [-121.654732, 40.887939], kind: "town" },
  { name: "Burney Falls State Park", coordinates: [-121.650948, 41.012619], kind: "tree" },
  { name: "Dunsmuir", coordinates: [-122.271683, 41.213348], kind: "town" },
  { name: "Callahan", coordinates: [-122.801425, 41.310022], kind: "town" },
  { name: "Etna", coordinates: [-122.898468, 41.459324], kind: "town" },
  { name: "Seiad Valley", coordinates: [-123.19606, 41.842098], kind: "town" },
  { name: "California-Oregon Border", coordinates: [-122.909111, 42.003632], kind: "poi" },
  { name: "Callahan's Lodge", coordinates: [-122.602684, 42.073795], kind: "poi" },
  { name: "Hyatt Lake Resort", coordinates: [-122.466202, 42.180359], kind: "poi" },
  { name: "Fish Lake Resort", coordinates: [-122.315262, 42.394241], kind: "poi" },
  { name: "Mazama Village", coordinates: [-122.167168, 42.867599], kind: "poi" },
  { name: "Diamond Lake Resort", coordinates: [-122.138519, 43.177395], kind: "poi" },
  { name: "Chemult", coordinates: [-121.783142, 43.216419], kind: "town" },
  { name: "Sisters", coordinates: [-121.549583, 44.291306], kind: "town" },
  { name: "Government Camp", coordinates: [-121.754723, 45.304024], kind: "town" },
  { name: "Cascade Locks", coordinates: [-121.89325, 45.668713], kind: "town" },
  { name: "Timberline Lodge", coordinates: [-121.711296, 45.331039], kind: "poi" },
  { name: "Shelter Cove Resort", coordinates: [-122.040192, 43.581501], kind: "poi" },
  { name: "Elk Lake Resort", coordinates: [-121.806061, 43.980419], kind: "poi" },
  { name: "McKenzie Pass", coordinates: [-121.805199, 44.259811], kind: "pass" },
  { name: "Olallie Lake Resort", coordinates: [-121.789192, 44.81398], kind: "poi" },
  { name: "Timothy Lake", coordinates: [-121.788323, 45.119864], kind: "water" },
  { name: "Santiam Pass", coordinates: [-121.849617, 44.423679], kind: "pass" },
  { name: "Trout Lake", coordinates: [-121.526993, 45.99651], kind: "town" },
  { name: "Packwood", coordinates: [-121.668861, 46.610199], kind: "town" },
  { name: "White Pass", coordinates: [-121.379272, 46.643639], kind: "pass" },
  { name: "Chinook Pass", coordinates: [-121.515877, 46.872101], kind: "pass" },
  { name: "Keechelus Lake", coordinates: [-121.353996, 47.328879], kind: "water" },
  { name: "Snoqualmie Pass", coordinates: [-121.413757, 47.423473], kind: "pass" },
  { name: "Stevens Pass", coordinates: [-121.089607, 47.744576], kind: "pass" },
  { name: "Skykomish", coordinates: [-121.361761, 47.709407], kind: "town" },
  { name: "Stehekin", coordinates: [-120.657158, 48.31052], kind: "town" },
  { name: "Mazama", coordinates: [-120.404684, 48.594224], kind: "town" },
  { name: "Harts Pass", coordinates: [-120.670052, 48.721031], kind: "pass" },
  { name: "Rainy Pass", coordinates: [-120.734077, 48.514751], kind: "pass" },
  { name: "PCT Northern Terminus", coordinates: [-120.802223, 49.000118], kind: "poi" },
]

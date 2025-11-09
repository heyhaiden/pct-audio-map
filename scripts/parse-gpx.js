const fs = require('fs');
const path = require('path');

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, index + 1), tolerance);
    const right = douglasPeucker(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

function parseGPX(gpxContent) {
  const coordinates = [];
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>[\s\S]*?<\/trkpt>/g;

  let match;
  let count = 0;

  while ((match = trkptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const ele = parseFloat(match[3]);
    coordinates.push([lon, lat, ele]);
    count++;

    if (count % 50000 === 0) {
      console.log('Parsed ' + count + ' points...');
    }
  }

  console.log('Total points parsed: ' + count);
  return coordinates;
}

async function main() {
  const gpxPath = '/Users/heyhaiden/Downloads/Entire PCT - size 6 - 327976 points - 2633.53 miles.gpx';
  const outputPath = path.join(__dirname, '../data/pct-trail-geometry.json');

  console.log('Reading GPX file...');
  const gpxContent = fs.readFileSync(gpxPath, 'utf-8');

  console.log('Parsing GPX coordinates...');
  const allCoordinates = parseGPX(gpxContent);

  console.log('Original points: ' + allCoordinates.length);

  const tolerances = [0.0005, 0.001, 0.002];

  console.log('\nTesting different simplification levels:');
  for (const tolerance of tolerances) {
    const simplified = douglasPeucker(allCoordinates, tolerance);
    const reductionPercent = ((1 - simplified.length / allCoordinates.length) * 100).toFixed(2);
    console.log('Tolerance ' + tolerance + ': ' + simplified.length + ' points (' + reductionPercent + '% reduction)');
  }

  const optimalTolerance = 0.001;
  console.log('\nUsing tolerance: ' + optimalTolerance);

  const simplifiedCoordinates = douglasPeucker(allCoordinates, optimalTolerance);
  console.log('Simplified to: ' + simplifiedCoordinates.length + ' points');

  const geoJSON = {
    type: "Feature",
    properties: {
      name: "Pacific Crest Trail",
      length: 2650,
      states: ["California", "Oregon", "Washington"],
      originalPoints: allCoordinates.length,
      simplifiedPoints: simplifiedCoordinates.length,
      tolerance: optimalTolerance
    },
    geometry: {
      type: "LineString",
      coordinates: simplifiedCoordinates
    }
  };

  console.log('\nWriting optimized GeoJSON to: ' + outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(geoJSON, null, 2));

  const fileSize = fs.statSync(outputPath).size;
  const fileSizeKB = (fileSize / 1024).toFixed(2);
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  console.log('\nOptimization complete!');
  console.log('File size: ' + fileSizeKB + ' KB (' + fileSizeMB + ' MB)');
  console.log('Points reduced from ' + allCoordinates.length + ' to ' + simplifiedCoordinates.length);
  console.log('Reduction: ' + ((1 - simplifiedCoordinates.length / allCoordinates.length) * 100).toFixed(2) + '%');
}

main().catch(console.error);

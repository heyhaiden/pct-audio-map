#!/usr/bin/env node

/**
 * Generate sprite sheets from SVG files for Mapbox style
 * 
 * This script generates:
 * - sprite.png and sprite.json (1x resolution)
 * - sprite@2x.png and sprite@2x.json (2x resolution for retina displays)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const spriteImagesDir = path.join(__dirname, '../public/map-styles/sprite_images');
const outputDir = path.join(__dirname, '../public/map-styles');

// Check if sprite_images directory exists
if (!fs.existsSync(spriteImagesDir)) {
  console.error(`Error: Sprite images directory not found at ${spriteImagesDir}`);
  process.exit(1);
}

// Get all SVG files
const svgFiles = fs.readdirSync(spriteImagesDir)
  .filter(file => file.endsWith('.svg'))
  .map(file => ({
    name: path.basename(file, '.svg'),
    path: path.join(spriteImagesDir, file)
  }));

if (svgFiles.length === 0) {
  console.error('Error: No SVG files found in sprite_images directory');
  process.exit(1);
}

console.log(`Found ${svgFiles.length} SVG files`);
console.log(`Input directory: ${spriteImagesDir}`);
console.log(`Output directory: ${outputDir}`);

/**
 * Generate sprite sheet for a given scale
 */
async function generateSprite(scale = 1) {
  const scaleSuffix = scale === 2 ? '@2x' : '';
  const outputPng = path.join(outputDir, `sprite${scaleSuffix}.png`);
  const outputJson = path.join(outputDir, `sprite${scaleSuffix}.json`);

  console.log(`\nGenerating ${scale}x sprite...`);

  // Process all SVGs to get their dimensions and convert to buffers
  const images = await Promise.all(
    svgFiles.map(async (file) => {
      const svgBuffer = fs.readFileSync(file.path);
      const metadata = await sharp(svgBuffer).metadata();
      const width = Math.ceil((metadata.width || 24) * scale);
      const height = Math.ceil((metadata.height || 24) * scale);
      
      // Convert SVG to PNG buffer
      const pngBuffer = await sharp(svgBuffer)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      return {
        name: file.name,
        buffer: pngBuffer,
        width,
        height
      };
    })
  );

  // Calculate sprite sheet dimensions using a simple bin-packing algorithm
  // For simplicity, we'll use a grid layout
  const maxWidth = Math.max(...images.map(img => img.width));
  const maxHeight = Math.max(...images.map(img => img.height));
  
  // Estimate grid size (square-ish)
  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  
  const spriteWidth = cols * maxWidth;
  const spriteHeight = rows * maxHeight;

  console.log(`  Sprite sheet size: ${spriteWidth}x${spriteHeight}px`);
  console.log(`  Grid: ${cols} columns x ${rows} rows`);

  // Create sprite sheet canvas
  const spriteCanvas = sharp({
    create: {
      width: spriteWidth,
      height: spriteHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Build composite operations
  const composites = [];
  const spriteJson = {};

  images.forEach((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * maxWidth;
    const y = row * maxHeight;

    composites.push({
      input: img.buffer,
      left: x,
      top: y
    });

    // Calculate pixel ratio (for @2x sprites)
    const pixelRatio = scale;
    
    spriteJson[img.name] = {
      width: img.width / pixelRatio,
      height: img.height / pixelRatio,
      pixelRatio: pixelRatio,
      x: x / pixelRatio,
      y: y / pixelRatio
    };
  });

  // Composite all images onto the sprite sheet
  const spriteBuffer = await spriteCanvas
    .composite(composites)
    .png()
    .toBuffer();

  // Save sprite PNG
  fs.writeFileSync(outputPng, spriteBuffer);
  console.log(`  ✓ Saved: ${outputPng}`);

  // Save sprite JSON
  fs.writeFileSync(outputJson, JSON.stringify(spriteJson, null, 2));
  console.log(`  ✓ Saved: ${outputJson}`);

  return { spriteJson, spriteBuffer };
}

async function main() {
  try {
    // Generate 1x sprite
    await generateSprite(1);

    // Generate 2x sprite for retina displays
    await generateSprite(2);

    console.log('\n✅ Sprite generation complete!');
    console.log(`Generated files:`);
    console.log(`  - ${path.join(outputDir, 'sprite.png')}`);
    console.log(`  - ${path.join(outputDir, 'sprite.json')}`);
    console.log(`  - ${path.join(outputDir, 'sprite@2x.png')}`);
    console.log(`  - ${path.join(outputDir, 'sprite@2x.json')}`);
  } catch (error) {
    console.error('\n❌ Error generating sprites:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

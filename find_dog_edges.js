import fs from 'fs';
import jpeg from 'jpeg-js';

const imagePath = './src/assets/images/dog_original_1779871601966.png';

const jpegData = fs.readFileSync(imagePath);
const rawImageData = jpeg.decode(jpegData, { useTArray: true });
const width = rawImageData.width;
const height = rawImageData.height;
const pixels = rawImageData.data;

console.log(`Image Size: ${width}x${height}`);

function isDogPixel(r, g, b, px, py) {
  // Let's design a powerful classifier based on dog colors vs dark foliage background
  // White/cream fur is very bright & neutral:
  if (r > 120 && g > 120 && b > 110) {
    // Avoid light leaks in top/top-left foliage:
    if (py < 0.25 && px < 0.3) return false;
    if (py < 0.15 && px > 0.7) return false;
    return true;
  }
  
  // Warm brown/tan/red-orange (main fur and harness):
  // Brown is characterized by having R > G and G > B (or G very close to B) and being moderately saturated.
  if (r > 50 && r > g && g > b - 15 && r - b > 10) {
    // Dark brown/earthy undergrowth leaves:
    if (py < 0.2 && px < 0.3) return false; // Top-left background
    if (py < 0.15) return false; // Top boundary
    if (r < 75 && g < 65 && b < 50 && py < 0.25) return false;
    return true;
  }
  
  // Bright red harness:
  if (r > 100 && r > g * 1.5 && r > b * 1.5 && py > 0.6) {
    return true;
  }
  
  // Blue eye / brown eye details:
  if (py > 0.25 && py < 0.5 && px > 0.25 && px < 0.75) {
    // Blue eye signature:
    if (b > r && b > g) return true;
    // Brown eye signature:
    if (r > 60 && g > 45 && r > b) return true;
  }

  return false;
}

const edges = [];
for (let y = 0; y < height; y++) {
  let left = -1;
  let right = -1;
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    if (isDogPixel(r, g, b, x / width, y / height)) {
      if (left === -1) left = x;
      right = x;
    }
  }
  edges.push({ y, left, right });
}

// Print downsampled edges
console.log('--- DOWNSAMPLED DOG EDGES ---');
for (let i = 0; i < height; i += 16) {
  const slice = edges.slice(i, i + 16);
  const avgLeft = Math.round(slice.reduce((sum, e) => sum + e.left, 0) / slice.length);
  const avgRight = Math.round(slice.reduce((sum, e) => sum + e.right, 0) / slice.length);
  console.log(`y: ${i}-${i+15} | Left X = ${avgLeft} (${(avgLeft / width * 100).toFixed(1)}%) | Right X = ${avgRight} (${(avgRight / width * 100).toFixed(1)}%)`);
}

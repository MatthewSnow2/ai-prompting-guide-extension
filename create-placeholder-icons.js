/**
 * AI Prompting Guide - Placeholder Icon Generator
 * 
 * This script generates simple placeholder PNG icons for the Chrome extension
 * in the required sizes (16x16, 32x32, 48x48, 128x128).
 * 
 * Usage:
 * 1. Make sure you have Node.js installed
 * 2. Run: npm install canvas
 * 3. Execute: node create-placeholder-icons.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Icon sizes required by Chrome extensions
const ICON_SIZES = [16, 32, 48, 128];

// Directory to save the icons
const OUTPUT_DIR = path.join(__dirname, 'images');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

/**
 * Generate a placeholder icon with the specified size
 * @param {number} size - Icon size in pixels
 * @returns {Buffer} - PNG image buffer
 */
function generateIcon(size) {
  // Create canvas with the specified size
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create a gradient background (blue to purple, matching the extension theme)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4285f4');  // Google blue
  gradient.addColorStop(1, '#8c52ff');  // Purple
  
  // Fill the background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add a border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(1, size / 32);
  ctx.strokeRect(0, 0, size, size);
  
  // Add text showing the size if the icon is large enough
  if (size >= 32) {
    const fontSize = Math.max(8, size / 6);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(size, size / 2, size / 2);
  } else if (size >= 16) {
    // For very small icons, just add a simple indicator
    ctx.fillStyle = 'white';
    ctx.fillRect(size / 4, size / 4, size / 2, size / 2);
  }
  
  // Convert canvas to PNG buffer
  return canvas.toBuffer('image/png');
}

/**
 * Main function to generate all icon sizes
 */
async function generateAllIcons() {
  console.log('Generating placeholder icons for AI Prompting Guide extension...');
  
  for (const size of ICON_SIZES) {
    try {
      const iconBuffer = generateIcon(size);
      const filePath = path.join(OUTPUT_DIR, `icon${size}.png`);
      
      fs.writeFileSync(filePath, iconBuffer);
      console.log(`Created icon: ${filePath}`);
    } catch (error) {
      console.error(`Error generating ${size}x${size} icon:`, error);
    }
  }
  
  console.log('Icon generation complete!');
}

// Run the icon generator
generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

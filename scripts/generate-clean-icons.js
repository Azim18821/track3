import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to create a clean icon with no white edges
function createCleanIcon(size, outputPath) {
  // Create a canvas with the specified size
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Set background color - deep blue (#1e3a8a)
  ctx.fillStyle = '#1e3a8a';
  
  // Draw rounded rectangle for background
  const cornerRadius = size * 0.25; // 25% of size for rounded corners
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.arcTo(size, 0, size, cornerRadius, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.arcTo(size, size, size - cornerRadius, size, cornerRadius);
  ctx.lineTo(cornerRadius, size);
  ctx.arcTo(0, size, 0, size - cornerRadius, cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);
  ctx.closePath();
  ctx.fill();
  
  // Draw heartbeat/EKG line
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.078; // ~8% of size for stroke width
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Calculate coordinate points based on size
  const leftX = size * 0.15;
  const rightX = size * 0.85;
  const centerY = size * 0.5;
  
  // First horizontal section
  const firstSegmentX = size * 0.325;
  
  // Peak points
  const upPeakX = size * 0.4;
  const upPeakY = size * 0.325;
  const downPeakX = size * 0.6;
  const downPeakY = size * 0.675;
  
  // Last horizontal section
  const lastSegmentX = size * 0.675;
  
  // Draw the EKG line
  ctx.beginPath();
  ctx.moveTo(leftX, centerY);
  ctx.lineTo(firstSegmentX, centerY);
  ctx.lineTo(upPeakX, upPeakY);
  ctx.lineTo(downPeakX, downPeakY);
  ctx.lineTo(lastSegmentX, centerY);
  ctx.lineTo(rightX, centerY);
  ctx.stroke();
  
  // Convert canvas to PNG buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Ensure the directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the buffer to the output file
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created icon: ${outputPath}`);
}

// Create different sized icons
const icons = [
  { size: 512, path: 'client/public/icons/icon-512x512.png' },
  { size: 192, path: 'client/public/icons/icon-192x192.png' },
  { size: 180, path: 'client/public/icons/apple-icon-180.png' },
  { size: 167, path: 'client/public/icons/apple-icon-167.png' },
  { size: 152, path: 'client/public/icons/apple-icon-152.png' },
  { size: 48, path: 'client/public/icons/favicon-48x48.png' },
  { size: 32, path: 'client/public/icons/favicon-32x32.png' },
  { size: 16, path: 'client/public/icons/favicon-16x16.png' }
];

// Create all icons
icons.forEach(icon => {
  createCleanIcon(icon.size, icon.path);
});

console.log('All icons have been generated successfully!');
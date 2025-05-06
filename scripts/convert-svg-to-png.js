import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertSvgToPng(svgPath, pngPath, width, height) {
  try {
    // Create a data URL from the SVG
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const svgBuffer = Buffer.from(svgContent);
    const svgBase64 = svgBuffer.toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    // Create a canvas with the desired dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Load the SVG image
    const img = await loadImage(dataUrl);
    
    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert the canvas to a PNG buffer
    const pngBuffer = canvas.toBuffer();
    
    // Write the PNG to file
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Converted ${svgPath} to ${pngPath}`);
    return true;
  } catch (err) {
    console.error(`Error converting ${svgPath} to PNG:`, err);
    return false;
  }
}

async function main() {
  const iconDirectory = path.join(__dirname, '../client/public/icons');
  
  // Convert 192x192 icon
  await convertSvgToPng(
    path.join(iconDirectory, 'icon-192x192.svg'),
    path.join(iconDirectory, 'icon-192x192.png'),
    192,
    192
  );
  
  // Convert 512x512 icon
  await convertSvgToPng(
    path.join(iconDirectory, 'icon-512x512.svg'),
    path.join(iconDirectory, 'icon-512x512.png'),
    512,
    512
  );
}

main().catch(console.error);
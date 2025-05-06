import QRCode from 'qrcode';
import fs from 'fs';

// The URL to encode in the QR code
const url = 'https://www.trackmadeaze.com';

// Function to generate QR code as SVG
async function generateQRCodeSVG() {
  try {
    // Generate QR code as SVG string
    const svgString = await QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    // Save the SVG to a file
    fs.writeFileSync('qrcode.svg', svgString);
    console.log('QR Code SVG generated successfully for:', url);
    console.log('Path to QR code SVG:', 'qrcode.svg');
    
    // Also log the SVG content for easy copying
    console.log('\nSVG content:');
    console.log(svgString);
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
}

// Call the function
generateQRCodeSVG();
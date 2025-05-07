/**
 * Local Development Helper for iOS Testing
 * 
 * Instructions:
 * 1. Find your Mac's IP address from System Preferences > Network
 *    (usually something like 192.168.1.xxx)
 * 2. Enter it below
 * 3. Run your server on your Mac with: npm run dev
 * 4. Build and deploy to iOS with: ./build-ios-app.sh
 */

// Set this to your Mac's IP address when testing locally
export const LOCAL_MAC_IP = "192.168.1.XXX"; // <- REPLACE WITH YOUR MAC'S IP

// The port your local server runs on
export const LOCAL_SERVER_PORT = 5000;

// Build the local development URL
export const LOCAL_DEV_URL = `http://${LOCAL_MAC_IP}:${LOCAL_SERVER_PORT}`;
#!/bin/bash

# Exit on error
set -e

# Show usage instructions
echo "🚀 Starting iOS live reload development environment..."
echo "This script will build the app and set up a live reload environment for iOS development."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ Error: This script must be run on macOS for iOS development."
  exit 1
fi

# Check if Xcode is installed
if ! xcode-select -p &> /dev/null; then
  echo "❌ Error: Xcode Command Line Tools not found."
  echo "Please install them by running: xcode-select --install"
  exit 1
fi

# Clean up previous build artifacts
echo "🧹 Cleaning previous builds..."
rm -rf dist

# Development build
echo "🔨 Building web app in development mode..."
npm run build

# Check if iOS platform exists
if [ ! -d "ios" ]; then
  echo "📱 iOS platform not found. Adding iOS platform..."
  npx cap add ios
else
  echo "📱 iOS platform found."
fi

# Make a backup of the capacitor config
if [ -f "capacitor.config.ts" ]; then
  echo "💾 Backing up capacitor config..."
  cp capacitor.config.ts capacitor.config.ts.bak
fi

# Modify capacitor config for live reload
echo "⚙️ Configuring for live reload..."
cat > capacitor.config.ts << EOL
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackmadeease.app',
  appName: 'TrackMadeEazE',
  webDir: 'dist',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
    androidScheme: 'http',
    iosScheme: 'http',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#1e3a8a',
    allowsLinkPreview: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#1e3a8a",
      showSpinner: true,
      iosSpinnerStyle: "large",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT_CONTENT',
      backgroundColor: '#1e3a8a',
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
EOL

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Verify iOS directory exists
if [ ! -d "ios" ]; then
  echo "❌ Error: iOS directory not found after sync. Something went wrong."
  exit 1
fi

echo "🧪 Checking for common iOS build issues..."

# Check if Info.plist exists
if [ ! -f "ios/App/App/Info.plist" ]; then
  echo "❌ Error: Info.plist not found. iOS project may be corrupted."
  exit 1
fi

# Run with live reload on a connected device (with verbose output)
echo "📱 Running on iOS with live reload..."
echo "⚠️ Note: If this fails, try opening the project in Xcode with: npx cap open ios"

# Use try/catch pattern for the cap run command
{
  npx cap run ios --livereload --external --verbose
} || {
  echo "❌ Live reload failed to start automatically."
  echo "Please open Xcode manually to build and run the app:"
  echo "npx cap open ios"
  npx cap open ios
}

echo "✅ Live reload session active (or Xcode is now open)."
echo "Any changes to your web code will be reflected in real-time on the device."
echo "Press Ctrl+C to stop the live reload server."

# Restore the original config when the script is terminated
trap 'echo "🔄 Restoring original capacitor config..."; if [ -f "capacitor.config.ts.bak" ]; then mv capacitor.config.ts.bak capacitor.config.ts; fi' EXIT
#!/bin/bash

# Script to build and run the TrackMadeEazE app on an iPhone
# This leverages Capacitor's capabilities and existing project scripts

echo "==================== iPhone Deployment Script ===================="
echo "This script will prepare your app for running on a physical iPhone"
echo "=================================================================="

# Build the web app using existing script
echo "Step 1: Building web application..."
./scripts/build-mobile.sh

# Check if iOS platform exists
if [ ! -d "ios" ]; then
  echo "Step 2: iOS platform not found. Adding iOS platform..."
  ./scripts/cap-add-ios.sh
else
  echo "Step 2: iOS platform already exists."
fi

# Create live development server configuration
echo "Step 3: Creating Capacitor configuration for remote server..."
REPLIT_URL=$(curl -s "https://replit.com/api/v1/replsvc/domain" | tr -d '"')
if [ -z "$REPLIT_URL" ]; then
  # If API fails, construct URL from environment variables or use hardcoded one
  REPLIT_URL="https://6d7f9872-2543-4adb-9827-3debb869bc42-00-2z64xmqb8t3o0.picard.replit.dev"
fi

cat > capacitor.config.json << EOL
{
  "appId": "com.trackmadeease.app",
  "appName": "TrackMadeEazE",
  "webDir": "dist",
  "server": {
    "url": "${REPLIT_URL}",
    "cleartext": true,
    "androidScheme": "https",
    "iosScheme": "https"
  },
  "ios": {
    "contentInset": "always",
    "backgroundColor": "#1e3a8a",
    "allowsLinkPreview": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "launchAutoHide": true,
      "backgroundColor": "#1e3a8a",
      "androidSplashResourceName": "splash",
      "androidScaleType": "CENTER_CROP",
      "showSpinner": true,
      "androidSpinnerStyle": "large",
      "iosSpinnerStyle": "large",
      "spinnerColor": "#ffffff",
      "splashFullScreen": true,
      "splashImmersive": true
    },
    "StatusBar": {
      "style": "LIGHT_CONTENT",
      "backgroundColor": "#1e3a8a",
      "overlaysWebView": true
    }
  }
}
EOL

# Sync with iOS
echo "Step 4: Updating iOS project with web assets and configuration..."
npx cap sync ios

# Make sure iOS project uses the icon
echo "Step 5: Ensuring app icon is properly configured..."
if [ -f "generated-icon.png" ]; then
  echo "Using existing app icon for the iOS build"
  mkdir -p ios/App/App/Assets.xcassets/AppIcon.appiconset
  # Copy doesn't replace all icons but ensures at least one is present
  cp generated-icon.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
fi

# Open in Xcode
echo "Step 6: Opening project in Xcode..."
./scripts/cap-open-ios.sh

echo ""
echo "================== DEPLOYMENT INSTRUCTIONS ======================"
echo "1. In Xcode, sign your app with your Apple Developer account"
echo "2. Select your connected iPhone as the target device"
echo "3. Press the Play button to build and run on your device"
echo "4. The app will connect to: ${REPLIT_URL}"
echo "5. You'll need to have your Replit app running for this to work"
echo "==============================================================="
echo ""
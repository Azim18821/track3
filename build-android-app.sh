#!/bin/bash

# Script to build and run the TrackMadeEazE app on Android
# This leverages Capacitor's capabilities and existing project scripts

echo "==================== Android Deployment Script ===================="
echo "This script will prepare your app for running on an Android device"
echo "=================================================================="

# Build the web app using existing script
echo "Step 1: Building web application..."
./scripts/build-mobile.sh

# Check if Android platform exists
if [ ! -d "android" ]; then
  echo "Step 2: Android platform not found. Adding Android platform..."
  ./scripts/cap-add-android.sh
else
  echo "Step 2: Android platform already exists."
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
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "launchAutoHide": true,
      "backgroundColor": "#1e3a8a", 
      "androidSplashResourceName": "splash",
      "androidScaleType": "CENTER_CROP",
      "showSpinner": true,
      "androidSpinnerStyle": "large",
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

# Sync with Android
echo "Step 4: Updating Android project with web assets and configuration..."
npx cap sync android

# Make sure Android project uses the icon
echo "Step 5: Ensuring app icon is properly configured..."
if [ -f "generated-icon.png" ]; then
  echo "Using existing app icon for the Android build"
  mkdir -p android/app/src/main/res/mipmap
  # Copy the icon to the Android project's mipmap directory
  cp generated-icon.png android/app/src/main/res/mipmap/ic_launcher.png
fi

# Open in Android Studio
echo "Step 6: Opening project in Android Studio..."
./scripts/cap-open-android.sh

echo ""
echo "================== DEPLOYMENT INSTRUCTIONS ======================"
echo "1. In Android Studio, wait for project to index and build"
echo "2. Connect your Android device via USB or set up an emulator"
echo "3. Enable USB debugging on your device if not already enabled"
echo "4. Select your device from the dropdown in Android Studio"
echo "5. Press the Play button to build and run on your device"
echo "6. The app will connect to: ${REPLIT_URL}"
echo "7. You'll need to have your Replit app running for this to work"
echo "==============================================================="
echo ""
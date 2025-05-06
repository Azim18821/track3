#!/bin/bash

# Exit on error
set -e

# Clean up any existing build artifacts
echo "Cleaning up previous builds..."
rm -rf dist
rm -rf ios/App/build

# Build the web app first
echo "Building web app..."
npm run build

# Copy web assets
echo "Copying web assets..."
npx cap copy

# Sync with Capacitor (more verbose output)
echo "Syncing with Capacitor..."
npx cap sync ios --verbose

# Check if iOS platform is added, if not add it
if [ ! -d "ios" ]; then
  echo "Adding iOS platform..."
  npx cap add ios
else
  echo "iOS platform already exists."
fi

# Update iOS native dependencies
echo "Updating iOS dependencies..."
cd ios/App
pod install
cd ../..

# Open in Xcode
echo "Opening in Xcode..."
npx cap open ios

echo "The app has been built and prepared for iOS. If you're on macOS, Xcode should now be open."
echo "In Xcode:"
echo "1. Make sure your Apple Developer Account is properly set up in Xcode"
echo "2. Set the bundle identifier to match your appId in capacitor.config.ts"
echo "3. Select your device or simulator in the targets dropdown"
echo "4. Click the play button to build and run"
echo ""
echo "If you encounter code signing issues:"
echo "- Go to Signing & Capabilities in Xcode"
echo "- Check 'Automatically manage signing'"
echo "- Select your development team"
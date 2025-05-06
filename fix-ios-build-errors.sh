#!/bin/bash

# This script helps fix common iOS build errors with Capacitor
# Specifically targeting issues with file decoding/encoding

# Exit on error
set -e

echo "🔍 Starting iOS build error fix script..."
echo "This script will attempt to fix common iOS build errors"

# Clean up previous artifacts
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf ios/App/build

# Remove the iOS platform completely
if [ -d "ios" ]; then
  echo "🗑️ Removing iOS platform to start fresh..."
  rm -rf ios
fi

# Build the web app with production settings
echo "🔨 Building web app..."
npm run build

# Add iOS platform freshly
echo "➕ Adding iOS platform..."
npx cap add ios

# Sync with verbose logging
echo "🔄 Syncing with Capacitor (verbose logging)..."
npx cap sync ios --verbose

# Update pods
echo "📦 Updating iOS dependencies..."
cd ios/App
pod install --repo-update
cd ../..

# Check for common issues
echo "🧪 Checking for common iOS build issues..."

# Ensure Info.plist is properly encoded
if [ -f "ios/App/App/Info.plist" ]; then
  echo "✅ Info.plist exists"
  
  # Check if it's a valid XML file
  if ! plutil -lint ios/App/App/Info.plist > /dev/null 2>&1; then
    echo "⚠️ Info.plist appears to be corrupted, attempting to fix..."
    # Create a minimal Info.plist if needed
    cat > ios/App/App/Info.plist << EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>TrackMadeEazE</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<true/>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
</dict>
</plist>
EOL
  fi
else
  echo "❌ Info.plist not found"
fi

# Run pod install again to ensure everything is up to date
echo "📦 Final update of iOS dependencies..."
cd ios/App
pod install
cd ../..

# Open Xcode to finalize setup
echo "🍎 Opening in Xcode..."
npx cap open ios

echo ""
echo "✅ Fix script completed!"
echo ""
echo "In Xcode:"
echo "1. Make sure 'Automatically manage signing' is checked in the Signing & Capabilities tab"
echo "2. Select your development team"
echo "3. If you still have issues with specific files, try these steps:"
echo "   - Check that all image files have proper extensions (e.g., .png, .jpg)"
echo "   - Remove any special characters from filenames"
echo "   - If an asset is causing problems, try excluding it from the build"
echo ""
echo "For more detailed troubleshooting information, see ios-build-troubleshooting.md"
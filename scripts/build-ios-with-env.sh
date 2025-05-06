#!/bin/bash

# Script to build the iOS app with proper environment variables
echo "🔨 Building iOS app with environment configuration..."

# Step 1: Ensure we have the right .env file
if [ "$1" == "prod" ] || [ "$1" == "production" ]; then
  echo "🌍 Using production environment"
  cp .env.production .env
else
  echo "🧪 Using development environment"
  cp .env.development .env
fi

# Step 2: Build the web app
echo "🏗️ Building web application..."
npm run build

# Step 3: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Step 4: Open in Xcode (optional)
if [ "$2" == "open" ]; then
  echo "📱 Opening in Xcode..."
  npx cap open ios
fi

echo "✅ iOS build process completed!"
echo ""
echo "Next steps:"
echo "1. Open in Xcode: npx cap open ios"
echo "2. Select your device/simulator in Xcode"
echo "3. Build and run the app"
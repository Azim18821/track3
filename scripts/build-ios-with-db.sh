#!/bin/bash

# Build iOS app for development with database configuration
# This script ensures that your iOS app connects to your PostgreSQL database

# Default values
BUILD_MODE="dev"
LOCAL_IP=""

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --mode) BUILD_MODE="$2"; shift ;;
        --ip) LOCAL_IP="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if we're in the repo root
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the repository root directory."
    exit 1
fi

# Validate build mode
if [ "$BUILD_MODE" != "dev" ] && [ "$BUILD_MODE" != "prod" ]; then
    echo "Error: --mode must be either 'dev' or 'prod'"
    exit 1
fi

# Environment file to use based on mode
if [ "$BUILD_MODE" = "dev" ]; then
    ENV_FILE=".env.development"
    ENV_NAME="development"
else
    ENV_FILE=".env.production"
    ENV_NAME="production"
fi

# Create iOS build environment file
TMP_ENV=".env.ios-build"

# Copy specific environment file or create one
if [ -f "$ENV_FILE" ]; then
    echo "Using environment from $ENV_FILE"
    cp "$ENV_FILE" "$TMP_ENV"
else
    echo "Creating temporary environment file"
    touch "$TMP_ENV"
fi

# If using development mode with local IP
if [ "$BUILD_MODE" = "dev" ] && [ ! -z "$LOCAL_IP" ]; then
    echo "Setting API URL to local development server at $LOCAL_IP"
    echo "VITE_API_URL=http://$LOCAL_IP:3000" >> "$TMP_ENV"
    echo "VITE_ENV=development" >> "$TMP_ENV"
fi

# Add database configuration
echo "Adding database configuration"
echo "DATABASE_URL=$DATABASE_URL" >> "$TMP_ENV"

# Build the app using our temporary environment
echo "Building iOS app for $ENV_NAME environment..."
npm run build -- --mode=$ENV_NAME

# Sync with Capacitor
echo "Syncing with Capacitor..."
npx cap sync ios

# Clean up
rm "$TMP_ENV"

echo "✓ iOS build completed!"
echo "Run 'npx cap open ios' to open the project in Xcode"

# If using development mode, show instructions
if [ "$BUILD_MODE" = "dev" ] && [ ! -z "$LOCAL_IP" ]; then
    echo ""
    echo "IMPORTANT: Make sure your development server is running:"
    echo "npm run dev"
    echo ""
    echo "Your iOS app will connect to: http://$LOCAL_IP:3000"
fi
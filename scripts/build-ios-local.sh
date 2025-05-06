#!/bin/bash

# Build iOS app for local development
# This will configure the app to connect to a local development server

# Default values
LOCAL_IP="localhost"
LOCAL_PORT="3000"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --ip) LOCAL_IP="$2"; shift ;;
        --port) LOCAL_PORT="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Create a temporary env file for the build
echo "Creating temporary environment file for local iOS build..."
TMP_ENV_FILE=".env.ios-local"

# Write local development settings to temporary file
cat > $TMP_ENV_FILE << EOF
VITE_API_URL=http://${LOCAL_IP}:${LOCAL_PORT}
VITE_ENV=development
EOF

# Copy API keys from development environment
if [ -f ".env.development" ]; then
    grep "VITE_" .env.development | grep -v "VITE_API_URL\|VITE_ENV" >> $TMP_ENV_FILE
fi

echo "Building iOS app with local development settings..."
echo "API URL: http://${LOCAL_IP}:${LOCAL_PORT}"

# Build with the temporary environment file
npm run build -- --mode=ios-local

# Sync changes to iOS
npx cap sync ios

echo "iOS build completed with local development settings"
echo "Run 'npx cap open ios' to open the project in Xcode"
echo ""
echo "IMPORTANT: Make sure your development server is running on http://${LOCAL_IP}:${LOCAL_PORT}"
echo "You can start it with: npm run dev"
#!/bin/bash
# iOS Local Development Build Script
# This script builds the iOS app for local development testing against your Mac's development server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════╗"
echo "║  TrackMadeEazE iOS Local Development Build Script  ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Get Mac's local IP address
echo -e "${YELLOW}Step 1: Detecting your Mac's IP address...${NC}"
ip_address=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$ip_address" ]; then
  echo -e "${RED}Could not automatically detect your Mac's IP address${NC}"
  echo -e "Please enter your Mac's IP address (e.g., 192.168.1.xxx):"
  read -r ip_address
  
  if [ -z "$ip_address" ]; then
    echo -e "${RED}No IP address provided. Exiting.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Using IP address: ${ip_address}${NC}"

# Step 2: Update the API configuration file
echo -e "\n${YELLOW}Step 2: Updating API configuration...${NC}"

# Update the API config with the actual IP
if [ -f "client/src/utils/apiConfig.ts" ]; then
  sed -i "" "s/LOCAL_DEV_MAC_IP = \".*\"/LOCAL_DEV_MAC_IP = \"${ip_address}\"/" client/src/utils/apiConfig.ts
  echo -e "${GREEN}Updated client/src/utils/apiConfig.ts with your IP: ${ip_address}${NC}"
else
  echo -e "${RED}Warning: client/src/utils/apiConfig.ts file not found${NC}"
fi

# Step 3: Create Info.plist additions for network security
echo -e "\n${YELLOW}Step 3: Preparing iOS network security settings...${NC}"

# Create directory for iOS config if it doesn't exist
mkdir -p ios/App/App/LocalDevelopment

# Create local iOS development config
cat > ios/App/App/LocalDevelopment/developmentOverrides.xcconfig << EOF
// Local Development Configuration
// Generated: $(date)

// Set server URL to local Mac
CAPACITOR_SERVER_URL=http://${ip_address}:5000
CAPACITOR_SERVER_CLEARTEXT=YES
EOF

echo -e "${GREEN}Created iOS development configuration${NC}"

# Step 4: Update Info.plist with network security exceptions
echo -e "\n${YELLOW}Step 4: Adding network security exceptions to Info.plist...${NC}"

# Create temporary file with network security settings
cat > ios/App/App/NetworkSecurity.plist << EOF
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
		<key>NSExceptionDomains</key>
		<dict>
			<key>${ip_address}</key>
			<dict>
				<key>NSExceptionAllowsInsecureHTTPLoads</key>
				<true/>
				<key>NSIncludesSubdomains</key>
				<true/>
			</dict>
		</dict>
	</dict>
EOF

# Check if network security settings already exist in Info.plist
if grep -q "NSAppTransportSecurity" ios/App/App/Info.plist; then
  echo -e "${YELLOW}Network security settings already exist in Info.plist${NC}"
  echo -e "Updating with new IP address..."
  
  # Use sed to replace the existing settings with the new ones
  sed -i "" "/<key>NSAppTransportSecurity<\/key>/,/<\/dict>/ c\\
$(cat ios/App/App/NetworkSecurity.plist)
" ios/App/App/Info.plist
else
  # Insert before the closing </dict> tag
  sed -i "" "s|</dict>|$(cat ios/App/App/NetworkSecurity.plist)\n</dict>|" ios/App/App/Info.plist
fi

echo -e "${GREEN}Updated Info.plist with network security exceptions${NC}"

# Clean up temporary file
rm ios/App/App/NetworkSecurity.plist

# Step 5: Build web assets
echo -e "\n${YELLOW}Step 5: Building web assets...${NC}"
echo -e "Using API URL: http://${ip_address}:5000"

# Force development mode and set the API URL
NODE_ENV=development \
VITE_MOBILE_API_URL="http://${ip_address}:5000" \
CAPACITOR_LOCAL_URL="http://${ip_address}:5000" \
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to build web assets. See errors above.${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully built web assets${NC}"

# Step 6: Sync with Capacitor
echo -e "\n${YELLOW}Step 6: Syncing with Capacitor...${NC}"

# Set environment for Capacitor
CAPACITOR_LOCAL_URL="http://${ip_address}:5000" npx cap sync ios

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to sync with Capacitor. See errors above.${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully synced Capacitor with latest web assets${NC}"

# Step 7: Open in Xcode
echo -e "\n${YELLOW}Step 7: Opening project in Xcode...${NC}"
npx cap open ios

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ iOS build process complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\n${YELLOW}NEXT STEPS:${NC}"
echo -e "1. In Xcode, select your iOS device as the build target"
echo -e "2. Click the Build and Run button (▶️)"
echo -e "3. Make sure your local server is running with: ${BLUE}npm run dev${NC}"
echo -e "\n${YELLOW}TROUBLESHOOTING:${NC}"
echo -e "• Ensure your iOS device is on the same WiFi network as your Mac"
echo -e "• Check that your Mac's firewall allows incoming connections on port 5000"
echo -e "• If connection fails, try adding a debug view in your app to show the current API URL"
echo -e ""
echo -e "Your app should connect to: ${BLUE}http://${ip_address}:5000${NC}"
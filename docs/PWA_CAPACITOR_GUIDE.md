# TrackMadeEazE PWA Deployment Guide with Capacitor.js

This guide outlines the steps to deploy the TrackMadeEazE application as a Progressive Web App (PWA) and use Capacitor.js to create native mobile applications for iOS and Android.

## Prerequisites

- Node.js and npm installed
- For iOS builds: macOS with Xcode installed
- For Android builds: Android Studio installed
- Git for version control

## 1. Initial Setup

The project has already been configured with the necessary Capacitor packages and configurations. Here's what has been done:

- Installed Capacitor core packages (`@capacitor/core`, `@capacitor/cli`)
- Installed platform packages (`@capacitor/ios`, `@capacitor/android`, `@capacitor/app`)
- Created PWA manifest file (`client/public/manifest.json`)
- Updated index.html with PWA meta tags
- Added service worker registration in main.tsx
- Created Capacitor configuration file (`capacitor.config.ts`)
- Created helper scripts in the `scripts` directory

## 2. Building the Web Application

Before generating native apps, you need to build the web application:

```bash
# Build the web application
npm run build
```

This creates the production build in the `dist/public` directory, which is the directory specified in the Capacitor configuration.

## 3. Initialize Capacitor

Initialize Capacitor with your app information:

```bash
# Run the initialization script
./scripts/cap-init.sh
```

## 4. Add Native Platforms

Add the platforms you want to target:

```bash
# Add Android platform
./scripts/cap-add-android.sh

# Add iOS platform
./scripts/cap-add-ios.sh
```

## 5. Sync Web Content to Native Projects

After building or making changes to your web app, sync the content to your native projects:

```bash
# Sync web content to native platforms
./scripts/cap-sync.sh
```

You can also use the combined build and sync script:

```bash
# Build and sync in one step
./scripts/build-mobile.sh
```

## 6. Open Native Projects

Open the native projects in their respective IDEs for final configuration and deployment:

```bash
# Open Android project in Android Studio
./scripts/cap-open-android.sh

# Open iOS project in Xcode
./scripts/cap-open-ios.sh
```

## 7. Native Platform Specific Configuration

### Android

In Android Studio:
1. Review the `AndroidManifest.xml` file
2. Customize app icons in the `res` directory
3. Build and run on a device or emulator

### iOS

In Xcode:
1. Set your development team in the Signing & Capabilities section
2. Customize app icons in the Assets.xcassets
3. Build and run on a device or simulator

## 8. PWA Deployment

To deploy as a Progressive Web App:

1. Host the contents of the `dist/public` directory on a web server
2. Ensure the server is configured for HTTPS
3. Verify service worker registration is working properly
4. Test the app's offline capabilities

## 9. App Store Deployment

### Google Play Store

1. Generate a signed APK or App Bundle in Android Studio
2. Create a Google Play Developer account if you don't have one
3. Follow the Play Store submission process

### Apple App Store

1. Archive the app in Xcode
2. Create an App Store Connect account if you don't have one
3. Upload the archive to App Store Connect
4. Submit for review

## 10. Troubleshooting

### Common Issues:

- **Service worker not registering**: Ensure HTTPS is properly configured in production
- **App not working offline**: Check service worker cache implementation
- **Native builds failing**: Ensure all native dependencies are properly installed
- **Icons not displaying**: Verify the correct paths in manifest.json and native projects

## 11. Maintenance

- Update Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/app`
- After updating, run sync: `./scripts/cap-sync.sh`
- Keep native dependencies updated in their respective projects

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [iOS App Distribution Guide](https://developer.apple.com/app-store/submitting/)
- [Android App Distribution Guide](https://developer.android.com/distribute/console)
# Capacitor.js Integration for TrackMadeEazE

This document provides an overview of how Capacitor.js has been integrated into the TrackMadeEazE application to enable native mobile app functionality.

## Current Implementation

### Installed Packages

The following Capacitor packages have been installed:

- `@capacitor/core`: The core Capacitor runtime
- `@capacitor/cli`: Command-line interface for Capacitor
- `@capacitor/ios`: iOS platform integration
- `@capacitor/android`: Android platform integration
- `@capacitor/app`: App plugin for handling app state and events

### Configuration Files

- `capacitor.config.ts`: The main configuration file that defines app information, build paths, and plugin settings.

### Scripts

A set of scripts has been created in the `scripts` directory to simplify Capacitor operations:

- `cap-init.sh`: Initialize Capacitor with app information
- `cap-sync.sh`: Sync web content to native platforms
- `cap-add-android.sh`: Add Android platform
- `cap-add-ios.sh`: Add iOS platform
- `cap-open-android.sh`: Open Android project in Android Studio
- `cap-open-ios.sh`: Open iOS project in Xcode
- `build-mobile.sh`: Build the web app and sync to native platforms

## Web Integration

### PWA Setup

The application has been configured as a Progressive Web App (PWA) with:

- Web app manifest in `client/public/manifest.json`
- Service worker for offline functionality in `client/public/serviceWorker.js`
- PWA meta tags in `client/index.html`
- Service worker registration in `client/src/main.tsx`

## Native Platform Integration

### Android

When you add the Android platform, Capacitor will:

1. Create an Android Studio project in the `android` directory
2. Copy the web assets to the appropriate location
3. Configure the AndroidManifest.xml with app details from capacitor.config.ts

### iOS

When you add the iOS platform, Capacitor will:

1. Create an Xcode project in the `ios` directory
2. Copy the web assets to the appropriate location
3. Configure the Info.plist with app details from capacitor.config.ts

## Workflow for Updates

When you make changes to the web application:

1. Build the web app (`npm run build`)
2. Sync the changes to native platforms (`./scripts/cap-sync.sh`)
3. Or use the combined script (`./scripts/build-mobile.sh`)

## Plugin Configuration

The `capacitor.config.ts` file includes configurations for plugins:

- **SplashScreen**: Controls the appearance and behavior of the splash screen

## Future Enhancements

Potential plugins to consider adding:

- `@capacitor/haptics`: For tactile feedback
- `@capacitor/keyboard`: For keyboard management
- `@capacitor/status-bar`: For status bar customization
- `@capacitor/camera`: For camera access
- `@capacitor/geolocation`: For location services

## Testing Native Functionality

To test native functionality:

1. Build and open the project in the native IDE
2. Run on a simulator/emulator or physical device
3. Test app-specific features like offline functionality
4. Verify that native plugins work correctly

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Native API Documentation](https://capacitorjs.com/docs/apis)
- [iOS Development Guide](https://capacitorjs.com/docs/ios)
- [Android Development Guide](https://capacitorjs.com/docs/android)
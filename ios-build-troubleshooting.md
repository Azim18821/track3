# iOS Build Troubleshooting Guide

This guide addresses common issues when building the TrackMadeEazE app for iOS using Capacitor.

## Common Build Errors

### Error: Unable to decode file

If you see an error about being unable to decode a file (common with image files):

1. Check that all image assets are in proper formats (PNG, JPEG)
2. Make sure image filenames don't contain special characters
3. Run the improved build script that includes cleanup steps

### Code Signing Issues

If you see code signing errors in Xcode:

1. Go to Xcode → Your Project → Signing & Capabilities
2. Check "Automatically manage signing"
3. Select your development team
4. Make sure your Apple Developer account is properly set up

### Missing Pods or CocoaPods Issues

If you encounter Pod-related errors:

1. Navigate to the iOS app directory: `cd ios/App`
2. Run: `pod deintegrate`
3. Run: `pod install`
4. If issues persist, delete the Podfile.lock file, then run `pod install` again

### App Transport Security Issues

If the app has network connectivity issues:

1. Check that the `capacitor.config.ts` is properly configured
2. Ensure your Info.plist has proper App Transport Security settings

## Post-Build Steps

After successfully building:

1. In Xcode, select your device or simulator from the targets dropdown
2. Click the Play button to build and run
3. If using a physical device, trust the developer certificate on your device when prompted

## Debugging

For more detailed debugging information:

1. In Xcode, go to Product → Scheme → Edit Scheme
2. Select the "Run" action and check "Debug executable"
3. Under the "Arguments" tab, add any debugging environment variables needed

## Building for Release

To build for App Store submission:

1. Update version and build numbers in Xcode under General tab
2. Select "Generic iOS Device" as the build target
3. Go to Product → Archive
4. Follow the distribution process in the Organizer window that appears
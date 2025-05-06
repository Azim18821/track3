# iOS Development Guide

This document provides guidance on setting up and configuring your iOS development environment for this project.

## Server Port Configuration

The application server defaults to using port 5000. This is important to know when setting up your iOS development environment.

### Default Server Configuration

- Default port: **5000**
- Fallback logic: If port 5000 is busy, it tries ports 5001, 5002, etc.
- As a last resort, it selects a random port between 3000-5000

## Building for iOS Development

We have a special script to build your iOS app for local development:

```bash
# Make the script executable (only needed once)
chmod +x scripts/build-ios-local.sh

# Build using default settings (localhost:5000)
./scripts/build-ios-local.sh

# Or specify your computer's network IP address for device testing
./scripts/build-ios-local.sh --ip 192.168.1.100
```

### Using a Custom Port

If your server is running on a different port, specify it with the `--port` parameter:

```bash
./scripts/build-ios-local.sh --port 3000
```

## Running Your Development Server

Make sure your server is running before testing on the iOS app:

```bash
npm run dev
```

## Common Issues and Solutions

### Network Connection Errors

If you see "Network Error" or "Offline API Error" in the console:

1. Verify your server is running with `npm run dev`
2. Check which port your server is actually running on (look for "Server running successfully on port XXXX" in the console)
3. Build your iOS app with that specific port:
   ```
   ./scripts/build-ios-local.sh --port XXXX
   ```

### Testing on Physical Devices

When testing on a physical iOS device (not the simulator):

1. Use your computer's local IP address instead of localhost:
   ```
   ./scripts/build-ios-local.sh --ip 192.168.1.XXX
   ```
   (Replace with your actual IP address)

2. Make sure your iOS device is on the same WiFi network as your development computer

### Form Validation Errors

If you encounter validation errors like "string did not match the expected pattern":

1. Check the console logs for detailed error messages
2. Ensure your API is properly connected (no network errors)
3. Try simplifying your test data - use basic email formats and simpler passwords
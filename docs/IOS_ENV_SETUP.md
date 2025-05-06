# iOS Environment Configuration Guide

This document explains how to properly manage environment variables for the iOS build of the application.

## Environment Files

The application uses different environment files for different contexts:

- `.env`: Base environment file with shared variables
- `.env.development`: Development-specific variables (local testing)
- `.env.production`: Production-specific variables (deployed app)

## Vite Environment Variables

For environment variables to be accessible in the frontend code, they must be prefixed with `VITE_`. For example:

```
VITE_API_URL=https://www.example.com
VITE_APP_VERSION=1.0.0
```

## Using Environment Variables

In your code, use the environment utilities from `client/src/utils/env.ts`:

```typescript
import { API_URL, ENV, isIOS } from '../utils/env';

// Then use these variables in your components/services
console.log('API URL:', API_URL);
console.log('Environment:', ENV);
console.log('Is iOS device:', isIOS);
```

## Building for iOS

To build the application for iOS with the proper environment:

1. Use the build script with environment parameter:

   ```bash
   # For production environment
   ./scripts/build-ios-with-env.sh prod
   
   # For development environment
   ./scripts/build-ios-with-env.sh dev
   
   # To also open Xcode after build
   ./scripts/build-ios-with-env.sh prod open
   ```

2. This script will:
   - Copy the appropriate .env file
   - Build the web application
   - Sync with Capacitor
   - Optionally open the project in Xcode

## Manually Building for iOS

If you prefer to build manually:

1. Choose your environment file:
   ```bash
   cp .env.production .env  # For production
   # or
   cp .env.development .env  # For development
   ```

2. Build the web application:
   ```bash
   npm run build
   ```

3. Sync with Capacitor:
   ```bash
   npx cap sync ios
   ```

4. Open in Xcode:
   ```bash
   npx cap open ios
   ```

## Debugging Environment Variables

To verify your environment variables are correctly loaded:

1. Add the `EnvInfoDisplay` component to your application temporarily
2. Check the displayed values match what you expect
3. Look for any environment-related errors in the console

## Common Issues

1. **Variables not showing up**: Make sure they are prefixed with `VITE_` in your .env files
2. **Wrong environment used**: Verify you've selected the correct environment when building
3. **API connections failing**: Double-check API keys and URLs in your environment files

For any other issues, check the Capacitor documentation or reach out to the development team.
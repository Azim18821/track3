import { CapacitorConfig } from '@capacitor/cli';

// Determine if we're in production build or dev build
const isProduction = process.env.NODE_ENV === 'production';

// For local development, allow overriding server URL via environment variable
const localDevUrl = process.env.CAPACITOR_LOCAL_URL || undefined;

// Dynamically set server configuration based on environment
const serverConfig = isProduction 
  ? {
      // Production configuration
      androidScheme: 'https',
      iosScheme: 'https',
      hostname: 'app',
    }
  : {
      // Development configuration - for local testing
      // If CAPACITOR_LOCAL_URL is set, use it (your Mac's IP)
      url: localDevUrl,
      // Use HTTP for local development
      androidScheme: 'http',
      iosScheme: 'http',
      // Only set hostname if no URL is provided
      hostname: localDevUrl ? undefined : 'app',
      // Allow cleartext (HTTP) traffic for local development
      cleartext: true,
    };

const config: CapacitorConfig = {
  appId: 'com.trackmadeease.app',
  appName: 'TrackMadeEazE',
  webDir: 'dist',
  server: serverConfig,
  ios: {
    contentInset: 'always',
    backgroundColor: '#1e3a8a',
    allowsLinkPreview: true,
    // Allow connections to all domains in development mode
    limitsNavigationsToAppBoundDomains: isProduction,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#1e3a8a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "large",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Handle status bar properly
    StatusBar: {
      style: 'LIGHT_CONTENT',
      backgroundColor: '#1e3a8a',
      overlaysWebView: true,
    },
    // Push Notifications configuration
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
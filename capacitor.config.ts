import { CapacitorConfig } from '@capacitor/cli';

// Determine if we're in production build or dev build
const isProduction = process.env.NODE_ENV === 'production';

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
      // Comment out url to use hostname, uncomment to use specific URL
      // url: 'http://localhost:3000',
      androidScheme: 'https',
      iosScheme: 'https',
      hostname: 'app',
      // If needed for local development:
      // cleartext: true,
    };

const config: CapacitorConfig = {
  appId: 'com.trackmadeease.app',
  appName: 'TrackMadeEazE',
  webDir: 'dist',
  server: serverConfig,
  ios: {
    contentInset: 'never',
    backgroundColor: '#1e3a8a',
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
    scrollEnabled: false,
    overrideUserAgent: 'TrackMadeEazE iOS App',
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
    // Handle status bar properly for iOS
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: true,
      // Add animation when status bar changes
      animation: 'FADE',
      // iOS-specific: Hide status bar by default (user can show with swipe)
      hide: false,
    },
    // Push Notifications configuration
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
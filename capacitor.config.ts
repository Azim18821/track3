import { CapacitorConfig } from '@capacitor/cli';

// Determine if we're in production build or dev build
const isProduction = process.env.NODE_ENV === 'production';

// Dynamically set server configuration based on environment
const serverConfig = isProduction 
  ? {
      // Production configuration
      androidScheme: 'https',
      hostname: 'app',
    }
  : {
      // Development configuration - for local testing
      // Comment out url to use hostname, uncomment to use specific URL
      // url: 'http://localhost:3000',
      androidScheme: 'https',
      hostname: 'app',
      // If needed for local development:
      // cleartext: true,
    };

const config: CapacitorConfig = {
  appId: 'com.trackmadeease.app',
  appName: 'TrackMadeEazE',
  webDir: 'dist',
  server: serverConfig,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e3a8a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: true,
      animation: 'FADE',
      hide: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
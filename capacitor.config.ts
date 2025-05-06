import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackmadeease.app',
  appName: 'TrackMadeEazE',
  webDir: 'dist',
  server: {
    // For development, use localhost if testing locally
    // url: 'https://www.trackmadeaze.com', 
    // For development and testing, you can use this instead:
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#1e3a8a',
    allowsLinkPreview: true,
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
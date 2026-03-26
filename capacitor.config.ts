import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brainplay.app',
  appName: 'BrainPlay',
  webDir: 'dist',
  // ─── Server config (production = bundled, no live reload) ─────────────────
  server: {
    androidScheme: 'https',
    // Uncomment for dev live reload:
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
  // ─── Android-specific ─────────────────────────────────────────────────────
  android: {
    // Allow mixed content for WebView (needed for some Firebase calls)
    allowMixedContent: true,
    // Capture back button in JS
    captureInput: true,
    // WebView optimizations
    webContentsDebuggingEnabled: false, // set true for dev
    backgroundColor: '#0d0b1e',
  },
  // ─── Plugins ──────────────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // We handle splash in React
      launchAutoHide: true,
      backgroundColor: '#0d0b1e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d0b1e',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

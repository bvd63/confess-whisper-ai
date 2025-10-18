import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8001763950ef40b68cd6ddf69928bd44',
  appName: 'confess-whisper-ai',
  webDir: 'dist',
  server: {
    url: 'https://80017639-50ef-40b6-8cd6-ddf69928bd44.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1A1F2C',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;

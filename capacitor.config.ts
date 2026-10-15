import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omnipost.video',
  appName: 'OmniPost Video',
  webDir: 'dist/client',
  server: {
    url: 'https://omnipost-k6b5.onrender.com',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;

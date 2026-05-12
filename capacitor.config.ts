import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gasaan.pos',
  appName: 'Gasaan POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

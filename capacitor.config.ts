import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nnyftr.silentstep',
  appName: 'silent-step',
  webDir: 'dist/silent-step/browser',
  plugins: {
    FirebaseFirestore: {
      enablePersistence: true,
    }
  }
};

export default config;
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.followback.web',
  appName: 'מי לא עוקב אחריך',
  webDir: 'dist',
  server: {
    // Keep the WebView on the bundled files; no remote URL.
    androidScheme: 'https',
  },
};

export default config;

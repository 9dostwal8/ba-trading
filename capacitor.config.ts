import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.offerdent.app",
  appName: "OfferDent",
  // Fallback shell; the app loads the live site from server.url below.
  webDir: "android-www",
  server: {
    url: "https://kurdion.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studygenie.app",
  appName: "StudyGenie",
  webDir: ".output/public",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
};

export default config;

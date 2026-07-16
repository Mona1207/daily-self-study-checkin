import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mona1207.selfstudycheckin",
  appName: "今日清单",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;

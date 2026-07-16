import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mona1207.selfstudycheckin",
  appName: "每日自学打卡",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;

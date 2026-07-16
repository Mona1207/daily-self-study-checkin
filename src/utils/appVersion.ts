export const APP_VERSION = "2.1.0";
export const APP_VERSION_CODE = 6;
export const APK_DOWNLOAD_URL = "https://mona1207.github.io/daily-self-study-checkin/downloads/daily-self-study-checkin-debug.apk?v=2.1.0";
export const VERSION_INFO_URL = "https://raw.githubusercontent.com/Mona1207/daily-self-study-checkin/gh-pages/downloads/version.json";

export interface RemoteVersionInfo {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes?: string[];
  updatedAt?: string;
}

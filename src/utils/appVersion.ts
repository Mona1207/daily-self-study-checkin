export const APP_VERSION = "2.0.0";
export const APP_VERSION_CODE = 5;
export const APK_DOWNLOAD_URL = "https://mona1207.github.io/daily-self-study-checkin/downloads/daily-self-study-checkin-debug.apk";
export const VERSION_INFO_URL = "https://mona1207.github.io/daily-self-study-checkin/downloads/version.json";

export interface RemoteVersionInfo {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes?: string[];
  updatedAt?: string;
}

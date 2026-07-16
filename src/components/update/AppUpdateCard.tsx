import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { APK_DOWNLOAD_URL, APP_VERSION, APP_VERSION_CODE, RemoteVersionInfo, VERSION_INFO_URL } from "../../utils/appVersion";
import { Button } from "../common/Button";
import { Card } from "../common/Card";

interface AppUpdateCardProps {
  notify: (type: "success" | "error" | "info", message: string) => void;
}

export function AppUpdateCard({ notify }: AppUpdateCardProps) {
  const [checking, setChecking] = useState(false);
  const [remote, setRemote] = useState<RemoteVersionInfo | null>(null);

  const checkUpdate = async () => {
    setChecking(true);
    try {
      const response = await fetch(`${VERSION_INFO_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("版本信息读取失败。");
      const data = (await response.json()) as RemoteVersionInfo;
      setRemote(data);
      if (data.versionCode > APP_VERSION_CODE) notify("success", `发现新版本 ${data.version}，可以下载更新。`);
      else notify("info", "当前已经是最新版本。");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "检查更新失败。");
    } finally {
      setChecking(false);
    }
  };

  const hasUpdate = Boolean(remote && remote.versionCode > APP_VERSION_CODE);
  const downloadUrl = remote?.apkUrl || APK_DOWNLOAD_URL;

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black">App 更新</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">当前版本：{APP_VERSION}</p>
          {remote && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              最新版本：{remote.version}
              {hasUpdate ? "，可下载更新包。" : "，无需更新。"}
            </p>
          )}
          {remote?.notes?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-300">
              {remote.notes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={checkUpdate} disabled={checking}>
            {checking ? "检查中" : "检查更新"}
          </Button>
          {hasUpdate && (
            <Button icon={<Download size={18} />} onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}>
              下载新版 APK
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

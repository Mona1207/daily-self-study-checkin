import { useEffect, useState } from "react";
import { DownloadCloud, RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../common/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (needRefresh[0]) {
    return (
      <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => updateServiceWorker(true)}>
        刷新新版本
      </Button>
    );
  }

  if (!promptEvent) return null;

  return (
    <Button
      variant="secondary"
      icon={<DownloadCloud size={18} />}
      onClick={async () => {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
      }}
    >
      安装到桌面
    </Button>
  );
}

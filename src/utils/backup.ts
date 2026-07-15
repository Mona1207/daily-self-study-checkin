import JSZip from "jszip";
import { AppDatabase, EvidenceImage } from "../types/task";
import { listEvidenceImages, saveEvidenceImage } from "./storage";

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportFullBackupZip = async (database: AppDatabase, filename: string): Promise<void> => {
  const zip = new JSZip();
  const root = zip.folder("backup");
  if (!root) throw new Error("创建备份包失败。");
  root.file("data.json", JSON.stringify(database, null, 2));
  const evidenceFolder = root.folder("evidence");
  const images = await listEvidenceImages();
  images.forEach((image) => {
    evidenceFolder?.file(`${image.id}-${image.name}`, image.blob);
  });
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, filename);
};

export const readFullBackupZip = async (file: File): Promise<{ data: unknown; images: EvidenceImage[] }> => {
  const zip = await JSZip.loadAsync(file);
  const dataFile = zip.file("backup/data.json") ?? zip.file("data.json");
  if (!dataFile) throw new Error("备份包中没有 data.json。");
  const data = JSON.parse(await dataFile.async("string")) as unknown;
  const images: EvidenceImage[] = [];
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.includes("evidence/"));
  for (const entry of entries) {
    const blob = await entry.async("blob");
    const name = entry.name.split("/").pop() ?? "evidence-image";
    const id = name.split("-")[0];
    images.push({
      id,
      taskId: "",
      evidenceId: "",
      name,
      type: blob.type || "image/png",
      blob,
      createdAt: new Date().toISOString(),
    });
  }
  return { data, images };
};

export const restoreBackupImages = async (images: EvidenceImage[]): Promise<void> => {
  for (const image of images) {
    await saveEvidenceImage(image);
  }
};

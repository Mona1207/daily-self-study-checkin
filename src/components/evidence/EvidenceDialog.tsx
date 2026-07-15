import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { EvidenceImage, TaskEvidence, StudyTask, EVIDENCE_LABEL } from "../../types/task";
import { getEvidenceImage, saveEvidenceImage, deleteEvidenceImage } from "../../utils/storage";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface EvidenceDialogProps {
  task: StudyTask | null;
  evidence?: TaskEvidence;
  open: boolean;
  onClose: () => void;
  onSave: (evidence: TaskEvidence) => void;
  notify: (type: "success" | "error" | "info", message: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/20";

export function EvidenceDialog({ task, evidence, open, onClose, onSave, notify }: EvidenceDialogProps) {
  const [text, setText] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [images, setImages] = useState<Array<EvidenceImage & { url: string }>>([]);

  useEffect(() => {
    if (!open || !task) return;
    setText(evidence?.text ?? "");
    setNumberValue(evidence?.numberValue?.toString() ?? "");
    let revoked: string[] = [];
    Promise.all((evidence?.imageIds ?? []).map((id) => getEvidenceImage(id))).then((items) => {
      const next = items.filter(Boolean).map((image) => {
        const url = URL.createObjectURL(image!.blob);
        revoked.push(url);
        return { ...image!, url };
      });
      setImages(next);
    });
    return () => {
      revoked.forEach(URL.revokeObjectURL);
    };
  }, [evidence, open, task]);

  const handleImages = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (images.length + files.length > 3) return notify("error", "每个任务最多上传 3 张图片。");
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        notify("error", "只支持 JPG、JPEG、PNG、WEBP 图片。");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        notify("error", "单张原始图片不能超过 10MB。");
        continue;
      }
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true });
        const id = crypto.randomUUID();
        const image: EvidenceImage = {
          id,
          taskId: task.id,
          evidenceId: evidence?.id ?? "",
          name: file.name,
          type: compressed.type || file.type,
          blob: compressed,
          createdAt: new Date().toISOString(),
        };
        await saveEvidenceImage(image);
        setImages((current) => [...current, { ...image, url: URL.createObjectURL(compressed) }]);
      } catch {
        notify("error", "图片压缩或保存失败，请尝试换一张图片。");
      }
    }
  };

  const removeImage = async (id: string) => {
    await deleteEvidenceImage(id);
    setImages((current) => current.filter((image) => image.id !== id));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!task) return;
    const needsText = task.evidenceRequirement === "text" || task.evidenceRequirement === "text_and_image";
    const needsNumber = task.evidenceRequirement === "number";
    const needsImage = task.evidenceRequirement === "image" || task.evidenceRequirement === "text_and_image";
    if (needsText && !text.trim()) return notify("error", "请填写文字证明后再打卡。");
    if (needsNumber && numberValue === "") return notify("error", "请填写完成数量后再打卡。");
    if (needsImage && images.length === 0) return notify("error", "请上传图片证明后再打卡。");
    const now = new Date().toISOString();
    const next: TaskEvidence = {
      id: evidence?.id ?? crypto.randomUUID(),
      taskId: task.id,
      text: text.trim() || undefined,
      numberValue: numberValue === "" ? undefined : Number(numberValue),
      numberLabel: needsNumber ? "完成数量" : undefined,
      imageIds: images.map((image) => image.id),
      submittedAt: evidence?.submittedAt ?? now,
      updatedAt: now,
    };
    onSave(next);
    notify("success", "完成证明已保存。");
    onClose();
  };

  return (
    <Modal title={task ? `提交完成证明：${task.title}` : "完成证明"} open={open} onClose={onClose}>
      {task && (
        <form className="space-y-5" onSubmit={submit}>
          <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
            证明要求：{EVIDENCE_LABEL[task.evidenceRequirement]}
          </div>
          {(task.evidenceRequirement === "text" || task.evidenceRequirement === "text_and_image") && (
            <label className="text-sm font-semibold">
              文字说明 / 学习心得
              <textarea className={`${inputClass} mt-1 min-h-28`} value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          )}
          {task.evidenceRequirement === "number" && (
            <label className="text-sm font-semibold">
              完成数量
              <input className={`${inputClass} mt-1`} type="number" min="0" value={numberValue} onChange={(event) => setNumberValue(event.target.value)} />
            </label>
          )}
          {(task.evidenceRequirement === "image" || task.evidenceRequirement === "text_and_image") && (
            <div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-700">
                <ImagePlus size={18} />
                上传图片
                <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} />
              </label>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {images.map((image) => (
                  <div key={image.id} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <a href={image.url} target="_blank" rel="noreferrer">
                      <img src={image.url} alt="完成证明" className="h-full w-full object-cover" />
                    </a>
                    <button type="button" className="absolute right-1 top-1 rounded-full bg-rose-500 p-1 text-white" onClick={() => removeImage(image.id)} aria-label="删除图片">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button icon={<Save size={18} />}>保存证明</Button>
        </form>
      )}
    </Modal>
  );
}

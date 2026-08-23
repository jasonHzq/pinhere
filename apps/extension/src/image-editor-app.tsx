import { useEffect, useState } from "react";
import { Check, ImageIcon, LoaderCircle, Minus, Plus, RotateCcw, ScanLine, X } from "lucide-react";
import { Cropper } from "@/components/cropper";
import { Button } from "@/components/ui";
import {
  IMAGE_EDITOR_DRAFT_KEY,
  IMAGE_EDITOR_RESULT_KEY,
  type ImageEditorDraft
} from "@/lib/image-editor";
import type { Rect } from "@/types";

const MIN_ZOOM = 75;
const MAX_ZOOM = 200;

function closeWindow() {
  window.close();
}

export function ImageEditorApp() {
  const [draft, setDraft] = useState<ImageEditorDraft | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session");
    void chrome.storage.local.get(IMAGE_EDITOR_DRAFT_KEY).then((stored) => {
      const candidate = stored[IMAGE_EDITOR_DRAFT_KEY] as ImageEditorDraft | undefined;
      if (!sessionId || !candidate || candidate.sessionId !== sessionId) {
        setError("图片编辑会话已失效，请回到缺陷窗口重新打开。");
        return;
      }
      setDraft(candidate);
      setCrop(candidate.crop);
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWindow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function applyCrop() {
    if (!draft || !crop) return;
    await chrome.storage.local.set({
      [IMAGE_EDITOR_RESULT_KEY]: { sessionId: draft.sessionId, crop }
    });
    closeWindow();
  }

  if (error) {
    return (
      <main className="image-editor-shell grid place-items-center p-8">
        <section className="max-w-md rounded-3xl border border-[#d9e0ea] bg-white p-8 text-center shadow-[0_24px_80px_rgba(35,48,68,.14)]">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef2ff] text-[#315efb]"><ImageIcon size={22} /></div>
          <h1 className="mt-5 text-xl font-extrabold tracking-[-.035em]">无法打开截图</h1>
          <p className="mt-3 text-sm leading-6 text-[#697386]">{error}</p>
          <Button className="mt-6 w-full" onClick={closeWindow}>关闭窗口</Button>
        </section>
      </main>
    );
  }

  if (!draft || !crop) {
    return <main className="image-editor-shell grid place-items-center"><LoaderCircle className="animate-spin text-[#315efb]" /></main>;
  }

  const selectedSize = `${Math.round(crop.width)} × ${Math.round(crop.height)} px`;

  return (
    <main className="image-editor-shell flex min-h-screen flex-col">
      <header className="image-editor-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#edf2ff] text-[#315efb]"><ScanLine size={20} /></span>
          <div className="min-w-0">
            <div className="eyebrow">Focused image editor</div>
            <h1 className="truncate text-lg font-extrabold tracking-[-.035em]">放大编辑截图</h1>
          </div>
        </div>
        <button type="button" className="focus-ring rounded-xl p-2.5 text-[#687489] hover:bg-[#edf1f5] hover:text-[#172033]" aria-label="关闭图片编辑窗口" title="关闭" onClick={closeWindow}><X size={20} /></button>
      </header>

      <div className="image-editor-toolbar">
        <div>
          <div className="text-xs font-extrabold">拖动图片，重新框选需要提交的区域</div>
          <div className="mt-1 text-[11px] text-[#7a8494]">当前选区 {selectedSize}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="editor-tool-button" onClick={() => setCrop(draft.initialCrop)}><RotateCcw size={14} />恢复初始选区</button>
          <div className="zoom-control" aria-label="图片缩放">
            <button type="button" aria-label="缩小图片" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 25))}><Minus size={14} /></button>
            <input aria-label="缩放比例" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={25} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            <button type="button" aria-label="放大图片" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 25))}><Plus size={14} /></button>
            <span>{zoom}%</span>
          </div>
        </div>
      </div>

      <section className="image-workbench" aria-label="截图编辑画布">
        <div className="image-workbench-scroll">
          <Cropper
            src={draft.screenshot}
            crop={crop}
            onChange={setCrop}
            className="image-editor-cropper"
            imageAlt="放大的缺陷截图，可拖动重新框选"
            style={{ width: `${zoom}%` }}
          />
        </div>
      </section>

      <footer className="image-editor-footer">
        <div className="hidden text-[11px] leading-5 text-[#7a8494] sm:block">只有选区会回到缺陷表单；标题和描述保持不变。</div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" onClick={closeWindow}>取消</Button>
          <Button type="button" onClick={() => void applyCrop()}><Check size={16} />应用选区</Button>
        </div>
      </footer>
    </main>
  );
}

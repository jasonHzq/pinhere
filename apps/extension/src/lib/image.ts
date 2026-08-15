import type { DomContext, Rect } from "@/types";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

export async function annotateScreenshot(src: string, dom: DomContext) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
  const sx = image.naturalWidth / dom.viewport.width; const sy = image.naturalHeight / dom.viewport.height;
  const rect = { x: dom.boundingRect.x * sx, y: dom.boundingRect.y * sy, width: dom.boundingRect.width * sx, height: dom.boundingRect.height * sy };
  context.fillStyle = "rgba(22,77,216,.13)"; context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "#255ff0"; context.lineWidth = Math.max(3, 2 * sx); context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  const pad = Math.max(48 * sx, Math.min(image.width, image.height) * .06);
  const crop = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: Math.min(image.width, rect.width + pad * 2), height: Math.min(image.height, rect.height + pad * 2) };
  crop.width = Math.min(crop.width, image.width - crop.x); crop.height = Math.min(crop.height, image.height - crop.y);
  return { screenshot: canvas.toDataURL("image/png"), crop };
}

export async function cropAndCompress(src: string, crop: Rect) {
  const image = await loadImage(src); let scale = 1; let quality = .88; let output = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(crop.width * scale)); canvas.height = Math.max(1, Math.round(crop.height * scale));
    canvas.getContext("2d")!.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    output = canvas.toDataURL("image/webp", quality);
    const bytes = Math.ceil((output.length - output.indexOf(",") - 1) * .75);
    if (bytes <= 2 * 1024 * 1024) return output;
    quality = Math.max(.58, quality - .08); scale *= .86;
  }
  throw new Error("截图压缩后仍超过 2 MiB，请缩小裁剪范围");
}

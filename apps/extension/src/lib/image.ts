import type { DomContext, Rect } from "@/types";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

export function viewportRectToImageRect(
  image: { width: number; height: number },
  viewport: { width: number; height: number },
  rect: Rect
): Rect {
  const sx = image.width / viewport.width;
  const sy = image.height / viewport.height;
  const left = Math.max(0, Math.min(image.width, rect.x * sx));
  const top = Math.max(0, Math.min(image.height, rect.y * sy));
  const right = Math.max(left, Math.min(image.width, (rect.x + rect.width) * sx));
  const bottom = Math.max(top, Math.min(image.height, (rect.y + rect.height) * sy));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export async function prepareRegionScreenshot(src: string, dom: DomContext) {
  const image = await loadImage(src);
  return {
    screenshot: src,
    highlight: undefined,
    crop: viewportRectToImageRect(
      { width: image.naturalWidth, height: image.naturalHeight },
      dom.viewport,
      dom.boundingRect
    )
  };
}

export async function annotateScreenshot(src: string, dom: DomContext) {
  const image = await loadImage(src);
  const sx = image.naturalWidth / dom.viewport.width;
  const rect = viewportRectToImageRect(
    { width: image.naturalWidth, height: image.naturalHeight },
    dom.viewport,
    dom.boundingRect
  );
  const pad = Math.max(48 * sx, Math.min(image.width, image.height) * .06);
  const crop = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: Math.min(image.width, rect.width + pad * 2), height: Math.min(image.height, rect.height + pad * 2) };
  crop.width = Math.min(crop.width, image.width - crop.x); crop.height = Math.min(crop.height, image.height - crop.y);
  // Cropper renders the selection overlay in CSS. Returning the original source
  // avoids a synchronous full-viewport canvas encode during editor startup.
  return { screenshot: src, crop, highlight: rect };
}

export async function cropAndCompress(src: string, crop: Rect, highlight?: Rect) {
  const image = await loadImage(src); let scale = 1; let quality = .88; let output = ""; let contentType: "image/webp" | "image/jpeg" = "image/webp";
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(crop.width * scale)); canvas.height = Math.max(1, Math.round(crop.height * scale));
    const context = canvas.getContext("2d")!;
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    if (highlight) {
      const left = (highlight.x - crop.x) * scale;
      const top = (highlight.y - crop.y) * scale;
      const width = highlight.width * scale;
      const height = highlight.height * scale;
      context.fillStyle = "rgba(22,77,216,.13)";
      context.fillRect(left, top, width, height);
      context.strokeStyle = "#255ff0";
      context.lineWidth = Math.max(3, 2 * scale);
      context.strokeRect(left, top, width, height);
    }
    output = canvas.toDataURL(contentType, quality);
    if (contentType === "image/webp" && !output.startsWith("data:image/webp")) {
      contentType = "image/jpeg";
      output = canvas.toDataURL(contentType, quality);
    }
    const bytes = Math.ceil((output.length - output.indexOf(",") - 1) * .75);
    if (bytes <= 2 * 1024 * 1024) return { base64: output, contentType, extension: contentType === "image/webp" ? "webp" : "jpg" };
    quality = Math.max(.58, quality - .08); scale *= .86;
  }
  throw new Error("截图压缩后仍超过 2 MiB，请缩小裁剪范围");
}

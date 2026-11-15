export const MAX_IMAGE_BYTES = 100_000;
const MAX_IMAGE_EDGE = 1600;

export type CompressedImage = {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
};

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("已取消图片处理", "AbortError");
}

function readImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    const clean = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      clean();
      image.src = "";
      reject(new DOMException("已取消图片处理", "AbortError"));
    };
    image.onload = () => {
      clean();
      if (!image.naturalWidth || !image.naturalHeight) reject(new Error("图片尺寸无效"));
      else resolve(image);
    };
    image.onerror = () => {
      clean();
      reject(new Error("无法读取这张图片，请尝试 JPG、PNG 或 WebP 格式"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    else image.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("图片压缩失败，请重新选择图片")), type, quality);
  });
}

function toDataUrl(blob: Blob, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const clean = () => signal?.removeEventListener("abort", abort);
    const abort = () => reader.abort();
    reader.onload = () => { clean(); resolve(String(reader.result)); };
    reader.onerror = () => { clean(); reject(new Error("图片读取失败，请重试")); };
    reader.onabort = () => { clean(); reject(new DOMException("已取消图片处理", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { clean(); reject(new DOMException("已取消图片处理", "AbortError")); }
    else reader.readAsDataURL(blob);
  });
}

/** Re-encode a browser-decodable image; only return verified, bounded raster data. */
export async function compressImage(file: File, signal?: AbortSignal): Promise<CompressedImage> {
  checkAbort(signal);
  if (!file.size) throw new Error("图片文件为空");
  if (file.type && !file.type.startsWith("image/")) throw new Error("请选择图片文件");
  // Original file size is deliberately not capped. The canvas never uses the original pixel dimensions.
  const url = URL.createObjectURL(file);
  let bitmap: ImageBitmap | null = null;
  let original: HTMLImageElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    original = await readImage(url, signal);
    checkAbort(signal);
    // The image element reports dimensions with the browser's EXIF orientation applied.
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(original.naturalWidth, original.naturalHeight));
    let width = Math.max(1, Math.round(original.naturalWidth * scale));
    let height = Math.max(1, Math.round(original.naturalHeight * scale));
    let source: CanvasImageSource = original;
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(original, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
        source = bitmap;
        original.src = "";
      } catch {
        // Some browsers decode an image but cannot resize it via ImageBitmap; use a bounded canvas.
      }
    }
    checkAbort(signal);
    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片，请更换浏览器重试");
    let type = "image/webp";
    const draw = () => {
      canvas!.width = width;
      canvas!.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (type === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(source, 0, 0, width, height);
    };
    while (true) {
      checkAbort(signal);
      draw();
      let result = await encode(canvas, type, 0.88);
      checkAbort(signal);
      if (type === "image/webp" && result.type !== "image/webp") {
        type = "image/jpeg";
        draw();
        result = await encode(canvas, type, 0.88);
      }
      if (!["image/webp", "image/jpeg", "image/png"].includes(result.type)) throw new Error("当前浏览器不支持图片压缩");
      if (result.size > MAX_IMAGE_BYTES) {
        let low = 0.34, high = 0.88;
        let smallest = await encode(canvas, type, low);
        checkAbort(signal);
        if (smallest.size <= MAX_IMAGE_BYTES) {
          // Keep as much quality as possible at the current size.
          result = smallest;
          for (let attempt = 0; attempt < 5; attempt++) {
            const quality = (low + high) / 2;
            const candidate = await encode(canvas, type, quality);
            checkAbort(signal);
            if (candidate.size <= MAX_IMAGE_BYTES) { low = quality; result = candidate; }
            else high = quality;
          }
        } else {
          if (width === 1 && height === 1) throw new Error("图片无法压缩至 100 KB，请重新选择图片");
          const reduction = Math.min(0.8, Math.max(0.45, Math.sqrt(MAX_IMAGE_BYTES / smallest.size) * 0.9));
          width = Math.max(1, Math.floor(width * reduction));
          height = Math.max(1, Math.floor(height * reduction));
          continue;
        }
      }
      checkAbort(signal);
      if (!result.size || result.size > MAX_IMAGE_BYTES) throw new Error("图片压缩失败，请重新选择图片");
      const dataUrl = await toDataUrl(result, signal);
      checkAbort(signal);
      return { dataUrl, blob: result, width, height };
    }
  } finally {
    bitmap?.close();
    if (original) original.src = "";
    if (canvas) { canvas.width = 1; canvas.height = 1; }
    URL.revokeObjectURL(url);
  }
}

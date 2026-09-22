import { extractAmountFromOcr, toLatinDigits } from "./ocr";

export type ClientOcrResult = {
  amount: number | null;
  text: string;
  ms: number;
};

let workerPromise: Promise<Awaited<ReturnType<typeof import("tesseract.js").createWorker>>> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      // English-only is much faster; bank apps mostly print Latin digits
      const worker = await createWorker("eng", 1);
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: "0123456789.,: *-IR",
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Downscale + grayscale + contrast for faster, cleaner digit OCR */
export async function preprocessReceiptBlob(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxW = 900;
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // grayscale + mild contrast stretch
    let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    y = (y - 128) * 1.35 + 128;
    y = Math.max(0, Math.min(255, y));
    // light threshold helps receipt screenshots
    y = y > 170 ? 255 : y < 90 ? 0 : y;
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);

  return await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || file), "image/jpeg", 0.82);
  });
}

function extractDigitsFallback(text: string, expected?: number): number | null {
  const cleaned = toLatinDigits(text).replace(/[^\d\s]/g, " ");
  const nums = [...cleaned.matchAll(/\d{5,12}/g)]
    .map((m) => Number(m[0]))
    .filter((n) => n >= 10_000 && n <= 500_000_000)
    .sort((a, b) => b - a);

  if (!nums.length) return null;
  if (expected) {
    const near = nums.find((n) => Math.abs(n - expected) / expected < 0.15);
    if (near) return near;
    const asToman = nums.find((n) => Math.abs(n / 10 - expected) / expected < 0.15);
    if (asToman) return Math.round(asToman / 10);
  }
  return nums[0];
}

/**
 * Fast client-side OCR focused on amount digits.
 * Times out so the UI never hangs.
 */
export async function ocrReceiptInBrowser(
  file: Blob,
  opts?: { expectedAmount?: number; timeoutMs?: number; onProgress?: (p: number) => void },
): Promise<ClientOcrResult> {
  const started = performance.now();
  const timeoutMs = opts?.timeoutMs ?? 12_000;

  const run = async (): Promise<ClientOcrResult> => {
    opts?.onProgress?.(5);
    const prepared = await preprocessReceiptBlob(file);
    opts?.onProgress?.(25);

    const worker = await getWorker();
    opts?.onProgress?.(45);

    const {
      data: { text },
    } = await worker.recognize(prepared);
    opts?.onProgress?.(90);

    const extracted = extractAmountFromOcr(text);
    const amount = extracted.amount ?? extractDigitsFallback(text, opts?.expectedAmount);
    opts?.onProgress?.(100);

    return { amount, text, ms: Math.round(performance.now() - started) };
  };

  return await Promise.race([
    run(),
    new Promise<ClientOcrResult>((resolve) =>
      setTimeout(
        () => resolve({ amount: null, text: "OCR_TIMEOUT", ms: timeoutMs }),
        timeoutMs,
      ),
    ),
  ]);
}

import { createWorker, PSM } from "tesseract.js";
import { extractAmountFromOcr } from "./ocr";

type OcrResult = { text: string; amount: number | null; candidates: number[] };

/** Lightweight server OCR — English digits only, hard timeout */
export async function ocrReceiptImage(buffer: Buffer, timeoutMs = 8000): Promise<OcrResult> {
  const work = async (): Promise<OcrResult> => {
    const worker = await createWorker("eng", 1);
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: "0123456789.,: *-IR",
      });
      const {
        data: { text },
      } = await worker.recognize(buffer);
      const extracted = extractAmountFromOcr(text);
      return { text, ...extracted };
    } finally {
      await worker.terminate();
    }
  };

  return await Promise.race([
    work(),
    new Promise<OcrResult>((resolve) =>
      setTimeout(() => resolve({ text: "OCR_TIMEOUT", amount: null, candidates: [] }), timeoutMs),
    ),
  ]);
}

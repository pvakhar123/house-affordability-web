import type { FinalReport } from "./types";

const MAX_URL_LENGTH = 8000;

/** base64url encode (URL-safe, no padding) */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url decode */
function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Compress a FinalReport into a URL-safe string */
export async function compressReport(report: FinalReport): Promise<string> {
  const json = JSON.stringify(report);
  const input = new TextEncoder().encode(json);

  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(input);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  const encoded = toBase64Url(compressed);

  if (encoded.length > MAX_URL_LENGTH) {
    throw new Error(
      "Report is too large to share via URL. Try saving it locally instead."
    );
  }

  return encoded;
}

/** Decompress a URL-safe string back into a FinalReport */
export async function decompressReport(encoded: string): Promise<FinalReport> {
  const compressed = fromBase64Url(encoded);

  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(compressed.buffer as ArrayBuffer));
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const decompressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  const json = new TextDecoder().decode(decompressed);
  return JSON.parse(json) as FinalReport;
}

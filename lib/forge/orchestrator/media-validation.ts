import { validateCourseCoverUpload } from "../../courses/cover-contracts";
import { coverPromptSchema, visualBriefSchema, type CoverPrompt, type VisualBrief } from "./media-contracts";

const internalReference = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|https?:\/\/|\bundefined\b|\[object |\bnull\b/i;
const strings = (value: unknown): string[] => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
const clean = (value: unknown) => strings(value).every((item) => !internalReference.test(item));

export function validateBrief(raw: unknown): VisualBrief | null {
  const parsed = visualBriefSchema.safeParse(raw);
  return parsed.success && clean(parsed.data) ? parsed.data : null;
}

// The brief is authoritative: its aspect ratio is enforced and its avoid list is always preserved.
export function validatePrompt(raw: unknown, brief: VisualBrief): CoverPrompt | null {
  const parsed = coverPromptSchema.safeParse(raw);
  if (!parsed.success || !clean(parsed.data)) return null;
  const seen = new Set<string>();
  const avoid = [...brief.avoid, ...parsed.data.avoid].filter((item) => { const key = item.toLowerCase(); return seen.has(key) ? false : Boolean(seen.add(key)); }).slice(0, 10);
  return { ...parsed.data, aspectRatio: brief.aspectRatio, avoid };
}

export function isCleanPrompt(prompt: string) { return !internalReference.test(prompt); }

type ImageInspection = { ok: true; mimeType: "image/jpeg" | "image/png" | "image/webp"; size: number; width: number; height: number } | { ok: false; reason: "empty" | "mime" | "size" | "dimensions" };
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));

function sniff(b: Uint8Array): { mimeType: "image/jpeg" | "image/png" | "image/webp"; width: number; height: number } | null {
  if (b.length > 24 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && ascii(b, 12, 4) === "IHDR") return { mimeType: "image/png", width: u32be(b, 16), height: u32be(b, 20) };
  if (b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    const kind = ascii(b, 12, 4);
    if (kind === "VP8 " && b.length > 30) return { mimeType: "image/webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    if (kind === "VP8L" && b.length > 25) { const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0; return { mimeType: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }; }
    if (kind === "VP8X" && b.length > 30) return { mimeType: "image/webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    return null;
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { mimeType: "image/jpeg", height: u16be(b, i + 5), width: u16be(b, i + 7) };
      i += 2 + u16be(b, i + 2);
    }
  }
  return null;
}

// Same product limits as a manual upload (validateCourseCoverUpload), applied to the actual bytes rather than a declared type.
export function inspectImage(bytes: Uint8Array | null | undefined): ImageInspection {
  if (!bytes || bytes.length === 0) return { ok: false, reason: "empty" };
  const found = sniff(bytes);
  if (!found) return { ok: false, reason: "mime" };
  if (!validateCourseCoverUpload(found.mimeType, bytes.length).ok) return { ok: false, reason: "size" };
  const valid = (n: number) => Number.isInteger(n) && n >= 256 && n <= 8192;
  if (!valid(found.width) || !valid(found.height)) return { ok: false, reason: "dimensions" };
  return { ok: true, mimeType: found.mimeType, size: bytes.length, width: found.width, height: found.height };
}

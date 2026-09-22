import { UrlSourceError } from "./url-fetch";

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(value: string) {
  return value.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#")) { const point = Number.parseInt(code[1]?.toLowerCase() === "x" ? code.slice(2) : code.slice(1), code[1]?.toLowerCase() === "x" ? 16 : 10); return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " "; }
    return entities[code.toLowerCase()] ?? match;
  });
}
export function extractUrlText(body: string, mimeType: string): { title: string; text: string; extractedChars: number } {
  let title = "";
  let text = body;
  if (mimeType !== "text/plain") {
    title = decode(body.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
    text = body.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]+\b(?:hidden|aria-hidden\s*=\s*["']?true|style\s*=\s*["'][^"']*display\s*:\s*none)[^>]*>[\s\S]*?<\/[^>]+>/gi, " ")
      .replace(/<\/?(?:h[1-6]|p|li|ul|ol|article|main|section|div|br|blockquote)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, " ");
  }
  text = decode(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b-\u200f\ufeff]/g, "").replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 20) throw new UrlSourceError("empty_content");
  const full = title && !text.startsWith(title) ? `${title}\n\n${text}` : text;
  return { title: title.slice(0, 180), text: full.slice(0, 100000), extractedChars: full.length };
}

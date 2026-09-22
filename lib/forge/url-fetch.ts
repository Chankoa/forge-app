import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export type UrlSourceErrorCode = "invalid_url" | "unsupported_protocol" | "private_address" | "dns_resolution_failed" | "redirect_blocked" | "too_many_redirects" | "timeout" | "fetch_failed" | "unsupported_content_type" | "content_too_large" | "empty_content";
export class UrlSourceError extends Error { constructor(public readonly code: UrlSourceErrorCode) { super(code); } }

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10000;

function publicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a === 192 && b === 0 || a === 198 && (b === 18 || b === 19) || a === 192 && b === 88);
  }
  if (family === 6) {
    const value = address.toLowerCase().replace(/^\[|\]$/g, "");
    if (value.includes("%")) return false;
    if (value.startsWith("::ffff:")) return false;
    const first = Number.parseInt(value.split(":")[0] || "0", 16);
    return first >= 0x2000 && first <= 0x3fff && !value.startsWith("2001:db8");
  }
  return false;
}

export function validatePublicUrl(input: string): URL {
  if (typeof input !== "string" || input.length > 2048 || /[\u0000-\u0020\\]/.test(input)) throw new UrlSourceError("invalid_url");
  let url: URL;
  try { url = new URL(input); } catch { throw new UrlSourceError("invalid_url"); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new UrlSourceError("unsupported_protocol");
  if (url.username || url.password) throw new UrlSourceError("invalid_url");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || host.endsWith(".invalid") || host.endsWith(".home") || host.endsWith(".lan") || !host.includes(".") && !isIP(host)) throw new UrlSourceError("private_address");
  if (isIP(host) && !publicIp(host)) throw new UrlSourceError("private_address");
  url.hash = "";
  return url;
}

async function pinnedAddress(url: URL, remainingMs: number): Promise<{ address: string; family: 4 | 6 }> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return { address: host, family: isIP(host) as 4 | 6 };
  let addresses: Array<{ address: string; family: number }>;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { addresses = await Promise.race([lookup(host, { all: true, verbatim: true }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new UrlSourceError("timeout")), remainingMs); })]); } catch (error) { if (error instanceof UrlSourceError) throw error; throw new UrlSourceError("dns_resolution_failed"); } finally { if (timer) clearTimeout(timer); }
  if (!addresses.length || addresses.some((item) => !publicIp(item.address))) throw new UrlSourceError("private_address");
  return addresses[0] as { address: string; family: 4 | 6 };
}

export function pinnedLookupResult(pinned: { address: string; family: 4 | 6 }, all: boolean) {
  return all ? [{ address: pinned.address, family: pinned.family }] : pinned.address;
}

export async function fetchPublicText(input: string): Promise<{ url: string; body: string; mimeType: string; rawChars: number }> {
  let url = validatePublicUrl(input);
  const seen = new Set<string>();
  const deadline = Date.now() + TIMEOUT_MS;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    if (seen.has(url.href)) throw new UrlSourceError("too_many_redirects");
    seen.add(url.href);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new UrlSourceError("timeout");
    const pinned = await pinnedAddress(url, remaining);
    const connectionRemaining = deadline - Date.now();
    if (connectionRemaining <= 0) throw new UrlSourceError("timeout");
    const result = await new Promise<{ status: number; location?: string; mimeType: string; body: string }>((resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
        method: "GET", timeout: connectionRemaining,
        headers: { Accept: "text/html, text/plain;q=0.9", "User-Agent": "ForgeSource/1.0" },
        lookup: (_host, options, callback) => callback(null, pinnedLookupResult(pinned, Boolean(options.all)), pinned.family),
      }, (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        const mimeType = String(response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if ([301, 302, 303, 307, 308].includes(status)) { response.resume(); resolve({ status, location, mimeType, body: "" }); return; }
        if (status < 200 || status >= 300) { response.destroy(); reject(new UrlSourceError("fetch_failed")); return; }
        if (!["text/html", "text/plain", "application/xhtml+xml"].includes(mimeType)) { response.destroy(); reject(new UrlSourceError("unsupported_content_type")); return; }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => { size += chunk.length; if (size > MAX_BYTES) { response.destroy(new UrlSourceError("content_too_large")); return; } chunks.push(chunk); });
        response.on("end", () => resolve({ status, mimeType, body: Buffer.concat(chunks).toString("utf8") }));
        response.on("error", reject);
      });
      const timer = setTimeout(() => request.destroy(new UrlSourceError("timeout")), connectionRemaining);
      request.on("error", reject);
      request.on("close", () => clearTimeout(timer));
      request.end();
    }).catch((error: unknown) => { if (error instanceof UrlSourceError) throw error; throw new UrlSourceError("fetch_failed"); });
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      if (!result.location) throw new UrlSourceError("redirect_blocked");
      if (redirects === MAX_REDIRECTS) throw new UrlSourceError("too_many_redirects");
      try { url = validatePublicUrl(new URL(result.location, url).href); } catch { throw new UrlSourceError("redirect_blocked"); }
      continue;
    }
    if (!result.body.trim()) throw new UrlSourceError("empty_content");
    return { url: url.href, body: result.body, mimeType: result.mimeType, rawChars: result.body.length };
  }
  throw new UrlSourceError("too_many_redirects");
}

export type RichDirectiveKind = "image" | "audio" | "video" | "practice";
export type RichDirective = {
  kind: RichDirectiveKind;
  fields: Record<string, string>;
  body: string;
  end: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fieldPattern = /^([a-z][a-z0-9_-]*)=(.*)$/;
const supportedKinds = new Set<RichDirectiveKind>(["image", "audio", "video", "practice"]);
const allowedFields: Record<RichDirectiveKind, readonly string[]> = {
  image: ["resource", "alt", "caption", "status"],
  audio: ["resource", "title", "caption", "transcript", "bpm", "status"],
  video: ["url", "title", "caption", "status"],
  practice: ["title", "bpm", "meter", "duration", "bars"],
};

function isPlaceholder(fields: Record<string, string>) {
  return fields.status === "placeholder";
}

function validBpm(value: string | undefined) {
  return value === undefined || (/^\d{1,3}$/.test(value) && Number(value) >= 20 && Number(value) <= 400);
}

function validFields(kind: RichDirectiveKind, fields: Record<string, string>) {
  if (Object.keys(fields).some((field) => !allowedFields[kind].includes(field))) return false;
  if (Object.values(fields).some((value) => value.length > 500 || /[<>]/.test(value))) return false;
  if (!validBpm(fields.bpm)) return false;
  if (fields.resource && !uuidPattern.test(fields.resource) && !isPlaceholder(fields)) return false;
  if (kind === "image" && (!fields.alt || (!fields.resource && !isPlaceholder(fields)))) return false;
  if (kind === "audio" && (!fields.title || (!fields.resource && !isPlaceholder(fields)))) return false;
  if (kind === "video" && (!fields.title || (!fields.url && !isPlaceholder(fields)))) return false;
  if (kind === "practice" && !fields.title) return false;
  if (fields.meter && !/^[0-9]{1,2}\/[0-9]{1,2}$/.test(fields.meter)) return false;
  return true;
}

export function isSupportedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be" || host === "vimeo.com";
  } catch {
    return false;
  }
}

export function parseRichDirective(lines: string[], start: number): RichDirective | null {
  const opening = /^:::(image|audio|video|practice)\s*$/.exec(lines[start] ?? "");
  if (!opening || !supportedKinds.has(opening[1] as RichDirectiveKind)) return null;
  const kind = opening[1] as RichDirectiveKind;
  const fields: Record<string, string> = {};
  let index = start + 1;
  for (; index < lines.length && lines[index] !== ":::"; index += 1) {
    const field = fieldPattern.exec(lines[index]);
    if (!field || !field[2].trim()) return null;
    fields[field[1]] = field[2].trim();
  }
  if (index >= lines.length || !validFields(kind, fields)) return null;
  if (kind !== "practice") {
    return { kind, fields, body: "", end: index };
  }
  const bodyStart = index + 1;
  index = bodyStart;
  while (index < lines.length && lines[index] !== ":::" ) index += 1;
  if (index >= lines.length) return null;
  return { kind, fields, body: lines.slice(bodyStart, index).join("\n").trim(), end: index };
}

export function validateRichContent(content: string, options: { allowResourceIds?: readonly string[]; trustedUrls?: readonly string[] } = {}) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const allowResourceIds = new Set(options.allowResourceIds ?? []);
  const trustedUrls = new Set(options.trustedUrls ?? []);
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^`{3,}/.test(lines[index])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /<\/?[a-z][^>]*>/i.test(lines[index])) return false;
    if (!lines[index].startsWith(":::")) continue;
    const directive = parseRichDirective(lines, index);
    if (!directive) return false;
    if (directive.fields.resource && !allowResourceIds.has(directive.fields.resource)) return false;
    if (directive.fields.url && (!isSupportedVideoUrl(directive.fields.url) || !trustedUrls.has(directive.fields.url))) return false;
    index = directive.end;
  }
  return true;
}

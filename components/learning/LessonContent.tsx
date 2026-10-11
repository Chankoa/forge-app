import type { ReactNode } from "react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { isSupportedVideoUrl, parseRichDirective, type RichDirective } from "@/lib/courses/lesson-rich-content";

export function isSafeLessonLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch { return false; }
}

function inline(value: string): ReactNode[] {
  return value.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(part);
    if (link) return isSafeLessonLink(link[2]) ? <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a> : <span key={index}>{link[1]}</span>;
    return part.startsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part.startsWith("*") ? <em key={index}>{part.slice(1, -1)}</em> : part;
  });
}

export type LessonMediaResource = { url: string | null; title?: string | null; status?: "ready" | "unavailable" };
type LessonRenderMode = "author" | "learner";
type LessonRenderOptions = { mode: LessonRenderMode; resources: Record<string, LessonMediaResource> };

function metadata(fields: Record<string, string>) {
  return [fields.bpm && `${fields.bpm} BPM`, fields.meter, fields.duration, fields.bars && `${fields.bars} mesures`].filter(Boolean).join(" · ");
}

function embedUrl(value: string) {
  if (!isSupportedVideoUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = url.searchParams.get("v");
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  return host === "vimeo.com" && /^\d+$/.test(url.pathname.slice(1)) ? `https://player.vimeo.com/video/${url.pathname.slice(1)}` : null;
}

type ListEntry = { indent: number; ordered: boolean; text: string };

function renderList(entries: ListEntry[], start: number, indent: number, ordered: boolean, key: string): [ReactNode, number] {
  const items: ReactNode[] = [];
  let index = start;
  while (index < entries.length && entries[index].indent === indent && entries[index].ordered === ordered) {
    const entry = entries[index];
    index += 1;
    let child: ReactNode = null;
    if (index < entries.length && entries[index].indent > indent) {
      [child, index] = renderList(entries, index, entries[index].indent, entries[index].ordered, `${key}-${items.length}`);
    }
    items.push(<li key={`${key}-${items.length}`}>{inline(entry.text)}{child}</li>);
  }
  const Tag = ordered ? "ol" : "ul";
  return [<Tag key={key}>{items}</Tag>, index];
}

function richBlock(directive: RichDirective, options: LessonRenderOptions, key: number): ReactNode {
  const { fields } = directive;
  if (fields.status === "placeholder") return options.mode === "author" ? <aside key={key} className="lesson-rich-placeholder" aria-label={`${directive.kind} à ajouter`}><strong>{directive.kind === "audio" ? "Audio" : directive.kind === "video" ? "Vidéo" : directive.kind === "image" ? "Image" : "Exercice"} à ajouter</strong>{fields.caption && <p>{fields.caption}</p>}</aside> : null;
  if (directive.kind === "image") {
    const resource = fields.resource ? options.resources[fields.resource] : undefined;
    if (!resource || !resource.url || !isSafeLessonLink(resource.url)) return options.mode === "author" ? <aside key={key} className="lesson-rich-placeholder">Image indisponible</aside> : null;
    // Resource URLs are resolved by the caller and may be signed storage URLs.
    // eslint-disable-next-line @next/next/no-img-element
    const image = <img src={resource.url} alt={fields.alt} />;
    return <figure key={key} className="lesson-rich-media lesson-rich-media--image">{image}{fields.caption && <figcaption>{fields.caption}</figcaption>}</figure>;
  }
  if (directive.kind === "audio") {
    const resource = fields.resource ? options.resources[fields.resource] : undefined;
    if (!resource || !resource.url || !isSafeLessonLink(resource.url)) return options.mode === "author" ? <aside key={key} className="lesson-rich-placeholder">Audio indisponible</aside> : null;
    return <figure key={key} className="lesson-rich-media lesson-rich-media--audio"><audio controls preload="metadata" src={resource.url} aria-label={fields.title} /><figcaption><strong>{fields.title}</strong>{metadata(fields) && <span>{metadata(fields)}</span>}{fields.caption && <span>{fields.caption}</span>}</figcaption></figure>;
  }
  if (directive.kind === "video") {
    const source = embedUrl(fields.url ?? "");
    if (!source) return options.mode === "author" ? <aside key={key} className="lesson-rich-placeholder">Vidéo indisponible</aside> : null;
    return <figure key={key} className="lesson-rich-media lesson-rich-media--video"><div className="lesson-video-frame"><iframe src={source} title={fields.title} allow="fullscreen" loading="lazy" /></div><figcaption><strong>{fields.title}</strong>{fields.caption && <span>{fields.caption}</span>}</figcaption></figure>;
  }
  return <aside key={key} className="lesson-practice"><header><strong>{fields.title}</strong>{metadata(fields) && <span>{metadata(fields)}</span>}</header>{directive.body && <p>{inline(directive.body)}</p>}</aside>;
}

function blocks(content: string, options: LessonRenderOptions) {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n"); const result: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const fence = /^(`{3,})([a-zA-Z0-9_-]*)\s*$/.exec(line);
    if (fence) { const code: string[] = []; index += 1; while (index < lines.length && !new RegExp(`^${fence[1]}\\s*$`).test(lines[index])) code.push(lines[index++]); if (index < lines.length) index += 1; const language = fence[2].toLowerCase(); result.push(language === "tab" ? <figure key={result.length} className="lesson-tab"><figcaption>Tablature</figcaption><pre><code>{code.join("\n")}</code></pre></figure> : <figure key={result.length} className="lesson-code" data-language={language || undefined}>{language && <figcaption>{language}</figcaption>}<pre><code>{code.join("\n")}</code></pre></figure>); continue; }
    if (line.startsWith(":::")) { const directive = parseRichDirective(lines, index); if (directive) { result.push(richBlock(directive, options, result.length)); index = directive.end + 1; continue; } }
    if (/^---+\s*$/.test(line)) { result.push(<hr key={result.length} />); index += 1; continue; }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) { const Tag = (`h${Math.max(2, heading[1].length)}`) as "h2" | "h3" | "h4"; result.push(<Tag key={result.length}>{inline(heading[2])}</Tag>); index += 1; continue; }
    if (line.startsWith("> ")) { const quote: string[] = []; while (index < lines.length && lines[index].startsWith("> ")) quote.push(lines[index++].slice(2)); const callout = /^\[!(NOTE|TIP|IMPORTANT)\]\s*$/i.exec(quote[0] ?? ""); result.push(callout ? <aside key={result.length} className="lesson-callout" aria-label="À retenir"><strong>À retenir</strong>{quote.slice(1).map((item, itemIndex) => <p key={itemIndex}>{inline(item)}</p>)}</aside> : <blockquote key={result.length}>{quote.map((item, itemIndex) => <p key={itemIndex}>{inline(item)}</p>)}</blockquote>); continue; }
    const list = /^(?:- |\* |\d+\. )/.test(line);
    if (list) { const entries: ListEntry[] = []; while (index < lines.length && /^\s*(?:[-*]|\d+\.)\s+/.test(lines[index])) { const match = /^(\s*)([-*]|\d+\.)\s+(.+)$/.exec(lines[index]); if (!match) break; entries.push({ indent: match[1].length, ordered: /^\d/.test(match[2]), text: match[3] }); index += 1; } const [listNode] = renderList(entries, 0, entries[0].indent, entries[0].ordered, `list-${result.length}`); result.push(listNode); continue; }
    const paragraph: string[] = []; while (index < lines.length && lines[index].trim() && !/^`{3,}/.test(lines[index]) && !/^(#{1,4})\s+|^> |^(?:- |\* |\d+\. )|^---+\s*$/.test(lines[index])) paragraph.push(lines[index++]); result.push(<p key={result.length}>{paragraph.map((item, itemIndex) => <span key={itemIndex}>{inline(item)}{itemIndex < paragraph.length - 1 && <br />}</span>)}</p>);
  }
  return result;
}

export function LessonMarkdown({ content, mode = "learner", resources = {} }: { content: string; mode?: LessonRenderMode; resources?: Record<string, LessonMediaResource> }) {
  return <div className="lesson-content">{blocks(content, { mode, resources })}</div>;
}

export function LessonContent({ lesson }: { lesson: CourseLesson }) {
  const content = lesson.content ?? lesson.description ?? "Le contenu de cette leçon n'est pas encore disponible.";
  return <>{lesson.objectives.length > 0 && <section className="lesson-objectives"><h3>Objectifs</h3><ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></section>}<LessonMarkdown content={content} resources={lesson.mediaResources} /></>;
}

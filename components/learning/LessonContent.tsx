import type { ReactNode } from "react";
import type { CourseLesson } from "@/lib/courses/contracts";

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

function blocks(content: string) {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n"); const result: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const fence = /^(`{3,})([a-zA-Z0-9_-]*)\s*$/.exec(line);
    if (fence) { const code: string[] = []; index += 1; while (index < lines.length && !new RegExp(`^${fence[1]}\\s*$`).test(lines[index])) code.push(lines[index++]); if (index < lines.length) index += 1; result.push(<pre key={result.length}><code>{code.join("\n")}</code></pre>); continue; }
    if (/^---+\s*$/.test(line)) { result.push(<hr key={result.length} />); index += 1; continue; }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) { const Tag = (`h${Math.max(2, heading[1].length)}`) as "h2" | "h3" | "h4"; result.push(<Tag key={result.length}>{inline(heading[2])}</Tag>); index += 1; continue; }
    if (line.startsWith("> ")) { const quote: string[] = []; while (index < lines.length && lines[index].startsWith("> ")) quote.push(lines[index++].slice(2)); const callout = /^\[!(NOTE|TIP|IMPORTANT)\]\s*$/i.exec(quote[0] ?? ""); result.push(callout ? <aside key={result.length} className="lesson-callout" aria-label="À retenir"><strong>À retenir</strong>{quote.slice(1).map((item, itemIndex) => <p key={itemIndex}>{inline(item)}</p>)}</aside> : <blockquote key={result.length}>{quote.map((item, itemIndex) => <p key={itemIndex}>{inline(item)}</p>)}</blockquote>); continue; }
    const list = /^(?:- |\* |\d+\. )/.test(line);
    if (list) { const ordered = /^\d+\. /.test(line); const items: string[] = []; while (index < lines.length && (ordered ? /^\d+\. /.test(lines[index]) : /^(?:- |\* )/.test(lines[index]))) items.push(lines[index++].replace(ordered ? /^\d+\. / : /^(?:- |\* )/, "")); const Tag = ordered ? "ol" : "ul"; result.push(<Tag key={result.length}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</Tag>); continue; }
    const paragraph: string[] = []; while (index < lines.length && lines[index].trim() && !/^`{3,}/.test(lines[index]) && !/^(#{1,4})\s+|^> |^(?:- |\* |\d+\. )|^---+\s*$/.test(lines[index])) paragraph.push(lines[index++]); result.push(<p key={result.length}>{paragraph.map((item, itemIndex) => <span key={itemIndex}>{inline(item)}{itemIndex < paragraph.length - 1 && <br />}</span>)}</p>);
  }
  return result;
}

export function LessonMarkdown({ content }: { content: string }) {
  return <div className="lesson-content">{blocks(content)}</div>;
}

export function LessonContent({ lesson }: { lesson: CourseLesson }) {
  const content = lesson.content ?? lesson.description ?? "Le contenu de cette leçon n'est pas encore disponible.";
  return <>{lesson.objectives.length > 0 && <section className="lesson-objectives"><h3>Objectifs</h3><ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></section>}<LessonMarkdown content={content} /></>;
}

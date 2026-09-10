import { ForgeError, type ForgeSource, type ForgeWarning } from "./contracts";

export type ForgeSourceRow = { id: string; course_id: string | null; title: string; type: string; source_kind: string; extraction_status: string; extracted_content: string | null; storage_bucket: string | null; storage_path: string | null; file_size: number | null; mime_type: string };
export interface SourceReader {
  sources(courseId: string, ids: string[]): Promise<ForgeSourceRow[]>;
  downloadText(source: ForgeSourceRow): Promise<string>;
}
export async function resolveForgeSources(reader: SourceReader, courseId: string, ids: string[], learningUnpublished = false) {
  const sources: ForgeSource[] = [];
  const warnings: ForgeWarning[] = [];
  if (!ids.length) return { sources, warnings };
  if (ids.length > 4 || new Set(ids).size !== ids.length || learningUnpublished) throw new ForgeError("source_unavailable");
  const rows = await reader.sources(courseId, ids);
  // A missing row may mean RLS denied it. Never disclose which foreign ID exists.
  if (rows.length !== ids.length || rows.some((s) => s.course_id !== courseId || !ids.includes(s.id))) throw new ForgeError("source_unavailable");
  for (const id of ids) {
    const source = rows.find((s) => s.id === id);
    if (!source) throw new ForgeError("source_unavailable");
    if (source.extraction_status !== "ready") { warnings.push({ code: "not_ready", target: id }); continue; }
    if (!["text", "markdown", "pdf"].includes(source.type) || !["text", "file"].includes(source.source_kind)) { warnings.push({ code: "unsupported_type", target: id }); continue; }
    let text = source.extracted_content?.trim() ?? "";
    if (!text && source.source_kind === "file" && source.type !== "pdf") {
      if (source.storage_bucket !== "course-sources" || !source.storage_path || !source.file_size || source.file_size > 10 * 1024 * 1024 || !["text/plain", "text/markdown"].includes(source.mime_type)) throw new ForgeError("source_unavailable");
      text = (await reader.downloadText(source)).trim();
    }
    if (!text) { warnings.push({ code: "extraction_unavailable", target: id }); continue; }
    sources.push({ id, title: source.title, text });
  }
  return { sources, warnings };
}

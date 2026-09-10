import { resolveCourseCapabilities } from "../capabilities/course-capabilities";
import { ForgeError, type ForgeContext, type ForgeRequest, type ForgeWarning } from "./contracts";
import { resolveForgeSources, type SourceReader } from "./sources";

export type ForgeCourseRow = { id: string; teacher_id: string; title: string; description: string | null; status: string };
export type ForgeLessonRow = { id: string; course_id: string; module_id: string; title: string; description: string | null; content: string | null; objectives: string[] | null };
// Read-only port: generation has no mutation capability. Implemented with session RLS.
export interface ForgeReader extends SourceReader {
  course(slug: string): Promise<ForgeCourseRow | null>;
  enrolled(courseId: string, userId: string): Promise<boolean>;
  lesson(courseId: string, slug: string): Promise<ForgeLessonRow | null>;
  modules(courseId: string): Promise<Array<{ id: string; title: string }>>;
  lessonTitles(courseId: string): Promise<Array<{ module_id: string; title: string }>>;
}
export function assertForgeAccess(mode: ForgeRequest["mode"], isOwner: boolean, isEnrolled: boolean) {
  const capabilities = resolveCourseCapabilities({ isOwner, isEnrolled });
  if (!(mode === "learn" ? capabilities.canLearn : capabilities.canEdit)) throw new ForgeError("forbidden");
}

export async function buildForgeContext(reader: ForgeReader, userId: string, request: ForgeRequest): Promise<ForgeContext> {
  const course = await reader.course(request.courseSlug);
  if (!course) throw new ForgeError("forbidden");
  assertForgeAccess(request.mode, course.teacher_id === userId, await reader.enrolled(course.id, userId));
  const lesson = request.lessonSlug ? await reader.lesson(course.id, request.lessonSlug) : null;
  if (request.lessonSlug && (!lesson || lesson.course_id !== course.id)) throw new ForgeError("context_unavailable");
  const modules = await reader.modules(course.id);
  const currentModule = lesson ? modules.find((m) => m.id === lesson.module_id) : undefined;
  if (lesson && !currentModule) throw new ForgeError("context_unavailable");
  const titles = !lesson ? await reader.lessonTitles(course.id) : [];
  const resolved = await resolveForgeSources(reader, course.id, request.sourceIds, request.mode === "learn" && course.status !== "published");
  return {
    course: { id: course.id, title: course.title, summary: course.description ?? "" }, module: currentModule,
    lesson: lesson ? { id: lesson.id, title: lesson.title, summary: lesson.description ?? "", content: lesson.content ?? "", objectives: lesson.objectives ?? [] } : undefined,
    outline: lesson ? [] : modules.map((m) => ({ title: m.title, lessons: titles.filter((l) => l.module_id === m.id).map((l) => l.title) })),
    sources: resolved.sources, warnings: resolved.warnings,
  };
}

// One deterministic budget for all data. JSON overhead is checked again before dispatch.
export function boundForgeContext(context: ForgeContext, maxChars: number): ForgeContext {
  let remaining = Math.floor(maxChars / 2);
  const warnings: ForgeWarning[] = [...context.warnings];
  const take = (value: string, target: string, cap = remaining) => {
    const text = value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n");
    const next = text.slice(0, Math.max(0, Math.min(remaining, cap)));
    remaining -= next.length;
    if (next.length < text.length) warnings.push({ code: "truncated", target });
    return next;
  };
  const course = { ...context.course, title: take(context.course.title, "course.title", 260), summary: take(context.course.summary, "course.summary", 2000) };
  const currentModule = context.module ? { ...context.module, title: take(context.module.title, "module.title", 220) } : undefined;
  const lesson = context.lesson ? { ...context.lesson, title: take(context.lesson.title, "lesson.title", 220), summary: take(context.lesson.summary, "lesson.summary", 1000), objectives: context.lesson.objectives.slice(0, 8).map((s) => take(s, "lesson.objectives", 300)), content: take(context.lesson.content, "lesson.content", Math.floor(remaining * 0.6)) } : undefined;
  if (context.lesson && context.lesson.objectives.length > 8) warnings.push({ code: "truncated", target: "lesson.objectives" });
  const sources = context.sources.map((s) => ({ id: s.id, title: take(s.title, s.id, 260), text: take(s.text, s.id, 4000) })).filter((s) => s.text.trim());
  const outline = context.outline.slice(0, 20).map((m) => ({ title: take(m.title, "outline", 220), lessons: m.lessons.slice(0, 30).map((s) => take(s, "outline", 220)) }));
  if (context.outline.length > 20 || context.outline.some((m) => m.lessons.length > 30)) warnings.push({ code: "truncated", target: "outline" });
  return { course, module: currentModule, lesson, outline, sources, warnings };
}

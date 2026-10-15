import Link from "next/link";
import { courseLessonPath } from "@/lib/courses/context-navigation";
import type { DiscussionContext } from "@/lib/courses/discussion";

type OutlineItem = { id: string; moduleTitle: string; lessons: Array<{ id: string; slug: string; title: string }> };

function contextTitle(context: DiscussionContext, outline: OutlineItem[]) {
  if (context.type === "course") return "Parcours";
  if (context.type === "module") {
    if (!context.moduleId) return "Contexte supprimé";
    const matchedModule = outline.find((item) => item.id === context.moduleId);
    return matchedModule ? "Module · " + matchedModule.moduleTitle : "Contexte supprimé";
  }
  if (!context.lessonId) return "Contexte supprimé";
  const lesson = outline.flatMap((module) => module.lessons).find((item) => item.id === context.lessonId);
  return lesson ? "Leçon · " + lesson.title : "Contexte supprimé";
}

export function DiscussionContextLabel({ context, outline, courseSlug }: { context: DiscussionContext; outline: OutlineItem[]; courseSlug: string }) {
  const title = contextTitle(context, outline);
  const lesson = context.type === "lesson" && context.lessonId
    ? outline.flatMap((module) => module.lessons).find((item) => item.id === context.lessonId)
    : null;
  return lesson ? <Link className="discussion-context" href={courseLessonPath(courseSlug, lesson.slug)}>{title}</Link> : <span className="discussion-context">{title}</span>;
}

import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";

export type CourseContextLink = { label: "Vue d'ensemble" | "Apprendre" | "Prévisualiser" | "Modifier" | "Publication"; href: string };

export function courseOverviewPath(courseSlug: string) { return `/app/courses/${courseSlug}`; }

export function courseLessonPath(courseSlug: string, lessonSlug: string) { return `${courseOverviewPath(courseSlug)}/lessons/${lessonSlug}`; }

export function getCourseContextLinks(courseSlug: string, capabilities: CourseCapabilities, lessonSlug?: string, learnLessonSlug?: string): CourseContextLink[] {
  const selectedLessonPath = lessonSlug ? courseLessonPath(courseSlug, lessonSlug) : courseOverviewPath(courseSlug);
  const learnLesson = lessonSlug ?? learnLessonSlug;
  const learnLessonPath = learnLesson ? courseLessonPath(courseSlug, learnLesson) : courseOverviewPath(courseSlug);
  return [
    { label: "Vue d'ensemble", href: courseOverviewPath(courseSlug) },
    ...(capabilities.canLearn ? [{ label: "Apprendre" as const, href: learnLessonPath }] : []),
    ...(capabilities.canPreview && learnLesson ? [{ label: "Prévisualiser" as const, href: `${learnLessonPath}?mode=preview` }] : []),
    ...(capabilities.canEdit ? [{ label: "Modifier" as const, href: `${selectedLessonPath}?mode=edit` }] : []),
    ...(capabilities.canPublish ? [{ label: "Publication" as const, href: `${courseOverviewPath(courseSlug)}?mode=publication` }] : []),
  ];
}

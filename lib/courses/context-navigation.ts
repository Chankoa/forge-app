import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";

export type CourseContextLink = { label: "Vue d'ensemble" | "Apprendre" | "Modifier" | "Publication"; href: string };

export function courseOverviewPath(courseSlug: string) { return `/app/courses/${courseSlug}`; }

export function getCourseContextLinks(courseSlug: string, capabilities: CourseCapabilities, lessonSlug?: string): CourseContextLink[] {
  const lessonPath = lessonSlug ? `${courseOverviewPath(courseSlug)}/lessons/${lessonSlug}` : courseOverviewPath(courseSlug);
  return [
    { label: "Vue d'ensemble", href: courseOverviewPath(courseSlug) },
    ...(capabilities.canLearn ? [{ label: "Apprendre" as const, href: lessonPath }] : []),
    ...(capabilities.canEdit ? [{ label: "Modifier" as const, href: `${lessonPath}?mode=edit` }] : []),
    ...(capabilities.canPublish ? [{ label: "Publication" as const, href: `${courseOverviewPath(courseSlug)}?mode=publication` }] : []),
  ];
}
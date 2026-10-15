import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";

export type CourseContextLink = { label: "Vue d'ensemble" | "Gérer" | "Classroom" | "Apprendre" | "Prévisualiser" | "Modifier" | "Publication" | "Discussion"; href: string };

export function courseOverviewPath(courseSlug: string) { return `/app/courses/${courseSlug}`; }

export function courseManagePath(courseSlug: string) { return courseOverviewPath(courseSlug); }

export function courseEditPath(courseSlug: string) { return `${courseOverviewPath(courseSlug)}?mode=edit`; }

export function courseClassroomPath(courseSlug: string) { return `${courseOverviewPath(courseSlug)}/classroom`; }

export function courseDiscussionPath(courseSlug: string) { return `${courseOverviewPath(courseSlug)}/discussion`; }

export function courseClassroomLearnerPath(courseSlug: string, learnerId: string) { return `${courseClassroomPath(courseSlug)}/learners/${learnerId}`; }

export function courseLessonPath(courseSlug: string, lessonSlug: string) { return `${courseOverviewPath(courseSlug)}/lessons/${lessonSlug}`; }

export function publicationCorrectionPath(courseSlug: string, kind: "blocking" | "recommended", lessonSlug?: string) {
  const structure = `${courseOverviewPath(courseSlug)}?mode=edit#cockpit-program-title`;
  return kind === "recommended" && lessonSlug ? `${courseLessonPath(courseSlug, lessonSlug)}?mode=edit` : structure;
}

export function getCourseContextLinks(courseSlug: string, capabilities: CourseCapabilities, lessonSlug?: string, learnLessonSlug?: string): CourseContextLink[] {
  const selectedLessonPath = lessonSlug ? courseLessonPath(courseSlug, lessonSlug) : courseOverviewPath(courseSlug);
  const learnLesson = lessonSlug ?? learnLessonSlug;
  const learnLessonPath = learnLesson ? courseLessonPath(courseSlug, learnLesson) : courseOverviewPath(courseSlug);
  return [
    { label: "Vue d'ensemble", href: courseOverviewPath(courseSlug) },
    ...(capabilities.canEdit && !lessonSlug ? [{ label: "Gérer" as const, href: courseManagePath(courseSlug) }] : []),
    ...(capabilities.canViewClassroom && !lessonSlug ? [{ label: "Classroom" as const, href: courseClassroomPath(courseSlug) }] : []),
    ...(capabilities.canLearn ? [{ label: "Apprendre" as const, href: learnLessonPath }] : []),
    ...(capabilities.canPreview && learnLesson ? [{ label: "Prévisualiser" as const, href: `${learnLessonPath}?mode=preview` }] : []),
    // The Cockpit owns course-wide editing. "Modifier" remains only for the
    // focused lesson editor, so owner navigation does not suggest two global
    // authoring destinations.
    ...(capabilities.canEdit && lessonSlug ? [{ label: "Modifier" as const, href: `${selectedLessonPath}?mode=edit` }] : []),
    ...(capabilities.canPublish ? [{ label: "Publication" as const, href: `${courseOverviewPath(courseSlug)}?mode=publication` }] : []),
    ...(capabilities.canViewPrivate ? [{ label: "Discussion" as const, href: courseDiscussionPath(courseSlug) }] : []),
  ];
}

import type { CourseMembershipRole, CourseMembershipStatus } from "@/lib/capabilities/course-capabilities";

export type CourseRelation = "learn" | "create" | "edit" | "view";

export function domainLabel(domain: string | null | undefined): string {
  return domain?.trim() || "Sans domaine";
}

export function domainNameFromRelation(
  relation: { name: string } | { name: string }[] | null | undefined,
): string | null {
  return Array.isArray(relation) ? relation[0]?.name ?? null : relation?.name ?? null;
}

export function courseRelations(enrolled: boolean, isOwner: boolean, membershipRole: CourseMembershipRole | null = null, membershipStatus: CourseMembershipStatus | null = null): CourseRelation[] {
  const collaborator = !isOwner && membershipStatus === "active" ? (membershipRole === "editor" ? "edit" : membershipRole === "viewer" ? "view" : null) : null;
  return [enrolled ? "learn" : null, collaborator, isOwner ? "create" : null].filter((value): value is CourseRelation => value !== null);
}

export function matchesCourseRelation(filter: "all" | CourseRelation, enrolled: boolean, isOwner: boolean, membershipRole: CourseMembershipRole | null = null, membershipStatus: CourseMembershipStatus | null = null): boolean {
  if (filter === "all") return true;
  return courseRelations(enrolled, isOwner, membershipRole, membershipStatus).includes(filter);
}

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function hasCourseCover(value: { coverUrl?: string | null }): boolean {
  return typeof value.coverUrl === "string" && value.coverUrl.trim().length > 0;
}

export type CourseCardAction = "manage" | "start" | "continue" | "review" | "view";
export function courseCardAction({ isOwner, enrolled, percentage, hasLesson }: { isOwner: boolean; enrolled: boolean; percentage: number; hasLesson: boolean }): CourseCardAction {
  if (isOwner) return "manage";
  if (!enrolled || !hasLesson) return "view";
  if (percentage >= 100) return "review";
  return percentage > 0 ? "continue" : "start";
}

export function canShowOwnerDelete(isOwner: boolean) { return isOwner; }

export function knownCourseDuration(course: { durationMinutes?: number | null; outline: Array<{ lessons: Array<{ durationMinutes: number | null }> }> }): number | null {
  if (course.durationMinutes != null) return course.durationMinutes;
  const lessons = course.outline.flatMap((module) => module.lessons);
  return lessons.length && lessons.every((lesson) => lesson.durationMinutes != null)
    ? lessons.reduce((total, lesson) => total + (lesson.durationMinutes ?? 0), 0) : null;
}
export function personalCardActions(course: { isOwner: boolean; enrolled: boolean; percentage: number; hasLesson: boolean }): { primary: CourseCardAction; secondary: "manage" | null } {
  if (course.isOwner && course.enrolled && course.hasLesson) return { primary: courseCardAction({ ...course, isOwner: false }), secondary: "manage" };
  return { primary: courseCardAction(course), secondary: null };
}

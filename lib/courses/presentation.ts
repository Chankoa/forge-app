export type CourseRelation = "learn" | "create";

export function domainLabel(domain: string | null | undefined): string {
  return domain?.trim() || "Sans domaine";
}

export function domainNameFromRelation(
  relation: { name: string } | { name: string }[] | null | undefined,
): string | null {
  return Array.isArray(relation) ? relation[0]?.name ?? null : relation?.name ?? null;
}

export function courseRelations(enrolled: boolean, isOwner: boolean): CourseRelation[] {
  return [enrolled ? "learn" : null, isOwner ? "create" : null].filter((value): value is CourseRelation => value !== null);
}

export function matchesCourseRelation(filter: "all" | CourseRelation, enrolled: boolean, isOwner: boolean): boolean {
  if (filter === "all") return true;
  return filter === "learn" ? enrolled : isOwner;
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

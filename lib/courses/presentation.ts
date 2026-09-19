export type CourseRelation = "learn" | "create";

export function courseRelations(enrolled: boolean, isOwner: boolean): CourseRelation[] {
  return [enrolled ? "learn" : null, isOwner ? "create" : null].filter((value): value is CourseRelation => value !== null);
}

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function hasCourseCover(value: { coverUrl?: string | null }): boolean {
  return typeof value.coverUrl === "string" && value.coverUrl.trim().length > 0;
}

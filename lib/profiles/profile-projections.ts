export type ProfileCourseProjection = { course: { status: string | null; visibility: string | null; domain: string | null }; isOwner: boolean; state: { enrollment: unknown | null } };

export function profileCourseSections<T extends ProfileCourseProjection>(courses: T[]) {
  return { authored: courses.filter((item) => item.isOwner), learning: courses.filter((item) => item.state.enrollment !== null) };
}

export function publicAuthorDomains(courses: ProfileCourseProjection[]): string[] {
  return [...new Set(courses.filter((item) => item.isOwner && item.course.status === "published" && item.course.visibility === "public").map((item) => item.course.domain?.trim()).filter((domain): domain is string => Boolean(domain)))].sort((left, right) => left.localeCompare(right, "fr"));
}
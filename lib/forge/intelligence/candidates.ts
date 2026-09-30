import type { SubjectCandidate } from "./contracts";

export function selectPlausibleCandidates(intent: string, courses: SubjectCandidate[], limit = 12) {
  const words = new Set(intent.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{4,}/g) ?? []);
  const score = (course: SubjectCandidate) => {
    const title = course.title.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const other = `${course.description ?? ""} ${course.domain ?? ""} ${course.level ?? ""}`.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return [...words].reduce((n, word) => n + (title.includes(word) ? 3 : other.includes(word) ? 1 : 0), 0);
  };
  return courses.map((course) => ({ course, rank: score(course) })).filter((item) => item.rank > 0).sort((a, b) => b.rank - a.rank).slice(0, limit).map((item) => item.course);
}

export function visiblePublishedCandidates<T extends { status: string | null; visibility: string | null }>(courses: T[]) {
  return courses.filter((course) => course.status === "published" && course.visibility === "public");
}

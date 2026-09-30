import type { CourseSummary } from "./contracts";

export type DiscoverableCourse = CourseSummary & { enrolled: boolean };

export function courseLevelLabel(level: string | null | undefined): string | null {
  return level === "beginner" ? "Débutant" : level === "intermediate" ? "Intermédiaire" : level === "advanced" ? "Avancé" : null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

export function exploreDomains(courses: DiscoverableCourse[]) {
  return [...new Set(courses.map((course) => course.domain?.trim()).filter((domain): domain is string => Boolean(domain)))].sort((a, b) => a.localeCompare(b, "fr"));
}

export function selectExploreCourses(courses: DiscoverableCourse[], query: string, domain: string) {
  const term = normalize(query.trim());
  const matching = courses.filter((course) => {
    if (course.status !== "published" || (domain && course.domain !== domain)) return false;
    return !term || normalize([course.title, course.description ?? "", course.domain ?? ""].join(" ")).includes(term);
  });
  // Keep the repository's created_at order; no publication timestamp or ranking is available here.
  return { featured: matching.slice(0, 3), recent: matching.slice(3), count: matching.length };
}

import { matchesCourseRelation, type CourseRelation } from "./presentation";

export type LibraryCourse = {
  id: string; slug: string; title: string; description: string | null; domain: string | null;
  status: string | null; moduleCount: number; lessonCount: number; durationMinutes: number | null;
  lessonSlug: string | null; enrolled: boolean; isOwner: boolean; percentage: number; completedCount: number;
  collaborationRole?: "editor" | "viewer" | null; author?: { displayName: string; initials: string };
};
export type LibraryView = "list" | "cards";
export type LibrarySort = "title_asc" | "title_desc" | "progress_desc";
export type LibraryStatus = "all" | "draft" | "published" | "archived" | "not_started" | "in_progress" | "completed";

export function libraryCourseStatus(course: LibraryCourse): Exclude<LibraryStatus, "all"> | null {
  if (course.isOwner || course.collaborationRole) return course.status === "published" ? "published" : course.status === "draft" ? "draft" : course.status === "archived" ? "archived" : null;
  if (!course.enrolled) return null;
  return course.percentage >= 100 ? "completed" : course.percentage > 0 ? "in_progress" : "not_started";
}

export const libraryStatusLabels: Record<Exclude<LibraryStatus, "all">, string> = {
  draft: "Brouillon", published: "Publié", archived: "Archivé", not_started: "À commencer", in_progress: "En cours", completed: "Terminé",
};

export function filterAndSortLibraryCourses(courses: LibraryCourse[], options: { relation: "all" | CourseRelation; status: LibraryStatus; query: string; sort: LibrarySort }) {
  const query = options.query.trim().toLocaleLowerCase("fr");
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  return courses.filter((course) => matchesCourseRelation(options.relation, course.enrolled, course.isOwner, course.collaborationRole, course.collaborationRole ? "active" : null)
    && (options.status === "all" || libraryCourseStatus(course) === options.status)
    && `${course.title} ${course.description ?? ""} ${course.domain ?? ""}`.toLocaleLowerCase("fr").includes(query))
    .sort((a, b) => options.sort === "progress_desc" ? (b.enrolled ? b.percentage : -1) - (a.enrolled ? a.percentage : -1) || collator.compare(a.title, b.title)
      : options.sort === "title_desc" ? collator.compare(b.title, a.title) : collator.compare(a.title, b.title));
}

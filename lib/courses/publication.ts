import type { CourseDetail } from "./contracts";

export type PublicationReadiness = { blocking: string[]; recommended: string[]; ready: boolean };

export function getPublicationReadiness(course: CourseDetail): PublicationReadiness {
  const lessonCount = course.outline.flatMap((module) => module.lessons).length;
  const blocking = lessonCount === 0 ? ["Ajoutez au moins une leçon avant de publier."] : [];
  const recommended = course.outline.flatMap((module) => module.lessons).some((lesson) => !lesson.content?.trim()) ? ["Ajoutez du contenu aux leçons pour une meilleure première lecture."] : [];
  return { blocking, recommended, ready: blocking.length === 0 };
}
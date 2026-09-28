import type { CourseOutline } from "./contracts";

export function getLessonNavigation(outline: CourseOutline, slug: string) {
  const lessons = outline.flatMap((module) => module.lessons);
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  if (index < 0) return null;
  const lesson = lessons[index];
  const moduleIndex = outline.findIndex((module) => module.lessons.some((item) => item.id === lesson.id));
  const selectedModule = outline[moduleIndex];
  return { lesson, previous: lessons[index - 1], next: lessons[index + 1], position: index + 1, total: lessons.length, moduleTitle: selectedModule.moduleTitle, moduleNumber: moduleIndex + 1, lessonNumber: selectedModule.lessons.findIndex((item) => item.id === lesson.id) + 1 };
}

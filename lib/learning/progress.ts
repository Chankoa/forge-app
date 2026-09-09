import type { CourseOutline } from "@/lib/courses/contracts";
import type { LessonProgress } from "./contracts";

export function orderedLessons(outline: CourseOutline) {
  return outline.flatMap((module) => module.lessons);
}

export function progressPercentage(totalLessons: number, completedLessonIds: Set<string>) {
  return totalLessons === 0 ? 0 : Math.round((completedLessonIds.size / totalLessons) * 100);
}

export function resolveContinueLessonId(outline: CourseOutline, progress: LessonProgress[], currentLessonId: string | null) {
  const lessons = orderedLessons(outline);
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const completed = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));

  if (currentLessonId && lessonIds.has(currentLessonId) && !completed.has(currentLessonId)) return currentLessonId;

  const latestIncomplete = [...progress]
    .filter((item) => !item.completed && lessonIds.has(item.lessonId))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];
  if (latestIncomplete) return latestIncomplete.lessonId;

  return lessons.find((lesson) => !completed.has(lesson.id))?.id ?? lessons[0]?.id ?? null;
}
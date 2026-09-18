import type { CourseLesson } from "./contracts";

export type LessonDraft = {
  title: string;
  description: string;
  content: string;
  objectives: string;
  type: string;
  durationMinutes: string;
  publishingStatus: string;
};

export function createLessonDraft(lesson: CourseLesson): LessonDraft {
  return { title: lesson.title, description: lesson.description ?? "", content: lesson.content ?? "", objectives: lesson.objectives.join("\n"), type: lesson.contentType, durationMinutes: lesson.durationMinutes?.toString() ?? "", publishingStatus: lesson.publishingStatus };
}

export function lessonDraftFormData(draft: LessonDraft): FormData {
  const data = new FormData();
  Object.entries(draft).forEach(([key, value]) => data.set(key, value));
  return data;
}
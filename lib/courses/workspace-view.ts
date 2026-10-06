import type { CourseDetail, CourseLesson } from "./contracts";
import type { LearningState } from "@/lib/learning/contracts";
import { courseEditPath } from "./context-navigation";

export type WorkspaceCourse = { course: CourseDetail; state: LearningState; isOwner: boolean };

export function workspaceLesson(item: WorkspaceCourse): CourseLesson | undefined {
  const lessons = item.course.outline.flatMap((module) => module.lessons);
  return lessons.find((lesson) => lesson.id === item.state.continueLessonId) ?? lessons[0];
}

export function workspaceCourseAction(item: WorkspaceCourse) {
  const lesson = workspaceLesson(item);
  if (item.state.enrollment && lesson) return {
    href: `/app/courses/${item.course.slug}/lessons/${lesson.slug}`,
    label: item.state.percentage >= 100 ? "Revoir" : item.state.percentage > 0 ? "Continuer" : "Commencer",
  };
  return { href: item.isOwner ? courseEditPath(item.course.slug) : `/app/courses/${item.course.slug}`, label: item.isOwner ? "Gérer" : "Voir le parcours" };
}

export function selectWorkspaceCourses(courses: WorkspaceCourse[]) {
  const continuing = courses.find(({ state }) => state.enrollment && state.percentage > 0 && state.percentage < 100)
    ?? courses.find(({ state }) => state.enrollment && state.percentage < 100)
    ?? courses.find(({ isOwner }) => isOwner)
    ?? courses[0];
  const paths = courses.slice(0, 3);
  const learning = courses.find((item) => item.state.enrollment && item.course.id !== continuing?.course.id)
    ?? courses.find((item) => item.state.enrollment);
  const editableLesson = courses.filter((item) => item.isOwner).map((item) => ({ item, lesson: workspaceLesson(item) })).find(({ lesson }) => Boolean(lesson));
  return { continuing, paths, learning, editableLesson };
}

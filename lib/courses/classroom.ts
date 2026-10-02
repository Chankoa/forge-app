import { progressPercentage } from "@/lib/learning/progress";
import { authorInitials } from "@/lib/profiles/author-identity";
import type { CourseOutline } from "./contracts";

export type ClassroomEnrollmentRow = { user_id: string; status: string; current_lesson_id: string | null };
export type ClassroomProgressRow = { user_id: string; lesson_id: string; completed: boolean };
export type ClassroomProfileRow = { id: string; name: string | null };
export type ClassroomLearner = { id: string; displayName: string; initials: string; progress: number; completedLessons: number; totalLessons: number; currentLessonTitle: string | null; status: "not-started" | "in-progress" | "completed" };
export type ClassroomData = { totalLearners: number; averageProgress: number | null; completedLearners: number; learners: ClassroomLearner[] };
export type ClassroomLearnerDetail = ClassroomLearner & { modules: Array<{ id: string; title: string; completedLessons: number; totalLessons: number; progress: number; lessons: Array<{ id: string; title: string; durationMinutes: number | null; state: "completed" | "current" | "todo" }> }> };

function classroomStatus(value: string): ClassroomLearner["status"] { return value === "completed" || value === "in-progress" ? value : "not-started"; }

function completedLessonIds(outline: CourseOutline, progressRows: ClassroomProgressRow[], learnerId: string) {
  const lessonIds = new Set(outline.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
  return new Set(progressRows.filter((progress) => progress.user_id === learnerId && progress.completed && lessonIds.has(progress.lesson_id)).map((progress) => progress.lesson_id));
}

function classroomLearnerFromRows(outline: CourseOutline, enrollment: ClassroomEnrollmentRow, progressRows: ClassroomProgressRow[], profile: ClassroomProfileRow | undefined): ClassroomLearner {
  const lessonIds = new Set(outline.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
  const lessonTitles = new Map(outline.flatMap((module) => module.lessons.map((lesson) => [lesson.id, lesson.title])));
  const displayName = profile?.name?.trim() || "Apprenant Forge";
  const completed = completedLessonIds(outline, progressRows, enrollment.user_id);
  return { id: enrollment.user_id, displayName, initials: authorInitials(displayName), progress: progressPercentage(lessonIds.size, completed), completedLessons: completed.size, totalLessons: lessonIds.size, currentLessonTitle: enrollment.current_lesson_id ? lessonTitles.get(enrollment.current_lesson_id) ?? null : null, status: classroomStatus(enrollment.status) };
}

export function classroomDataFromRows(outline: CourseOutline, enrollments: ClassroomEnrollmentRow[], progressRows: ClassroomProgressRow[], profiles: ClassroomProfileRow[]): ClassroomData {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const learners = enrollments.map((enrollment) => classroomLearnerFromRows(outline, enrollment, progressRows, profilesById.get(enrollment.user_id))).sort((first, second) => first.progress - second.progress || first.displayName.localeCompare(second.displayName, "fr"));
  return { totalLearners: learners.length, averageProgress: learners.length ? Math.round(learners.reduce((sum, learner) => sum + learner.progress, 0) / learners.length) : null, completedLearners: learners.filter((learner) => learner.status === "completed").length, learners };
}

export function classroomLearnerDetailFromRows(outline: CourseOutline, enrollment: ClassroomEnrollmentRow, progressRows: ClassroomProgressRow[], profile?: ClassroomProfileRow): ClassroomLearnerDetail {
  const learner = classroomLearnerFromRows(outline, enrollment, progressRows, profile);
  const completed = completedLessonIds(outline, progressRows, enrollment.user_id);
  return {
    ...learner,
    modules: outline.map((module) => {
      const completedLessons = module.lessons.filter((lesson) => completed.has(lesson.id)).length;
      return {
        id: module.id,
        title: module.moduleTitle,
        completedLessons,
        totalLessons: module.lessons.length,
        progress: progressPercentage(module.lessons.length, new Set(module.lessons.filter((lesson) => completed.has(lesson.id)).map((lesson) => lesson.id))),
        lessons: module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, durationMinutes: lesson.durationMinutes, state: completed.has(lesson.id) ? "completed" as const : enrollment.current_lesson_id === lesson.id ? "current" as const : "todo" as const })),
      };
    }),
  };
}
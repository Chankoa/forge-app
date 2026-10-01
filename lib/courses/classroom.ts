import { progressPercentage } from "@/lib/learning/progress";
import { authorInitials } from "@/lib/profiles/author-identity";
import type { CourseOutline } from "./contracts";

export type ClassroomEnrollmentRow = { user_id: string; status: string; current_lesson_id: string | null };
export type ClassroomProgressRow = { user_id: string; lesson_id: string; completed: boolean };
export type ClassroomProfileRow = { id: string; name: string | null };
export type ClassroomLearner = { displayName: string; initials: string; progress: number; completedLessons: number; totalLessons: number; currentLessonTitle: string | null; status: "not-started" | "in-progress" | "completed" };
export type ClassroomData = { totalLearners: number; averageProgress: number | null; completedLearners: number; learners: ClassroomLearner[] };

function classroomStatus(value: string): ClassroomLearner["status"] { return value === "completed" || value === "in-progress" ? value : "not-started"; }

export function classroomDataFromRows(outline: CourseOutline, enrollments: ClassroomEnrollmentRow[], progressRows: ClassroomProgressRow[], profiles: ClassroomProfileRow[]): ClassroomData {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const lessonIds = new Set(outline.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
  const lessonTitles = new Map(outline.flatMap((module) => module.lessons.map((lesson) => [lesson.id, lesson.title])));
  const completedByLearner = new Map<string, Set<string>>();
  for (const progress of progressRows) {
    if (!progress.completed || !lessonIds.has(progress.lesson_id)) continue;
    const completed = completedByLearner.get(progress.user_id) ?? new Set<string>();
    completed.add(progress.lesson_id);
    completedByLearner.set(progress.user_id, completed);
  }
  const totalLessons = lessonIds.size;
  const learners = enrollments.map((enrollment) => {
    const displayName = profilesById.get(enrollment.user_id)?.name?.trim() || "Apprenant Forge";
    const completed = completedByLearner.get(enrollment.user_id) ?? new Set<string>();
    return { displayName, initials: authorInitials(displayName), progress: progressPercentage(totalLessons, completed), completedLessons: completed.size, totalLessons, currentLessonTitle: enrollment.current_lesson_id ? lessonTitles.get(enrollment.current_lesson_id) ?? null : null, status: classroomStatus(enrollment.status) };
  }).sort((first, second) => first.progress - second.progress || first.displayName.localeCompare(second.displayName, "fr"));
  return { totalLearners: learners.length, averageProgress: learners.length ? Math.round(learners.reduce((sum, learner) => sum + learner.progress, 0) / learners.length) : null, completedLearners: learners.filter((learner) => learner.status === "completed").length, learners };
}
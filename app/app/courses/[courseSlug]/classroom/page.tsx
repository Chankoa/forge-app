import { CourseClassroom } from "@/components/course/CourseClassroom";
import { CourseWorkspace } from "@/components/course/CourseWorkspace";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { getCourseClassroom } from "@/lib/courses/classroom-repository";
import { getCourseDetail, getLearningState } from "@/lib/courses/learning-repository";

export default async function CourseClassroomPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const course = await getCourseDetail(courseSlug);
  if (!course) return <p className="env-note">Parcours introuvable ou lecture Supabase indisponible.</p>;

  const [state, relationship] = await Promise.all([getLearningState(course), getAuthoringRelationship(course.id)]);
  const capabilities = resolveCourseCapabilities({ isOwner: relationship.isOwner, isEnrolled: state.enrollment !== null, courseStatus: course.status, membershipRole: relationship.membershipRole, membershipStatus: relationship.membershipStatus });
  if (!capabilities.canViewClassroom) return <p className="env-note">Le Classroom est réservé au propriétaire du parcours.</p>;

  const classroom = await getCourseClassroom(course);
  const outline = course.outline.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => ({ ...lesson, status: state.completedLessonIds.has(lesson.id) ? "completed" as const : state.continueLessonId === lesson.id ? "in-progress" as const : "not-started" as const })) }));

  return <CourseWorkspace course={course} mode="classroom" capabilities={capabilities} outline={outline} forgeContext={{ mode: "learn", courseTitle: course.title }} content={classroom ? <CourseClassroom data={classroom} archived={course.status === "archived"} /> : <p className="env-note">Le Classroom est momentanément indisponible.</p>} />;
}
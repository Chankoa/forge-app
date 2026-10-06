import { LearnerProgressDetail } from "@/components/course/LearnerProgressDetail";
import { CourseWorkspace } from "@/components/course/CourseWorkspace";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { getCourseClassroomLearnerDetail } from "@/lib/courses/classroom-repository";
import { getCourseDetail, getLearningState } from "@/lib/courses/learning-repository";

export default async function ClassroomLearnerPage({ params }: { params: Promise<{ courseSlug: string; learnerId: string }> }) {
  const { courseSlug, learnerId } = await params;
  const course = await getCourseDetail(courseSlug);
  if (!course) return <p className="env-note">Ce parcours est introuvable ou momentanément indisponible.</p>;
  const [state, relationship] = await Promise.all([getLearningState(course), getAuthoringRelationship(course.id)]);
  const capabilities = resolveCourseCapabilities({ isOwner: relationship.isOwner, isEnrolled: state.enrollment !== null, courseStatus: course.status, membershipRole: relationship.membershipRole, membershipStatus: relationship.membershipStatus });
  if (!capabilities.canViewClassroom) return <p className="env-note">Le suivi des apprenants est réservé au propriétaire du parcours.</p>;

  const detail = await getCourseClassroomLearnerDetail(course, learnerId);
  if (!detail) return <p className="env-note">Cet apprenant n&apos;est pas inscrit à ce parcours ou son suivi est momentanément indisponible.</p>;
  const outline = course.outline.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => ({ ...lesson, status: "not-started" as const })) }));
  return <CourseWorkspace course={course} mode="classroom" capabilities={capabilities} outline={outline} forgeContext={{ mode: "learn", courseTitle: course.title }} content={<LearnerProgressDetail courseSlug={course.slug} detail={detail} archived={course.status === "archived"} />} />;
}
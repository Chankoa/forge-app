import { notFound } from "next/navigation";
import { CourseDiscussion } from "@/components/course/CourseDiscussion";
import { CourseWorkspace } from "@/components/course/CourseWorkspace";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { getCourseDiscussionAccess, listCourseDiscussion } from "@/lib/courses/discussion-repository";
import { getCourseDetail, getLearningState } from "@/lib/courses/learning-repository";
import type { DiscussionContext } from "@/lib/courses/discussion";

function requestedContext(value: { context?: string; module?: string; lesson?: string }, outline: Array<{ id: string; lessons: Array<{ id: string }> }>): DiscussionContext {
  if (value.context === "module" && value.module && outline.some((module) => module.id === value.module)) return { type: "module", moduleId: value.module, lessonId: null };
  if (value.context === "lesson" && value.lesson && outline.some((module) => module.lessons.some((lesson) => lesson.id === value.lesson))) return { type: "lesson", moduleId: null, lessonId: value.lesson };
  return { type: "course", moduleId: null, lessonId: null };
}

export default async function CourseDiscussionPage({ params, searchParams }: { params: Promise<{ courseSlug: string }>; searchParams: Promise<{ context?: string; module?: string; lesson?: string }> }) {
  const { courseSlug } = await params;
  const query = await searchParams;
  const course = await getCourseDetail(courseSlug);
  if (!course) notFound();
  const [state, relationship, access, discussion] = await Promise.all([
    getLearningState(course),
    getAuthoringRelationship(course.id),
    getCourseDiscussionAccess(course.id),
    listCourseDiscussion(course.id),
  ]);
  if (!access.canRead || !discussion.available) notFound();
  const capabilities = resolveCourseCapabilities({
    isOwner: relationship.isOwner,
    isEnrolled: state.enrollment !== null,
    courseStatus: course.status,
    membershipRole: relationship.membershipRole,
    membershipStatus: relationship.membershipStatus,
  });
  const outline = course.outline.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => ({ ...lesson, status: "not-started" as const })) }));
  const discussionOutline = outline.map((module) => ({ id: module.id, moduleTitle: module.moduleTitle, lessons: module.lessons.map((lesson) => ({ id: lesson.id, slug: lesson.slug, title: lesson.title })) }));
  return <CourseWorkspace
    course={course}
    mode="discussion"
    capabilities={capabilities}
    outline={outline}
    forgeContext={{ mode: "edit", courseTitle: course.title }}
    content={<CourseDiscussion courseId={course.id} courseSlug={course.slug} courseTitle={course.title} messages={discussion.messages} access={access} outline={discussionOutline} initialContext={requestedContext(query, discussionOutline)} />}
  />;
}

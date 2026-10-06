import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import type { CourseSummary } from "@/lib/courses/contracts";
import { courseRelations } from "@/lib/courses/presentation";
import { Badge } from "@/components/ui/Badge";
import { DomainMetadata } from "./DomainMetadata";
import { RelationPills } from "./CoursePresentation";
import { AuthorAttribution } from "./AuthorAttribution";
import { CourseRemixButton } from "./CourseRemixButton";
import { canOfferOwnerCourseRemix } from "@/lib/courses/remix";

export function CourseIdentityHeader({ course, capabilities, overview }: { course: CourseSummary; capabilities: CourseCapabilities; overview: boolean }) {
  const statusLabel = course.status === "published" ? "Publié" : course.status === "archived" ? "Archivé" : "Brouillon";
  return <>
    <DomainMetadata domain={course.domain} />
    <div className="course-context__title-row"><h1>{course.title}</h1><Badge success={course.status === "published"}>{statusLabel}</Badge>{overview && canOfferOwnerCourseRemix({ isAuthenticated: true, isOwner: capabilities.canArchive, status: course.status, visibility: null }) && <CourseRemixButton courseId={course.id} compact />}</div>
    {!capabilities.canManageSources && <AuthorAttribution author={course.author} />}
    {overview && course.description && <p className="course-context__description">{course.description}</p>}
    <RelationPills relations={courseRelations(capabilities.canLearn, capabilities.canManageSources, capabilities.membershipRole, capabilities.membershipStatus)} />
  </>;
}

import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import type { CourseSummary } from "@/lib/courses/contracts";
import { courseRelationshipMarker } from "@/lib/courses/presentation";
import { Badge } from "@/components/ui/Badge";
import { DomainMetadata } from "./DomainMetadata";
import { AuthorAttribution } from "./AuthorAttribution";
import { CourseRemixButton } from "./CourseRemixButton";
import { canOfferOwnerCourseRemix } from "@/lib/courses/remix";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { CourseShareButton } from "./CourseShareButton";
import { publicCourseSharePath } from "@/lib/courses/course-management";

export function CourseIdentityHeader({ course, capabilities, overview }: { course: CourseSummary & { visibility?: string | null }; capabilities: CourseCapabilities; overview: boolean }) {
  const statusLabel = course.status === "published" ? "Publié" : course.status === "archived" ? "Archivé" : "Brouillon";
  const relationshipMarker = courseRelationshipMarker(capabilities.canLearn, capabilities.canViewClassroom, capabilities.membershipRole, capabilities.membershipStatus);
  return <>
    <DomainMetadata domain={course.domain} />
    <div className="course-context__title-row"><h1>{course.title}</h1><Badge success={course.status === "published"}>{statusLabel}</Badge>{overview && canOfferOwnerCourseRemix({ isAuthenticated: true, isOwner: capabilities.canViewClassroom, status: course.status, visibility: null }) && <CourseRemixButton courseId={course.id} compact />}{overview && capabilities.canViewClassroom && <CourseShareButton sharePath={publicCourseSharePath(course)} publicationHref={`/app/courses/${course.slug}?mode=publication`} />}</div>
    {overview && course.description && <p className="course-context__description">{course.description}</p>}
    {capabilities.canEdit && !capabilities.canViewClassroom && <p className="course-context__owner-action"><ProfileAvatar name={course.author?.displayName ?? course.owner?.displayName} url={course.author?.avatarUrl} size="sm" />Vous modifiez le parcours de {course.owner?.displayName ?? course.author?.displayName ?? "Propriétaire non renseigné"}</p>}
    {!capabilities.canEdit && capabilities.membershipStatus === "active" && capabilities.membershipRole === "viewer" && <p className="course-context__owner-action"><ProfileAvatar name={course.author?.displayName ?? course.owner?.displayName} url={course.author?.avatarUrl} size="sm" />Vous consultez le parcours de {course.owner?.displayName ?? course.author?.displayName ?? "Propriétaire non renseigné"}</p>}
    {(capabilities.canViewClassroom || (!capabilities.canEdit && !(capabilities.membershipStatus === "active" && capabilities.membershipRole === "viewer"))) && <AuthorAttribution author={course.author} />}
    {relationshipMarker && <p className="course-context__relationship">{relationshipMarker}</p>}
  </>;
}

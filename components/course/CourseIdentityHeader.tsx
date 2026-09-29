import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import type { CourseSummary } from "@/lib/courses/contracts";
import { courseRelations } from "@/lib/courses/presentation";
import { Badge } from "@/components/ui/Badge";
import { DomainMetadata } from "./DomainMetadata";
import { RelationPills } from "./CoursePresentation";

export function CourseIdentityHeader({ course, capabilities, overview }: { course: CourseSummary; capabilities: CourseCapabilities; overview: boolean }) {
  return <>
    <DomainMetadata domain={course.domain} />
    <div className="course-context__title-row"><h1>{course.title}</h1><Badge success={course.status === "published"}>{course.status === "published" ? "Publié" : "Brouillon"}</Badge></div>
    {overview && course.description && <p className="course-context__description">{course.description}</p>}
    <RelationPills relations={courseRelations(capabilities.canLearn, capabilities.canEdit)} />
  </>;
}

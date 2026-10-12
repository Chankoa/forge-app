import Link from "next/link";
import type { CourseProvenance as CourseProvenanceData } from "@/lib/courses/provenance-repository";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

export function CourseProvenance({ provenance }: { provenance: CourseProvenanceData | null | undefined }) {
  if (!provenance) return null;
  const source = provenance.sourceHref ? <Link href={provenance.sourceHref}>« {provenance.sourceCourseTitle} »</Link> : <>« {provenance.sourceCourseTitle} »</>;
  return <p className="course-provenance">Adapté de {source}{provenance.sourceAuthorName ? <> par <span className="course-provenance__author"><ProfileAvatar name={provenance.sourceAuthorName} url={provenance.sourceAuthor?.avatarUrl} size="sm" />{provenance.sourceAuthorName}</span></> : null}</p>;
}
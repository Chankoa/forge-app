import Link from "next/link";
import type { CourseProvenance as CourseProvenanceData } from "@/lib/courses/provenance-repository";

export function CourseProvenance({ provenance }: { provenance: CourseProvenanceData | null | undefined }) {
  if (!provenance) return null;
  const source = provenance.sourceHref ? <Link href={provenance.sourceHref}>« {provenance.sourceCourseTitle} »</Link> : <>« {provenance.sourceCourseTitle} »</>;
  return <p className="course-provenance">Adapté de {source}{provenance.sourceAuthorName ? <> par {provenance.sourceAuthorName}</> : null}</p>;
}
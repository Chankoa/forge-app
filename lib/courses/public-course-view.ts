import { domainNameFromRelation } from "./presentation";
import type { PublicCourseDetail } from "./public-course-repository";

export type PublicCourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string | null;
  visibility: string | null;
  duration_minutes: number | null;
  level: string | null;
  domains: { name: string } | { name: string }[] | null;
};

export function mapPublicCourseDetail(row: PublicCourseRow): Omit<PublicCourseDetail, "author" | "provenance"> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    domain: domainNameFromRelation(row.domains),
    durationMinutes: row.duration_minutes,
    level: row.level,
  };
}
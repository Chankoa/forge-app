import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicCourseAuthor } from "@/lib/profiles/public-author-repository";
import { getCourseProvenance, type CourseProvenance } from "./provenance-repository";
import type { PublicAuthorIdentity } from "@/lib/profiles/author-identity";
import { mapPublicCourseDetail, type PublicCourseRow } from "./public-course-view";

export type PublicCourseDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  domain: string | null;
  durationMinutes: number | null;
  level: string | null;
  author?: PublicAuthorIdentity;
  provenance: CourseProvenance | null;
};

export async function getPublicCourseDetail(courseSlug: string): Promise<PublicCourseDetail | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("courses")
    .select("id,slug,title,subtitle,description,status,visibility,duration_minutes,level,domains(name)")
    .eq("slug", courseSlug)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();
  if (error || !data) return null;
  const course = data as PublicCourseRow;
  const [author, provenance] = await Promise.all([
    getPublicCourseAuthor(client, course),
    getCourseProvenance(course.id, { publicPath: true }),
  ]);
  return { ...mapPublicCourseDetail(course), ...(author ? { author } : {}), provenance };
}
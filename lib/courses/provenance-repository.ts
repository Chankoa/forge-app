import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CourseProvenance = {
  sourceCourseTitle: string;
  sourceAuthorName: string | null;
  remixedAt: string;
  sourceHref: string | null;
};

type ProvenanceRow = {
  remixed_from_course_id: string | null;
  source_course_title: string;
  source_author_name: string | null;
  remixed_at: string;
};

export async function getCourseProvenance(courseId: string): Promise<CourseProvenance | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("course_provenance").select("remixed_from_course_id,source_course_title,source_author_name,remixed_at").eq("course_id", courseId).maybeSingle();
  const provenance = data as ProvenanceRow | null;
  if (error || !provenance) return null;

  let sourceHref: string | null = null;
  if (provenance.remixed_from_course_id) {
    const { data: source } = await client.from("courses").select("slug,status,visibility").eq("id", provenance.remixed_from_course_id).maybeSingle();
    if (source?.status === "published" && source.visibility === "public") sourceHref = `/app/courses/${source.slug}`;
  }

  return {
    sourceCourseTitle: provenance.source_course_title,
    sourceAuthorName: provenance.source_author_name,
    remixedAt: provenance.remixed_at,
    sourceHref,
  };
}
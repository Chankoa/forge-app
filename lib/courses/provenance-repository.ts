import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCourseOwnerIdentity, getPublicCourseAuthor } from "@/lib/profiles/public-author-repository";
import type { PublicAuthorIdentity } from "@/lib/profiles/author-identity";

export type CourseProvenance = {
  sourceCourseTitle: string;
  sourceAuthorName: string | null;
  sourceAuthor?: PublicAuthorIdentity | null;
  remixedAt: string;
  sourceHref: string | null;
};

type ProvenanceRow = {
  remixed_from_course_id: string | null;
  source_course_title: string;
  source_author_name: string | null;
  remixed_at: string;
};

export async function getCourseProvenance(courseId: string, options: { publicPath?: boolean } = {}): Promise<CourseProvenance | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("course_provenance").select("remixed_from_course_id,source_course_title,source_author_name,remixed_at").eq("course_id", courseId).maybeSingle();
  const provenance = data as ProvenanceRow | null;
  if (error || !provenance) return null;

  let sourceHref: string | null = null;
  let sourceAuthor: PublicAuthorIdentity | null = null;
  if (provenance.remixed_from_course_id) {
    const { data: source } = await client.from("courses").select("slug,status,visibility").eq("id", provenance.remixed_from_course_id).maybeSingle();
    if (source?.status === "published" && source.visibility === "public") {
      sourceHref = `${options.publicPath ? "/courses" : "/app/courses"}/${source.slug}`;
      sourceAuthor = await getPublicCourseAuthor(client, { id: provenance.remixed_from_course_id, status: source.status, visibility: source.visibility });
    } else {
      sourceAuthor = await getCourseOwnerIdentity(client, provenance.remixed_from_course_id);
    }
  }

  return {
    sourceCourseTitle: provenance.source_course_title,
    sourceAuthorName: provenance.source_author_name,
    sourceAuthor,
    remixedAt: provenance.remixed_at,
    sourceHref,
  };
}
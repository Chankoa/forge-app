import type { SupabaseClient } from "@supabase/supabase-js";
import { courseCoverBucket, courseCoverPresentation, type CoverPresentation } from "./cover-contracts";

type CourseCoverRow = {
  id: string;
  cover_image: string | null;
  cover_storage_path: string | null;
  cover_mime_type: string | null;
  cover_file_size: number | null;
};

export async function resolveCourseCovers(client: SupabaseClient, courseIds: readonly string[]): Promise<Record<string, CoverPresentation>> {
  const ids = [...new Set(courseIds)];
  if (!ids.length) return {};

  const { data, error } = await client
    .from("courses")
    .select("id,cover_image,cover_storage_path,cover_mime_type,cover_file_size")
    .in("id", ids);
  if (error || !data?.length) return {};

  const covers: Record<string, CoverPresentation> = {};
  for (const row of data as CourseCoverRow[]) {
    const cover = courseCoverPresentation(row, (path) => client.storage.from(courseCoverBucket).getPublicUrl(path).data.publicUrl);
    if (cover) covers[row.id] = cover;
  }
  return covers;
}

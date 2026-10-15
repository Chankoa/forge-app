import type { CourseSummary } from "./contracts";
import { courseCoverBucket, courseCoverPresentation } from "./cover-contracts";
import { domainNameFromRelation } from "./presentation";
import { publicAuthorIdentity } from "@/lib/profiles/author-identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicDiscoverableCourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  duration_minutes: number | null;
  level: string | null;
  domain_name: string | null;
  cover_image: string | null;
  cover_storage_path: string | null;
  cover_mime_type: string | null;
  cover_file_size: number | null;
  author_profile_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
};

type LegacyExploreCourseRow = Pick<CourseSummary, "id" | "slug" | "title" | "status" | "description" | "level"> & {
  duration_minutes: number | null;
  domains: { name: string } | { name: string }[] | null;
};

// Keeps legacy callers and fixtures compatible while discovery uses the narrow RPC below.
export function mapExploreCourse(row: LegacyExploreCourseRow): CourseSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    description: row.description,
    domain: domainNameFromRelation(row.domains),
    durationMinutes: row.duration_minutes,
    level: row.level,
  };
}

export function mapPublicDiscoverableCourse(row: PublicDiscoverableCourseRow, publicStorageUrl: (path: string) => string): CourseSummary {
  const author = row.author_profile_id
    ? publicAuthorIdentity({ profile_id: row.author_profile_id, name: row.author_name, avatar_url: row.author_avatar_url })
    : { displayName: "Propriétaire non renseigné", initials: "?", avatarUrl: null };
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    domain: row.domain_name,
    durationMinutes: row.duration_minutes,
    level: row.level,
    author,
    cover: courseCoverPresentation(row, publicStorageUrl),
  };
}

export async function listDiscoverableCourses(): Promise<{ courses: Array<CourseSummary & { enrolled: boolean; isOwner: boolean }>; envRequired: boolean; unavailable: boolean }> {
	const client = await createServerSupabaseClient();

	if (!client) return { courses: [], envRequired: true, unavailable: false };

	const { data, error } = await client.rpc("list_public_discoverable_courses");

	if (error) return { courses: [], envRequired: false, unavailable: true };

	const withCovers = (data as PublicDiscoverableCourseRow[] ?? []).map((row) => mapPublicDiscoverableCourse(
		row,
		(path) => client.storage.from(courseCoverBucket).getPublicUrl(path).data.publicUrl,
	));
	const { data: { user } } = await client.auth.getUser();
	if (!user || withCovers.length === 0) return { courses: withCovers.map((course) => ({ ...course, enrolled: false, isOwner: false })), envRequired: false, unavailable: false };
	const ownerCourseIds = new Set((data as PublicDiscoverableCourseRow[] ?? []).filter((row) => row.author_profile_id === user.id).map((row) => row.id));
	const { data: enrollments } = await client.from("enrollments").select("course_id").eq("user_id", user.id).in("course_id", withCovers.map((course) => course.id));
	const enrolledIds = new Set((enrollments ?? []).map((enrollment: { course_id: string }) => enrollment.course_id));
	return { courses: withCovers.map((course) => ({ ...course, enrolled: enrolledIds.has(course.id), isOwner: ownerCourseIds.has(course.id) })), envRequired: false, unavailable: false };
}

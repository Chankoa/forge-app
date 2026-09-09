import type { CourseSummary } from "./contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
type ExploreCourseRow = Pick<CourseSummary, "id" | "slug" | "title" | "status">;

export function mapExploreCourse(row: ExploreCourseRow): CourseSummary {
	return { ...row, description: null, domain: null };
}

export async function listDiscoverableCourses(): Promise<{ courses: CourseSummary[]; envRequired: boolean; unavailable: boolean }> {
	const client = await createServerSupabaseClient();

	if (!client) return { courses: [], envRequired: true, unavailable: false };

	const { data, error } = await client
		.from("courses")
		.select("id, slug, title, status")
		.eq("status", "published")
		.order("created_at", { ascending: false });

	if (error) return { courses: [], envRequired: false, unavailable: true };

	return { courses: (data ?? []).map(mapExploreCourse), envRequired: false, unavailable: false };
}
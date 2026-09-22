import type { CourseSummary } from "./contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
type ExploreCourseRow = Pick<CourseSummary, "id" | "slug" | "title" | "status" | "description"> & { duration_minutes: number | null; domains: { name: string }[] | null };

export function mapExploreCourse(row: ExploreCourseRow): CourseSummary {
	return { id: row.id, slug: row.slug, title: row.title, status: row.status, description: row.description, domain: row.domains?.[0]?.name ?? null, durationMinutes: row.duration_minutes };
}

export async function listDiscoverableCourses(): Promise<{ courses: Array<CourseSummary & { enrolled: boolean }>; envRequired: boolean; unavailable: boolean }> {
	const client = await createServerSupabaseClient();

	if (!client) return { courses: [], envRequired: true, unavailable: false };

	const { data, error } = await client
		.from("courses")
		.select("id, slug, title, status, description, duration_minutes, domains(name)")
		.eq("status", "published")
		.eq("visibility", "public")
		.order("created_at", { ascending: false });

	if (error) return { courses: [], envRequired: false, unavailable: true };

	const courses = (data ?? []).map((row) => mapExploreCourse(row as ExploreCourseRow));
	const { data: { user } } = await client.auth.getUser();
	if (!user || courses.length === 0) return { courses: courses.map((course) => ({ ...course, enrolled: false })), envRequired: false, unavailable: false };
	const { data: enrollments } = await client.from("enrollments").select("course_id").in("course_id", courses.map((course) => course.id));
	const enrolledIds = new Set((enrollments ?? []).map((enrollment: { course_id: string }) => enrollment.course_id));
	return { courses: courses.map((course) => ({ ...course, enrolled: enrolledIds.has(course.id) })), envRequired: false, unavailable: false };
}
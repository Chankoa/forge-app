import type { CourseSummary } from "./contracts";
import { domainNameFromRelation } from "./presentation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicCourseAuthor } from "@/lib/profiles/public-author-repository";
type ExploreCourseRow = Pick<CourseSummary, "id" | "slug" | "title" | "status" | "description" | "level"> & { duration_minutes: number | null; domains: { name: string } | { name: string }[] | null };

export function mapExploreCourse(row: ExploreCourseRow): CourseSummary {
	return { id: row.id, slug: row.slug, title: row.title, status: row.status, description: row.description, domain: domainNameFromRelation(row.domains), durationMinutes: row.duration_minutes, level: row.level };
}

export async function listDiscoverableCourses(): Promise<{ courses: Array<CourseSummary & { enrolled: boolean }>; envRequired: boolean; unavailable: boolean }> {
	const client = await createServerSupabaseClient();

	if (!client) return { courses: [], envRequired: true, unavailable: false };

	const { data, error } = await client
		.from("courses")
		.select("id, slug, title, status, description, duration_minutes, level, domains(name)")
		.eq("status", "published")
		.eq("visibility", "public")
		.order("created_at", { ascending: false });

	if (error) return { courses: [], envRequired: false, unavailable: true };

	const courses = await Promise.all((data ?? []).map(async (row) => {
		const course = mapExploreCourse(row as ExploreCourseRow);
		const author = await getPublicCourseAuthor(client, { id: course.id, status: course.status, visibility: "public" });
		return author ? { ...course, author } : course;
	}));
	const { data: { user } } = await client.auth.getUser();
	if (!user || courses.length === 0) return { courses: courses.map((course) => ({ ...course, enrolled: false })), envRequired: false, unavailable: false };
	const { data: enrollments } = await client.from("enrollments").select("course_id").in("course_id", courses.map((course) => course.id));
	const enrolledIds = new Set((enrollments ?? []).map((enrollment: { course_id: string }) => enrollment.course_id));
	return { courses: courses.map((course) => ({ ...course, enrolled: enrolledIds.has(course.id) })), envRequired: false, unavailable: false };
}

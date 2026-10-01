import type { PublicAuthorIdentity } from "@/lib/profiles/author-identity";

export type CourseSummary = { id: string; slug: string; title: string; description: string | null; domain: string | null; status: string | null; author?: PublicAuthorIdentity; collaborationRequestsEnabled?: boolean; lessonCount?: number; durationMinutes?: number | null; level?: string | null; };
export type CourseLesson = { id: string; slug: string; title: string; description: string | null; content: string | null; objectives: string[]; durationMinutes: number | null; contentType: string; publishingStatus: string; status: "not-started" | "in-progress" | "completed"; };
export type CourseOutline = { id: string; moduleTitle: string; lessons: CourseLesson[] }[];
export type CourseDetail = CourseSummary & { domainId: string | null; subtitle: string | null; visibility: string | null; outline: CourseOutline; };

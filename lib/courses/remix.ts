export type CourseRemixDestination = { id: string; slug: string };
export type CourseRemixOffer = { isAuthenticated: boolean; isOwner: boolean; status: string | null; visibility: string | null };

type CourseRemixRpcClient = {
  rpc: (functionName: "create_course_remix", args: { source_course_id: string }) => PromiseLike<{
    data: CourseRemixDestination | CourseRemixDestination[] | null;
    error: { code?: string | null; message?: string | null } | null;
  }>;
};

const remixErrorMessages: Record<string, string> = {
  AUTH_REQUIRED: "Connectez-vous pour remixer ce parcours.",
  ACTIVE_ACCOUNT_REQUIRED: "Votre compte ne permet pas encore de créer un remix.",
  SOURCE_COURSE_NOT_FOUND: "Ce parcours ne peut pas être remixé.",
  SOURCE_COURSE_NOT_ELIGIBLE: "Ce parcours ne peut pas être remixé.",
  SOURCE_AUTHOR_UNAVAILABLE: "Impossible de créer le remix pour le moment.",
  REMIX_SLUG_EXHAUSTED: "Impossible de créer le remix pour le moment.",
  REMIX_LESSON_SLUG_EXHAUSTED: "Impossible de créer le remix pour le moment.",
};

export class CourseRemixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseRemixError";
  }
}

function courseRemixDestination(data: CourseRemixDestination | CourseRemixDestination[] | null): CourseRemixDestination | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value.id === "string" && typeof value.slug === "string" ? value : null;
}

export async function requestCourseRemix(client: CourseRemixRpcClient, sourceCourseId: string): Promise<CourseRemixDestination> {
  const { data, error } = await client.rpc("create_course_remix", { source_course_id: sourceCourseId });
  if (error) {
    const message = remixErrorMessages[error.code ?? ""] ?? remixErrorMessages[error.message ?? ""] ?? "Impossible de créer le remix pour le moment.";
    throw new CourseRemixError(message);
  }
  const destination = courseRemixDestination(data);
  if (!destination) throw new CourseRemixError("Impossible de créer le remix pour le moment.");
  return destination;
}

export function canOfferPublicCourseRemix(course: CourseRemixOffer): boolean {
  return course.isAuthenticated && !course.isOwner && course.status === "published" && course.visibility === "public";
}

export function canOfferOwnerCourseRemix(course: CourseRemixOffer): boolean {
  return course.isOwner && (course.status === "draft" || course.status === "published");
}

export function courseRemixCockpitPath(slug: string): string {
  return `/app/courses/${slug}`;
}
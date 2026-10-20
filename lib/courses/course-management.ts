export type CourseDeletionBlocker = "not-owner" | "not-draft" | "enrollments" | "storage-dependencies" | "unavailable";

export type CourseDeletionEligibility = {
  allowed: boolean;
  blocker?: CourseDeletionBlocker;
  enrollmentCount: number;
  storageDependencyCount: number;
};

export function evaluateCourseDeletionEligibility(input: {
  isOwner: boolean;
  status: string | null | undefined;
  enrollmentCount: number;
  storageDependencyCount: number;
}): CourseDeletionEligibility {
  if (!input.isOwner) return { allowed: false, blocker: "not-owner", enrollmentCount: input.enrollmentCount, storageDependencyCount: input.storageDependencyCount };
  if (input.status !== "draft") return { allowed: false, blocker: "not-draft", enrollmentCount: input.enrollmentCount, storageDependencyCount: input.storageDependencyCount };
  if (input.enrollmentCount > 0) return { allowed: false, blocker: "enrollments", enrollmentCount: input.enrollmentCount, storageDependencyCount: input.storageDependencyCount };
  if (input.storageDependencyCount > 0) return { allowed: false, blocker: "storage-dependencies", enrollmentCount: input.enrollmentCount, storageDependencyCount: input.storageDependencyCount };
  return { allowed: true, enrollmentCount: 0, storageDependencyCount: 0 };
}

export function courseDeletionBlockerMessage(blocker: CourseDeletionBlocker | undefined) {
  switch (blocker) {
    case "enrollments": return "Ce parcours contient des inscriptions et ne peut pas être supprimé.";
    case "storage-dependencies": return "Ce brouillon contient encore des fichiers. Archivez-le ou supprimez d’abord ses ressources avant de le supprimer définitivement.";
    case "not-draft": return "Seuls les brouillons peuvent être supprimés. Utilisez l’archivage pour ce parcours.";
    default: return "Ce parcours ne peut plus être supprimé.";
  }
}

export function publicCourseSharePath(course: { slug: string; status: string | null | undefined; visibility?: string | null | undefined }) {
  return course.status === "published" && course.visibility === "public" ? `/courses/${course.slug}` : null;
}

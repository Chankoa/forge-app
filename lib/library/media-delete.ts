import { resourceIdsInRichContent } from "@/lib/courses/lesson-rich-content";
import { libraryMessages } from "./library-items";

export type LibraryMediaDeleteResult =
  | { ok: true }
  | { ok: false; code: "unauthenticated" | "not_found" | "forbidden" | "referenced" | "check_failed" | "db_delete_failed" | "storage_delete_failed"; error: string };

export const libraryDeleteMessages = {
  unauthenticated: "Connectez-vous pour supprimer ce média.",
  not_found: "Ce média est introuvable.",
  forbidden: "Seul le propriétaire du parcours peut supprimer un média.",
  referenced: libraryMessages.referencedBlocked,
  check_failed: "Les références du média n’ont pas pu être vérifiées. Rien n’a été supprimé.",
  db_delete_failed: "Le média n’a pas pu être supprimé.",
  storage_delete_failed: "Le média a été retiré de la bibliothèque, mais son fichier n’a pas pu être nettoyé.",
} as const;

export type LibraryMediaDeleteDeps = {
  getUserId: () => Promise<string | null>;
  getMedia: (id: string) => Promise<{ id: string; course_id: string; storage_path: string | null; storage_bucket: string | null } | null>;
  getCourseOwner: (courseId: string) => Promise<string | null>;
  listLessonContents: (courseId: string) => Promise<{ content: string | null }[] | null>;
  deleteRow: (courseId: string, id: string) => Promise<boolean>;
  removeFile: (path: string) => Promise<boolean>;
};

const fail = (code: keyof typeof libraryDeleteMessages): LibraryMediaDeleteResult => ({ ok: false, code, error: libraryDeleteMessages[code] });

// Course and storage path come from the DB row, never from the client. References are re-resolved at delete time.
export async function deleteLibraryMedia(deps: LibraryMediaDeleteDeps, input: { mediaId: string }): Promise<LibraryMediaDeleteResult> {
  const userId = await deps.getUserId();
  if (!userId) return fail("unauthenticated");
  const media = await deps.getMedia(input.mediaId);
  if (!media) return fail("not_found");
  if ((await deps.getCourseOwner(media.course_id)) !== userId) return fail("forbidden");
  const lessons = await deps.listLessonContents(media.course_id);
  if (!lessons) return fail("check_failed");
  if (lessons.some((lesson) => resourceIdsInRichContent(lesson.content ?? "").includes(media.id))) return fail("referenced");
  if (!(await deps.deleteRow(media.course_id, media.id))) return fail("db_delete_failed");
  if (media.storage_path && media.storage_bucket === "course-media" && !(await deps.removeFile(media.storage_path))) return fail("storage_delete_failed");
  return { ok: true };
}

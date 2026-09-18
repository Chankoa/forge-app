export type SourceUploadFailureCode = "storage_bucket_missing" | "storage_forbidden" | "storage_upload_failed" | "source_insert_failed" | "invalid_text_file" | "unsupported_type" | "file_too_large" | "unknown";

type SupabaseError = { message?: unknown; statusCode?: unknown; status?: unknown };

export function normalizeTextFile(name: string) {
  const extension = name.toLowerCase().match(/\.(txt|md)$/)?.[1];
  if (!extension) return { ok: false as const, code: "unsupported_type" as const };
  return { ok: true as const, mimeType: extension === "md" ? "text/markdown" : "text/plain" };
}

export function classifyStorageUploadError(error: unknown): SourceUploadFailureCode {
  const value = (error ?? {}) as SupabaseError;
  const status = Number(value.statusCode ?? value.status);
  const message = String(value.message ?? "").toLowerCase();
  if (status === 401 || status === 403 || /not authorized|permission denied|row-level security|forbidden/.test(message)) return "storage_forbidden";
  if (status === 404 || /bucket.*not found|bucket.*does not exist/.test(message)) return "storage_bucket_missing";
  return "storage_upload_failed";
}

export function sourceUploadMessage(code: SourceUploadFailureCode) {
  return { storage_bucket_missing: "Le stockage des sources n'est pas configuré.", storage_forbidden: "Vous n'avez pas l'autorisation d'ajouter cette source.", storage_upload_failed: "Le fichier n'a pas pu être enregistré.", source_insert_failed: "Le fichier a été envoyé mais la source n'a pas pu être enregistrée.", invalid_text_file: "Le fichier TXT/MD n'a pas pu être lu comme texte.", unsupported_type: "Ce format n'est pas pris en charge.", file_too_large: "Le fichier dépasse la taille maximale de 10 Mo.", unknown: "La source n'a pas pu être ajoutée." }[code];
}

export function safeUploadDiagnostic(step: string, error: unknown, bucket: string, path: string, authenticated: boolean, owner: boolean) {
  const value = (error ?? {}) as SupabaseError;
  return { step, code: classifyStorageUploadError(error), status: Number(value.statusCode ?? value.status) || undefined, message: String(value.message ?? "Erreur inconnue").slice(0, 300), bucket, path, authenticated, owner };
}
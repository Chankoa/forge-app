import assert from "node:assert/strict";
import test from "node:test";
import { classifyStorageUploadError, normalizeTextFile, safeUploadDiagnostic, sourceUploadMessage } from "../lib/forge/source-upload";

test("TXT and MD MIME types are derived exclusively from their validated extensions", () => {
  assert.deepEqual(normalizeTextFile("test.txt"), { ok: true, mimeType: "text/plain" });
  assert.deepEqual(normalizeTextFile("test-forge.txt"), { ok: true, mimeType: "text/plain" });
  assert.deepEqual(normalizeTextFile("test-forge.md"), { ok: true, mimeType: "text/markdown" });
  assert.deepEqual(normalizeTextFile("malware.exe"), { ok: false, code: "unsupported_type" });
  assert.deepEqual(normalizeTextFile("fake.pdf"), { ok: false, code: "unsupported_type" });
});

test("Storage errors map to safe user-facing failures", () => {
  assert.equal(classifyStorageUploadError({ statusCode: 404, message: "Bucket not found" }), "storage_bucket_missing");
  assert.equal(classifyStorageUploadError({ statusCode: 403, message: "new row violates row-level security policy" }), "storage_forbidden");
  assert.equal(sourceUploadMessage("source_insert_failed"), "Le fichier a été envoyé mais la source n'a pas pu être enregistrée.");
});

test("upload diagnostics exclude secrets and retain only operational metadata", () => {
  const diagnostic = safeUploadDiagnostic("storage.upload", { statusCode: 403, message: "permission denied" }, "course-sources", "user/course/file.md", true, true);
  assert.deepEqual(diagnostic, { step: "storage.upload", code: "storage_forbidden", status: 403, message: "permission denied", bucket: "course-sources", path: "user/course/file.md", authenticated: true, owner: true });
});
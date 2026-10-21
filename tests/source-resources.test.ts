import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deleteSourceResource, formatFileSize, isOwnedCoursePath, isPdfSource, resolvePdfAccess, type DeleteDeps, type PdfAccessDeps, type SourceResourceRow } from "../lib/forge/source-resources";

const owner = "11111111-1111-4111-8111-111111111111";
const learner = "22222222-2222-4222-8222-222222222222";
const course = "33333333-3333-4333-8333-333333333333";
const otherCourse = "44444444-4444-4444-8444-444444444444";
const sid = "55555555-5555-4555-8555-555555555555";
const pdf: SourceResourceRow = { id: sid, course_id: course, type: "pdf", source_kind: "file", storage_bucket: "course-sources", storage_path: `${owner}/${course}/abc-doc.pdf`, mime_type: "application/pdf", title: "Doc", file_size: 2048 };

function pdfDeps(over: Partial<PdfAccessDeps> & { user?: string | null; source?: SourceResourceRow | null; enrolled?: boolean } = {}) {
  const calls = { signed: [] as string[] };
  const deps: PdfAccessDeps = {
    getUserId: async () => over.user === undefined ? owner : over.user,
    getCourse: async (slug) => slug === "demo" ? { id: course, teacher_id: owner } : null,
    getSource: async (courseId) => (over.source === undefined ? pdf : over.source) && courseId === course ? (over.source === undefined ? pdf : over.source) : null,
    createSignedUrl: over.createSignedUrl ?? (async (path, ttl) => { calls.signed.push(`${path}:${ttl}`); return "https://signed.example/x"; }),
  };
  return { deps, calls };
}

function deleteDeps(over: { user?: string | null; source?: SourceResourceRow | null; refs?: number | null; rowOk?: boolean; fileOk?: boolean } = {}) {
  const calls = { row: 0, file: [] as string[] };
  const deps: DeleteDeps = {
    getUserId: async () => over.user === undefined ? owner : over.user,
    getCourse: async (slug) => slug === "demo" ? { id: course, teacher_id: owner } : null,
    getSource: async (courseId) => courseId === course ? (over.source === undefined ? pdf : over.source) : null,
    countPathReferences: async () => over.refs === undefined ? 1 : over.refs,
    deleteRow: async () => { calls.row += 1; return over.rowOk ?? true; },
    removeFile: async (path) => { calls.file.push(path); return over.fileOk ?? true; },
  };
  return { deps, calls };
}

test("PDF detection requires type, MIME, bucket and path, not the extension", () => {
  assert.equal(isPdfSource(pdf), true);
  assert.equal(isPdfSource({ ...pdf, mime_type: "text/plain" }), false);
  assert.equal(isPdfSource({ ...pdf, type: "text" }), false);
  assert.equal(isPdfSource({ ...pdf, storage_path: null }), false);
  assert.equal(isPdfSource({ ...pdf, storage_bucket: "uploads" }), false);
  assert.equal(isPdfSource({ ...pdf, source_kind: "url" }), false);
});

test("signed PDF URL is generated server-side with a short TTL", async () => {
  const { deps, calls } = pdfDeps();
  const result = await resolvePdfAccess(deps, { courseSlug: "demo", sourceId: sid });
  assert.equal(result.ok && result.url, "https://signed.example/x");
  assert.deepEqual(calls.signed, [`${pdf.storage_path}:300`]);
  assert.equal(result.ok && result.fileSize, 2048);
});

test("non-PDF, missing, cross-course and unavailable resources do not open the viewer", async () => {
  assert.equal((await resolvePdfAccess(pdfDeps({ source: { ...pdf, type: "text", mime_type: "text/plain" } }).deps, { courseSlug: "demo", sourceId: sid })).ok, false);
  assert.deepEqual((await resolvePdfAccess(pdfDeps({ source: null }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "not_found");
  assert.equal((await resolvePdfAccess(pdfDeps({ source: { ...pdf, course_id: otherCourse } }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "not_found");
  const failed = await resolvePdfAccess(pdfDeps({ createSignedUrl: async () => null }).deps, { courseSlug: "demo", sourceId: sid });
  assert.deepEqual(failed, { ok: false, code: "url_unavailable", error: "Le document ne peut pas être affiché." });
  assert.equal((await resolvePdfAccess(pdfDeps().deps, { courseSlug: "demo", sourceId: "../etc" }) as { code: string }).code, "invalid_request");
});

test("Forge source PDF read: owner only, enrollment never grants access, anonymous denied", async () => {
  assert.equal((await resolvePdfAccess(pdfDeps().deps, { courseSlug: "demo", sourceId: sid })).ok, true);
  assert.equal((await resolvePdfAccess(pdfDeps({ user: learner, enrolled: true }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "permission_denied");
  assert.equal((await resolvePdfAccess(pdfDeps({ user: null }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "unauthenticated");
});

test("Forge source RLS removes learner reads from both metadata and Storage", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261021141132_harden_forge_sources_owner_only.sql", import.meta.url), "utf8");
  assert.match(migration, /drop policy if exists "Users can read enrolled ready course sources" on public\.course_sources;/);
  assert.match(migration, /drop policy if exists "Users can read enrolled course source files" on storage\.objects;/);
  assert.doesNotMatch(migration, /create policy/i);
});

test("owner deletes a file resource: DB row then Storage object", async () => {
  const { deps, calls } = deleteDeps();
  assert.deepEqual(await deleteSourceResource(deps, { courseSlug: "demo", sourceId: sid }), { ok: true, storageRemoved: true });
  assert.equal(calls.row, 1);
  assert.deepEqual(calls.file, [pdf.storage_path]);
});

test("owner deletes a non-file resource without touching Storage", async () => {
  const { deps, calls } = deleteDeps({ source: { ...pdf, type: "web", source_kind: "url", storage_bucket: null, storage_path: null, mime_type: "text/html" } });
  assert.deepEqual(await deleteSourceResource(deps, { courseSlug: "demo", sourceId: sid }), { ok: true, storageRemoved: false });
  assert.deepEqual(calls.file, []);
});

test("viewer, learner, unrelated and anonymous users cannot delete", async () => {
  for (const user of [learner, "66666666-6666-4666-8666-666666666666"]) {
    const { deps, calls } = deleteDeps({ user });
    assert.equal((await deleteSourceResource(deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "permission_denied");
    assert.equal(calls.row + calls.file.length, 0);
  }
  assert.equal((await deleteSourceResource(deleteDeps({ user: null }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "unauthenticated");
});

test("invalid and cross-course resource IDs are rejected", async () => {
  const { deps, calls } = deleteDeps();
  assert.equal((await deleteSourceResource(deps, { courseSlug: "demo", sourceId: "nope" }) as { code: string }).code, "invalid_request");
  assert.equal((await deleteSourceResource(deps, { courseSlug: "bad slug", sourceId: sid }) as { code: string }).code, "invalid_request");
  assert.equal((await deleteSourceResource(deleteDeps({ source: { ...pdf, course_id: otherCourse } }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "not_found");
  assert.equal((await deleteSourceResource(deleteDeps({ source: null }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "not_found");
  assert.equal(calls.row, 0);
});

test("a shared file or a foreign storage path is never destroyed", async () => {
  const shared = deleteDeps({ refs: 2 });
  assert.equal((await deleteSourceResource(shared.deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "resource_in_use");
  assert.equal(shared.calls.row + shared.calls.file.length, 0);
  for (const path of [`${learner}/${course}/x.pdf`, `${owner}/${otherCourse}/x.pdf`, `${owner}/${course}/../x.pdf`, `brief/x.pdf`]) {
    const { deps, calls } = deleteDeps({ source: { ...pdf, storage_path: path } });
    assert.equal((await deleteSourceResource(deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "invalid_storage_path");
    assert.equal(calls.row + calls.file.length, 0);
  }
  assert.equal(isOwnedCoursePath(pdf.storage_path!, owner, course), true);
});

test("DB and Storage failures are normalised and never remove the file after a DB failure", async () => {
  const db = deleteDeps({ rowOk: false });
  assert.deepEqual(await deleteSourceResource(db.deps, { courseSlug: "demo", sourceId: sid }), { ok: false, code: "db_delete_failed", error: "Impossible de supprimer cette source." });
  assert.deepEqual(db.calls.file, []);
  const storage = deleteDeps({ fileOk: false });
  assert.equal((await deleteSourceResource(storage.deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "storage_delete_failed");
  assert.equal((await deleteSourceResource(deleteDeps({ refs: null }).deps, { courseSlug: "demo", sourceId: sid }) as { code: string }).code, "db_delete_failed");
});

test("file size formatting", () => {
  assert.equal(formatFileSize(null), null);
  assert.equal(formatFileSize(2048), "2 Ko");
  assert.equal(formatFileSize(3 * 1024 * 1024), "3,0 Mo");
});

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI wiring: shared viewer, read action in rail and library, delete only in owner library", () => {
  const actions = read("components/forge/SourceResourceActions.tsx");
  const viewer = read("components/forge/PdfViewer.tsx");
  const rail = read("components/forge/ForgeRail.tsx");
  const library = read("components/forge/ForgeSourceResources.tsx");
  assert.match(actions, /source\.pdf &&/);
  assert.match(actions, /Lire le document/);
  assert.match(actions, /Supprimer cette source \?/);
  assert.match(actions, /Le fichier associé sera également supprimé\./);
  assert.match(actions, /Source supprimée\./);
  assert.match(actions, /Impossible de supprimer cette source\./);
  assert.match(viewer, /showModal/);
  assert.match(viewer, /target="_blank" rel="noopener noreferrer"/);
  assert.match(viewer, /Le document ne peut pas être affiché\./);
  assert.match(viewer, /loadUrl\(\)/);
  assert.match(rail, /<SourceResourceActions courseSlug=\{context\.courseSlug\} source=\{source\} \/>/);
  assert.match(rail, /context\.mode === "edit" && <>/);
  assert.doesNotMatch(rail, /canDelete/);
  assert.match(library, /SourceResourceActions courseSlug=\{courseSlug\} source=\{source\} canDelete/);
  assert.equal(/storage_path|storagePath/.test(actions + viewer), false);
});

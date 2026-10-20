import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deleteLessonResource, isOwnedResourcePath, listLessonResources, resolveResourcePdf, uploadPdfResource, validatePdfUpload, type LessonResourceRow, type PdfUploadCheck } from "../lib/forge/lesson-resources";
import { resolveForgeSources } from "../lib/forge/sources";

const owner = "11111111-1111-4111-8111-111111111111";
const learner = "22222222-2222-4222-8222-222222222222";
const course = "33333333-3333-4333-8333-333333333333";
const otherCourse = "44444444-4444-4444-8444-444444444444";
const lesson = "77777777-7777-4777-8777-777777777777";
const rid = "55555555-5555-4555-8555-555555555555";
const pdf: LessonResourceRow = { id: rid, course_id: course, lesson_id: lesson, title: "Guide", file_name: "guide.pdf", file_size: 4096, mime_type: "application/pdf", storage_bucket: "resources", storage_path: `${owner}/${course}/${lesson}/u-guide.pdf`, access: "enrolled" };
const head = new TextEncoder().encode("%PDF-1.7");
const file = (over: Partial<PdfUploadCheck> = {}): PdfUploadCheck => ({ name: "Guide Été.pdf", type: "application/pdf", size: 4096, head, ...over });

function base(over: { user?: string | null; status?: string; enrolled?: boolean; row?: LessonResourceRow | null } = {}) {
  return {
    getUserId: async () => over.user === undefined ? owner : over.user,
    getCourse: async (slug: string) => slug === "demo" ? { id: course, teacher_id: owner, status: over.status ?? "published" } : null,
    getResource: async (courseId: string) => courseId === course ? (over.row === undefined ? pdf : over.row) : null,
    isEnrolled: async () => over.enrolled ?? false,
    lessonBelongs: async (courseId: string, lessonId: string) => courseId === course && lessonId === lesson,
  };
}

test("PDF upload accepts a real PDF and rejects wrong MIME, extension, signature, empty and oversized files", () => {
  assert.deepEqual(validatePdfUpload(file()), { ok: true });
  assert.equal((validatePdfUpload(file({ type: "text/plain" })) as { code: string }).code, "unsupported_type");
  assert.equal((validatePdfUpload(file({ name: "guide.txt" })) as { code: string }).code, "unsupported_type");
  assert.equal((validatePdfUpload(file({ head: new TextEncoder().encode("MZ\u0090\u0000") })) as { code: string }).code, "unsupported_type");
  assert.equal((validatePdfUpload(file({ size: 0 })) as { code: string }).code, "empty_file");
  assert.equal((validatePdfUpload(file({ size: 10 * 1024 * 1024 + 1 })) as { code: string }).code, "file_too_large");
});

test("owner uploads a PDF to the pedagogical `resources` bucket path and the row is stored", async () => {
  const calls = { upload: [] as string[], insert: [] as string[], removed: [] as string[] };
  const deps = { ...base(), uploadFile: async (p: string) => { calls.upload.push(p); return true; }, insertRow: async (r: { path: string }) => { calls.insert.push(r.path); return pdf; }, removeFile: async (p: string) => { calls.removed.push(p); return true; }, uniqueId: () => "uid" };
  const result = await uploadPdfResource(deps, { courseSlug: "demo", lessonId: lesson, file: file() });
  assert.equal(result.ok, true);
  assert.equal(calls.upload[0], `${owner}/${course}/${lesson}/uid-guide-ete.pdf`);
  assert.equal(isOwnedResourcePath(calls.upload[0], owner, course, lesson), true);
  assert.deepEqual(calls.removed, []);
});

test("upload is owner-only, validates the lesson, and rolls back the file when the insert fails", async () => {
  const mk = (b: ReturnType<typeof base>, insert: boolean) => { const removed: string[] = []; return { removed, deps: { ...b, uploadFile: async () => true, insertRow: async () => insert ? pdf : null, removeFile: async (p: string) => { removed.push(p); return true; }, uniqueId: () => "u" } }; };
  assert.equal(((await uploadPdfResource(mk(base({ user: learner }), true).deps, { courseSlug: "demo", lessonId: lesson, file: file() })) as { code: string }).code, "permission_denied");
  assert.equal(((await uploadPdfResource(mk(base({ user: null }), true).deps, { courseSlug: "demo", lessonId: lesson, file: file() })) as { code: string }).code, "unauthenticated");
  assert.equal(((await uploadPdfResource(mk(base(), true).deps, { courseSlug: "demo", lessonId: otherCourse, file: file() })) as { code: string }).code, "not_found");
  assert.equal(((await uploadPdfResource(mk(base(), true).deps, { courseSlug: "demo", lessonId: lesson, file: file({ type: "image/png" }) })) as { code: string }).code, "unsupported_type");
  const failing = mk(base(), false);
  assert.equal(((await uploadPdfResource(failing.deps, { courseSlug: "demo", lessonId: lesson, file: file() })) as { code: string }).code, "insert_failed");
  assert.equal(failing.removed.length, 1);
});

test("learner reads a published, enrolled-access pedagogical PDF; unenrolled, unpublished and premium are denied", async () => {
  const sign = async () => "https://signed.example/r";
  const ok = await resolveResourcePdf({ ...base({ user: learner, enrolled: true }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid });
  assert.equal(ok.ok, true);
  assert.equal(((await resolveResourcePdf({ ...base({ user: learner, enrolled: false }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "permission_denied");
  assert.equal(((await resolveResourcePdf({ ...base({ user: learner, enrolled: true, status: "draft" }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "permission_denied");
  assert.equal(((await resolveResourcePdf({ ...base({ user: learner, enrolled: true, row: { ...pdf, access: "premium" } }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "permission_denied");
  assert.equal(((await resolveResourcePdf({ ...base({ user: null }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "unauthenticated");
});

test("non-PDF, cross-course and unavailable resources do not open the viewer", async () => {
  const sign = async () => "https://signed.example/r";
  assert.equal(((await resolveResourcePdf({ ...base({ row: { ...pdf, mime_type: "text/plain" } }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "not_pdf");
  assert.equal(((await resolveResourcePdf({ ...base({ row: { ...pdf, storage_bucket: "course-sources" } }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "not_pdf");
  assert.equal(((await resolveResourcePdf({ ...base({ row: { ...pdf, course_id: otherCourse } }), createSignedUrl: sign }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "not_found");
  assert.equal(((await resolveResourcePdf({ ...base(), createSignedUrl: async () => null }, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "url_unavailable");
  assert.equal(((await resolveResourcePdf({ ...base(), createSignedUrl: sign }, { courseSlug: "demo", resourceId: "bad" })) as { code: string }).code, "invalid_request");
});

test("learner lists only enrolled-access PDFs of a published lesson; outsiders see nothing", async () => {
  const rows: LessonResourceRow[] = [pdf, { ...pdf, id: "88888888-8888-4888-8888-888888888888", access: "premium" }, { ...pdf, id: "99999999-9999-4999-8999-999999999999", mime_type: "text/plain" }];
  const list = (b: ReturnType<typeof base>) => listLessonResources({ ...b, listResources: async () => rows }, { courseSlug: "demo", lessonId: lesson });
  assert.deepEqual((await list(base({ user: learner, enrolled: true }))).map((r) => r.id), [rid]);
  assert.deepEqual(await list(base({ user: learner, enrolled: false })), []);
  assert.deepEqual(await list(base({ user: learner, enrolled: true, status: "draft" })), []);
  assert.deepEqual(await list(base({ user: null })), []);
  assert.equal((await list(base())).length, 2);
});

test("resource delete targets the pedagogical row and bucket; only the owner may delete", async () => {
  const mk = (b: ReturnType<typeof base>, extra: { refs?: number | null; rowOk?: boolean; fileOk?: boolean } = {}) => { const calls = { row: [] as string[], file: [] as string[] }; return { calls, deps: { ...b, countPathReferences: async () => extra.refs === undefined ? 1 : extra.refs, deleteRow: async (_c: string, id: string) => { calls.row.push(id); return extra.rowOk ?? true; }, removeFile: async (p: string) => { calls.file.push(p); return extra.fileOk ?? true; } } }; };
  const ok = mk(base());
  assert.deepEqual(await deleteLessonResource(ok.deps, { courseSlug: "demo", resourceId: rid }), { ok: true, storageRemoved: true });
  assert.deepEqual(ok.calls, { row: [rid], file: [pdf.storage_path] });
  for (const user of [learner, "66666666-6666-4666-8666-666666666666"]) {
    const denied = mk(base({ user, enrolled: true }));
    assert.equal(((await deleteLessonResource(denied.deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "permission_denied");
    assert.equal(denied.calls.row.length + denied.calls.file.length, 0);
  }
  assert.equal(((await deleteLessonResource(mk(base({ row: { ...pdf, course_id: otherCourse } })).deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "not_found");
  assert.equal(((await deleteLessonResource(mk(base()).deps, { courseSlug: "demo", resourceId: "x" })) as { code: string }).code, "invalid_request");
  assert.equal(((await deleteLessonResource(mk(base({ row: { ...pdf, storage_bucket: "course-sources" } })).deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "invalid_storage_path");
  assert.equal(((await deleteLessonResource(mk(base({ row: { ...pdf, storage_path: `${learner}/${course}/${lesson}/x.pdf` } })).deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "invalid_storage_path");
  const shared = mk(base(), { refs: 2 });
  assert.equal(((await deleteLessonResource(shared.deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "resource_in_use");
  assert.equal(shared.calls.row.length + shared.calls.file.length, 0);
  const dbFail = mk(base(), { rowOk: false });
  assert.equal(((await deleteLessonResource(dbFail.deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "db_delete_failed");
  assert.deepEqual(dbFail.calls.file, []);
  assert.equal(((await deleteLessonResource(mk(base(), { fileOk: false }).deps, { courseSlug: "demo", resourceId: rid })) as { code: string }).code, "storage_delete_failed");
});

test("Forge sources are never available to learner Forge requests", async () => {
  const reader = { sources: async () => { throw new Error("must not be read"); }, downloadText: async () => "" };
  await assert.rejects(() => resolveForgeSources(reader, course, [rid], true), /source_unavailable/);
  const context = readFileSync(new URL("../lib/forge/context.ts", import.meta.url), "utf8");
  assert.match(context, /resolveForgeSources\(reader, course\.id, request\.sourceIds, request\.mode === "learn"\)/);
  const actions = readFileSync(new URL("../app/app/forge/source-actions.ts", import.meta.url), "utf8");
  assert.match(actions, /parsed\.data\.mode === "learn"\) return \[\]/);
});

test("sources and pedagogical resources stay distinct models, buckets and UI vocabulary; viewer is reused", () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const resActions = read("app/app/courses/resource-actions.ts");
  const srcActions = read("app/app/forge/source-actions.ts");
  assert.match(resActions, /from\("resources"\)/);
  assert.doesNotMatch(resActions, /course_sources|course-sources/);
  assert.doesNotMatch(srcActions.slice(srcActions.indexOf("async function resourceDeps")), /from\("resources"\)|"resources"\)\.(upload|remove|createSignedUrl)/);
  const panel = read("components/forge/LessonResourcesPanel.tsx");
  const srcUi = read("components/forge/SourceResourceActions.tsx");
  assert.match(panel, /import \{ PdfViewer \}/);
  assert.match(srcUi, /import \{ PdfViewer \}/);
  assert.match(panel, /Supprimer cette ressource \?/);
  assert.match(srcUi, /Supprimer cette source \?/);
  assert.match(panel, /accept="\.pdf,application\/pdf"/);
  assert.match(read("components/learning/LearnerLesson.tsx"), /<LessonResourcesPanel courseSlug=\{courseSlug\} lessonId=\{lesson\.id\} \/>/);
  assert.match(read("components/authoring/LessonEditor.tsx"), /<LessonResourcesPanel courseSlug=\{courseSlug\} lessonId=\{lesson\.id\} canManage \/>/);
  assert.doesNotMatch(read("components/learning/LearnerLesson.tsx") + read("components/forge/ForgeRail.tsx"), /LessonResourcesPanel[^>]*canManage/);
});

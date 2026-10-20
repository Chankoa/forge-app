import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { libraryAccess, libraryEmptyMessage, libraryKindLabels, libraryLessonHref, libraryMessages, libraryTabCounts, libraryTabLabels, defaultLibraryFilters, filterLibraryItems, mediaReferenceMap, normalizeMedia, normalizeResource, normalizeSource, type LibraryContext, type LibraryCourse } from "../lib/library/library-items";
import { deleteLibraryMedia, type LibraryMediaDeleteDeps } from "../lib/library/media-delete";

const ownerAccess = libraryAccess({ isOwner: true, courseStatus: "published" });
const editorAccess = libraryAccess({ isOwner: false, courseStatus: "published", membershipRole: "editor", membershipStatus: "active" });
const viewerAccess = libraryAccess({ isOwner: false, courseStatus: "published", membershipRole: "viewer", membershipStatus: "active" });
const learnerAccess = libraryAccess({ isOwner: false, courseStatus: "published" });

const course = (id: string, role: "owner" | "editor", access = role === "owner" ? ownerAccess : editorAccess): LibraryCourse => ({ id, slug: `c-${id}`, title: `Parcours ${id}`, ownerId: "u1", status: "published", role, capabilities: access.capabilities });
const MEDIA_ID = "11111111-1111-4111-8111-111111111111";
const ctx = (extra: Partial<LibraryContext> = {}): LibraryContext => ({
  courses: new Map([["a", course("a", "owner")], ["b", course("b", "editor")]]),
  lessons: new Map([["l1", { id: "l1", slug: "lecon-un", title: "Leçon un", moduleId: "m1", courseId: "a" }]]),
  modules: new Map([["m1", { id: "m1", title: "Module un" }]]),
  references: new Map(),
  ...extra,
});
const media = (over = {}) => ({ id: MEDIA_ID, course_id: "a", created_by: "u1", storage_path: "a/x/abc.png", kind: "image" as const, mime_type: "image/png", file_size: 10, title: "Schéma", alt_text: "Un schéma", caption: null, status: "ready", created_at: "2026-01-02", ...over });
const resource = (over = {}) => ({ id: "r1", course_id: "a", module_id: null, lesson_id: "l1", title: "Guide", type: "download", href: "a/g.pdf", file_name: "g.pdf", file_size: 99, mime_type: "application/pdf", storage_bucket: "resources", storage_path: "a/g.pdf", access: "enrolled", created_by: "u1", created_at: "2026-01-03", ...over });
const source = (over = {}) => ({ id: "s1", course_id: "a", title: "Brief", type: "pdf", source_kind: "file", original_url: null, extraction_status: "ready", file_name: "b.pdf", file_size: 5, mime_type: "application/pdf", storage_path: "t/b.pdf", teacher_id: "u1", created_at: "2026-01-01", ...over });

test("media normalization and orphan detection", () => {
  const orphan = normalizeMedia(media(), ctx())!;
  assert.equal(orphan.kind, "media");
  assert.equal(orphan.referenced, false);
  assert.equal(orphan.lessonTitle, null);
  const refs = mediaReferenceMap([{ id: "l1", content: `:::image\nresource=${MEDIA_ID}\nalt=x\n:::` }]);
  const used = normalizeMedia(media(), ctx({ references: refs }));
  assert.equal(used!.referenced, true); assert.equal(used!.lessonTitle, "Leçon un"); assert.equal(libraryLessonHref(used!), "/app/courses/c-a/lessons/lecon-un?mode=edit");
});

test("resource and source normalization keep their own terminology", () => {
  const r = normalizeResource(resource(), ctx())!;
  const s = normalizeSource(source(), ctx())!;
  assert.equal(r.isPdf, true); assert.equal(r.visibility, "Apprenants inscrits"); assert.equal(r.lessonTitle, "Leçon un"); assert.equal(r.referenced, null);
  assert.equal(s.visibility, "Forge uniquement"); assert.equal(s.status, "ready"); assert.equal(s.kind, "source");
  assert.equal(libraryKindLabels.source, "Source Forge");
  assert.equal(libraryKindLabels.resource, "Ressource pédagogique");
  assert.equal(libraryTabLabels.source, "Sources Forge");
  assert.equal(libraryTabLabels.media, "Médias");
});

test("external URLs are only exposed when http(s)", () => {
  assert.equal(normalizeSource(source({ source_kind: "url", storage_path: null, mime_type: null, original_url: "javascript:alert(1)" }), ctx())!.url, null);
  assert.equal(normalizeSource(source({ source_kind: "url", storage_path: null, mime_type: null, original_url: "https://example.com" }), ctx())!.url, "https://example.com");
});

test("permissions: owner all, editor media only, viewer/learner nothing", () => {
  assert.equal(normalizeMedia(media({ course_id: "b" }), ctx())!.canDelete, false);
  assert.equal(normalizeResource(resource({ course_id: "b" }), ctx()), null);
  assert.equal(normalizeSource(source({ course_id: "b" }), ctx()), null);
  assert.equal(normalizeMedia(media(), ctx())!.canDelete, true);
  for (const access of [viewerAccess, learnerAccess]) {
    const c = ctx({ courses: new Map([["a", course("a", "editor", access)]]) });
    assert.equal(normalizeMedia(media(), c), null); assert.equal(normalizeResource(resource(), c), null); assert.equal(normalizeSource(source(), c), null);
  }
  assert.equal(normalizeMedia(media({ course_id: "zzz" }), ctx()), null);
});

test("filters: kind, course, referenced, search", () => {
  const items = [normalizeMedia(media(), ctx())!, normalizeResource(resource(), ctx())!, normalizeSource(source(), ctx())!, normalizeMedia(media({ id: "m2", course_id: "b", title: "Éclair" }), ctx())!];
  assert.deepEqual(libraryTabCounts(items), { all: 4, media: 2, resource: 1, source: 1 });
  assert.equal(filterLibraryItems(items, { ...defaultLibraryFilters, tab: "source" }).length, 1);
  assert.equal(filterLibraryItems(items, { ...defaultLibraryFilters, courseId: "b" }).length, 1);
  assert.equal(filterLibraryItems(items, { ...defaultLibraryFilters, referenced: "unreferenced" }).length, 2);
  assert.equal(filterLibraryItems(items, { ...defaultLibraryFilters, referenced: "referenced" }).length, 0);
  assert.equal(filterLibraryItems(items, { ...defaultLibraryFilters, query: "eclair" }).length, 1);
  assert.equal(filterLibraryItems(items, { ...defaultLibraryFilters, query: "leçon un" }).length, 1);
  assert.equal(libraryEmptyMessage(0, defaultLibraryFilters), "Aucun élément dans votre bibliothèque pour le moment.");
  assert.equal(libraryEmptyMessage(3, { ...defaultLibraryFilters, referenced: "unreferenced" }), "Aucun média non référencé.");
  assert.match(libraryMessages.subtitle, /^Retrouvez les médias, ressources pédagogiques et sources/);
});

function deleteDeps(over: Partial<LibraryMediaDeleteDeps> = {}) {
  const calls: string[] = [];
  const deps: LibraryMediaDeleteDeps = {
    getUserId: async () => "u1",
    getMedia: async (id) => ({ id, course_id: "a", storage_path: "a/x/abc.png", storage_bucket: "course-media" }),
    getCourseOwner: async () => "u1",
    listLessonContents: async () => [{ content: "texte" }],
    deleteRow: async () => { calls.push("row"); return true; },
    removeFile: async (p) => { calls.push(`file:${p}`); return true; },
    ...over,
  };
  return { deps, calls };
}

test("delete: unreferenced media owned by caller is removed with its file", async () => {
  const { deps, calls } = deleteDeps();
  assert.deepEqual(await deleteLibraryMedia(deps, { mediaId: MEDIA_ID }), { ok: true });
  assert.deepEqual(calls, ["row", "file:a/x/abc.png"]);
});

test("delete: referenced media is blocked, nothing removed", async () => {
  const { deps, calls } = deleteDeps({ listLessonContents: async () => [{   content: `:::image\nresource=${MEDIA_ID}\nalt=x\n:::` }] });
    const result = await deleteLibraryMedia(deps, { mediaId: MEDIA_ID });
    assert.equal(result.ok, false); assert.equal(!result.ok && result.code, "referenced"); assert.deepEqual(calls, []);
});

test("delete: non-owner, anonymous, unknown and unverifiable are refused", async () => {
  for (const [over, code] of [[{ getCourseOwner: async () => "someone" }, "forbidden"], [{ getUserId: async () => null }, "unauthenticated"], [{ getMedia: async () => null }, "not_found"], [{ listLessonContents: async () => null }, "check_failed"]] as const) {
    const { deps, calls } = deleteDeps(over);
    const result = await deleteLibraryMedia(deps, { mediaId: MEDIA_ID });
    assert.equal(!result.ok && result.code, code); assert.deepEqual(calls, []);
  }
});

test("delete: storage failure is reported after the row is gone; foreign bucket is never touched", async () => {
  const failing = deleteDeps({ removeFile: async () => false });
  const result = await deleteLibraryMedia(failing.deps, { mediaId: MEDIA_ID });
  assert.equal(!result.ok && result.code, "storage_delete_failed");
  const foreign = deleteDeps({ getMedia: async (id) => ({ id, course_id: "a", storage_path: "x", storage_bucket: "resources" }) });
  await deleteLibraryMedia(foreign.deps, { mediaId: MEDIA_ID });
  assert.deepEqual(foreign.calls, ["row"]);
});

test("actions never accept a client storage path and the Library merges no table", () => {
  const actions = readFileSync("app/app/library/actions.ts", "utf8");
  assert.doesNotMatch(actions, /storagePath|storage_path:\s*string\)/);
  assert.match(actions, /deleteLibraryMediaAction\(mediaId: string\)/);
  const repo = readFileSync("lib/library/library-repository.ts", "utf8");
  for (const table of ["course_media_resources", "resources", "course_sources"]) assert.match(repo, new RegExp(`from\\("${table}"\\)`));
  assert.doesNotMatch(repo, /\.insert\(|\.upsert\(|\.delete\(/);
  assert.match(repo, /eq\("teacher_id", userId\)/);
});

test("learner and viewer enrolled relationships do not expose a creator library", () => {
  assert.equal(learnerAccess.media || learnerAccess.resources || learnerAccess.sources, false);
  assert.equal(viewerAccess.media || viewerAccess.resources || viewerAccess.sources, false);
  const view = readFileSync("components/library/LibraryView.tsx", "utf8");
  assert.doesNotMatch(view, /Ressources pédagogiques de l’apprenant/);
});

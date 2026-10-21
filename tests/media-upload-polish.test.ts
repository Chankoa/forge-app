import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { uploadOperationError } from "../lib/uploads/upload-feedback";
import { validateAvatarUpload, avatarMaxBytes } from "../lib/profiles/profile-contracts";
import { validateCourseCoverUpload, courseCoverMaxBytes, coverGuidance } from "../lib/courses/cover-contracts";
import { courseMediaStoragePath, validateMediaUpload, mediaUploadLimits } from "../lib/courses/media-contracts";
import { insertMediaResource } from "../lib/courses/lesson-markdown";

test("Server Action upload capacity covers the largest validated audio file", () => {
  const config = readFileSync("next.config.ts", "utf8");
  const match = config.match(/bodySizeLimit:\s*"(\d+)mb"/);
  assert.ok(match);
  const limit = Number(match[1]) * 1024 * 1024;
  assert.equal(limit, 26 * 1024 * 1024);
  assert.ok(limit >= mediaUploadLimits.audio + 20 * 1024);
});

test("product limits and MIME types stay aligned across avatar, cover and lesson media", () => {
  assert.equal(avatarMaxBytes, 2 * 1024 * 1024);
  assert.equal(courseCoverMaxBytes, 5 * 1024 * 1024);
  assert.equal(mediaUploadLimits.image, 8 * 1024 * 1024);
  assert.equal(mediaUploadLimits.audio, 25 * 1024 * 1024);
  assert.equal(validateAvatarUpload("image/png", avatarMaxBytes).ok, true);
  assert.equal(validateCourseCoverUpload("image/webp", courseCoverMaxBytes).ok, true);
  assert.equal(validateCourseCoverUpload("image/gif", 1024).ok, false);
  assert.equal(validateMediaUpload("image", "image/png", mediaUploadLimits.image).ok, true);
  assert.equal(validateMediaUpload("audio", "audio/wav", mediaUploadLimits.audio).ok, true);
  assert.match(coverGuidance, /5 Mo/);
  assert.doesNotMatch(coverGuidance, /GIF/);
});

test("lesson media paths begin with the course id, not the bucket name", () => {
  const path = courseMediaStoragePath("course-id", "resource-id", "../lesson audio.wav");
  assert.equal(path, "course-id/resource-id/lesson-audio.wav");
  assert.ok(path.startsWith("course-id/"));
  assert.doesNotMatch(path, /^course-media\//);
});

test("lesson media action commits upload and metadata without requiring a signed URL", () => {
  const actionSource = readFileSync("app/app/create/actions.ts", "utf8");
  const actionStart = actionSource.indexOf("export async function uploadCourseMediaAction");
  const actionEnd = actionSource.indexOf("\nasync function reorderAdjacent", actionStart);
  assert.notEqual(actionStart, -1);
  assert.notEqual(actionEnd, -1);
  const action = actionSource.slice(actionStart, actionEnd);
  const uploadIndex = action.indexOf('.storage.from("course-media").upload(');
  const insertIndex = action.indexOf('.from("course_media_resources").insert(');
  assert.notEqual(uploadIndex, -1);
  assert.ok(insertIndex > uploadIndex);
  assert.doesNotMatch(action, /createSignedUrl|signed\.data|signed\.error/);
  assert.match(action, /if \(error \|\| !data\) \{[\s\S]*?storage\.from\("course-media"\)\.remove\(\[storagePath\]\)/);
  assert.match(action, /return \{ id: data\.id, kind: data\.kind,/);
  assert.doesNotMatch(action, /return \{[^}]*\burl\s*:/);

  const lessonEditor = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  assert.match(lessonEditor, /URL\.createObjectURL\(file\)/);
  assert.match(lessonEditor, /onUploaded\(resource, kind, text, caption, file\)/);
  assert.match(lessonEditor, /setLocalResources\(\(current\) => \(\{ \.\.\.current, \[resource\.id\]: \{ \.\.\.resource, url: previewUrl, durationSeconds: null \} \}\)\)/);
  assert.match(lessonEditor, /URL\.revokeObjectURL\(url\)/);
  assert.doesNotMatch(lessonEditor, /lesson-editor__media-upload[\s\S]*?<input value=\{text\} required/);
  assert.match(lessonEditor, /mediaPanelOpen && canUploadMedia && <MediaUpload/);
  assert.match(lessonEditor, /onUploaded=\{insertUploadedResource\}/);
  assert.match(lessonEditor, /dispatchToast\(`\$\{kind === "image" \? "Image" : "Audio"\} ajouté au brouillon\.`\)/);
});

test("lesson directives persist only resource identity, never storage or signed URLs", () => {
  const directive = insertMediaResource("", 0, 0, "audio", "resource-123", "QA audio", "QA caption").content;
  assert.match(directive, /^:::audio\nresource=resource-123\ntitle=QA audio\ncaption=QA caption\n:::/);
  assert.doesNotMatch(directive, /https?:\/\/|storage_path|course-media\//);

  const migration = readFileSync("supabase/migrations/20261011000000_i10c_course_media_resources.sql", "utf8");
  assert.match(migration, /return split_part\(object_name, '\/', 1\)::uuid;/);
  assert.doesNotMatch(migration, /split_part\(object_name, '\/', 1\) <> 'course-media'/);
});

test("upload failures use product copy instead of raw runtime errors", () => {
  assert.equal(uploadOperationError("avatar"), "La photo n’a pas pu être téléversée.");
  assert.equal(uploadOperationError("cover"), "L’image de couverture n’a pas pu être téléversée.");
  assert.equal(uploadOperationError("image"), "L’image n’a pas pu être ajoutée à la leçon.");
  assert.equal(uploadOperationError("audio"), "Le fichier audio n’a pas pu être ajouté à la leçon.");
  const uploadSurfaces = [
    "components/profile/ProfileForms.tsx",
    "components/course/CourseCoverManager.tsx",
    "components/authoring/LessonEditor.tsx",
  ];
  for (const path of uploadSurfaces) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /uploadOperationError/);
    assert.match(source, /uploading\.current/);
    assert.doesNotMatch(source, /Failed to fetch|StorageApiError|PostgrestError/);
  }
  const media = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  const avatar = readFileSync("components/profile/ProfileForms.tsx", "utf8");
  const cover = readFileSync("components/course/CourseCoverManager.tsx", "utf8");
  assert.match(avatar, /catch \{ setFeedback\(\{ message: uploadOperationError\("avatar"\), error: true \}\); \}/);
  assert.match(cover, /catch \{ setMessage\(upload \? uploadOperationError\("cover"\)/);
  assert.match(media, /catch \{ setMessage\(uploadOperationError\(kind\)\); setError\(true\); \}/);
  assert.match(avatar, /2 Mo maximum/);
  assert.match(media, /onUploaded\(resource, kind, text, caption, file\)/);
  assert.match(media, /setLocalResources/);
  assert.match(media, /25 Mo maximum/);
  assert.match(media, /8 Mo maximum/);
});

test("upload controls prevent repeated submits while an upload is pending", () => {
  const avatar = readFileSync("components/profile/ProfileForms.tsx", "utf8");
  const cover = readFileSync("components/course/CourseCoverManager.tsx", "utf8");
  const media = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  for (const source of [avatar, cover, media]) {
    assert.match(source, /if \(uploading\.current\) return;/);
  }
  assert.match(avatar, /disabled=\{pending\} onClick=\{\(\) => input\.current\?\.click\(\)\}/);
  assert.match(cover, /disabled=\{pending\} onClick=\{\(\) => input\.current\?\.click\(\)\}/);
  assert.match(media, /onClick=\{upload\} disabled=\{pending\}/);
});

test("empty lessons stay compact until writing starts and draft preview uses the learner renderer", () => {
  const editor = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  assert.match(editor, /!draft\.content\.trim\(\) && !writingStarted \? <LessonEmptyContent/);
  assert.match(editor, /<LessonMarkdown content=\{draft\.content\} mode="author" resources=\{localResources\}/);
  assert.match(editor, /contentView === "source" \? "Source Markdown" : "Rédaction"/);
  assert.match(editor, /aria-label="Mise en forme du contenu"/);
  for (const label of ["Gras", "Italique", "Liste à puces", "Liste numérotée", "Lien", "Citation", "Bloc de code"]) {
    assert.match(editor, new RegExp(`aria-label="${label}"`));
  }
});

test("avatar and cover dimensions use the approved variants", () => {
  const styles = readFileSync("styles/globals.css", "utf8");
  for (const [variant, pixels] of [["xs", 32], ["sm", 40], ["md", 48], ["profile", 88]] as const) {
    assert.match(styles, new RegExp(`\\.profile-avatar--${variant}\\s*\\{\\s*width: ${pixels}px;\\s*height: ${pixels}px;\\s*\\}`));
  }
  assert.match(styles, /\.profile-avatar--profile\s*\{\s*width: 72px;\s*height: 72px;\s*\}/);
  assert.match(styles, /\.public-course__cover\s*\{\s*max-width: 720px;\s*aspect-ratio: 16 \/ 9;/);
  assert.match(styles, /\.course-cover-manager__body\s*\{[^}]*grid-template-columns: minmax\(0, 280px\)/);
});

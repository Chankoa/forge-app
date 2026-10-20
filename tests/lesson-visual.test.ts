import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mediaCapabilityDefinitions, resolveMediaCapability } from "../lib/forge/intelligence/capabilities";
import { lessonVisualMessages, type CoverPrompt, type LessonVisualContext, type VisualBrief } from "../lib/forge/orchestrator/media-contracts";
import { acceptLessonImage, generateVisualImage, prepareVisualBrief, prepareVisualPrompt } from "../lib/forge/orchestrator/lesson-visual-service";
import { lessonExcerpt } from "../lib/forge/orchestrator/lesson-visual-context";
import { insertMediaResource } from "../lib/courses/lesson-markdown";

const courseId = "11111111-1111-4111-8111-111111111111";
const lessonId = "33333333-3333-4333-8333-333333333333";
const context: LessonVisualContext = { course: { title: "CSS Grid", subtitle: null, domain: "Web", level: "debutant" }, moduleTitle: "Grid", lessonTitle: "Les pistes", description: null, objectives: ["Définir une grille"], excerpt: "Une grille est composée de pistes." };
const brief: VisualBrief = {
  subject: "Pistes d’une grille", educationalIntent: "Montrer des pistes", audience: "Débutants", visualDirection: "Un chantier avec des planches alignées",
  mood: "Calme", composition: "Plan large", keyConcepts: ["piste"], preferredMetaphors: [], avoid: ["texte"], paletteDirection: "Tons naturels", imageStyle: "Illustration", textInImage: "minimal", aspectRatio: "3:2", accessibilityIntent: "Décrire", imageIntent: "decorative",
};
const promptOut: CoverPrompt = { prompt: "Wide shot of aligned wooden planks on a workshop floor, natural light, no text", avoid: ["text"], aspectRatio: "16:9", styleNotes: "Naturel", accessibilityNotes: "Contraste", altText: "Planches alignées dans un atelier" };
function png(width: number, height: number) {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width); new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}
const allowed = { consume: () => undefined, loadLesson: async () => context };
const denied = { consume: () => assert.fail("consume must not run"), loadLesson: async () => null };

test("lesson visual capabilities target lessons and reuse the image model setting without text fallback", () => {
  for (const id of ["generate_visual_brief", "generate_visual_prompt", "generate_visual_image"] as const) {
    assert.deepEqual(mediaCapabilityDefinitions[id].supportedTargets, ["lesson"]);
    assert.equal(mediaCapabilityDefinitions[id].humanApproval, true);
    assert.ok(resolveMediaCapability(id));
  }
  const image = mediaCapabilityDefinitions.generate_visual_image.resolveModel;
  assert.equal(image({ FORGE_COVER_IMAGE_MODEL: " img-model ", FORGE_COVER_TEXT_MODEL: "text-model", FORGE_MODEL: "text" }), "img-model");
  assert.equal(image({ FORGE_COVER_TEXT_MODEL: "text-model", FORGE_MODEL: "text" }), undefined);
  assert.equal(mediaCapabilityDefinitions.generate_visual_image.resolveModel({}), mediaCapabilityDefinitions.generate_cover_image.resolveModel({}));
});

test("lesson context excerpt is bounded and stripped of directives, URLs and identifiers", () => {
  const raw = `# Titre\n:::image\nresource=${lessonId}\nalt=x\n:::\nVoir https://secret.example/a.png et ${lessonId}.\n` + "mot ".repeat(1000);
  const excerpt = lessonExcerpt(raw);
  assert.ok(excerpt.length <= 1500);
  assert.ok(!/https?:|resource=|:::/.test(excerpt) && !excerpt.includes(lessonId));
  assert.equal(lessonExcerpt(null), "");
});

test("figurative and conceptual briefs are accepted and normalised to landscape without text", async () => {
  for (const purpose of ["figurative", "conceptual"] as const) {
    let payload = "";
    const result = await prepareVisualBrief({ courseId, lessonId, purpose }, { ...allowed, provider: { generate: async (capability, input) => { payload = input; assert.equal(capability, "generate_visual_brief"); return brief; } } });
    assert.equal(result.status, "success");
    assert.equal(result.data?.brief.aspectRatio, "16:9");
    assert.equal(result.data?.brief.textInImage, "none");
    assert.equal(JSON.parse(payload).purpose, purpose);
    assert.ok(!/storage|email|@/.test(payload));
  }
});

test("invalid targets and purposes are rejected before any provider call", async () => {
  const provider = { generate: async () => assert.fail("provider must not run") };
  for (const raw of [{ courseId: "nope", lessonId, purpose: "figurative" }, { courseId, lessonId: "nope", purpose: "figurative" }, { courseId, lessonId, purpose: "cover" }, { courseId, lessonId, purpose: "figurative", extra: 1 }]) {
    assert.equal((await prepareVisualBrief(raw, { ...allowed, provider })).status, "validation_error");
  }
});

test("prompt generation follows the brief and image output stays transient", async () => {
  const prompt = await prepareVisualPrompt({ courseId, lessonId, purpose: "figurative", brief }, { ...allowed, provider: { generate: async () => promptOut } });
  assert.equal(prompt.status, "success");
  const image = await generateVisualImage({ courseId, lessonId, prompt: promptOut.prompt, aspectRatio: "16:9" }, { ...allowed, image: { generate: async () => ({ bytes: png(1536, 1024) }) } });
  assert.equal(image.status, "success");
  assert.ok(image.data?.previewUrl.startsWith("data:image/png;base64,"));
});

test("denied users get no generation and consume no quota", async () => {
  const provider = { generate: async () => assert.fail("provider must not run") };
  assert.equal((await prepareVisualBrief({ courseId, lessonId, purpose: "figurative" }, { ...denied, provider })).status, "permission_denied");
  assert.equal((await prepareVisualPrompt({ courseId, lessonId, purpose: "figurative", brief }, { ...denied, provider })).status, "permission_denied");
  const image = await generateVisualImage({ courseId, lessonId, prompt: promptOut.prompt, aspectRatio: "16:9" }, { ...denied, image: { generate: async () => assert.fail("image must not run") } });
  assert.equal(image.status, "permission_denied");
  assert.equal(image.summary, lessonVisualMessages.denied);
});

test("unusable provider images are rejected with a product message", async () => {
  const result = await generateVisualImage({ courseId, lessonId, prompt: promptOut.prompt, aspectRatio: "16:9" }, { ...allowed, image: { generate: async () => ({ bytes: new Uint8Array([1, 2, 3]) }) } });
  assert.equal(result.status, "invalid_result");
  const failed = await generateVisualImage({ courseId, lessonId, prompt: promptOut.prompt, aspectRatio: "16:9" }, { ...allowed, image: { generate: async () => { throw new Error("raw provider secret"); } } });
  assert.equal(failed.summary, lessonVisualMessages.image);
  assert.ok(!failed.summary.includes("secret"));
});

test("accepting stores through the existing media upload and keeps alt text for the draft directive", async () => {
  let form: FormData | null = null;
  const file = new File([png(1536, 1024)], "x", { type: "text/plain" });
  const result = await acceptLessonImage(courseId, lessonId, { file, altText: "  Planches alignées  ", caption: "" }, { ...allowed, store: async (data) => { form = data; return { id: "res-1", kind: "image", title: null, altText: "Planches alignées", caption: null, status: "ready" }; } });
  assert.equal(result.ok, true);
  const sent = form as unknown as FormData;
  assert.equal(sent.get("kind"), "image");
  assert.equal(sent.get("altText"), "Planches alignées");
  assert.equal((sent.get("file") as File).type, "image/png");
  const inserted = insertMediaResource("Intro", 5, 5, "image", "res-1", "Planches alignées", "");
  assert.ok(inserted.content.includes("resource=res-1") && inserted.content.includes("alt=Planches alignées"));
});

test("accept refuses unauthorised users, bad bytes and missing alt text without storing", async () => {
  const store = async () => assert.fail("store must not run") as never;
  const good = new File([png(1536, 1024)], "x");
  assert.equal((await acceptLessonImage(courseId, lessonId, { file: good, altText: "a" }, { ...denied, store })).ok, false);
  assert.equal((await acceptLessonImage(courseId, lessonId, { file: new File([new Uint8Array([1, 2, 3])], "x"), altText: "a" }, { ...allowed, store })).ok, false);
  assert.equal((await acceptLessonImage(courseId, lessonId, { file: good, altText: "  " }, { ...allowed, store })).ok, false);
  assert.equal((await acceptLessonImage(courseId, lessonId, { file: "text", altText: "a" }, { ...allowed, store })).ok, false);
});

test("lesson visual actions share the cover rate limiters and storage boundaries stay separate", () => {
  const actions = readFileSync("app/app/forge/cover-workflow-actions.ts", "utf8");
  assert.equal((actions.match(/createForgeRateLimiter\(/g) ?? []).length, 2);
  assert.match(actions, /generateVisualImage\([\s\S]*consumeImage\(user\.id, Math\.min\(config\.rateLimitPerHour, 10\)\)/);
  const accept = readFileSync("app/app/courses/lesson-image-actions.ts", "utf8");
  assert.match(accept, /uploadCourseMediaAction/);
  for (const forbidden of ["course-covers", "course-sources", "storeCover", "\"resources\"", "course_sources"]) assert.ok(!accept.includes(forbidden), forbidden);
  const studio = readFileSync("components/forge/LessonImageStudio.tsx", "utf8");
  assert.ok(!/FORGE_|process\.env|gpt-image/.test(studio));
});

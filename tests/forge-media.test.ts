import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { mediaCapabilityDefinitions, resolveCourseCapability, resolveMediaCapability } from "../lib/forge/intelligence/capabilities";
import { coverMessages, type CoverContext, type VisualBrief } from "../lib/forge/orchestrator/media-contracts";
import { inspectImage, validateBrief, validatePrompt } from "../lib/forge/orchestrator/media-validation";
import { generateCoverImage, prepareCoverBrief, prepareCoverPrompt } from "../lib/forge/orchestrator/media-service";
import { coverFlowReducer, dataUrlToFile, initialCoverFlow } from "../lib/forge/orchestrator/cover-flow";
import { canManageCourseCover } from "../lib/courses/cover-contracts";
import { CoverStudioView } from "../components/course/CoverStudioView";

const courseId = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const context: CoverContext = { title: "CSS Grid et Flexbox", subtitle: null, description: "Maîtriser la mise en page.", domain: "Web", level: "debutant", objectives: ["Construire une grille"], moduleTitles: ["Flexbox", "Grid"] };
const brief: VisualBrief = {
  subject: "Mise en page en grille", educationalIntent: "Évoquer la structure spatiale", audience: "Débutants", visualDirection: "Blocs alignés sur une grille",
  mood: "Clair et calme", composition: "Grille asymétrique", keyConcepts: ["grille", "alignement"], preferredMetaphors: ["plan d’architecte"], avoid: ["cerveau futuriste"],
  paletteDirection: "Violet doux", imageStyle: "Illustration éditoriale", textInImage: "none", aspectRatio: "3:2", accessibilityIntent: "Décrire la structure", imageIntent: "decorative",
};
const promptOut = { prompt: "Editorial illustration of aligned blocks on a calm grid, soft violet palette, no text", avoid: ["glowing brain"], aspectRatio: "16:9", styleNotes: "Éditorial", accessibilityNotes: "Contraste élevé", altText: "Blocs alignés sur une grille" };

function png(width: number, height: number, length = 64) {
  const bytes = new Uint8Array(length);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width); new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}
const common = () => ({ consume: () => undefined, loadCover: async () => context });

test("media capabilities are registered, course-targeted and require human approval", () => {
  for (const id of ["generate_cover_brief", "generate_cover_prompt", "generate_cover_image"] as const) {
    const definition = resolveMediaCapability(id);
    assert.ok(definition);
    assert.deepEqual(definition.supportedTargets, ["course"]);
    assert.equal(definition.humanApproval, true);
    assert.ok(definition.inputSchema && definition.outputSchema && definition.requiredContext && definition.mutation);
  }
  assert.equal(mediaCapabilityDefinitions.generate_cover_image.mutation, "transient_asset");
  assert.equal(resolveMediaCapability("generate_cover_video"), null);
  assert.equal(resolveCourseCapability("generate_cover_image"), null);
  assert.equal(resolveMediaCapability("__proto__"), null);
});

test("image model is server-side configuration with no fallback to the text model", () => {
  const resolve = mediaCapabilityDefinitions.generate_cover_image.resolveModel;
  assert.equal(resolve({}), undefined);
  assert.equal(resolve({ FORGE_COVER_IMAGE_MODEL: " img-model " }), "img-model");
});

test("visual brief validation", () => {
  assert.ok(validateBrief(brief));
  assert.equal(validateBrief({ ...brief, subject: undefined }), null);
  assert.equal(validateBrief({ ...brief, aspectRatio: "1:1" }), null);
  assert.equal(validateBrief({ ...brief, keyConcepts: [] }), null);
  assert.equal(validateBrief({ ...brief, textInImage: "lots" }), null);
  assert.equal(validateBrief({ ...brief, extra: "x" }), null);
  assert.equal(validateBrief({ ...brief, subject: `Cours ${courseId}` }), null);
});

test("prompt validation enforces brief ratio, keeps avoid list, rejects internals", () => {
  const prompt = validatePrompt(promptOut, brief)!;
  assert.equal(prompt.aspectRatio, "3:2");
  assert.deepEqual(prompt.avoid, ["cerveau futuriste", "glowing brain"]);
  assert.ok(!JSON.stringify(prompt).includes("undefined"));
  assert.equal(validatePrompt({ ...promptOut, prompt: `Illustration for course ${courseId} with grid` }, brief), null);
  assert.equal(validatePrompt({ ...promptOut, prompt: "short" }, brief), null);
});

test("brief and prompt services validate output and never leak provider errors", async () => {
  const ok = await prepareCoverBrief({ courseId }, { ...common(), provider: { generate: async () => brief } });
  assert.equal(ok.status, "success");
  const bad = await prepareCoverBrief({ courseId }, { ...common(), provider: { generate: async () => ({ subject: "x" }) } });
  assert.equal(bad.status, "invalid_result");
  const failed = await prepareCoverBrief({ courseId }, { ...common(), provider: { generate: async () => { throw new Error("sk-secret boom"); } } });
  assert.equal(failed.status, "provider_error");
  assert.equal(failed.summary, coverMessages.brief);
  assert.ok(!JSON.stringify(failed).includes("sk-secret"));
  assert.equal((await prepareCoverBrief({ courseId, instruction: "Plus éditorial" }, { ...common(), provider: { generate: async () => brief } })).status, "validation_error");
  const prompt = await prepareCoverPrompt({ courseId, brief }, { ...common(), provider: { generate: async () => promptOut } });
  assert.equal(prompt.status, "success");
  assert.equal(prompt.data?.prompt.aspectRatio, "3:2");
});

test("the provider receives bounded context and no identifiers of storage or people", async () => {
  let received = "";
  await prepareCoverBrief({ courseId }, { ...common(), provider: { generate: async (_c, text) => { received = text; return brief; } } });
  assert.ok(received.includes("CSS Grid"));
  assert.ok(!/teacher|email|@|storage|https?:/i.test(received));
});

test("image generation returns a transient normalized result and rejects unsafe output", async () => {
  const request = { courseId, prompt: promptOut.prompt, aspectRatio: "3:2" };
  const good = await generateCoverImage(request, { ...common(), image: { generate: async () => ({ bytes: png(1536, 1024) }) } });
  assert.equal(good.status, "success");
  assert.equal(good.data?.mimeType, "image/png");
  assert.equal(good.data?.width, 1536);
  assert.ok(good.data?.previewUrl.startsWith("data:image/png;base64,"));
  const provider = await generateCoverImage(request, { ...common(), image: { generate: async () => { throw new Error("rate limited sk-x"); } } });
  assert.equal(provider.status, "provider_error");
  assert.equal(provider.summary, coverMessages.image);
  for (const bytes of [new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]), new Uint8Array(0), png(100, 100), png(1536, 1024, 5 * 1024 * 1024 + 1)]) {
    const result = await generateCoverImage(request, { ...common(), image: { generate: async () => ({ bytes }) } });
    assert.equal(result.status, "invalid_result");
    assert.equal(result.summary, coverMessages.unusable);
  }
  const missing = await generateCoverImage(request, { ...common(), image: { generate: async () => undefined as never } });
  assert.equal(missing.status, "invalid_result");
  assert.equal(inspectImage(null).ok, false);
});

test("non-owners cannot generate and nothing is called for them", async () => {
  let called = false;
  const denied = await generateCoverImage({ courseId, prompt: promptOut.prompt, aspectRatio: "3:2" }, { loadCover: async () => null, consume: () => { called = true; }, image: { generate: async () => { called = true; return { bytes: png(1536, 1024) }; } } });
  assert.equal(denied.status, "permission_denied");
  assert.equal(called, false);
  assert.equal(canManageCourseCover(owner, owner), true);
  for (const other of ["33333333-3333-4333-8333-333333333333", null, undefined, ""]) assert.equal(canManageCourseCover(owner, other), false);
  assert.equal(canManageCourseCover(null, null), false);
});

test("accept reuses the existing cover pipeline, stays owner-only and adds no table or column", () => {
  const actions = readFileSync("app/app/courses/cover-actions.ts", "utf8");
  const accept = actions.slice(actions.indexOf("export async function acceptGeneratedCoverAction"));
  assert.match(accept, /requireCoverOwner\(courseId\)/);
  assert.match(accept, /inspectImage\(/);
  assert.match(accept, /storeCover\(/);
  assert.match(actions.slice(actions.indexOf("export async function setCourseCoverAction")), /storeCover\(/);
  const store = actions.slice(actions.indexOf("async function storeCover"), actions.indexOf("export async function setCourseCoverAction"));
  assert.match(store, /validateCourseCoverUpload/);
  assert.match(store, /storage\.from\(courseCoverBucket\)/);
  for (const field of ["cover_storage_path", "cover_mime_type", "cover_file_size"]) assert.match(store, new RegExp(field));
  const workflow = readFileSync("app/app/forge/cover-workflow-actions.ts", "utf8");
  assert.doesNotMatch(workflow, /storage|\.update\(|\.insert\(|cover_storage_path/);
  const repository = readFileSync("lib/forge/orchestrator/repository.ts", "utf8");
  assert.match(repository.slice(repository.indexOf("createCoverRepository")), /canManageCourseCover/);
  assert.doesNotMatch(readFileSync("lib/forge/orchestrator/media-service.ts", "utf8"), /storage|\.update\(|\.insert\(/);
});

test("cover flow reducer: explicit steps, cancel, adjust, error, edit", () => {
  let state = coverFlowReducer(initialCoverFlow, { type: "open" });
  assert.equal(state.step, "brief");
  state = coverFlowReducer(state, { type: "brief", brief });
  state = coverFlowReducer(state, { type: "prompt", prompt: validatePrompt(promptOut, brief)! });
  state = coverFlowReducer(state, { type: "image", image: { status: "success", mimeType: "image/png", size: 10, width: 1536, height: 1024, previewUrl: "data:image/png;base64,AA==" } });
  assert.equal(state.step, "image");
  const adjusted = coverFlowReducer(state, { type: "adjust" });
  assert.equal(adjusted.step, "brief");
  assert.equal(adjusted.image, null);
  const edited = coverFlowReducer(state, { type: "edit", patch: { mood: "Plus technique" } });
  assert.equal(edited.prompt, null);
  assert.equal(edited.image, null);
  assert.equal(edited.brief?.mood, "Plus technique");
  const failed = coverFlowReducer(coverFlowReducer(state, { type: "start", busy: "image" }), { type: "fail", message: coverMessages.image });
  assert.equal(failed.busy, null);
  assert.equal(failed.error, coverMessages.image);
  assert.deepEqual(coverFlowReducer(state, { type: "cancel" }), initialCoverFlow);
  assert.equal(dataUrlToFile("data:image/png;base64,AAEC", "image/png")?.size, 3);
  assert.equal(dataUrlToFile("nope", "image/png"), null);
});

const handlers = { onBrief() {}, onPrompt() {}, onImage() {}, onAccept() {}, onCancel() {}, onAdjust() {}, onEdit() {}, onInstruction() {} };
const render = (state: Parameters<typeof CoverStudioView>[0]["state"]) => renderToStaticMarkup(createElement(CoverStudioView, { state, handlers }));
test("cover studio view renders each state without generating anything", () => {
  const empty = render({ ...initialCoverFlow, step: "brief" });
  assert.match(empty, /Préparer la direction visuelle/);
  assert.match(empty, /Annuler/);
  const withBrief = render({ ...initialCoverFlow, step: "brief", brief });
  assert.match(withBrief, /Plus éditorial/);
  assert.match(withBrief, /Générer le prompt/);
  const prompt = validatePrompt(promptOut, brief)!;
  const promptView = render({ ...initialCoverFlow, step: "prompt", brief, prompt });
  assert.match(promptView, /Générer l’image/);
  assert.match(promptView, /Modifier la direction/);
  const image = { status: "success" as const, mimeType: "image/png" as const, size: 10, width: 1536, height: 1024, previewUrl: "data:image/png;base64,AA==" };
  const preview = render({ ...initialCoverFlow, step: "image", brief, prompt, image });
  for (const label of ["Utiliser cette image", "Régénérer", "Modifier la direction", "Annuler", "rien n’est enregistré"]) assert.ok(preview.includes(label), label);
  assert.match(render({ ...initialCoverFlow, step: "image", brief, prompt, image, busy: "image" }), /Génération…/);
  assert.match(render({ ...initialCoverFlow, step: "prompt", brief, prompt, error: coverMessages.image }), /Forge n’a pas pu générer cette image\./);
});

test("cover manager exposes the Forge entry next to manual upload and generation is never automatic", () => {
  const manager = readFileSync("components/course/CourseCoverManager.tsx", "utf8");
  assert.match(manager, /Créer avec Forge/);
  assert.match(manager, /Remplacer/);
  const studio = readFileSync("components/course/CoverForgeStudio.tsx", "utf8");
  assert.doesNotMatch(studio, /useEffect/);
});

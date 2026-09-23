import test from "node:test";
import assert from "node:assert/strict";
import { deserializePublicDraft, PUBLIC_DRAFT_TTL_MS, publicCoursePreviewSchema, publicPreviewRequestSchema, serializePublicDraft, transitionPublicDraft } from "../lib/forge/public-contracts";
import { runPublicCoursePreview } from "../lib/forge/public-service";
import { ForgeError } from "../lib/forge/contracts";

const preview = { title: "Concevoir un design system", summary: "Un parcours guidé pour comprendre, construire et documenter un système cohérent.", suggestedDomain: "Design", suggestedDomainLabel: null, format: "full_course" as const, level: "Débutant", estimatedDuration: "2 semaines", learningOutcomes: ["Définir des tokens", "Documenter des composants"], modules: [{ title: "Fondations", summary: "Cadrer les principes essentiels.", estimatedDuration: "2 h", outcomes: ["Identifier les besoins"] }, { title: "Mise en pratique", summary: "Construire un premier système.", estimatedDuration: "3 h", outcomes: ["Créer des composants"] }] };

test("public preview schema accepts the typed contract", () => { assert.equal(publicCoursePreviewSchema.safeParse(preview).success, true); assert.equal(publicCoursePreviewSchema.safeParse({ ...preview, suggestedDomainLabel: null }).success, true); });
test("public request rejects empty and oversized intentions", () => { assert.equal(publicPreviewRequestSchema.safeParse({ intent: "" }).success, false); assert.equal(publicPreviewRequestSchema.safeParse({ intent: "x".repeat(501) }).success, false); });
test("format mapping only accepts stable values", () => { assert.equal(publicPreviewRequestSchema.safeParse({ intent: "Je veux apprendre TypeScript", format: "full_course" }).success, true); assert.equal(publicPreviewRequestSchema.safeParse({ intent: "Je veux apprendre TypeScript", format: "cours" }).success, false); });
test("anonymous generation needs no auth, persistence, reader, or private context", async () => { let consumed = 0; const result = await runPublicCoursePreview({ intent: "Je veux apprendre à concevoir un design system", format: "full_course" }, { provider: { availability: "configured", async generatePublic(messages) { assert.equal(messages.prompt.includes("course_sources"), false); return { output: preview, finishReason: "stop" }; } }, consumeRateLimit: () => { consumed += 1; } }); assert.equal(result.ok, true); assert.equal(consumed, 1); });
test("rate limit path is controlled", async () => { const result = await runPublicCoursePreview({ intent: "Je veux apprendre à concevoir un design system" }, { provider: { availability: "configured", async generatePublic() { throw new Error("must not run"); } }, consumeRateLimit: () => { throw new ForgeError("rate_limited"); } }); assert.deepEqual(result, { ok: false, error: "rate_limited" }); });
test("public preview rejects incomplete and malformed structured output with telemetry", async () => {
  const events: Array<Record<string, string | number | boolean>> = [];
  const deps = { provider: { availability: "configured" as const, async generatePublic() { return { output: preview, finishReason: "length" }; } }, consumeRateLimit() {}, telemetry(metrics: Record<string, string | number | boolean>) { events.push(metrics); } };
  assert.deepEqual(await runPublicCoursePreview({ intent: "Je veux apprendre à concevoir un design system" }, deps), { ok: false, error: "invalid_result" });
  assert.equal(events.at(-1)?.result, "invalid_result");
  assert.equal(events.at(-1)?.finishReason, "length");
});
test("public preview preserves a controlled timeout", async () => {
  const result = await runPublicCoursePreview({ intent: "Je veux apprendre à concevoir un design system" }, { provider: { availability: "configured", async generatePublic() { throw new ForgeError("timeout"); } }, consumeRateLimit() {} });
  assert.deepEqual(result, { ok: false, error: "timeout" });
});
test("draft round-trip, expiry, and version validation", () => { const now = 100_000_000; const value = serializePublicDraft({ intent: "Je veux apprendre à concevoir un design system", format: "full_course", domain: "Design", preview }, now); assert.equal(deserializePublicDraft(value, now + 1)?.intent.includes("design system"), true); assert.equal(deserializePublicDraft(value, now + PUBLIC_DRAFT_TTL_MS + 1), null); assert.equal(deserializePublicDraft(value.replace('"version":1', '"version":2'), now), null); });
test("draft survives signup and auth pending until restored or consumed", () => { const now = 100_000_000; const pending = serializePublicDraft({ intent: "Je veux apprendre à concevoir un design system", preview, lifecycle: "AUTH_PENDING" }, now); assert.equal(deserializePublicDraft(pending, now)?.lifecycle, "AUTH_PENDING"); const restored = transitionPublicDraft(pending, "RESTORED_IN_CREATE", now); assert.equal(deserializePublicDraft(restored, now)?.lifecycle, "RESTORED_IN_CREATE"); const consumed = transitionPublicDraft(restored, "CONSUMED", now); assert.equal(deserializePublicDraft(consumed, now)?.lifecycle, "CONSUMED"); });
test("malformed draft cannot transition", () => assert.equal(transitionPublicDraft("not-json", "RESTORED_IN_CREATE"), null));

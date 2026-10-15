import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Forge rail defaults to contextual tabs and supports keyboard navigation", () => {
  const source = readFileSync("components/forge/ForgeRail.tsx", "utf8");
  assert.match(source, /useState<"suggestions" \| "analysis" \| "resources" \| "chat">\("suggestions"\)/);
  for (const tab of ["Suggestions", "Analyse", "Ressources", "Chat"]) assert.match(source, new RegExp(`label: "${tab}"`));
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /ArrowLeft.*ArrowRight.*Home.*End/);
  assert.match(source, /listForgeSourcesAction/);
  assert.match(source, /<CurriculumAnalysis course=\{course\}/);
  assert.match(source, /<ContentIntelligence/);
  assert.match(source, /Brouillon local après examen et application explicites/);
  assert.match(source, /Discussion uniquement ; aucun contenu ne sera modifié/);
  assert.match(source, /Médias de cette leçon/);
  assert.match(source, /sourceLocationLabel/);
});

test("Forge Chat calls the existing ask action and keeps application behind proposal review", () => {
  const source = readFileSync("components/forge/ForgeRail.tsx", "utf8");
  assert.match(source, /run\("ask", question/);
  assert.match(source, /setChatMessages/);
  assert.match(source, /Conversation V1 liée à ce contexte, conservée uniquement dans cette session/);
  assert.match(source, /onApply=\{\(\) => \{/);
  assert.match(source, /applyLessonProposal\(context\.lessonId, proposal\)/);
});

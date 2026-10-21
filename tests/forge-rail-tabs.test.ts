import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Forge rail defaults to conversation and supports secondary contextual tabs", () => {
  const source = readFileSync("components/forge/ForgeRail.tsx", "utf8");
  assert.match(source, /useState<"suggestions" \| "analysis" \| "resources" \| "chat">\("chat"\)/);
  for (const tab of ["Conversation", "Suggestions", "Analyse", "Ressources"]) assert.match(source, new RegExp(`label: "${tab}"`));
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /ArrowLeft.*ArrowRight.*Home.*End/);
  assert.match(source, /listForgeSourcesAction/);
  assert.match(source, /Voir l’analyse dans la conversation/);
  assert.match(source, /<CoursePlanReview data=\{workflow\.data\}/);
  assert.match(source, /<ContentIntelligence/);
  assert.match(source, /filter\(\(\{ id \}\) => context\.mode === "edit" \|\| id !== "analysis"\)/);
  assert.match(source, /Brouillon local après examen et application explicites/);
  assert.match(source, /Discussion uniquement ; aucun contenu ne sera modifié/);
  assert.match(source, /Médias de cette leçon/);
  assert.match(source, /sourceLocationLabel/);
  assert.match(source, /Analyser le parcours/);
  assert.match(source, /Améliorer la structure/);
  assert.match(source, /const chatPrompts = context\.mode === "learn"/);
  assert.match(source, /Expliquer cette leçon/);
  assert.match(source, /M’expliquer ce parcours/);
  assert.match(source, /Posez une question sur \$\{context\.lessonTitle \? "cette leçon" : "ce parcours"\}/);
  assert.match(source, /Forge répond au sujet du parcours sans modifier son contenu/);
});

test("Forge Chat calls the existing ask action and keeps application behind proposal review", () => {
  const source = readFileSync("components/forge/ForgeRail.tsx", "utf8");
  assert.match(source, /run\("ask", question/);
  assert.match(source, /setChatMessages/);
  assert.match(source, /Demandez à Forge d’analyser, améliorer ou modifier ce parcours/);
  assert.match(source, /onApply=\{\(\) => \{/);
  assert.match(source, /applyLessonProposal\(context\.lessonId, proposal\)/);
});

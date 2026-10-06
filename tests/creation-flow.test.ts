import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GeneratedPath } from "../components/forge/GeneratedPath";
import { canCreateCourseFromProposal, canGenerateCourseProposal, canStartCourseCreation, creationProposalLabels, draftCourseCreationAttributes, ownerEditorRedirect, selectedCreationDomain } from "../lib/forge/creation-flow";
import type { PublicCoursePreview } from "../lib/forge/public-contracts";

const domains = [{ id: "domain-ai", name: "Intelligence artificielle · Numérique" }, { id: "domain-web", name: "Création web" }];
const proposal: PublicCoursePreview = { title: "Fondamentaux de l'IA", summary: "Un parcours introductif pour comprendre les principes de l'intelligence artificielle.", suggestedDomain: "Intelligence artificielle", suggestedDomainLabel: "Intelligence artificielle", format: "full_course", level: "Débutant", estimatedDuration: null, learningOutcomes: ["Comprendre les notions essentielles", "Identifier des usages responsables"], modules: [{ title: "Repères", summary: "Situer les concepts principaux.", estimatedDuration: null, outcomes: ["Définir l'intelligence artificielle"] }, { title: "Pratique", summary: "Évaluer des cas concrets.", estimatedDuration: null, outcomes: ["Reconnaître un usage pertinent"] }] };

test("creation requires an explicit persisted domain without a fallback", () => {
  assert.equal(selectedCreationDomain(domains, "domain-ai")?.name, "Intelligence artificielle · Numérique");
  assert.equal(selectedCreationDomain(domains, "") , null);
  assert.equal(selectedCreationDomain(domains, "Intelligence artificielle · Numérique"), null);
  assert.equal(canGenerateCourseProposal("Créer une initiation à l'intelligence artificielle", domains, ""), false);
  assert.equal(canGenerateCourseProposal("Créer une initiation à l'intelligence artificielle", domains, "domain-ai"), true);
  assert.equal(canGenerateCourseProposal("Créer une initiation à l'intelligence artificielle", [], "domain-ai"), false);
});

test("a generated proposal stays review-only until an explicit domain-backed create action", () => {
  assert.equal(canCreateCourseFromProposal(proposal, domains, ""), false);
  assert.equal(canCreateCourseFromProposal(proposal, domains, "domain-ai"), true);
  assert.equal(canStartCourseCreation(false, proposal, domains, "domain-ai"), true);
  assert.equal(canStartCourseCreation(true, proposal, domains, "domain-ai"), false);
  assert.equal(creationProposalLabels.generated, "Proposition générée · À examiner");
  assert.equal(creationProposalLabels.adjusted, "Proposition ajustée · À examiner");
  assert.equal(creationProposalLabels.confirmed, "Création confirmée");
  assert.deepEqual(draftCourseCreationAttributes("domain-ai"), { domain_id: "domain-ai", status: "draft", visibility: "private", availability: "preview" });
  assert.equal(ownerEditorRedirect("ia-debutant"), "/app/courses/ia-debutant?mode=edit");
});

test("proposal review exposes editable text, domain selection, structure, and explicit creation", () => {
  const html = renderToStaticMarkup(createElement(GeneratedPath, { preview: proposal, domain: domains[0].name, domainId: "", domains, proposalState: "generated", canAccept: false, onDomainChange() {}, onAdjust() {}, onRegenerate() {}, onAccept() {} }));
  assert.match(html, /Proposition générée · À examiner/);
  assert.match(html, /Titre proposé/);
  assert.match(html, /Résumé proposé/);
  assert.match(html, /Choisir le domaine/);
  assert.match(html, /Intelligence artificielle · Numérique/);
  assert.match(html, /2 modules · 2 leçons proposées/);
  assert.match(html, /Repères/);
  assert.match(html, /Pratique/);
  assert.match(html, /Regénérer la proposition/);
  assert.match(html, /Créer le parcours/);
  assert.match(html, /disabled=""[^>]*>.*Créer le parcours/);
});
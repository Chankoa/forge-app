import assert from "node:assert/strict";
import test from "node:test";
import { createIntentSchema, manualProposalFromIntent } from "../lib/forge/authoring-contracts";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";

test("a valid brief produces a user-labelled local preview proposal", () => { const intent = createIntentSchema.parse({ brief: "Créer un parcours de conception de produit pour débutants." }); const proposal = manualProposalFromIntent(intent); assert.equal(proposal.modules.length, 1); assert.equal(proposal.title, intent.brief.slice(0, 90)); });
test("a short brief is rejected before proposal or persistence", () => assert.equal(createIntentSchema.safeParse({ brief: "Trop court" }).success, false));
test("owner without enrollment can edit but cannot learn", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: false }); assert.equal(result.canEdit, true); assert.equal(result.canLearn, false); });
test("owner and enrollment share edit and learn on one course", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: true }); assert.equal(result.canEdit, true); assert.equal(result.canLearn, true); });
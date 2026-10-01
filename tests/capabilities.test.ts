import assert from "node:assert/strict";
import test from "node:test";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
test("enrollment can learn but cannot edit", () => { const result = resolveCourseCapabilities({ isOwner: false, isEnrolled: true }); assert.equal(result.canLearn, true); assert.equal(result.canEdit, false); });
test("owner can edit and publish", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: false }); assert.equal(result.canEdit, true); assert.equal(result.canPublish, true); });
test("owner enrollment has learning and editing capabilities", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: true }); assert.equal(result.canLearn, true); assert.equal(result.canEdit, true); });
test("archived courses retain canonical owner authoring but block publication and learning", () => {
	const owner = resolveCourseCapabilities({ isOwner: true, isEnrolled: true, courseStatus: "archived" });
	assert.equal(owner.canView, true); assert.equal(owner.canEdit, true); assert.equal(owner.canPublish, false); assert.equal(owner.canArchive, false); assert.equal(owner.canRestore, true); assert.equal(owner.canLearn, false);
	const learner = resolveCourseCapabilities({ isOwner: false, isEnrolled: true, courseStatus: "archived" });
	assert.equal(learner.canView, false); assert.equal(learner.canLearn, false); assert.equal(learner.canRestore, false);
});
test("membership context is retained without creating authority", () => {
	for (const membershipStatus of ["active", "invited", "suspended", "revoked"] as const) {
		const result = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "editor", membershipStatus });
		assert.equal(result.membershipRole, "editor"); assert.equal(result.membershipStatus, membershipStatus);
		assert.equal(result.canView, false); assert.equal(result.canEdit, false); assert.equal(result.canPublish, false); assert.equal(result.canArchive, false);
	}
	const memberOwner = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "owner", membershipStatus: "active" });
	assert.equal(memberOwner.canEdit, false); assert.equal(memberOwner.canRestore, false);
});